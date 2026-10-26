import { readHandler } from './_lib/http.js';
import { ethUsdNow, listClubs, type Sort } from './_lib/stats.js';

const SORTS: Sort[] = ['trending', 'new', 'top', 'gainers', 'volume'];

/**
 * GET /api/clubs?sort=trending|new|top|gainers|volume&kind=movie|person&subject=person:123&limit=60
 */
export const GET = readHandler(async (url) => {
  const sortParam = url.searchParams.get('sort') as Sort | null;
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : 'trending';
  const kindParam = url.searchParams.get('kind');
  const kind =
    kindParam === 'movie' || kindParam === 'person' ? kindParam : undefined;
  const subjectParam = /^(movie|person):(\d+)$/.exec(
    url.searchParams.get('subject') ?? '',
  );
  const subject = subjectParam
    ? {
        kind: subjectParam[1] as 'movie' | 'person',
        id: Number(subjectParam[2]),
      }
    : undefined;
  const limit = Number(url.searchParams.get('limit') ?? 60) || 60;
  const [clubs, meta] = await Promise.all([
    listClubs({ sort, kind, subject, limit }),
    ethUsdNow(),
  ]);
  return { clubs, ...meta };
});
