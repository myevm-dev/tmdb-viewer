import { useEffect, useRef, type ReactNode } from 'react';
import type { Person } from '../lib/tmdb';
import PersonCard from './PersonCard';

interface Props {
  people: Person[];
  loading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  empty?: ReactNode;
}

/** "Known for" line, e.g. "Acting · Dune, Oppenheimer". */
export function knownFor(p: Person) {
  const titles = (p.known_for ?? [])
    .map((k) => k.title ?? k.name)
    .filter(Boolean)
    .slice(0, 2);
  return [p.known_for_department, titles.join(', ')]
    .filter(Boolean)
    .join(' · ');
}

export default function PeopleGrid({
  people,
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
      <div className="people-grid">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="skeleton skeleton--person" />
        ))}
      </div>
    );
  }

  if (!people.length)
    return <div className="empty">{empty ?? 'No people found'}</div>;

  const seen = new Set<number>();
  const unique = people.filter((p) => !seen.has(p.id) && seen.add(p.id));

  return (
    <>
      <div className="people-grid">
        {unique.map((p) => (
          <PersonCard key={p.id} person={p} subtitle={knownFor(p)} />
        ))}
      </div>
      <div ref={sentinel} />
    </>
  );
}
