import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import MovieGrid from '../components/MovieGrid';
import PeopleGrid from '../components/PeopleGrid';
import { searchMovies, searchPeople } from '../lib/tmdb';

type Tab = 'movies' | 'people';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const tab: Tab = params.get('tab') === 'people' ? 'people' : 'movies';

  const movies = useInfiniteQuery({
    queryKey: ['search', query],
    queryFn: ({ pageParam }) => searchMovies(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.total_pages ? last.page + 1 : undefined,
    enabled: !!query,
  });

  const people = useInfiniteQuery({
    queryKey: ['search-people', query],
    queryFn: ({ pageParam }) => searchPeople(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.total_pages ? last.page + 1 : undefined,
    enabled: !!query,
  });

  const counts = {
    movies: movies.data?.pages[0]?.total_results,
    people: people.data?.pages[0]?.total_results,
  };

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    if (t === 'people') next.set('tab', 'people');
    else next.delete('tab');
    setParams(next, { replace: true });
  };

  return (
    <div className="page">
      <div className="page__head">
        <h1>{query ? <>Results for “{query}”</> : 'Search'}</h1>
        {query && (
          <div className="segmented">
            {(
              [
                ['movies', 'Movies'],
                ['people', 'People'],
              ] as [Tab, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                className={tab === t ? 'is-active' : ''}
                onClick={() => setTab(t)}
              >
                {label}
                {counts[t] !== undefined && (
                  <span className="seg-count">
                    {counts[t]!.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {!query ? (
        <div className="empty">
          Type in the search bar to find a film or a person.
        </div>
      ) : tab === 'movies' ? (
        <MovieGrid
          movies={movies.data?.pages.flatMap((p) => p.results) ?? []}
          loading={movies.isLoading}
          hasMore={movies.hasNextPage}
          loadingMore={movies.isFetchingNextPage}
          onLoadMore={() => movies.fetchNextPage()}
          empty={<>No films matched “{query}”.</>}
        />
      ) : (
        <PeopleGrid
          people={people.data?.pages.flatMap((p) => p.results) ?? []}
          loading={people.isLoading}
          hasMore={people.hasNextPage}
          loadingMore={people.isFetchingNextPage}
          onLoadMore={() => people.fetchNextPage()}
          empty={<>No people matched “{query}”.</>}
        />
      )}
    </div>
  );
}
