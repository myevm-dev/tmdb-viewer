import { useQueries } from '@tanstack/react-query';
import Row from '../components/Row';
import { MovieTile } from '../components/MovieTile';
import { getMovie } from '../lib/tmdb';
import { useMyList } from '../lib/myList';

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
