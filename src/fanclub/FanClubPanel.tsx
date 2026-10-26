import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { MovieDetails } from '../lib/tmdb';
import { useMarkets, useMovieFanClubs, useTokenBalance } from './hooks';
import TokenChart from './TokenChart';
import LaunchModal from './LaunchModal';
import { CHAIN, links } from './config';
import { compact, pct, shortAddress, timeAgo, usd } from '../lib/format';
import {
  CopyIcon,
  ExternalIcon,
  RocketIcon,
  UsersIcon,
} from '../components/Icons';
import { useWallet } from '../wallet/WalletProvider';
import type { FanClubToken } from './data';

export default function FanClubPanel({ movie }: { movie: MovieDetails }) {
  const { clubs, primary, isLoading } = useMovieFanClubs(movie.id, movie.title);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const active = clubs.find((c) => c.address === selected) ?? primary;
  const [params, setParams] = useSearchParams();

  // Deep link from the launchpad picker: /movie/:id?launch=1
  useEffect(() => {
    if (params.get('launch') !== '1' || isLoading) return;
    if (!primary) setLaunchOpen(true);
    params.delete('launch');
    setParams(params, { replace: true });
  }, [params, isLoading, primary, setParams]);

  return (
    <section className="fanclub" id="fan-club">
      <header className="section-head">
        <h2>
          <span className="chip chip--gold">FAN CLUB</span> {movie.title}
        </h2>
        {clubs.length > 1 && (
          <div className="segmented segmented--sm">
            {clubs.slice(0, 4).map((c) => (
              <button
                key={c.address}
                className={c.address === active?.address ? 'is-active' : ''}
                onClick={() => setSelected(c.address)}
              >
                ${c.symbol}
              </button>
            ))}
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="fanclub__grid">
          <div className="card skeleton" style={{ height: 360 }} />
          <div className="card skeleton" style={{ height: 360 }} />
        </div>
      ) : active ? (
        <ActiveClub token={active} />
      ) : (
        <EmptyClub movie={movie} onLaunch={() => setLaunchOpen(true)} />
      )}

      <LaunchModal
        movie={movie}
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        onLaunched={(t) => setSelected(t.address)}
      />
    </section>
  );
}

function EmptyClub({
  movie,
  onLaunch,
}: {
  movie: MovieDetails;
  onLaunch: () => void;
}) {
  return (
    <div className="fanclub__grid">
      <div className="card fanclub-empty">
        <div className="fanclub-empty__icon">
          <UsersIcon size={28} />
        </div>
        <h3>No fan club yet</h3>
        <p className="muted">
          Be the first to start the official <strong>{movie.title}</strong> fan
          club. Launch a fan token with its own Uniswap v4 pool on {CHAIN.name}{' '}
          — you earn a share of every trade's fees, forever.
        </p>
        <ul className="ticks">
          <li>One click deploy via Clanker v4</li>
          <li>Liquidity locked at launch — no rugs</li>
          <li>Creator rewards on every swap</li>
        </ul>
        <button className="btn btn--gold btn--lg" onClick={onLaunch}>
          <RocketIcon size={18} /> Launch fan club
        </button>
      </div>
      <div className="card card--flush">
        <TokenChart
          emptyTitle="No market yet"
          emptyText="Launch the fan club and its chart will live here."
        />
      </div>
    </div>
  );
}

function ActiveClub({ token }: { token: FanClubToken }) {
  const markets = useMarkets([token.address]);
  const market = markets.data?.[token.address.toLowerCase()] ?? null;
  const holding = useTokenBalance(token.address);
  const { address } = useWallet();
  const [copied, setCopied] = useState(false);

  const mcap = market?.marketCap ?? token.marketCap ?? null;
  const change = market?.change24h ?? null;

  return (
    <div className="fanclub__grid">
      <div className="card club">
        <div className="club__head">
          <img src={token.image} alt="" className="club__img" />
          <div>
            <h3>{token.name}</h3>
            <div className="club__sub">
              <span className="mono">${token.symbol}</span>
              {token.createdAt && (
                <span className="muted">
                  · launched {timeAgo(token.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="stats">
          <Stat
            label="Price"
            value={usd(market?.priceUsd, { compact: false })}
          />
          <Stat label="Market cap" value={usd(mcap)} />
          <Stat
            label="24h"
            value={pct(change)}
            tone={change === null ? undefined : change >= 0 ? 'up' : 'down'}
          />
          <Stat label="Volume 24h" value={usd(market?.volume24h)} />
          <Stat label="Liquidity" value={usd(market?.liquidityUsd)} />
          <Stat label="Trades 24h" value={compact(market?.txns24h)} />
        </div>

        {address && (
          <div className="holding">
            <span className="muted">Your stake</span>
            <strong>
              {holding.data
                ? `${compact(holding.data.balance)} $${token.symbol}`
                : '—'}
            </strong>
            {holding.data && holding.data.balance > 0 && (
              <span className="chip">{holding.data.share}% of supply</span>
            )}
          </div>
        )}

        <button
          className="addr-copy"
          onClick={() => {
            navigator.clipboard?.writeText(token.address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
        >
          <span className="mono">
            {copied ? 'Copied!' : shortAddress(token.address)}
          </span>
          <CopyIcon size={14} />
        </button>

        <div className="btn-row">
          <a
            className="btn btn--gold"
            href={links.uniswap(token.address)}
            target="_blank"
            rel="noreferrer"
          >
            Join · Buy ${token.symbol}
          </a>
          <a
            className="btn btn--ghost"
            href={links.clanker(token.address)}
            target="_blank"
            rel="noreferrer"
          >
            Clanker <ExternalIcon size={14} />
          </a>
          <a
            className="btn btn--ghost"
            href={links.token(token.address)}
            target="_blank"
            rel="noreferrer"
          >
            Explorer <ExternalIcon size={14} />
          </a>
        </div>
      </div>
      <div className="card card--flush">
        <TokenChart market={market} loading={markets.isLoading} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'up' | 'down';
}) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className={`stat__value ${tone ? `is-${tone}` : ''}`}>{value}</span>
    </div>
  );
}
