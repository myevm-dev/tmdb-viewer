import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import PeopleGrid from '../components/PeopleGrid';
import {
  PEOPLE_CATEGORIES,
  getPeople,
  isPeopleCategory,
  type PeopleCategory,
} from '../lib/tmdb';

export default function People() {
  const { category = 'popular' } = useParams();
  if (!isPeopleCategory(category))
    return <Navigate to="/people/popular" replace />;
  return <PeopleCategoryPage category={category} />;
}

function PeopleCategoryPage({ category }: { category: PeopleCategory }) {
  const q = useInfiniteQuery({
    queryKey: ['people-infinite', category],
    queryFn: ({ pageParam }) => getPeople(category, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < Math.min(last.total_pages, 500) ? last.page + 1 : undefined,
  });

  return (
    <div className="page">
      <div className="page__head">
        <h1>{PEOPLE_CATEGORIES[category].title}</h1>
        <nav className="pills">
          {(Object.keys(PEOPLE_CATEGORIES) as PeopleCategory[]).map((c) => (
            <NavLink key={c} to={`/people/${c}`} className="pill">
              {PEOPLE_CATEGORIES[c].title}
            </NavLink>
          ))}
        </nav>
      </div>
      <PeopleGrid
        people={q.data?.pages.flatMap((p) => p.results) ?? []}
        loading={q.isLoading}
        hasMore={q.hasNextPage}
        loadingMore={q.isFetchingNextPage}
        onLoadMore={() => q.fetchNextPage()}
      />
    </div>
  );
}
