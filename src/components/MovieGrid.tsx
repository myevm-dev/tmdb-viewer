import { useEffect, useRef, type ReactNode } from 'react';
import type { Movie } from '../lib/tmdb';
import { MovieTile } from './MovieTile';

interface Props {
  movies: Movie[];
  loading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  empty?: ReactNode;
}

/** Responsive tile grid with infinite scroll via IntersectionObserver. */
export default function MovieGrid({
  movies,
  loading,
  hasMore,
  loadingMore,
  onLoadMore,
  empty,
}: Props) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || !onLoadMore) return;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && !loadingMore && onLoadMore(),
      { rootMargin: '800px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  if (loading) {
    return (
      <div className="grid">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="skeleton skeleton--tile" />
        ))}
      </div>
    );
  }

  if (!movies.length)
    return <div className="empty">{empty ?? 'No movies found'}</div>;

  // De-dupe — TMDB pagination occasionally repeats items across pages.
  const seen = new Set<string>();
  const keyOf = (m: Movie) => `${m.media_type ?? 'movie'}-${m.id}`;
  const unique = movies.filter(
    (m) => !seen.has(keyOf(m)) && seen.add(keyOf(m)),
  );

  return (
    <>
      <div className="grid">
        {unique.map((m) => (
          <MovieTile key={keyOf(m)} movie={m} />
        ))}
        {loadingMore &&
          Array.from({ length: 4 }, (_, i) => (
            <div key={`l${i}`} className="skeleton skeleton--tile" />
          ))}
      </div>
      <div ref={sentinel} />
    </>
  );
}
