import { getAddress } from 'ethers';
import { config } from './config.js';
import { getDb } from './db.js';
import type { SubjectKind } from './sync.js';

export type Sort = 'trending' | 'new' | 'top' | 'gainers' | 'volume';

interface Row {
  address: string;
  kind: SubjectKind;
  subject_id: number;
  name: string;
  symbol: string;
  image: string;
  pool_id: string;
  deployer: string | null;
  tx_hash: string | null;
  created_at: string | Date;
  start_price_eth: number | null;
  price_eth: number | null;
  ref1h: number | null;
  ref24h: number | null;
  last_trade: string | Date | null;
  vol1h_eth: number | null;
  vol24h_eth: number | null;
  trades24h: number | string | null;
  buys24h: number | string | null;
  sells24h: number | string | null;
  buys1h: number | string | null;
  traders24h: number | string | null;
  traders_all: number | string | null;
}

const STATS_SQL = (where: string) => `
with agg as (
  select club,
    coalesce(sum(eth_amount) filter (where ts > now() - interval '1 hour'), 0) as vol1h_eth,
    coalesce(sum(eth_amount), 0)                                               as vol24h_eth,
    count(*)                                                                   as trades24h,
    count(*) filter (where side = 'buy')                                       as buys24h,
    count(*) filter (where side = 'sell')                                      as sells24h,
    count(*) filter (where side = 'buy' and ts > now() - interval '1 hour')    as buys1h,
    count(distinct trader)                                                     as traders24h
  from trades where ts > now() - interval '24 hours' group by club
),
lifetime as (select club, count(distinct trader) as traders_all from trades group by club),
last as (
  select distinct on (club) club, price_eth, ts from trades order by club, ts desc, log_index desc
),
ref1h as (
  select distinct on (club) club, price_eth from trades
  where ts <= now() - interval '1 hour' order by club, ts desc, log_index desc
),
ref24h as (
  select distinct on (club) club, price_eth from trades
  where ts <= now() - interval '24 hours' order by club, ts desc, log_index desc
)
select c.address, c.kind, c.subject_id, c.name, c.symbol, c.image, c.pool_id, c.deployer,
  c.tx_hash, c.created_at, c.start_price_eth,
  coalesce(last.price_eth, c.start_price_eth)   as price_eth,
  coalesce(ref1h.price_eth, c.start_price_eth)  as ref1h,
  coalesce(ref24h.price_eth, c.start_price_eth) as ref24h,
  last.ts as last_trade,
  agg.vol1h_eth, agg.vol24h_eth, agg.trades24h, agg.buys24h, agg.sells24h, agg.buys1h,
  agg.traders24h, lifetime.traders_all
from clubs c
left join agg on agg.club = c.address
left join lifetime on lifetime.club = c.address
left join last on last.club = c.address
left join ref1h on ref1h.club = c.address
left join ref24h on ref24h.club = c.address
${where}`;

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const iso = (v: string | Date | null) =>
  v === null ? null : (v instanceof Date ? v : new Date(v)).toISOString();

/**
 * Trending = recent money + breadth of buyers, decaying when trading stops,
 * with a short boost for brand-new launches so they get discovered.
 */
function trendScore(r: Row, ethUsd: number) {
  const vol1h = n(r.vol1h_eth) * ethUsd;
  const vol24h = n(r.vol24h_eth) * ethUsd;
  const hoursSince = r.last_trade
    ? (Date.now() - new Date(r.last_trade).getTime()) / 3_600_000
    : Infinity;
  const ageHours = (Date.now() - new Date(r.created_at).getTime()) / 3_600_000;
  const activity =
    3 * Math.log1p(vol1h) +
    Math.log1p(vol24h) +
    2 * Math.sqrt(n(r.traders24h)) +
    1.5 * Math.log1p(n(r.buys1h));
  const freshness = Number.isFinite(hoursSince)
    ? Math.exp(-hoursSince / 12)
    : 0;
  const launchBoost = ageHours < 2 ? 4 * (1 - ageHours / 2) : 0;
  return activity * freshness + launchBoost;
}

export interface ClubStats {
  address: string;
  kind: SubjectKind;
  subjectId: number;
  name: string;
  symbol: string;
  image: string;
  poolId: string;
  deployer: string | null;
  txHash: string | null;
  createdAt: string | null;
  market: {
    priceEth: number | null;
    priceUsd: number | null;
    marketCap: number | null;
    volume1h: number;
    volume24h: number;
    change1h: number | null;
    change24h: number | null;
    txns24h: number;
    buys24h: number;
    sells24h: number;
    traders24h: number;
    tradersAllTime: number;
    lastTradeAt: string | null;
  };
  trendScore: number;
}

function shape(r: Row, ethUsd: number): ClubStats {
  const price = r.price_eth;
  const pct = (ref: number | null) =>
    price && ref ? (price / ref - 1) * 100 : null;
  return {
    address: getAddress(r.address),
    kind: r.kind,
    subjectId: Number(r.subject_id),
    name: r.name,
    symbol: r.symbol,
    image: r.image,
    poolId: r.pool_id,
    deployer: r.deployer,
    txHash: r.tx_hash,
    createdAt: iso(r.created_at),
    market: {
      priceEth: price,
      priceUsd: price !== null && ethUsd ? price * ethUsd : null,
      marketCap:
        price !== null && ethUsd ? price * ethUsd * config.totalSupply : null,
      volume1h: n(r.vol1h_eth) * ethUsd,
      volume24h: n(r.vol24h_eth) * ethUsd,
      change1h: pct(r.ref1h),
      change24h: pct(r.ref24h),
      txns24h: n(r.trades24h),
      buys24h: n(r.buys24h),
      sells24h: n(r.sells24h),
      traders24h: n(r.traders24h),
      tradersAllTime: n(r.traders_all),
      lastTradeAt: iso(r.last_trade),
    },
    trendScore: Math.round(trendScore(r, ethUsd) * 100) / 100,
  };
}

