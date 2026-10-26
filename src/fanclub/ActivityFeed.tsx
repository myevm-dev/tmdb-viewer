import { Link } from 'react-router-dom';
import { useActivity, useIndexer } from './indexer';
import { subjectPath } from './data';
import { links } from './config';
import { shortAddress, timeAgo, usd } from '../lib/format';

/** Live buys/sells across every fan club (indexer only). */
export default function ActivityFeed() {
  const { enabled } = useIndexer();
  const q = useActivity(16, enabled);
  if (!enabled) return null;
  const trades = q.data?.trades ?? [];

  return (
    <section className="activity">
      <div className="page__head">
        <h2>
          <span className="live-dot" /> Live activity
        </h2>
      </div>
      {trades.length === 0 ? (
        <div className="activity__empty muted">
          {q.isLoading
            ? 'Loading trades…'
            : 'No trades yet — the first buy will show up here.'}
        </div>
      ) : (
        <div className="activity__track">
          {trades.map((t) => (
            <div
              key={`${t.txHash}-${t.club}-${t.ts}`}
              className={`trade-pill is-${t.side}`}
            >
              <img src={t.image} alt="" />
              <div>
                <div>
                  <a
                    href={links.address(t.trader)}
                    target="_blank"
                    rel="noreferrer"
                    className="mono"
                  >
                    {shortAddress(t.trader)}
                  </a>{' '}
                  <span className={t.side === 'buy' ? 'is-up' : 'is-down'}>
                    {t.side === 'buy' ? 'bought' : 'sold'}
                  </span>{' '}
                  <strong>{usd(t.usd)}</strong>
                </div>
                <div className="muted small">
                  <Link to={`${subjectPath(t.kind, t.subjectId)}#fan-club`}>
                    ${t.symbol}
                  </Link>{' '}
                  ·{' '}
                  <a href={links.tx(t.txHash)} target="_blank" rel="noreferrer">
                    {timeAgo(t.ts)}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
