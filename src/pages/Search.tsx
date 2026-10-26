import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import MovieGrid from '../components/MovieGrid';
import { searchMovies } from '../lib/tmdb';

export default function Search() {
  const [params] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';

  const q = useInfiniteQuery({
    queryKey: ['search', query],
    queryFn: ({ pageParam }) => searchMovies(query, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.total_pages ? last.page + 1 : undefined,
    enabled: !!query,
  });

  const total = q.data?.pages[0]?.total_results;

  return (
    <div className="page">
      <div className="page__head">
        <h1>{query ? <>Results for “{query}”</> : 'Search'}</h1>
        {total !== undefined && (
          <span className="muted">{total.toLocaleString()} titles</span>
        )}
      </div>
      {query ? (
        <MovieGrid
          movies={q.data?.pages.flatMap((p) => p.results) ?? []}
          loading={q.isLoading}
          hasMore={q.hasNextPage}
          loadingMore={q.isFetchingNextPage}
          onLoadMore={() => q.fetchNextPage()}
          empty={<>Nothing matched “{query}”. Try a different title.</>}
        />
      ) : (
        <div className="empty">Type in the search bar to find a film.</div>
      )}
    </div>
  );
}
