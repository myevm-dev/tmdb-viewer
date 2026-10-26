import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import MovieGrid from '../components/MovieGrid';
import {
  CATEGORIES,
  getCategory,
  isCategory,
  type Category,
} from '../lib/tmdb';

export default function Browse() {
  const { category } = useParams();
  if (!isCategory(category)) return <Navigate to="/browse/popular" replace />;
  return <BrowseCategory category={category} />;
}

function BrowseCategory({ category }: { category: Category }) {
  const q = useInfiniteQuery({
    queryKey: ['category-infinite', category],
    queryFn: ({ pageParam }) => getCategory(category, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < Math.min(last.total_pages, 500) ? last.page + 1 : undefined,
  });

  return (
    <div className="page">
      <div className="page__head">
        <h1>{CATEGORIES[category].title}</h1>
        <nav className="pills">
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <NavLink key={c} to={`/browse/${c}`} className="pill">
              {CATEGORIES[c].title}
            </NavLink>
          ))}
        </nav>
      </div>
      <MovieGrid
        movies={q.data?.pages.flatMap((p) => p.results) ?? []}
        loading={q.isLoading}
        hasMore={q.hasNextPage}
        loadingMore={q.isFetchingNextPage}
        onLoadMore={() => q.fetchNextPage()}
      />
    </div>
  );
}
