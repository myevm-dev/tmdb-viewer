import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FanSubject } from './subject';
import { useMarkets, useSubjectFanClubs, useTokenBalance } from './hooks';
import TokenChart from './TokenChart';
import { useClubTrades, useIndexer } from './indexer';
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

export default function FanClubPanel({
  subject,
  pending = false,
}: {
  subject: FanSubject;
  /** True while we're still working out who this is across catalogs. */
  pending?: boolean;
}) {
  const {
    clubs,
    primary,
    isLoading: clubsLoading,
  } = useSubjectFanClubs(
    subject.kind,
    subject.id,
    subject.name,
    subject.aliases,
  );
  const isLoading = clubsLoading || pending;
  const [launchOpen, setLaunchOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const active = clubs.find((c) => c.address === selected) ?? primary;
  const [params, setParams] = useSearchParams();

  // Deep link from the launchpad picker: /movie/:id?launch=1 or /person/:id?launch=1
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
          <span className="chip chip--gold">FAN CLUB</span> {subject.name}
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
        <EmptyClub subject={subject} onLaunch={() => setLaunchOpen(true)} />
      )}

      <LaunchModal
        subject={subject}
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        onLaunched={(t) => setSelected(t.address)}
      />
    </section>
  );
}

function EmptyClub({
  subject,
  onLaunch,
}: {
  subject: FanSubject;
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
          Be the first to start the official <strong>{subject.name}</strong> fan
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
          {market?.source === 'indexer' ? (
            <Stat label="Traders 24h" value={compact(market.traders24h)} />
          ) : (
            <Stat label="Liquidity" value={usd(market?.liquidityUsd)} />
          )}
          <Stat
            label="Trades 24h"
            value={
              market?.source === 'indexer' && market.txns24h
                ? `${compact(market.buys24h)}↑ ${compact(market.sells24h)}↓`
                : compact(market?.txns24h)
            }
          />
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
        <TokenChart
          address={token.address}
          market={market}
          loading={markets.isLoading}
        />
      </div>
      <RecentTrades address={token.address} symbol={token.symbol} />
    </div>
  );
}

/** Latest buys/sells for this club (indexer only). */
function RecentTrades({
  address,
  symbol,
}: {
  address: string;
  symbol: string;
}) {
  const { enabled } = useIndexer();
  const q = useClubTrades(address, enabled);
  if (!enabled) return null;
  const trades = q.data?.trades ?? [];
  return (
    <div className="card trades">
      <div className="trades__head">
        <h3>
          <span className="live-dot" /> Recent trades
        </h3>
        <span className="muted small">Updates every 10s</span>
      </div>
      {trades.length === 0 ? (
        <p className="muted small trades__empty">
          {q.isLoading
            ? 'Loading…'
            : `No trades yet. The first buy of $${symbol} will appear here.`}
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th className="num">USD</th>
              <th className="num">ETH</th>
              <th className="num">${symbol}</th>
              <th className="num">Price</th>
              <th>Trader</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={`${t.txHash}-${t.ts}-${t.amount}`}>
                <td>
                  <a href={links.tx(t.txHash)} target="_blank" rel="noreferrer">
                    {timeAgo(t.ts)}
                  </a>
                </td>
                <td className={t.side === 'buy' ? 'is-up' : 'is-down'}>
                  {t.side === 'buy' ? 'Buy' : 'Sell'}
                </td>
                <td className="num">{usd(t.usd)}</td>
                <td className="num">{t.eth.toFixed(4)}</td>
                <td className="num">{compact(t.amount)}</td>
                <td className="num">{usd(t.priceUsd, { compact: false })}</td>
                <td>
                  <a
                    className="mono"
                    href={links.address(t.trader)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortAddress(t.trader)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
