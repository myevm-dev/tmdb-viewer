import { useQuery } from '@tanstack/react-query';
import type { FanClubToken, SubjectKind, TokenMarket } from './data';

/**
 * Client for the Fancast indexer (/api/*). When the API isn't deployed or has
 * no database, `useIndexer().enabled` is false and the app falls back to the
 * Clanker API + DexScreener.
 */

export type IndexedSort = 'trending' | 'new' | 'top' | 'gainers' | 'volume';
export type Timeframe = '5m' | '15m' | '1h' | '4h' | '1d';

export interface IndexedClub {
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
  trendScore: number;
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
}

export interface IndexedTrade {
  txHash: string;
  club: string;
  name: string;
  symbol: string;
  image: string;
  kind: SubjectKind;
  subjectId: number;
  side: 'buy' | 'sell';
  trader: string;
  amount: number;
  eth: number;
  usd: number | null;
  priceUsd: number | null;
  ts: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    headers: { accept: 'application/json' },
  });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.includes('json'))
    throw new Error(`indexer ${res.status}`);
  return res.json();
}

/** One cheap probe, cached for the session. */
export function useIndexer() {
  const q = useQuery({
    queryKey: ['indexer', 'status'],
    queryFn: async () => {
      try {
        await api('clubs?limit=1');
        return true;
      } catch {
        return false;
      }
    },
    staleTime: Infinity,
    retry: false,
  });
  return { enabled: q.data === true, ready: q.isFetched };
}

export const toToken = (c: IndexedClub): FanClubToken => ({
  address: c.address,
  kind: c.kind,
  subjectId: c.subjectId,
  name: c.name,
  symbol: c.symbol,
  image: c.image,
  createdAt: c.createdAt ?? undefined,
  deployer: c.deployer ?? undefined,
  txHash: c.txHash ?? undefined,
  poolId: c.poolId,
  marketCap: c.market.marketCap ?? undefined,
  source: 'clanker',
});

export const toMarket = (c: IndexedClub): TokenMarket => ({
  pairAddress: c.poolId,
  priceUsd: c.market.priceUsd,
  marketCap: c.market.marketCap,
  fdv: c.market.marketCap,
  liquidityUsd: null,
  volume24h: c.market.volume24h,
  volume1h: c.market.volume1h,
  change24h: c.market.change24h,
  change1h: c.market.change1h,
  txns24h: c.market.txns24h,
  buys24h: c.market.buys24h,
  sells24h: c.market.sells24h,
  traders24h: c.market.traders24h,
  lastTradeAt: c.market.lastTradeAt,
  url: '',
  dexId: 'uniswap-v4',
  source: 'indexer',
});

export function useIndexedClubs(
  params: {
    sort?: IndexedSort;
    kind?: SubjectKind;
    subject?: { kind: SubjectKind; id: number };
    limit?: number;
  },
  enabled = true,
) {
  const qs = new URLSearchParams({
    sort: params.sort ?? 'trending',
    limit: String(params.limit ?? 100),
  });
  if (params.kind) qs.set('kind', params.kind);
  if (params.subject)
    qs.set('subject', `${params.subject.kind}:${params.subject.id}`);
  return useQuery({
    queryKey: ['indexer', 'clubs', qs.toString()],
    queryFn: () =>
      api<{ clubs: IndexedClub[]; ethUsd: number; syncedAt: string | null }>(
        `clubs?${qs}`,
      ),
    enabled,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}

export function useClubTrades(address: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['indexer', 'club', address],
    queryFn: () =>
      api<{ club: IndexedClub | null; trades: IndexedTrade[] }>(
        `club?address=${address}`,
      ),
    enabled: enabled && !!address,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

export function useActivity(limit = 20, enabled = true) {
  return useQuery({
    queryKey: ['indexer', 'trades', limit],
    queryFn: () => api<{ trades: IndexedTrade[] }>(`trades?limit=${limit}`),
    enabled,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

export function useCandles(
  address: string | undefined,
  tf: Timeframe,
  enabled = true,
) {
  return useQuery({
    queryKey: ['indexer', 'candles', address, tf],
    queryFn: () =>
      api<{ candles: Candle[] }>(`candles?address=${address}&tf=${tf}`),
    enabled: enabled && !!address,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/** Nudge the indexer right after a launch so the new club appears quickly. */
export const pokeIndexer = () =>
  fetch('/api/clubs?sort=new&limit=1').catch(() => {});
