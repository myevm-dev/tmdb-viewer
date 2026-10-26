import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import MovieGrid from '../components/MovieGrid';
import {
  TV_CATEGORIES,
  getTvCategory,
  isTvCategory,
  type TvCategory,
} from '../lib/tmdb';

export default function Shows() {
  const { category } = useParams();
  if (!isTvCategory(category)) return <Navigate to="/shows/trending" replace />;
  return <ShowsCategory category={category} />;
}

function ShowsCategory({ category }: { category: TvCategory }) {
  const q = useInfiniteQuery({
    queryKey: ['tv-infinite', category],
    queryFn: ({ pageParam }) => getTvCategory(category, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < Math.min(last.total_pages, 500) ? last.page + 1 : undefined,
  });

  return (
    <div className="page">
      <div className="page__head">
        <h1>{TV_CATEGORIES[category].title}</h1>
        <nav className="pills">
          {(Object.keys(TV_CATEGORIES) as TvCategory[]).map((c) => (
            <NavLink key={c} to={`/shows/${c}`} className="pill">
              {TV_CATEGORIES[c].title}
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
