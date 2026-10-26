import { Link } from 'react-router-dom';
import { subjectPath, type FanClubToken, type TokenMarket } from './data';
import { ChartPlaceholder } from './TokenChart';
import { pct, timeAgo, usd } from '../lib/format';

interface Props {
  token: FanClubToken;
  market?: TokenMarket | null;
  rank?: number;
}

export default function FanClubCard({ token, market, rank }: Props) {
  const mcap = market?.marketCap ?? token.marketCap ?? null;
  const change = market?.change24h ?? null;
  const up = (change ?? 0) >= 0;

  return (
    <Link
      to={`${subjectPath(token.kind, token.subjectId)}#fan-club`}
      className="fc-card"
    >
      <div className="fc-card__media">
        {token.image ? (
          <img src={token.image} alt="" loading="lazy" />
        ) : (
          <div className="fc-card__blank" />
        )}
        {rank !== undefined && <span className="fc-card__rank">#{rank}</span>}
        <span className="chip chip--gold fc-card__chip">FAN CLUB</span>
      </div>
      <div className="fc-card__body">
        <div className="fc-card__title">
          <strong title={token.name}>{token.name}</strong>
          <span className="muted small">
            <span className="mono">${token.symbol}</span> ·{' '}
            {token.kind === 'person' ? 'Person' : 'Film'}
          </span>
        </div>
        <div className="fc-card__chart">
          {market ? (
            <ChangeBars h1={market.change1h} h24={market.change24h} />
          ) : (
            <ChartPlaceholder title="No chart yet" />
          )}
        </div>
        <div className="fc-card__stats">
          <div>
            <span className="muted small">Mkt cap</span>
            <strong>{usd(mcap)}</strong>
          </div>
          <div>
            <span className="muted small">24h</span>
            <strong className={change === null ? '' : up ? 'is-up' : 'is-down'}>
              {pct(change)}
            </strong>
          </div>
          <div>
            <span className="muted small">Vol</span>
            <strong>{usd(market?.volume24h)}</strong>
          </div>
        </div>
        {token.createdAt && (
          <span className="muted small">
            Launched {timeAgo(token.createdAt)}
          </span>
        )}
      </div>
    </Link>
  );
}

/** Compact momentum meter (1h vs 24h change) — honest, no fabricated history. */
function ChangeBars({ h1, h24 }: { h1: number | null; h24: number | null }) {
  const bar = (label: string, v: number | null) => {
    const w = v === null ? 0 : Math.min(Math.abs(v), 100) / 2;
    return (
      <div className="cbar">
        <span className="cbar__label">{label}</span>
        <div className="cbar__track">
          <span className="cbar__mid" />
          <span
            className={`cbar__fill ${v !== null && v < 0 ? 'is-down' : 'is-up'}`}
            style={
              v !== null && v < 0
                ? { right: '50%', width: `${w}%` }
                : { left: '50%', width: `${w}%` }
            }
          />
        </div>
        <span
          className={`cbar__val ${v === null ? '' : v >= 0 ? 'is-up' : 'is-down'}`}
        >
          {pct(v)}
        </span>
      </div>
    );
  };
  return (
    <div className="cbars">
      {bar('1h', h1)}
      {bar('24h', h24)}
    </div>
  );
}
