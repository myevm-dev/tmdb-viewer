import { readHandler } from './_lib/http.js';
import { getClub, recentTrades } from './_lib/stats.js';

/** GET /api/club?address=0x… — stats plus the latest trades. */
export const GET = readHandler(async (url) => {
  const address = url.searchParams.get('address') ?? '';
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Invalid address');
  const [club, trades] = await Promise.all([
    getClub(address),
    recentTrades({ address, limit: 25 }),
  ]);
  return { club, trades };
}, 5);
