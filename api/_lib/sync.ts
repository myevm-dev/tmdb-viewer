import { Contract, Interface, JsonRpcProvider, type Log } from 'ethers';
import { config, SWAP, TOKEN_CREATED } from './config.js';
import { getDb, values, type Db } from './db.js';

const iface = new Interface([TOKEN_CREATED, SWAP]);
const TOKEN_CREATED_TOPIC = iface.getEvent('TokenCreated')!.topicHash;
const SWAP_TOPIC = iface.getEvent('Swap')!.topicHash;
const Q96 = 2 ** 96;

let provider: JsonRpcProvider | null = null;
export function rpc() {
  provider ??= new JsonRpcProvider(config.rpcUrl, config.chainId, {
    staticNetwork: true,
    batchMaxCount: 50,
  });
  return provider;
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

type Subject = { kind: 'movie' | 'person'; id: number };

function parseJson(s: string): Record<string, any> | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

/** Fancast stamps `messageId: movie/<id>` or `person/<id>` into the token context. */
export function subjectFromContext(
  contextJson: string,
  metadataJson: string,
): Subject | null {
  const ctx = parseJson(contextJson);
  if (!ctx || !config.interfaces.includes(String(ctx.interface ?? '')))
    return null;
  const m = /(movie|person)\/(\d+)/.exec(String(ctx.messageId ?? ''));
  if (m) return { kind: m[1] as Subject['kind'], id: Number(m[2]) };
  if (/^\d+$/.test(String(ctx.id ?? '')))
    return { kind: 'movie', id: Number(ctx.id) };
  const meta = parseJson(metadataJson);
  for (const u of meta?.socialMediaUrls ?? []) {
    const mm = /themoviedb\.org\/(movie|person)\/(\d+)/.exec(
      String(u?.url ?? ''),
    );
    if (mm) return { kind: mm[1] as Subject['kind'], id: Number(mm[2]) };
  }
  return null;
}

/** ETH per club token. Uniswap orders currencies by address; both have 18 decimals. */
export function priceFromSqrt(sqrtPriceX96: bigint, token0IsClub: boolean) {
  const r = Number(sqrtPriceX96) / Q96;
  const token1PerToken0 = r * r;
  return token0IsClub ? token1PerToken0 : 1 / token1PerToken0;
}

/** Launch price: Clanker starts every pool deep below 1 ETH/token, i.e. 1.0001^-|tick|. */
export const priceFromTick = (tick: number) =>
  Math.pow(1.0001, -Math.abs(tick));

/* ------------------------------------------------------------------ */
/* ETH/USD                                                             */
/* ------------------------------------------------------------------ */

async function fetchEthUsd(): Promise<number | null> {
  try {
    if (config.ethUsdFeed) {
      const feed = new Contract(
        config.ethUsdFeed,
        [
          'function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)',
          'function decimals() view returns (uint8)',
        ],
        rpc(),
      );
      const [[, answer], dec] = await Promise.all([
        feed.latestRoundData(),
        feed.decimals(),
      ]);
      return Number(answer) / 10 ** Number(dec);
    }
    const res = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot', {
      signal: AbortSignal.timeout(4000),
    });
    const body = await res.json();
    const n = Number(body?.data?.amount);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */

interface SyncResult {
  status: 'ok' | 'busy' | 'idle';
  from?: number;
  to?: number;
  head?: number;
  clubs: number;
  trades: number;
  ms: number;
}

const isRangeError = (e: unknown) =>
  /range|limit|too many|exceed|10000 results/i.test(
    String((e as Error)?.message ?? e),
  );

async function getLogsAdaptive(
  filter: { address: string; topics: (string | string[] | null)[] },
  from: number,
  to: number,
): Promise<Log[]> {
  return rpc().getLogs({ ...filter, fromBlock: from, toBlock: to });
}

/** Take a short lease so concurrent invocations don't index the same range twice. */
async function acquire(db: Db) {
  const { rows } = await db.query<{
    block: string | null;
    eth_usd: number | null;
    eth_usd_at: string | null;
  }>(
    `update sync_state set locked_until = now() + ($1 || ' milliseconds')::interval
       where id = 'main' and (locked_until is null or locked_until < now())
       returning block, eth_usd, eth_usd_at`,
    [String(config.budgetMs + 10_000)],
  );
  return rows[0] ?? null;
}

export async function sync(): Promise<SyncResult> {
  const started = Date.now();
  const db = await getDb();
  const lease = await acquire(db);
  if (!lease)
    return { status: 'busy', clubs: 0, trades: 0, ms: Date.now() - started };

  let clubsAdded = 0;
  let tradesAdded = 0;
  let cursor = lease.block === null ? null : Number(lease.block);
  try {
    const head = (await rpc().getBlockNumber()) - config.confirmations;
    let from =
      cursor === null
        ? (config.startBlock ?? Math.max(0, head - config.lookbackBlocks))
        : cursor + 1;
    const firstFrom = from;
    if (from > head) {
      await db.query(
        `update sync_state set updated_at = now() where id = 'main'`,
      );
      return {
        status: 'idle',
        head,
        clubs: 0,
        trades: 0,
        ms: Date.now() - started,
      };
    }

    // ETH/USD refreshes at most once a minute.
    let ethUsd = lease.eth_usd;
    const ethAge = lease.eth_usd_at
      ? Date.now() - Date.parse(lease.eth_usd_at)
      : Infinity;
    if (ethAge > 60_000) {
      const fresh = await fetchEthUsd();
      if (fresh) {
        ethUsd = fresh;
        await db.query(
          `update sync_state set eth_usd = $1, eth_usd_at = now() where id = 'main'`,
          [fresh],
        );
      }
    }

    const pools = new Map<string, { address: string; token0IsClub: boolean }>();
    for (const r of (
      await db.query<{
        pool_id: string;
        address: string;
        token0_is_club: boolean;
      }>('select pool_id, address, token0_is_club from clubs')
    ).rows) {
      pools.set(r.pool_id, {
        address: r.address,
        token0IsClub: r.token0_is_club,
      });
    }

    let range = config.maxBlockRange;
    while (from <= head && Date.now() - started < config.budgetMs) {
      const to = Math.min(head, from + range - 1);
      let created: Log[];
      try {
        created = await getLogsAdaptive(
          { address: config.clankerFactory, topics: [TOKEN_CREATED_TOPIC] },
          from,
          to,
        );
      } catch (e) {
        if (isRangeError(e) && range > 10) {
          range = Math.max(10, Math.floor(range / 2));
          continue;
        }
        throw e;
      }

      // Block timestamps: Base produces a block every 2s, so one lookup per chunk is enough.
      let toTs: number | null = null;
      const tsOf = async (block: number) => {
        toTs ??= (await rpc().getBlock(to))!.timestamp;
        return new Date((toTs - (to - block) * config.blockTimeSec) * 1000);
      };

      // 1) New Fancast clubs in this range
      const clubRows: unknown[][] = [];
      for (const log of created) {
        const ev = iface.parseLog(log);
        if (!ev) continue;
        const a = ev.args;
        const subject = subjectFromContext(a.tokenContext, a.tokenMetadata);
        if (!subject) continue;
        const paired = String(a.pairedToken).toLowerCase();
        if (paired !== config.weth) continue; // only ETH-paired clubs are priced
        const address = String(a.tokenAddress).toLowerCase();
        const poolId = String(a.poolId).toLowerCase();
        const token0IsClub = BigInt(address) < BigInt(paired);
        pools.set(poolId, { address, token0IsClub });
        clubRows.push([
          address,
          subject.kind,
          subject.id,
          a.tokenName,
          a.tokenSymbol,
          a.tokenImage,
          poolId,
          paired,
          token0IsClub,
          priceFromTick(Number(a.startingTick)),
          String(a.tokenAdmin).toLowerCase(),
          log.transactionHash,
          log.blockNumber,
          await tsOf(log.blockNumber),
        ]);
      }
      if (clubRows.length) {
        const v = values(clubRows);
        const r = await db.query(
          `insert into clubs (address, kind, subject_id, name, symbol, image, pool_id, paired_token,
             token0_is_club, start_price_eth, deployer, tx_hash, block, created_at)
           values ${v.sql} on conflict (address) do nothing returning address`,
          v.params,
        );
        clubsAdded += r.rows.length;
      }

      // 2) Swaps on every Fancast pool in this range (pool ids OR-ed in topic1)
      const ids = [...pools.keys()];
      const swaps: Log[] = [];
      try {
        for (let i = 0; i < ids.length; i += 50) {
          swaps.push(
            ...(await getLogsAdaptive(
              {
                address: config.poolManager,
                topics: [SWAP_TOPIC, ids.slice(i, i + 50)],
              },
              from,
              to,
            )),
          );
        }
      } catch (e) {
        if (isRangeError(e) && range > 10) {
          range = Math.max(10, Math.floor(range / 2));
          continue;
        }
        throw e;
      }

      if (swaps.length) {
        // Real trader = tx sender (the swap event only shows the router).
        const hashes = [...new Set(swaps.map((s) => s.transactionHash))];
        const senders = new Map<string, string>();
        const txs = await Promise.all(
          hashes.map((h) =>
            rpc()
              .getTransaction(h)
              .catch(() => null),
          ),
        );
        txs.forEach(
          (tx, i) => tx && senders.set(hashes[i], tx.from.toLowerCase()),
        );

        const tradeRows: unknown[][] = [];
        for (const log of swaps) {
          const ev = iface.parseLog(log);
          if (!ev) continue;
          const pool = pools.get(String(ev.args.id).toLowerCase());
          if (!pool) continue;
          // v4 deltas are from the swapper's side: positive = received, negative = paid.
          const a0 = BigInt(ev.args.amount0);
          const a1 = BigInt(ev.args.amount1);
          const clubDelta = pool.token0IsClub ? a0 : a1;
          const ethDelta = pool.token0IsClub ? a1 : a0;
          if (clubDelta === 0n) continue;
          tradeRows.push([
            log.transactionHash,
            log.index,
            pool.address,
            log.blockNumber,
            await tsOf(log.blockNumber),
            clubDelta > 0n ? 'buy' : 'sell',
            senders.get(log.transactionHash) ??
              String(ev.args.sender).toLowerCase(),
            Math.abs(Number(clubDelta)) / 1e18,
            Math.abs(Number(ethDelta)) / 1e18,
            priceFromSqrt(BigInt(ev.args.sqrtPriceX96), pool.token0IsClub),
            ethUsd,
          ]);
        }
        for (let i = 0; i < tradeRows.length; i += 500) {
          const v = values(tradeRows.slice(i, i + 500));
          const r = await db.query(
            `insert into trades (tx_hash, log_index, club, block, ts, side, trader, club_amount,
               eth_amount, price_eth, eth_usd)
             values ${v.sql} on conflict do nothing returning tx_hash`,
            v.params,
          );
          tradesAdded += r.rows.length;
        }
      }

      cursor = to;
      await db.query(
        `update sync_state set block = $1, updated_at = now() where id = 'main'`,
        [to],
      );
      from = to + 1;
      range = Math.min(config.maxBlockRange, range * 2);
    }

    return {
      status: 'ok',
      from: firstFrom,
      to: cursor ?? undefined,
      head,
      clubs: clubsAdded,
      trades: tradesAdded,
      ms: Date.now() - started,
    };
  } finally {
    await db.query(
      `update sync_state set locked_until = null where id = 'main'`,
    );
  }
}

/** Kick off a sync when data is stale. Never throws. */
export async function syncIfStale(): Promise<void> {
  try {
    const db = await getDb();
    const { rows } = await db.query<{
      updated_at: string | null;
      locked_until: string | null;
    }>(`select updated_at, locked_until from sync_state where id = 'main'`);
    const s = rows[0];
    const age = s?.updated_at
      ? Date.now() - Date.parse(s.updated_at)
      : Infinity;
    const locked = s?.locked_until && Date.parse(s.locked_until) > Date.now();
    if (age > config.staleMs && !locked) await sync();
  } catch (e) {
    console.error('[indexer] sync failed', e);
  }
}
