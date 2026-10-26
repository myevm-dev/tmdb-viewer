import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAllFanClubs, useMarkets } from '../fanclub/hooks';
import FanClubCard from '../fanclub/FanClubCard';
import { CHAIN } from '../fanclub/config';
import {
  posterUrl,
  profileUrl,
  releaseYear,
  searchMovies,
  searchPeople,
} from '../lib/tmdb';
import { usd } from '../lib/format';
import { RocketIcon, SearchIcon } from '../components/Icons';
import { useFanClubSubjects } from '../fanclub/useFanClubSubjects';
import { subjectPath, type SubjectKind } from '../fanclub/data';

type Sort = 'market-cap' | 'new' | 'gainers';

export default function FanClubs() {
  const [sort, setSort] = useState<Sort>('market-cap');
  const { tokens, isLoading, apiError } = useAllFanClubs(
    sort === 'new' ? 'new' : 'market-cap',
  );
  const markets = useMarkets(tokens.map((t) => t.address));
  const m = (a: string) => markets.data?.[a.toLowerCase()];

  const [kind, setKind] = useState<'all' | SubjectKind>('all');

  const sorted = useMemo(() => {
    const list = tokens.filter((t) => kind === 'all' || t.kind === kind);
    if (sort === 'new')
      list.sort(
        (a, b) =>
          Date.parse(b.createdAt ?? '0') - Date.parse(a.createdAt ?? '0'),
      );
    else if (sort === 'gainers')
      list.sort(
        (a, b) =>
          (m(b.address)?.change24h ?? -1e9) - (m(a.address)?.change24h ?? -1e9),
      );
    else
      list.sort(
        (a, b) =>
          (m(b.address)?.marketCap ?? b.marketCap ?? 0) -
          (m(a.address)?.marketCap ?? a.marketCap ?? 0),
      );
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, sort, kind, markets.data]);

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
            Every film and star deserves a <em>fan club.</em>
          </h1>
          <p className="muted">
            Launch a fan token for any movie, actor or director in one
            transaction. Each club gets its own Uniswap v4 pool via Clanker,
            locked liquidity, and creator rewards on every trade.
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
            'Pick a film or star',
            'Search any movie or person in the TMDB catalog.',
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

      <div className="page__head">
        <h2>All fan clubs</h2>
        <div className="lp-filters">
          <div className="segmented">
            {(
              [
                ['all', 'All'],
                ['movie', 'Films'],
                ['person', 'People'],
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
            {(
              [
                ['market-cap', 'Top'],
                ['new', 'New'],
                ['gainers', 'Gainers'],
              ] as [Sort, string][]
            ).map(([k, label]) => (
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
          The Clanker index is unreachable right now, so only fan clubs launched
          from this device are shown.
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
              rank={sort === 'market-cap' ? i + 1 : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="empty empty--cta">
          <RocketIcon size={32} />
          <strong>No fan clubs yet</strong>
          <span className="muted">
            Search for a film or actor above and launch the very first one.
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
    return [...m, ...p].sort((a, b) => a.rank - b.rank);
  }, [movies.data, people.data]);

  const loading = movies.isLoading || people.isLoading;

  return (
    <div className="picker" ref={wrap}>
      <div className="picker__input">
        <SearchIcon size={18} />
        <input
          value={q}
          placeholder="Search a movie or actor to launch a fan club…"
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
                      className={it.kind === 'person' ? 'is-round' : ''}
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
