/**
 * GET /api/identity?tmdb=6193,1190668&deezer=27
 *
 * Fancast's identity hub: one real person = one Wikidata item (Q-id). Each
 * catalog plugs in through the Wikidata property that stores its id, so a
 * new source (e.g. sports) is one line in SOURCES — no pairwise matching.
 *
 * Batched into a single SPARQL query, cached at the CDN for a day, and sent
 * with an identifying User-Agent as Wikimedia's API policy asks.
 */

const SOURCES = {
  tmdb: 'P4985', // TMDB person ID
  deezer: 'P2722', // Deezer artist ID
  // sports: '…'   // add the athlete catalog's Wikidata property here
} as const;

type Source = keyof typeof SOURCES;
const SOURCE_NAMES = Object.keys(SOURCES) as Source[];

const ENDPOINT =
  process.env.WIKIDATA_SPARQL_URL || 'https://query.wikidata.org/sparql';
const USER_AGENT =
  'Fancast/1.0 (https://github.com/myevm-dev/tmdb-viewer; identity linking)';

export interface IdentityLink {
  qid: string;
  ids: Partial<Record<Source, number[]>>;
}

export function buildQuery(input: Partial<Record<Source, number[]>>) {
  const unions = SOURCE_NAMES.filter((s) => input[s]?.length).map(
    (s) =>
      `{ VALUES ?in { ${input[s]!.map((id) => `"${id}"`).join(' ')} } ?item wdt:${SOURCES[s]} ?in . }`,
  );
  const props = SOURCE_NAMES.map((s) => `("${s}" wdt:${SOURCES[s]})`).join(' ');
  return `SELECT DISTINCT ?item ?src ?val WHERE {
  ${unions.join(' UNION ')}
  VALUES (?src ?prop) { ${props} }
  ?item ?prop ?val .
}`;
}

export function parseBindings(json: any): IdentityLink[] {
  const byItem = new Map<string, IdentityLink>();
  for (const b of json?.results?.bindings ?? []) {
    const qid = String(b.item?.value ?? '')
      .split('/')
      .pop();
    const src = b.src?.value as Source;
    const val = Number(b.val?.value);
    if (!qid || !SOURCE_NAMES.includes(src) || !Number.isFinite(val)) continue;
    const link = byItem.get(qid) ?? { qid, ids: {} };
    const list = (link.ids[src] ??= []);
    if (!list.includes(val)) list.push(val);
    byItem.set(qid, link);
  }
  return [...byItem.values()];
}

const parseIds = (v: string | null) =>
  [
    ...new Set(
      (v ?? '')
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ].slice(0, 100);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const input: Partial<Record<Source, number[]>> = {};
  for (const s of SOURCE_NAMES) {
    const ids = parseIds(url.searchParams.get(s));
    if (ids.length) input[s] = ids;
  }
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
  };
  if (!Object.keys(input).length) {
    return new Response(JSON.stringify({ links: [] }), { headers });
  }
  try {
    const res = await fetch(
      `${ENDPOINT}?format=json&query=${encodeURIComponent(buildQuery(input))}`,
      {
        headers: {
          accept: 'application/sparql-results+json',
          'user-agent': USER_AGENT,
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) throw new Error(`Wikidata ${res.status}`);
    const links = parseBindings(await res.json());
    return new Response(JSON.stringify({ links }), {
      headers: {
        ...headers,
        'cache-control':
          'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message ?? e) }),
      {
        status: 502,
        headers: { ...headers, 'cache-control': 'no-store' },
      },
    );
  }
}
