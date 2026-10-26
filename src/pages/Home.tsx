import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Hero from '../components/Hero';
import Row from '../components/Row';
import { MovieTile, RankTile } from '../components/MovieTile';
import { CATEGORIES, getCategory, type Category } from '../lib/tmdb';
import { rankClubs, useAllFanClubs, useMarkets } from '../fanclub/hooks';
import FanClubCard from '../fanclub/FanClubCard';
import { RocketIcon } from '../components/Icons';
import MyListRow, { FollowingRow } from './MyListRow';
import PersonCard from '../components/PersonCard';
import { knownFor } from '../components/PeopleGrid';
import {
  getPeople,
  getTvCategory,
  TV_CATEGORIES,
  type TvCategory,
} from '../lib/tmdb';
import { ArtistCard } from '../components/PersonCard';
import { getChartArtists } from '../lib/deezer';

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
  const { tokens, isLoading, ranked } = useAllFanClubs('trending');
  const markets = useMarkets(tokens.map((t) => t.address));
  const market = (a: string) => markets.data?.[a.toLowerCase()];
  const sorted = ranked ? tokens : rankClubs(tokens, market, 'trending');

  return (
    <Row
      variant="card"
      title={
        <>
          <span className="chip chip--gold">LIVE</span> Trending Fan Clubs
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
          Pick any film, show, star or artist and deploy its fan token on
          Uniswap v4.
        </span>
      </Link>
    </Row>
  );
}

function TvRow({ category, rank }: { category: TvCategory; rank?: boolean }) {
  const q = useQuery({
    queryKey: ['tv-category', category, 1],
    queryFn: () => getTvCategory(category, 1),
    staleTime: 10 * 60_000,
  });
  if (rank) {
    return (
      <Row
        variant="rank"
        title="Top 10 TV Shows"
        href={`/shows/${category}`}
        loading={q.isLoading}
      >
        {q.data?.results.slice(0, 10).map((m, i) => (
          <RankTile key={m.id} movie={m} rank={i + 1} />
        ))}
      </Row>
    );
  }
  return (
    <Row
      title={TV_CATEGORIES[category].title}
      href={`/shows/${category}`}
      loading={q.isLoading}
    >
      {q.data?.results.map((m) => (
        <MovieTile key={m.id} movie={m} />
      ))}
    </Row>
  );
}

function ArtistsRow() {
  const q = useQuery({
    queryKey: ['dz-chart', 0],
    queryFn: () => getChartArtists(0, 60),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  if (q.isError) return null; // music catalog not reachable on this host
  return (
    <Row title="Top Artists" href="/music" variant="card" loading={q.isLoading}>
      {q.data?.data.slice(0, 24).map((a, i) => (
        <ArtistCard
          key={a.id}
          artist={a}
          subtitle={`#${a.position ?? i + 1} on the chart`}
        />
      ))}
    </Row>
  );
}

function PeopleRow() {
  const q = useQuery({
    queryKey: ['people', 'trending', 1],
    queryFn: () => getPeople('trending', 1),
    staleTime: 10 * 60_000,
  });
  return (
    <Row
      title="Trending People"
      href="/people/trending"
      variant="card"
      loading={q.isLoading}
    >
      {q.data?.results
        .filter((p) => p.profile_path)
        .map((p) => (
          <PersonCard key={p.id} person={p} subtitle={knownFor(p)} />
        ))}
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
        <TvRow category="trending" />
        <MyListRow />
        <FollowingRow />
        <ArtistsRow />
        <PeopleRow />
        <CategoryRow category="now_playing" />
        <TvRow category="top_rated" rank />
        <CategoryRow category="popular" />
        <TvRow category="on_the_air" />
        <CategoryRow category="upcoming" />
      </div>
    </div>
  );
}
