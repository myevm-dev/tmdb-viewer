import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Hero from '../components/Hero';
import Row from '../components/Row';
import { MovieTile, RankTile } from '../components/MovieTile';
import { CATEGORIES, getCategory, type Category } from '../lib/tmdb';
import { useAllFanClubs, useMarkets } from '../fanclub/hooks';
import FanClubCard from '../fanclub/FanClubCard';
import { RocketIcon } from '../components/Icons';
import MyListRow from './MyListRow';

function useCategory(c: Category) {
  return useQuery({
    queryKey: ['category', c, 1],
    queryFn: () => getCategory(c, 1),
    staleTime: 10 * 60_000,
  });
}

function CategoryRow({ category }: { category: Category }) {
  const q = useCategory(category);
  return (
    <Row
      title={CATEGORIES[category].title}
      href={`/browse/${category}`}
      loading={q.isLoading}
    >
      {q.data?.results.map((m) => (
        <MovieTile key={m.id} movie={m} />
      ))}
    </Row>
  );
}

function FanClubsRow() {
  const { tokens, isLoading } = useAllFanClubs('market-cap');
  const markets = useMarkets(tokens.map((t) => t.address));
  const sorted = [...tokens].sort(
    (a, b) =>
      (markets.data?.[b.address.toLowerCase()]?.marketCap ?? b.marketCap ?? 0) -
      (markets.data?.[a.address.toLowerCase()]?.marketCap ?? a.marketCap ?? 0),
  );

  return (
    <Row
      variant="card"
      title={
        <>
          <span className="chip chip--gold">LIVE</span> Fan Clubs
        </>
      }
      href="/fan-clubs"
      loading={isLoading && !tokens.length}
    >
      {sorted.slice(0, 12).map((t, i) => (
        <FanClubCard
          key={t.address}
          token={t}
          market={markets.data?.[t.address.toLowerCase()]}
          rank={i + 1}
        />
      ))}
      <Link to="/fan-clubs" className="fc-cta">
        <RocketIcon size={28} />
        <strong>
          {tokens.length ? 'Launch another' : 'Start the first fan club'}
        </strong>
        <span className="muted">
          Pick any film and deploy its fan token on Uniswap v4.
        </span>
      </Link>
    </Row>
  );
}

export default function Home() {
  const trending = useCategory('trending');
  const top = useCategory('top_rated');

  return (
    <div className="home">
      <Hero movies={trending.data?.results ?? []} />
      <div className="shelves">
        <FanClubsRow />
        <CategoryRow category="trending" />
        <Row
          variant="rank"
          title="Top 10 All-Time"
          href="/browse/top_rated"
          loading={top.isLoading}
        >
          {top.data?.results.slice(0, 10).map((m, i) => (
            <RankTile key={m.id} movie={m} rank={i + 1} />
          ))}
        </Row>
        <MyListRow />
        <CategoryRow category="now_playing" />
        <CategoryRow category="popular" />
        <CategoryRow category="upcoming" />
      </div>
    </div>
  );
}
