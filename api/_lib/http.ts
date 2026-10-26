import { waitUntil } from '@vercel/functions';
import { config } from './config.js';
import { syncIfStale } from './sync.js';

/** JSON response, cached briefly at the CDN so traffic spikes cost one DB query. */
export function json(
  data: unknown,
  init: { status?: number; sMaxAge?: number } = {},
) {
  const sMaxAge = init.sMaxAge ?? 10;
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control':
        init.status && init.status >= 400
          ? 'no-store'
          : `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 5}`,
      'access-control-allow-origin': '*',
    },
  });
}

/** Wrap a read endpoint: serve from the DB, and refresh the index in the background if stale. */
export function readHandler(
  fn: (url: URL) => Promise<unknown>,
  sMaxAge?: number,
) {
  return async (request: Request) => {
    if (!config.databaseUrl) {
      return json({ error: 'indexer_disabled' }, { status: 503 });
    }
    try {
      const data = await fn(new URL(request.url));
      waitUntil(syncIfStale());
      return json(data, { sMaxAge });
    } catch (e) {
      console.error('[api]', e);
      return json(
        { error: String((e as Error)?.message ?? e) },
        { status: 500 },
      );
    }
  };
}
