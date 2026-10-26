import { useMemo } from 'react';
import { getAddress, isAddress } from 'ethers';
import { createStore } from '../lib/storage';
import { CHAIN, CLANKER_API, FAN_CLUB_INTERFACE } from './config';

/** What a fan club is for: a film or a person (actor, director…). */
export type SubjectKind = 'movie' | 'person';

export interface FanClubToken {
  address: string;
  kind: SubjectKind;
  /** TMDB id of the movie or person. */
  subjectId: number;
  name: string;
  symbol: string;
  image: string;
  createdAt?: string;
  deployer?: string;
  txHash?: string;
  poolId?: string;
  /** Market cap reported by Clanker, used until DexScreener data arrives. */
  marketCap?: number;
  source: 'local' | 'clanker';
}

export interface TokenMarket {
  pairAddress: string;
  priceUsd: number | null;
  marketCap: number | null;
  fdv: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  change24h: number | null;
  change1h: number | null;
  txns24h: number | null;
  url: string;
  dexId: string;
}

/* ------------------------------------------------------------------ */
/* Local registry — every fan club launched from this browser.         */
/* ------------------------------------------------------------------ */

const registry = createStore<Record<string, FanClubToken>>(
  `reel:fan-clubs:${CHAIN.id}`,
  {},
);

export const saveLocalFanClub = (t: FanClubToken) =>
  registry.set((prev) => ({ ...prev, [t.address.toLowerCase()]: t }));

// Entries saved before people were supported only carry `movieId`.
const upgrade = (t: FanClubToken & { movieId?: number }): FanClubToken =>
  t.kind ? t : { ...t, kind: 'movie', subjectId: t.subjectId ?? t.movieId! };

export const useLocalFanClubs = () => {
  const state = registry.use();
  return useMemo(() => Object.values(state).map(upgrade), [state]);
};

export const subjectPath = (kind: SubjectKind, id: number) => `/${kind}/${id}`;

/* ------------------------------------------------------------------ */
/* Clanker public API — discovers fan clubs launched by anyone.        */
/* ------------------------------------------------------------------ */

type Json = Record<string, any>;

const parseMaybeJson = (v: unknown): Json | null => {
  if (!v) return null;
  if (typeof v === 'object') return v as Json;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return null;
};

/** Extracts the TMDB movie/person we stamp into the token's social context / metadata. */
export function subjectFromToken(
  t: Json,
): { kind: SubjectKind; id: number } | null {
  const ctx = parseMaybeJson(t.social_context ?? t.socialContext ?? t.context);
  if (ctx) {
    const iface = String(ctx.interface ?? '');
    if (iface && iface !== FAN_CLUB_INTERFACE) return null;
    const fromMsg = /(movie|person)\/(\d+)/.exec(String(ctx.messageId ?? ''));
    if (fromMsg)
      return { kind: fromMsg[1] as SubjectKind, id: Number(fromMsg[2]) };
    // Early launches stored the bare movie id.
    if (/^\d+$/.test(String(ctx.id ?? '')))
      return { kind: 'movie', id: Number(ctx.id) };
  }
  const meta = parseMaybeJson(t.metadata);
  const urls: { url?: string }[] = meta?.socialMediaUrls ?? [];
  for (const u of urls) {
    const m = /themoviedb\.org\/(movie|person)\/(\d+)/.exec(u.url ?? '');
    if (m) return { kind: m[1] as SubjectKind, id: Number(m[2]) };
  }
  return null;
}

const num = (...vals: unknown[]) => {
  for (const v of vals) {
    const n = typeof v === 'string' ? Number(v) : (v as number);
    if (typeof n === 'number' && Number.isFinite(n)) return n;
  }
  return undefined;
};

function normalizeClankerToken(t: Json): FanClubToken | null {
  const address = t.contract_address ?? t.address;
  if (!address || !isAddress(address)) return null;
  const subject = subjectFromToken(t);
  if (!subject) return null;
  if (t.chain_id && Number(t.chain_id) !== CHAIN.id) return null;
  const market = t.related?.market ?? t.market ?? {};
  return {
    address: getAddress(address),
    kind: subject.kind,
    subjectId: subject.id,
    name: t.name ?? '',
    symbol: t.symbol ?? '',
    image: t.img_url ?? t.image ?? '',
    createdAt: t.deployed_at ?? t.created_at,
    deployer: t.msg_sender ?? t.admin,
    txHash: t.tx_hash,
    poolId: t.pool_address,
    marketCap: num(market.marketCap, market.market_cap, t.market_cap),
    source: 'clanker',
  };
}

