import { readHandler } from './_lib/http.js';
import { recentTrades } from './_lib/stats.js';

/** GET /api/trades?limit=30 — the live activity feed across every fan club. */
export const GET = readHandler(async (url) => {
  const limit = Number(url.searchParams.get('limit') ?? 30) || 30;
  return { trades: await recentTrades({ limit }) };
}, 5);