export async function ethUsdNow() {
  const db = await getDb();
  const { rows } = await db.query<{
    eth_usd: number | null;
    block: string | null;
    updated_at: string | Date | null;
  }>(`select eth_usd, block, updated_at from sync_state where id = 'main'`);
  return {
    ethUsd: rows[0]?.eth_usd ?? 0,
    block: rows[0]?.block ? Number(rows[0].block) : null,
    syncedAt: iso(rows[0]?.updated_at ?? null),
  };
}

export async function listClubs(opts: {
  sort?: Sort;
  kind?: SubjectKind;
  subject?: { kind: SubjectKind; id: number };
  limit?: number;
}) {
  const db = await getDb();
  const { ethUsd } = await ethUsdNow();
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.kind) {
    params.push(opts.kind);
    where.push(`c.kind = $${params.length}`);
  }
  if (opts.subject) {
    params.push(opts.subject.kind, opts.subject.id);
    where.push(
      `c.kind = $${params.length - 1} and c.subject_id = $${params.length}`,
    );
  }
  const { rows } = await db.query<Row>(
    STATS_SQL(where.length ? `where ${where.join(' and ')}` : ''),
    params,
  );
  const clubs = rows.map((r) => shape(r, ethUsd));

  const by: Record<Sort, (a: ClubStats, b: ClubStats) => number> = {
    trending: (a, b) => b.trendScore - a.trendScore,
    new: (a, b) =>
      Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''),
    top: (a, b) => (b.market.marketCap ?? 0) - (a.market.marketCap ?? 0),
    gainers: (a, b) =>
      (b.market.change24h ?? -1e9) - (a.market.change24h ?? -1e9),
    volume: (a, b) => b.market.volume24h - a.market.volume24h,
  };
  clubs.sort(by[opts.sort ?? 'trending']);
  return clubs.slice(0, Math.min(opts.limit ?? 60, 200));
}

export async function getClub(address: string) {
  const db = await getDb();
  const { ethUsd } = await ethUsdNow();
  const { rows } = await db.query<Row>(STATS_SQL('where c.address = $1'), [
    address.toLowerCase(),
  ]);
  return rows[0] ? shape(rows[0], ethUsd) : null;
}

export async function recentTrades(opts: { address?: string; limit?: number }) {
  const db = await getDb();
  const { ethUsd } = await ethUsdNow();
  const params: unknown[] = [Math.min(opts.limit ?? 30, 100)];
  let where = '';
  if (opts.address) {
    params.push(opts.address.toLowerCase());
    where = `where t.club = $2`;
  }
  const { rows } = await db.query<any>(
    `select t.*, c.name, c.symbol, c.image, c.kind, c.subject_id
       from trades t join clubs c on c.address = t.club
       ${where}
       order by t.ts desc, t.log_index desc limit $1`,
    params,
  );
  return rows.map((r) => {
    const usdRate = r.eth_usd ?? ethUsd;
    return {
      txHash: r.tx_hash,
      club: getAddress(r.club),
      name: r.name,
      symbol: r.symbol,
      image: r.image,
      kind: r.kind,
      subjectId: Number(r.subject_id),
      side: r.side as 'buy' | 'sell',
      trader: getAddress(r.trader),
      amount: Number(r.club_amount),
      eth: Number(r.eth_amount),
      usd: usdRate ? Number(r.eth_amount) * usdRate : null,
      priceUsd: usdRate ? Number(r.price_eth) * usdRate : null,
      ts: iso(r.ts),
    };
  });
}

export const TIMEFRAMES = {
  '5m': { bucket: 300, window: 2 * 86_400 },
  '15m': { bucket: 900, window: 5 * 86_400 },
  '1h': { bucket: 3_600, window: 21 * 86_400 },
  '4h': { bucket: 14_400, window: 90 * 86_400 },
  '1d': { bucket: 86_400, window: 3 * 365 * 86_400 },
} as const;
export type Timeframe = keyof typeof TIMEFRAMES;

/** OHLCV in USD, built from indexed swaps (open/close are first/last trade in the bucket). */
export async function candles(address: string, tf: Timeframe) {
  const db = await getDb();
  const { ethUsd } = await ethUsdNow();
  const { bucket, window } = TIMEFRAMES[tf];
  const { rows } = await db.query<any>(
    `select (floor(extract(epoch from ts) / $2) * $2)::bigint as t,
            (array_agg(price_eth * coalesce(eth_usd, $4) order by ts, log_index))[1]           as o,
            max(price_eth * coalesce(eth_usd, $4))                                              as h,
            min(price_eth * coalesce(eth_usd, $4))                                              as l,
            (array_agg(price_eth * coalesce(eth_usd, $4) order by ts desc, log_index desc))[1]  as c,
            sum(eth_amount * coalesce(eth_usd, $4))                                             as v
       from trades
      where club = $1 and ts > now() - ($3 || ' seconds')::interval
      group by 1 order by 1`,
    [address.toLowerCase(), bucket, String(window), ethUsd],
  );
  const out = rows.map((r) => ({
    time: Number(r.t),
    open: Number(r.o),
    high: Number(r.h),
    low: Number(r.l),
    close: Number(r.c),
    volume: Number(r.v),
  }));
  // Chain candles: each opens where the previous closed (swap prices are post-trade).
  for (let i = 1; i < out.length; i++) {
    const c = out[i];
    c.open = out[i - 1].close;
    c.high = Math.max(c.high, c.open);
    c.low = Math.min(c.low, c.open);
  }
  return out;
}