export async function fetchClankerFanClubs(
  opts: {
    q?: string;
    sortBy?: 'market-cap' | 'tx-h24' | 'price-percent-h24';
    limit?: number;
    cursor?: string;
  } = {},
): Promise<{ tokens: FanClubToken[]; cursor?: string }> {
  const params = new URLSearchParams({
    socialInterface: FAN_CLUB_INTERFACE,
    chainId: String(CHAIN.id),
    limit: String(opts.limit ?? 20),
    includeMarket: 'true',
    sort: 'desc',
  });
  if (opts.q) params.set('q', opts.q.slice(0, 100));
  if (opts.sortBy) params.set('sortBy', opts.sortBy);
  if (opts.cursor) params.set('cursor', opts.cursor);

  const res = await fetch(`${CLANKER_API}/tokens?${params}`, {
    headers: { accept: 'application/json' },
  });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.includes('json'))
    throw new Error(`Clanker API unavailable (${res.status})`);
  const body = await res.json();
  const raw: Json[] = Array.isArray(body)
    ? body
    : (body.data ?? body.tokens ?? []);
  return {
    tokens: raw
      .map(normalizeClankerToken)
      .filter((t): t is FanClubToken => !!t),
    cursor: body.cursor ?? undefined,
  };
}

/** Merge lists, de-duplicating by address (Clanker data wins, local fills gaps). */
export function mergeFanClubs(...lists: FanClubToken[][]) {
  const map = new Map<string, FanClubToken>();
  for (const list of lists) {
    for (const t of list) {
      const key = t.address.toLowerCase();
      const prev = map.get(key);
      if (!prev) {
        map.set(key, t);
        continue;
      }
      const defined = Object.fromEntries(
        Object.entries(t).filter(([, v]) => v !== undefined && v !== ''),
      ) as Partial<FanClubToken>;
      map.set(key, {
        ...prev,
        ...defined,
        txHash: prev.txHash ?? t.txHash,
        source:
          prev.source === 'clanker' || t.source === 'clanker'
            ? 'clanker'
            : 'local',
      });
    }
  }
  return [...map.values()];
}

/* ------------------------------------------------------------------ */
/* DexScreener — prices, volume, liquidity and the chart embed.        */
/* ------------------------------------------------------------------ */

export async function fetchMarkets(
  addresses: string[],
): Promise<Record<string, TokenMarket>> {
  const out: Record<string, TokenMarket> = {};
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const res = await fetch(
      `https://api.dexscreener.com/tokens/v1/${CHAIN.slug}/${chunk.join(',')}`,
    );
    if (!res.ok) continue;
    const pairs: Json[] = await res.json();
    if (!Array.isArray(pairs)) continue;
    for (const p of pairs) {
      const base = String(p.baseToken?.address ?? '').toLowerCase();
      const quote = String(p.quoteToken?.address ?? '').toLowerCase();
      const key = chunk.includes(base)
        ? base
        : chunk.includes(quote)
          ? quote
          : null;
      if (!key) continue;
      const liq = num(p.liquidity?.usd) ?? 0;
      const existing = out[key];
      if (existing && (existing.liquidityUsd ?? 0) >= liq) continue;
      out[key] = {
        pairAddress: p.pairAddress,
        priceUsd: num(p.priceUsd) ?? null,
        marketCap: num(p.marketCap, p.fdv) ?? null,
        fdv: num(p.fdv) ?? null,
        liquidityUsd: liq || null,
        volume24h: num(p.volume?.h24) ?? null,
        change24h: num(p.priceChange?.h24) ?? null,
        change1h: num(p.priceChange?.h1) ?? null,
        txns24h: p.txns?.h24
          ? (p.txns.h24.buys ?? 0) + (p.txns.h24.sells ?? 0)
          : null,
        url: p.url,
        dexId: p.dexId,
      };
    }
  }
  return out;
}
