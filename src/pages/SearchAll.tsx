import { useMemo } from 'react';
import type { Movie, Person } from '../lib/tmdb';
import { profileUrl } from '../lib/tmdb';
import { artistImage, type DzArtist } from '../lib/deezer';
import { identityKey, useIdentities, type Identity } from '../lib/identity';
import MovieGrid from '../components/MovieGrid';
import { ProfileCard } from '../components/PersonCard';
import { knownFor } from '../components/PeopleGrid';
import { compact } from '../lib/format';

type Tab = 'all' | 'movies' | 'tv' | 'people' | 'music';

interface Entry {
  key: string;
  kind: 'person' | 'artist';
  id: number;
  name: string;
  image: string | null;
  subtitle: string;
}

/**
 * Merge TMDB people and Deezer artists into one list where each real person
 * appears once. Links come from Wikidata (exact ids, never name matching);
 * the TMDB person is canonical, so a crossover star opens their full profile.
 */
export function unifyPeople(
  people: Person[],
  artists: DzArtist[],
  ids: Map<string, Identity | null> | undefined,
): Entry[] {
  const get = (source: 'tmdb' | 'deezer', id: number) =>
    ids?.get(identityKey({ source, id })) ?? null;
  const out: Entry[] = [];
  const usedArtists = new Set<number>();

  for (const p of people) {
    const identity = get('tmdb', p.id);
    const artist = identity?.deezer
      ? artists.find((a) => a.id === identity.deezer)
      : undefined;
    if (artist) usedArtists.add(artist.id);
    const roles = [p.known_for_department, identity?.deezer ? 'Music' : null]
      .filter(Boolean)
      .join(' · ');
    out.push({
      key: `person-${p.id}`,
      kind: 'person',
      id: p.id,
      name: p.name,
      image:
        profileUrl(p.profile_path) ??
        (artist ? artistImage(artist, 'medium') : null),
      subtitle: roles || knownFor(p),
    });
  }

  for (const a of artists) {
    if (usedArtists.has(a.id)) continue;
    const identity = get('deezer', a.id);
    // Linked to a person already listed above? Then it's the same human — skip.
    if (identity?.tmdb && people.some((p) => p.id === identity.tmdb)) continue;
    out.push({
      key: `artist-${a.id}`,
      kind: identity?.tmdb ? 'person' : 'artist',
      id: identity?.tmdb ?? a.id,
      name: a.name,
      image: artistImage(a, 'medium'),
      subtitle: [
        identity?.tmdb ? 'Acting' : null,
        'Music',
        a.nb_fan ? `${compact(a.nb_fan)} fans` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  // Interleave so the strongest match of each catalog leads, without duplicates.
  const persons = out.filter((e) => e.key.startsWith('person-'));
  const musicOnly = out.filter((e) => e.key.startsWith('artist-'));
  const merged: Entry[] = [];
  for (let i = 0; merged.length < out.length; i++) {
    if (persons[i]) merged.push(persons[i]);
    if (musicOnly[i]) merged.push(musicOnly[i]);
  }
  return merged;
}

export default function AllResults({
  movies,
  shows,
  people,
  artists,
  loading,
  onMore,
  query,
}: {
  movies: Movie[];
  shows: Movie[];
  people: Person[];
  artists: DzArtist[];
  loading: boolean;
  onMore: (t: Tab) => void;
  query: string;
}) {
  const topPeople = people.slice(0, 10);
  const topArtists = artists.slice(0, 10);
  const refs = useMemo(
    () => [
      ...topPeople.map((p) => ({ source: 'tmdb' as const, id: p.id })),
      ...topArtists.map((a) => ({ source: 'deezer' as const, id: a.id })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topPeople.map((p) => p.id).join(), topArtists.map((a) => a.id).join()],
  );
  const ids = useIdentities(refs);
  const unified = ids.isLoading
    ? []
    : unifyPeople(topPeople, topArtists, ids.data);

  if (loading) {
    return <MovieGrid movies={[]} loading />;
  }
  if (!movies.length && !shows.length && !people.length && !artists.length) {
    return (
      <div className="empty">
        Nothing matched “{query}”. Try another spelling.
      </div>
    );
  }

  return (
    <div className="all-results">
      {(unified.length > 0 || ids.isLoading) && (
        <section>
          <div className="all-results__head">
            <h2 className="sub-head">People & artists</h2>
            <div className="all-results__more">
              <button className="link-btn" onClick={() => onMore('people')}>
                All people
              </button>
              <button className="link-btn" onClick={() => onMore('music')}>
                All artists
              </button>
            </div>
          </div>
          <div className="people-grid">
            {ids.isLoading
              ? Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="skeleton skeleton--person" />
                ))
              : unified
                  .slice(0, 12)
                  .map((e) => (
                    <ProfileCard
                      key={e.key}
                      kind={e.kind}
                      id={e.id}
                      name={e.name}
                      image={e.image}
                      subtitle={e.subtitle}
                    />
                  ))}
          </div>
        </section>
      )}

      {movies.length > 0 && (
        <section>
          <div className="all-results__head">
            <h2 className="sub-head">Movies</h2>
            <button className="link-btn" onClick={() => onMore('movies')}>
              See all
            </button>
          </div>
          <MovieGrid movies={movies.slice(0, 8)} />
        </section>
      )}

      {shows.length > 0 && (
        <section>
          <div className="all-results__head">
            <h2 className="sub-head">TV shows</h2>
            <button className="link-btn" onClick={() => onMore('tv')}>
              See all
            </button>
          </div>
          <MovieGrid movies={shows.slice(0, 8)} />
        </section>
      )}
    </div>
  );
}
