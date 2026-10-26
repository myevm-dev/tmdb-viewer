import { useQueries } from '@tanstack/react-query';
import Row from '../components/Row';
import { MovieTile } from '../components/MovieTile';
import PersonCard, { ArtistCard } from '../components/PersonCard';
import {
  getMovie,
  getPerson,
  getTv,
  type Movie,
  type PersonDetails,
} from '../lib/tmdb';
import { getArtist, type DzArtist } from '../lib/deezer';
import { useMyList } from '../lib/myList';
import { useFollowing } from '../lib/following';

/** Saved films and shows, newest first. */
export function useMyListMovies(limit?: number) {
  const { entries, count } = useMyList();
  const list = limit ? entries.slice(0, limit) : entries;
  const results = useQueries({
    queries: list.map(({ kind, id }) => ({
      queryKey: [kind, id],
      queryFn: (): Promise<Movie> => (kind === 'tv' ? getTv(id) : getMovie(id)),
      staleTime: 10 * 60_000,
    })),
  });
  return {
    movies: results.map((r) => r.data).filter((m): m is Movie => !!m),
    loading: results.some((r) => r.isLoading),
    count,
  };
}

export type Followed =
  { kind: 'person'; data: PersonDetails } | { kind: 'artist'; data: DzArtist };

/** Followed people and artists, newest first. */
export function useFollowed(limit?: number) {
  const { entries, count } = useFollowing();
  const list = limit ? entries.slice(0, limit) : entries;
  const results = useQueries({
    queries: list.map(({ kind, id }) => ({
      queryKey: [kind, id],
      queryFn: async (): Promise<Followed> =>
        kind === 'artist'
          ? { kind, data: await getArtist(id) }
          : { kind: 'person', data: await getPerson(id) },
      staleTime: 10 * 60_000,
    })),
  });
  return {
    items: results.map((r) => r.data).filter((x): x is Followed => !!x),
    loading: results.some((r) => r.isLoading),
    count,
  };
}

export function FollowedCard({ item }: { item: Followed }) {
  return item.kind === 'artist' ? (
    <ArtistCard artist={item.data} />
  ) : (
    <PersonCard person={item.data} subtitle={item.data.known_for_department} />
  );
}

export default function MyListRow() {
  const { movies, loading, count } = useMyListMovies(20);
  if (!count) return null;
  return (
    <Row title="My List" href="/my-list" loading={loading && !movies.length}>
      {movies.map((m) => (
        <MovieTile key={`${m.media_type ?? 'movie'}-${m.id}`} movie={m} />
      ))}
    </Row>
  );
}

export function FollowingRow() {
  const { items, loading, count } = useFollowed(20);
  if (!count) return null;
  return (
    <Row
      title="People & artists you follow"
      href="/my-list"
      variant="card"
      loading={loading && !items.length}
    >
      {items.map((it) => (
        <FollowedCard key={`${it.kind}-${it.data.id}`} item={it} />
      ))}
    </Row>
  );
}
