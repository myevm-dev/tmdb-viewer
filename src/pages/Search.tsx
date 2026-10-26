import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import MovieGrid from '../components/MovieGrid';
import PeopleGrid from '../components/PeopleGrid';
import { ArtistCard } from '../components/PersonCard';
import { searchMovies, searchPeople, searchTv } from '../lib/tmdb';
import { searchArtists } from '../lib/deezer';
import { compact } from '../lib/format';
import AllResults from './SearchAll';

type Tab = 'all' | 'movies' | 'tv' | 'people' | 'music';
const TABS: [Tab, string][] = [
  ['all', 'All'],
  ['movies', 'Movies'],
  ['tv', 'TV'],
  ['people', 'People'],
  ['music', 'Music'],
];

const nextTmdbPage = (last: { page: number; total_pages: number }) =>
  last.page < last.total_pages ? last.page + 1 : undefined;

export default function Search() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = TABS.some(([t]) => t === tabParam) ? tabParam! : 'all';
  const enabled = !!query;

  const movies = useInfiniteQuery({
    queryKey: ['search', query],
    queryFn: ({ pageParam }) => searchMovies(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextTmdbPage,
    enabled,
  });
  const tv = useInfiniteQuery({
    queryKey: ['search-tv', query],
    queryFn: ({ pageParam }) => searchTv(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextTmdbPage,
    enabled,
  });
  const people = useInfiniteQuery({
    queryKey: ['search-people', query],
    queryFn: ({ pageParam }) => searchPeople(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextTmdbPage,
    enabled,
  });
  const music = useInfiniteQuery({
    queryKey: ['search-artists', query],
    queryFn: ({ pageParam }) => searchArtists(query, pageParam, 30),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.data.length, 0);
      return last.next && loaded < (last.total ?? 0) ? loaded : undefined;
    },
    enabled,
    retry: 1,
  });

  const counts: Record<Tab, number | undefined> = {
    all: undefined,
    movies: movies.data?.pages[0]?.total_results,
    tv: tv.data?.pages[0]?.total_results,
    people: people.data?.pages[0]?.total_results,
    music: music.data?.pages[0]?.total,
  };

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    if (t === 'all') next.delete('tab');
    else next.set('tab', t);
    setParams(next, { replace: true });
  };

  const artists = music.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="page">
      <div className="page__head">
        <h1>{query ? <>Results for “{query}”</> : 'Search'}</h1>
        {query && (
          <div className="segmented">
            {TABS.map(([t, label]) => (
              <button
                key={t}
                className={tab === t ? 'is-active' : ''}
                onClick={() => setTab(t)}
              >
                {label}
                {counts[t] !== undefined && (
                  <span className="seg-count">{compact(counts[t])}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {!query ? (
        <div className="empty">
          Type in the search bar to find a film, show, person or artist.
        </div>
      ) : tab === 'all' ? (
        <AllResults
          movies={movies.data?.pages[0]?.results ?? []}
          shows={tv.data?.pages[0]?.results ?? []}
          people={people.data?.pages[0]?.results ?? []}
          artists={music.data?.pages[0]?.data ?? []}
          loading={movies.isLoading || people.isLoading}
          onMore={setTab}
          query={query}
        />
      ) : tab === 'movies' ? (
        <MovieGrid
          movies={movies.data?.pages.flatMap((p) => p.results) ?? []}
          loading={movies.isLoading}
          hasMore={movies.hasNextPage}
          loadingMore={movies.isFetchingNextPage}
          onLoadMore={() => movies.fetchNextPage()}
          empty={<>No films matched “{query}”.</>}
        />
      ) : tab === 'tv' ? (
        <MovieGrid
          movies={tv.data?.pages.flatMap((p) => p.results) ?? []}
          loading={tv.isLoading}
          hasMore={tv.hasNextPage}
          loadingMore={tv.isFetchingNextPage}
          onLoadMore={() => tv.fetchNextPage()}
          empty={<>No shows matched “{query}”.</>}
        />
      ) : tab === 'people' ? (
        <PeopleGrid
          people={people.data?.pages.flatMap((p) => p.results) ?? []}
          loading={people.isLoading}
          hasMore={people.hasNextPage}
          loadingMore={people.isFetchingNextPage}
          onLoadMore={() => people.fetchNextPage()}
          empty={<>No people matched “{query}”.</>}
        />
      ) : music.isLoading ? (
        <div className="people-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skeleton skeleton--person" />
          ))}
        </div>
      ) : music.isError ? (
        <div className="empty">The music catalog is unavailable right now.</div>
      ) : artists.length ? (
        <>
          <div className="people-grid">
            {artists.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
          {music.hasNextPage && (
            <div className="load-more">
              <button
                className="btn btn--ghost"
                onClick={() => music.fetchNextPage()}
                disabled={music.isFetchingNextPage}
              >
                {music.isFetchingNextPage ? 'Loading…' : 'Load more artists'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty">No artists matched “{query}”.</div>
      )}
    </div>
  );
}
