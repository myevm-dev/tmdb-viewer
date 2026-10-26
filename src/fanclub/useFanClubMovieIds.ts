import { useMemo } from 'react';
import { useAllFanClubs } from './hooks';

/** Set of TMDB movie ids that already have a fan club (for badges on tiles). */
export function useFanClubMovieIds() {
  const { tokens } = useAllFanClubs('new');
  return useMemo(() => new Set(tokens.map((t) => t.movieId)), [tokens]);
}
