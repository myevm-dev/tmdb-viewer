import { useQueries } from '@tanstack/react-query';
import Row from '../components/Row';
import { MovieTile } from '../components/MovieTile';
import PersonCard from '../components/PersonCard';
import { getMovie, getPerson } from '../lib/tmdb';
import { useMyList } from '../lib/myList';
import { useFollowing } from '../lib/following';

export function useMyListMovies(limit?: number) {
  const { list } = useMyList();
  const ids = limit ? list.slice(0, limit) : list;
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['movie', id],
      queryFn: () => getMovie(id),
      staleTime: 10 * 60_000,
    })),
  });
  return {
    movies: results
      .map((r) => r.data)
      .filter((m): m is NonNullable<typeof m> => !!m),
    loading: results.some((r) => r.isLoading),
    count: list.length,
  };
}

export function useFollowedPeople(limit?: number) {
  const { list } = useFollowing();
  const ids = limit ? list.slice(0, limit) : list;
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['person', id],
      queryFn: () => getPerson(id),
      staleTime: 10 * 60_000,
    })),
  });
  return {
    people: results
      .map((r) => r.data)
      .filter((p): p is NonNullable<typeof p> => !!p),
    loading: results.some((r) => r.isLoading),
    count: list.length,
  };
}

export default function MyListRow() {
  const { movies, loading, count } = useMyListMovies(20);
  if (!count) return null;
  return (
    <Row title="My List" href="/my-list" loading={loading && !movies.length}>
      {movies.map((m) => (
        <MovieTile key={m.id} movie={m} />
      ))}
    </Row>
  );
}

/** Followed people + what they've been in lately. */
export function FollowingRow() {
  const { people, loading, count } = useFollowedPeople(20);
  if (!count) return null;
  return (
    <Row
      title="People you follow"
      href="/my-list"
      variant="card"
      loading={loading && !people.length}
    >
      {people.map((p) => (
        <PersonCard key={p.id} person={p} subtitle={p.known_for_department} />
      ))}
    </Row>
  );
}
