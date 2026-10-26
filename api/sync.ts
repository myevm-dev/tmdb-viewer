import { config } from './_lib/config.js';
import { json } from './_lib/http.js';
import { sync } from './_lib/sync.js';

/**
 * GET /api/sync — index new launches and trades now.
 * Reads already trigger this in the background when data is >15s old; call it
 * from a scheduler (Vercel Cron on Pro, or any uptime pinger) to keep data hot
 * even with no visitors. Protected by CRON_SECRET when set.
 */
export async function GET(request: Request) {
  if (!config.databaseUrl)
    return json({ error: 'indexer_disabled' }, { status: 503 });
  if (config.cronSecret) {
    const auth = request.headers.get('authorization');
    const key = new URL(request.url).searchParams.get('key');
    if (auth !== `Bearer ${config.cronSecret}` && key !== config.cronSecret) {
      return json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  try {
    return json(await sync(), { sMaxAge: 0 });
  } catch (e) {
    console.error('[sync]', e);
    return json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
}
