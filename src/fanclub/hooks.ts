import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Contract, JsonRpcProvider, formatUnits } from 'ethers';
import {
  fetchClankerFanClubs,
  fetchMarkets,
  mergeFanClubs,
  useLocalFanClubs,
  type FanClubToken,
  type SubjectKind,
  type TokenMarket,
} from './data';
import { CHAIN } from './config';
import {
  toMarket,
  toToken,
  useIndexedClubs,
  useIndexer,
  type IndexedSort,
} from './indexer';
import { useWallet } from '../wallet/WalletProvider';

const byCreated = (a: FanClubToken, b: FanClubToken) =>
  Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? '') || 0;

export type ClubSort = IndexedSort;

/**
 * All known fan clubs. With the indexer, they come pre-ranked from /api/clubs
 * (trending, new, top, gainers, volume) with market data attached; otherwise
 * from Clanker's API. Clubs launched from this browser are always included.
 */
export function useAllFanClubs(sort: ClubSort = 'new') {
  const { enabled, ready } = useIndexer();
  const local = useLocalFanClubs();
  const indexed = useIndexedClubs({ sort, limit: 100 }, enabled);
  const remote = useQuery({
    queryKey: ['fanclubs', sort === 'top' ? 'market-cap' : 'new'],
    queryFn: () =>
      fetchClankerFanClubs({
        sortBy: sort === 'top' ? 'market-cap' : undefined,
        limit: 20,
      }),
    enabled: ready && !enabled,
    staleTime: 30_000,
    retry: 1,
  });

  return useMemo(() => {
    if (enabled) {
      const clubs = indexed.data?.clubs ?? [];
      const markets = Object.fromEntries(
        clubs.map((c) => [c.address.toLowerCase(), toMarket(c)]),
      );
      return {
        tokens: mergeFanClubs(clubs.map(toToken), local),
        markets: markets as Record<string, TokenMarket>,
        isLoading: indexed.isLoading,
        apiError: indexed.error as Error | null,
        ranked: true,
      };
    }
    return {
      tokens: mergeFanClubs(remote.data?.tokens ?? [], local),
      markets: undefined,
      isLoading: !ready || remote.isLoading,
      apiError: remote.error as Error | null,
      ranked: false,
    };
  }, [
    enabled,
    ready,
    indexed.data,
    indexed.isLoading,
    indexed.error,
    remote.data,
    remote.isLoading,
    remote.error,
    local,
  ]);
}

/**
 * Fan clubs for one subject — including its aliases (the same real person in
 * other catalogs). The earliest launch across all of them is the official club.
 */
export function useSubjectFanClubs(
  kind: SubjectKind,
  subjectId: number,
  name?: string,
  aliases: { kind: SubjectKind; id: number }[] = [],
) {
  const { enabled, ready } = useIndexer();
  const local = useLocalFanClubs();
  const subjects = useMemo(
    () => [{ kind, id: subjectId }, ...aliases],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, subjectId, aliases.map((a) => `${a.kind}:${a.id}`).join(',')],
  );
  const subjectKey = subjects.map((x) => `${x.kind}:${x.id}`).join(',');
  const indexed = useIndexedClubs(
    { sort: 'new', subjects, limit: 20 },
    enabled,
  );
  const remote = useQuery({
    queryKey: ['fanclubs', subjectKey],
    queryFn: () => fetchClankerFanClubs({ q: name, limit: 20 }),
    enabled: ready && !enabled && !!name,
    staleTime: 30_000,
    retry: 1,
  });
  const source = enabled
    ? (indexed.data?.clubs ?? []).map(toToken)
    : (remote.data?.tokens ?? []);
  const clubs = useMemo(
    () =>
      mergeFanClubs(source, local)
        .filter((t) =>
          subjects.some((x) => x.kind === t.kind && x.id === t.subjectId),
        )
        .sort(byCreated),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indexed.data, remote.data, local, subjectKey, enabled],
  );
  const loading = !ready || (enabled ? indexed.isLoading : remote.isLoading);
  return {
    clubs,
    primary: clubs[0] ?? null,
    isLoading: loading && !clubs.length,
  };
}

/** Market data by token address: indexer first, DexScreener for anything it doesn't know yet. */
export function useMarkets(addresses: string[]) {
  const { enabled, ready } = useIndexer();
  const all = useIndexedClubs({ sort: 'new', limit: 200 }, enabled);
  const indexedMap = useMemo(() => {
    const m: Record<string, TokenMarket> = {};
    for (const c of all.data?.clubs ?? [])
      m[c.address.toLowerCase()] = toMarket(c);
    return m;
  }, [all.data]);

  const missing = (
    enabled ? addresses.filter((a) => !indexedMap[a.toLowerCase()]) : addresses
  )
    .map((a) => a.toLowerCase())
    .sort();
  const dex = useQuery({
    queryKey: ['markets', missing.join(',')],
    queryFn: () => fetchMarkets(missing),
    enabled: ready && missing.length > 0 && (!enabled || all.isFetched),
    staleTime: 20_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const data = useMemo(
    () => ({ ...(dex.data ?? {}), ...indexedMap }),
    [dex.data, indexedMap],
  );
  return {
    data,
    isLoading: !ready || (enabled ? all.isLoading : dex.isLoading),
  };
}

const readProvider = new JsonRpcProvider(CHAIN.rpc, CHAIN.id, {
  staticNetwork: true,
});
const ERC20 = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

/** Connected wallet's balance of a fan token (read via public RPC). */
export function useTokenBalance(token?: string) {
  const { address } = useWallet();
  return useQuery({
    queryKey: ['tokenBalance', token, address],
    queryFn: async () => {
      const c = new Contract(token!, ERC20, readProvider);
      const [bal, supply] = await Promise.all([
        c.balanceOf(address),
        c.totalSupply(),
      ]);
      return {
        balance: Number(formatUnits(bal, 18)),
        share: supply > 0n ? Number((bal * 1_000_000n) / supply) / 10_000 : 0,
      };
    },
    enabled: !!token && !!address,
    staleTime: 15_000,
  });
}

/**
 * Client-side ranking, used when the indexer isn't available (the indexer
 * returns lists already ranked). "Trending" falls back to 24h volume.
 */
export function rankClubs(
  tokens: FanClubToken[],
  market: (address: string) => TokenMarket | undefined,
  sort: ClubSort,
) {
  const mc = (t: FanClubToken) =>
    market(t.address)?.marketCap ?? t.marketCap ?? 0;
  const list = [...tokens];
  switch (sort) {
    case 'new':
      return list.sort(
        (a, b) =>
          Date.parse(b.createdAt ?? '0') - Date.parse(a.createdAt ?? '0'),
      );
    case 'gainers':
      return list.sort(
        (a, b) =>
          (market(b.address)?.change24h ?? -1e9) -
          (market(a.address)?.change24h ?? -1e9),
      );
    case 'trending':
    case 'volume':
      return list.sort(
        (a, b) =>
          (market(b.address)?.volume24h ?? 0) -
            (market(a.address)?.volume24h ?? 0) || mc(b) - mc(a),
      );
    default:
      return list.sort((a, b) => mc(b) - mc(a));
  }
}
