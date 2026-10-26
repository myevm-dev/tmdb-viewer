import { lazy, Suspense, useState } from 'react';
import type { TokenMarket } from './data';
import { links } from './config';
import { ChartIcon } from '../components/Icons';
import { useIndexer } from './indexer';

const CandleChart = lazy(() => import('./CandleChart'));

interface Props {
  /** Token address — enables Fancast's own candles when the indexer is live. */
  address?: string;
  market?: TokenMarket | null;
  loading?: boolean;
  height?: number;
  /** Message for the no-chart state */
  emptyTitle?: string;
  emptyText?: string;
}

/**
 * Price chart: Fancast's own candles from the indexer when available, else the
 * DexScreener embed, else a designed placeholder.
 */
export default function TokenChart({
  address,
  market,
  loading,
  height = 360,
  emptyTitle = 'Chart coming soon',
  emptyText = 'The chart appears once the Uniswap v4 pool sees its first trades and gets indexed.',
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const { enabled: indexed, ready } = useIndexer();

  if (address && indexed) {
    return (
      <div className="chart" style={{ height }}>
        <Suspense
          fallback={<ChartPlaceholder loading title="Loading chart…" />}
        >
          <CandleChart
            address={address}
            emptyTitle={emptyTitle}
            emptyText={emptyText}
          />
        </Suspense>
      </div>
    );
  }

  if (ready && market?.source === 'dexscreener' && market.pairAddress) {
    return (
      <div className="chart" style={{ height }}>
        {!loaded && <ChartPlaceholder loading title="Loading chart…" />}
        <iframe
          title="Price chart"
          src={links.dexscreenerEmbed(market.pairAddress)}
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0 }}
          allow="clipboard-write"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="chart" style={{ height }}>
      <ChartPlaceholder
        loading={loading}
        title={loading ? 'Looking for market data…' : emptyTitle}
        text={loading ? undefined : emptyText}
      />
    </div>
  );
}

export function ChartPlaceholder({
  loading,
  title,
  text,
}: {
  loading?: boolean;
  title?: string;
  text?: string;
}) {
  return (
    <div className={`chart-ph ${loading ? 'is-loading' : ''}`}>
      <svg
        className="chart-ph__svg"
        viewBox="0 0 400 160"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="phFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[32, 64, 96, 128].map((y) => (
          <line
            key={y}
            x1="0"
            x2="400"
            y1={y}
            y2={y}
            className="chart-ph__grid"
          />
        ))}
        {[80, 160, 240, 320].map((x) => (
          <line
            key={x}
            y1="0"
            y2="160"
            x1={x}
            x2={x}
            className="chart-ph__grid"
          />
        ))}
        <path
          d="M0 120 C 30 118, 50 100, 80 104 S 130 80, 160 86 S 210 60, 240 70 S 290 40, 320 52 S 370 30, 400 34 L400 160 L0 160Z"
          fill="url(#phFill)"
        />
        <path
          className="chart-ph__line"
          d="M0 120 C 30 118, 50 100, 80 104 S 130 80, 160 86 S 210 60, 240 70 S 290 40, 320 52 S 370 30, 400 34"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      {(title || text) && (
        <div className="chart-ph__msg">
          <ChartIcon size={22} />
          {title && <strong>{title}</strong>}
          {text && <span>{text}</span>}
        </div>
      )}
    </div>
  );
}
