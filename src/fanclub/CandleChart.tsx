import { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useCandles, type Timeframe } from './indexer';
import { ChartPlaceholder } from './TokenChart';
import { tinyNumber } from '../lib/format';

const TFS: Timeframe[] = ['5m', '15m', '1h', '4h', '1d'];

/** Tiny token prices, e.g. $0.0₆412. */
function formatPrice(p: number) {
  if (!Number.isFinite(p)) return '';
  if (p === 0) return '$0';
  if (Math.abs(p) >= 1) return `$${p.toFixed(2)}`;
  return `$${tinyNumber(p)}`;
}

export default function CandleChart({
  address,
  emptyTitle,
  emptyText,
}: {
  address: string;
  emptyTitle: string;
  emptyText: string;
}) {
  const [tf, setTf] = useState<Timeframe>('15m');
  const q = useCandles(address, tf);
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const price = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volume = useRef<ISeriesApi<'Histogram'> | null>(null);
  const candles = q.data?.candles ?? [];
  const hasData = candles.length > 0;

  useEffect(() => {
    if (!box.current || !hasData) return;
    const c = createChart(box.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9b99a6',
        fontFamily: 'Inter, system-ui, sans-serif',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
    });
    price.current = c.addSeries(CandlestickSeries, {
      upColor: '#3ddc97',
      downColor: '#ff5d6c',
      wickUpColor: '#3ddc97',
      wickDownColor: '#ff5d6c',
      borderVisible: false,
      priceFormat: { type: 'custom', formatter: formatPrice, minMove: 1e-12 },
    });
    volume.current = c.addSeries(HistogramSeries, {
      priceScaleId: 'vol',
      priceFormat: { type: 'volume' },
    });
    c.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
    };
  }, [hasData]);

  useEffect(() => {
    if (!price.current || !volume.current || !hasData) return;
    price.current.setData(
      candles.map((k) => ({
        time: k.time as UTCTimestamp,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      })),
    );
    volume.current.setData(
      candles.map((k) => ({
        time: k.time as UTCTimestamp,
        value: k.volume,
        color:
          k.close >= k.open ? 'rgba(61,220,151,0.35)' : 'rgba(255,93,108,0.35)',
      })),
    );
    chart.current?.timeScale().fitContent();
  }, [candles, hasData]);

  return (
    <div className="candles">
      <div className="candles__bar">
        <div className="segmented segmented--sm">
          {TFS.map((t) => (
            <button
              key={t}
              className={tf === t ? 'is-active' : ''}
              onClick={() => setTf(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="muted small">
          <span className="live-dot" /> Fancast live
        </span>
      </div>
      {hasData ? (
        <div className="candles__plot" ref={box} />
      ) : (
        <div className="candles__plot">
          <ChartPlaceholder
            loading={q.isLoading}
            title={q.isLoading ? 'Loading chart…' : emptyTitle}
            text={
              q.isLoading
                ? undefined
                : `${emptyText} No trades in this ${tf} window yet.`
            }
          />
        </div>
      )}
    </div>
  );
}
