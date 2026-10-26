import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  rankClubs,
  useAllFanClubs,
  useMarkets,
  type ClubSort,
} from '../fanclub/hooks';
import { useIndexer } from '../fanclub/indexer';
import ActivityFeed from '../fanclub/ActivityFeed';
import FanClubCard from '../fanclub/FanClubCard';
import { CHAIN } from '../fanclub/config';
import {
  posterUrl,
  profileUrl,
  releaseYear,
  searchMovies,
  searchPeople,
  searchTv,
} from '../lib/tmdb';
import { artistImage, searchArtists } from '../lib/deezer';
import { compact, usd } from '../lib/format';
import { RocketIcon, SearchIcon } from '../components/Icons';
import { useFanClubSubjects } from '../fanclub/useFanClubSubjects';
import { subjectPath, type SubjectKind } from '../fanclub/data';

const SORTS: [ClubSort, string][] = [
  ['trending', 'Trending'],
  ['new', 'New'],
  ['top', 'Top'],
  ['gainers', 'Gainers'],
  ['volume', 'Volume'],
];

export default function FanClubs() {
  const [sort, setSort] = useState<ClubSort>('trending');
  const { tokens, isLoading, apiError, ranked } = useAllFanClubs(sort);
  const markets = useMarkets(tokens.map((t) => t.address));
  const m = (a: string) => markets.data?.[a.toLowerCase()];
  const { enabled: live } = useIndexer();

  const [kind, setKind] = useState<'all' | SubjectKind>('all');

  const sorted = useMemo(() => {
    const list = tokens.filter((t) => kind === 'all' || t.kind === kind);
    return ranked ? list : rankClubs(list, m, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, sort, kind, ranked, markets.data]);

  const totals = useMemo(() => {
    let mcap = 0;
    let vol = 0;
    for (const t of tokens) {
      mcap += m(t.address)?.marketCap ?? t.marketCap ?? 0;
      vol += m(t.address)?.volume24h ?? 0;
    }
    return { mcap, vol };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, markets.data]);

  return (
    <div className="page launchpad">
      <section className="lp-hero">
        <div className="lp-hero__text">
          <span className="hero__eyebrow">Launchpad · {CHAIN.name}</span>
          <h1>
            Every fandom deserves a <em>fan club.</em>
          </h1>
          <p className="muted">
            Launch a fan token for any movie, TV show, actor, director or music
            artist in one transaction. Each club gets its own Uniswap v4 pool
            via Clanker, locked liquidity, and creator rewards on every trade.
          </p>
          <SubjectPicker />
        </div>
        <div className="lp-stats">
          <div>
            <span className="muted small">Fan clubs</span>
            <strong>{tokens.length || (isLoading ? '…' : 0)}</strong>
          </div>
          <div>
            <span className="muted small">Combined market cap</span>
            <strong>{totals.mcap ? usd(totals.mcap) : '—'}</strong>
          </div>
          <div>
            <span className="muted small">24h volume</span>
            <strong>{totals.vol ? usd(totals.vol) : '—'}</strong>
          </div>
        </div>
      </section>

      <section className="how">
        {[
          [
            '01',
            'Pick what you love',
            'Any film, show, person or music artist.',
          ],
          [
            '02',
            'Launch the club',
            'Name it, choose a launch curve, confirm in your wallet.',
          ],
          [
            '03',
            'Grow the fandom',
            'Fans buy in on Uniswap. You earn fees on every swap.',
          ],
        ].map(([n, t, d]) => (
          <div key={n} className="how__step">
            <span className="how__n">{n}</span>
            <strong>{t}</strong>
            <span className="muted">{d}</span>
          </div>
        ))}
      </section>

      <ActivityFeed />

      <div className="page__head">
        <h2>{live && <span className="live-dot" />} All fan clubs</h2>
        <div className="lp-filters">
          <div className="segmented">
            {(
              [
                ['all', 'All'],
                ['movie', 'Films'],
                ['tv', 'TV'],
                ['person', 'People'],
                ['artist', 'Music'],
              ] as ['all' | SubjectKind, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                className={kind === k ? 'is-active' : ''}
                onClick={() => setKind(k)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="segmented">
            {SORTS.map(([k, label]) => (
              <button
                key={k}
                className={sort === k ? 'is-active' : ''}
                onClick={() => setSort(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {apiError && (
        <p className="notice">
          {live
            ? 'Live market data is temporarily unavailable. Showing what we have.'
            : 'The Clanker index is unreachable right now, so only fan clubs launched from this device are shown.'}
        </p>
      )}

      {isLoading && !tokens.length ? (
        <div className="fc-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton skeleton--card" />
          ))}
        </div>
      ) : sorted.length ? (
        <div className="fc-grid">
          {sorted.map((t, i) => (
            <FanClubCard
              key={t.address}
              token={t}
              market={m(t.address)}
              rank={sort === 'top' || sort === 'trending' ? i + 1 : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="empty empty--cta">
          <RocketIcon size={32} />
          <strong>No fan clubs yet</strong>
          <span className="muted">
            Search above and launch the very first one.
          </span>
        </div>
      )}
    </div>
  );
}

type PickerItem = {
  kind: SubjectKind;
  id: number;
  name: string;
  meta: string;
  img: string | null;
};

function SubjectPicker() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const clubs = useFanClubSubjects();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) =>
      !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const enabled = debounced.length > 1;
  const movies = useQuery({
    queryKey: ['search', debounced, 'picker'],
    queryFn: () => searchMovies(debounced),
    enabled,
  });
  const people = useQuery({
    queryKey: ['search-people', debounced, 'picker'],
    queryFn: () => searchPeople(debounced),
    enabled,
  });
  const shows = useQuery({
    queryKey: ['search-tv', debounced, 'picker'],
    queryFn: () => searchTv(debounced),
    enabled,
  });
  const artists = useQuery({
    queryKey: ['search-artists', debounced, 'picker'],
    queryFn: () => searchArtists(debounced, 0, 4),
    enabled,
    retry: 0,
  });

  // Interleave by popularity so the best match leads, whichever kind it is.
  const items: PickerItem[] = useMemo(() => {
    const m = (movies.data?.results ?? []).slice(0, 5).map((x, i) => ({
      kind: 'movie' as const,
      id: x.id,
      name: x.title,
      meta: `Film${releaseYear(x) ? ` · ${releaseYear(x)}` : ''}`,
      img: posterUrl(x, 'w185'),
      rank: i,
    }));
    const p = (people.data?.results ?? []).slice(0, 4).map((x, i) => ({
      kind: 'person' as const,
      id: x.id,
      name: x.name,
      meta: x.known_for_department ?? 'Person',
      img: profileUrl(x.profile_path),
      rank: i + ((x.popularity ?? 0) > 20 ? -0.5 : 0.5),
    }));
    const t = (shows.data?.results ?? []).slice(0, 3).map((x, i) => ({
      kind: 'tv' as const,
      id: x.id,
      name: x.title,
      meta: `TV${releaseYear(x) ? ` · ${releaseYear(x)}` : ''}`,
      img: posterUrl(x, 'w185'),
      rank: i + 0.25,
    }));
    const a = (artists.data?.data ?? []).slice(0, 3).map((x, i) => ({
      kind: 'artist' as const,
      id: x.id,
      name: x.name,
      meta: `Music${x.nb_fan ? ` · ${compact(x.nb_fan)} fans` : ''}`,
      img: artistImage(x, 'medium'),
      rank: i + ((x.nb_fan ?? 0) > 1_000_000 ? -0.6 : 0.6),
    }));
    return [...m, ...t, ...p, ...a]
      .sort((x, y) => x.rank - y.rank)
      .slice(0, 10);
  }, [movies.data, people.data, shows.data, artists.data]);

  const loading = movies.isLoading || people.isLoading || shows.isLoading;

  return (
    <div className="picker" ref={wrap}>
      <div className="picker__input">
        <SearchIcon size={18} />
        <input
          value={q}
          placeholder="Search a movie, show, actor or artist…"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && enabled && (
        <ul className="picker__list">
          {loading && !items.length && (
            <li className="muted picker__status">Searching…</li>
          )}
          {!loading && items.length === 0 && (
            <li className="muted picker__status">No matches</li>
          )}
          {items.map((it) => {
            const has = clubs.has(it.kind, it.id);
            return (
              <li key={`${it.kind}-${it.id}`}>
                <button
                  onClick={() =>
                    navigate(
                      `${subjectPath(it.kind, it.id)}${has ? '' : '?launch=1'}#fan-club`,
                    )
                  }
                >
                  {it.img ? (
                    <img
                      src={it.img}
                      alt=""
                      className={
                        it.kind === 'person' || it.kind === 'artist'
                          ? 'is-round'
                          : ''
                      }
                    />
                  ) : (
                    <span className="picker__ph" />
                  )}
                  <span className="picker__title">
                    {it.name}
                    <span className="muted small">{it.meta}</span>
                  </span>
                  <span className={`chip ${has ? '' : 'chip--gold'}`}>
                    {has ? 'View club' : 'Launch'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
