import { readHandler } from './_lib/http.js';
import { ethUsdNow, listClubs, type Sort } from './_lib/stats.js';
import type { SubjectKind } from './_lib/sync.js';

const KINDS: SubjectKind[] = ['movie', 'tv', 'person', 'artist'];

const SORTS: Sort[] = ['trending', 'new', 'top', 'gainers', 'volume'];

/**
 * GET /api/clubs?sort=trending|new|top|gainers|volume&kind=movie|tv|person|artist&subject=person:123[,artist:456]&limit=60
 */
export const GET = readHandler(async (url) => {
  const sortParam = url.searchParams.get('sort') as Sort | null;
  const sort = sortParam && SORTS.includes(sortParam) ? sortParam : 'trending';
  const kindParam = url.searchParams.get('kind');
  const kind = KINDS.includes(kindParam as SubjectKind)
    ? (kindParam as SubjectKind)
    : undefined;
  // subject=person:123 or several, comma-separated: person:123,artist:456
  const subjects = (url.searchParams.get('subject') ?? '')
    .split(',')
    .map((x) => /^(movie|tv|person|artist):(\d+)$/.exec(x.trim()))
    .filter((m): m is RegExpExecArray => !!m)
    .slice(0, 10)
    .map((m) => ({ kind: m[1] as SubjectKind, id: Number(m[2]) }));
  const limit = Number(url.searchParams.get('limit') ?? 60) || 60;
  const [clubs, meta] = await Promise.all([
    listClubs({ sort, kind, subjects, limit }),
    ethUsdNow(),
  ]);
  return { clubs, ...meta };
});
