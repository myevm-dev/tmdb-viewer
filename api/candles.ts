import { readHandler } from './_lib/http.js';
import { TIMEFRAMES, candles, type Timeframe } from './_lib/stats.js';

/** GET /api/candles?address=0x…&tf=5m|15m|1h|4h|1d — OHLCV in USD. */
export const GET = readHandler(async (url) => {
  const address = url.searchParams.get('address') ?? '';
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Invalid address');
  const tfParam = url.searchParams.get('tf') as Timeframe | null;
  const tf: Timeframe = tfParam && tfParam in TIMEFRAMES ? tfParam : '15m';
  return { tf, candles: await candles(address, tf) };
}, 15);
