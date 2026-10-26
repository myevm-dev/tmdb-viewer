import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Contract, JsonRpcProvider, formatUnits } from 'ethers';
import {
  fetchClankerFanClubs,
  fetchMarkets,
  mergeFanClubs,
  useLocalFanClubs,
  type FanClubToken,
} from './data';
import { CHAIN } from './config';
import { useWallet } from '../wallet/WalletProvider';

const byCreated = (a: FanClubToken, b: FanClubToken) =>
  Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? '') || 0;

/** All known fan clubs (Clanker index + launched from this browser). */
export function useAllFanClubs(sortBy: 'market-cap' | 'new' = 'new') {
  const local = useLocalFanClubs();
  const remote = useQuery({
    queryKey: ['fanclubs', sortBy],
    queryFn: () =>
      fetchClankerFanClubs({
        sortBy: sortBy === 'market-cap' ? 'market-cap' : undefined,
        limit: 20,
      }),
    staleTime: 30_000,
    retry: 1,
  });
  const tokens = useMemo(
    () => mergeFanClubs(remote.data?.tokens ?? [], local),
    [remote.data, local],
  );
  return {
    tokens,
    isLoading: remote.isLoading,
    apiError: remote.error as Error | null,
  };
}

/** Fan clubs for a single movie. The earliest launch is the "official" one. */
export function useMovieFanClubs(movieId: number, title?: string) {
  const local = useLocalFanClubs();
  const remote = useQuery({
    queryKey: ['fanclubs', 'movie', movieId],
    queryFn: () => fetchClankerFanClubs({ q: title, limit: 20 }),
    enabled: !!title,
    staleTime: 30_000,
    retry: 1,
  });
  const clubs = useMemo(
    () =>
      mergeFanClubs(remote.data?.tokens ?? [], local)
        .filter((t) => t.movieId === movieId)
        .sort(byCreated),
    [remote.data, local, movieId],
  );
  return {
    clubs,
    primary: clubs[0] ?? null,
    isLoading: remote.isLoading && !clubs.length,
  };
}

export function useMarkets(addresses: string[]) {
  const key = [...addresses]
    .map((a) => a.toLowerCase())
    .sort()
    .join(',');
  return useQuery({
    queryKey: ['markets', key],
    queryFn: () => fetchMarkets(addresses),
    enabled: addresses.length > 0,
    staleTime: 20_000,
    refetchInterval: 30_000,
    retry: 1,
  });
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
