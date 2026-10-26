import { useQuery } from '@tanstack/react-query';

/**
 * Cross-catalog identity. A real person is one Wikidata item; each catalog
 * (TMDB people, Deezer artists, later sports) attaches through the Wikidata
 * property that stores its id. Exact links only — no name guessing — so two
 * different people who share a name are never merged.
 */

export type IdentitySource = 'tmdb' | 'deezer';

const SOURCES: Record<IdentitySource, string> = {
  tmdb: 'P4985', // TMDB person ID
  deezer: 'P2722', // Deezer artist ID
};

export interface Identity {
  qid: string;
  tmdb?: number;
  deezer?: number;
}

export interface SourceRef {
  source: IdentitySource;
  id: number;
}

const refKey = (r: SourceRef) => `${r.source}:${r.id}`;
const TTL = 7 * 24 * 3600_000;
const STORE_KEY = 'fancast:identity:v1';

type Cached = { i: Identity | null; t: number };
let memory: Record<string, Cached> | null = null;

function cache(): Record<string, Cached> {
  if (memory) return memory;
  try {
    memory = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
  } catch {
    memory = {};
  }
  return memory!;
}

function persist() {
  try {
    const entries = Object.entries(cache())
      .filter(([, v]) => Date.now() - v.t < TTL)
      .slice(-2000);
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify(Object.fromEntries(entries)),
    );
  } catch {
    /* storage full or blocked — memory cache still works */
  }
}

interface Link {
  qid: string;
  ids: Partial<Record<IdentitySource, number[]>>;
}

function sparql(input: Partial<Record<IdentitySource, number[]>>) {
  const names = Object.keys(SOURCES) as IdentitySource[];
  const unions = names
    .filter((s) => input[s]?.length)
    .map(
      (s) =>
        `{ VALUES ?in { ${input[s]!.map((id) => `"${id}"`).join(' ')} } ?item wdt:${SOURCES[s]} ?in . }`,
    );
  const props = names.map((s) => `("${s}" wdt:${SOURCES[s]})`).join(' ');
  return `SELECT DISTINCT ?item ?src ?val WHERE { ${unions.join(' UNION ')} VALUES (?src ?prop) { ${props} } ?item ?prop ?val . }`;
}

function parse(json: any): Link[] {
  const byItem = new Map<string, Link>();
  for (const b of json?.results?.bindings ?? []) {
    const qid = String(b.item?.value ?? '')
      .split('/')
      .pop()!;
    const src = b.src?.value as IdentitySource;
    const val = Number(b.val?.value);
    if (!qid || !(src in SOURCES) || !Number.isFinite(val)) continue;
    const link = byItem.get(qid) ?? { qid, ids: {} };
    (link.ids[src] ??= []).push(val);
    byItem.set(qid, link);
  }
  return [...byItem.values()];
}

/** Our cached API first (CDN-cached, proper User-Agent); Wikidata directly as a fallback. */
async function fetchLinks(
  input: Partial<Record<IdentitySource, number[]>>,
): Promise<Link[]> {
  const qs = new URLSearchParams();
  for (const [s, ids] of Object.entries(input))
    if (ids?.length) qs.set(s, ids.join(','));
  try {
    const res = await fetch(`/api/identity?${qs}`, {
      headers: { accept: 'application/json' },
    });
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) {
      return (await res.json()).links ?? [];
    }
  } catch {
    /* fall through */
  }
  const res = await fetch(
    `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql(input))}`,
    { headers: { accept: 'application/sparql-results+json' } },
  );
  if (!res.ok) throw new Error(`Wikidata ${res.status}`);
  return parse(await res.json());
}

async function resolveNow(refs: SourceRef[]) {
  const out = new Map<string, Identity | null>();
  const c = cache();
  for (let i = 0; i < refs.length; i += 80) {
    const batch = refs.slice(i, i + 80);
    const input: Partial<Record<IdentitySource, number[]>> = {};
    for (const r of batch) (input[r.source] ??= []).push(r.id);
    let links: Link[];
    try {
      links = await fetchLinks(input);
    } catch {
      continue; // leave unresolved (not cached) so we retry later
    }
    const now = Date.now();
    for (const link of links) {
      // When an item lists several ids for one catalog, the first is canonical.
      const identity: Identity = {
        qid: link.qid,
        tmdb: link.ids.tmdb?.[0],
        deezer: link.ids.deezer?.[0],
      };
      // Cache every id the person has, so the reverse lookup is free later.
      for (const [source, list] of Object.entries(link.ids) as [
        IdentitySource,
        number[],
      ][])
        for (const id of list)
          c[refKey({ source, id })] = { i: identity, t: now };
    }
    for (const r of batch) {
      const hit = c[refKey(r)];
      const identity = hit && hit.t === now ? hit.i : null;
      c[refKey(r)] = { i: identity, t: now };
      out.set(refKey(r), identity);
    }
    persist();
  }
  return out;
}

// Coalesce lookups requested in the same moment (e.g. a row of 24 cards) into one request.
let queue: {
  refs: SourceRef[];
  done: (m: Map<string, Identity | null>) => void;
}[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  const jobs = queue;
  queue = [];
  timer = null;
  const unique = new Map<string, SourceRef>();
  for (const j of jobs) for (const r of j.refs) unique.set(refKey(r), r);
  resolveNow([...unique.values()])
    .catch(() => new Map<string, Identity | null>())
    .then((m) => jobs.forEach((j) => j.done(m)));
}

/**
 * Resolve many catalog ids at once. Unlinked ids map to null. Cached for a
 * week in memory + localStorage; concurrent calls are batched.
 */
export async function resolveIdentities(refs: SourceRef[]) {
  const out = new Map<string, Identity | null>();
  const c = cache();
  const missing: SourceRef[] = [];
  for (const r of refs) {
    const hit = c[refKey(r)];
    if (hit && Date.now() - hit.t < TTL) out.set(refKey(r), hit.i);
    else missing.push(r);
  }
  if (missing.length) {
    const fetched = await new Promise<Map<string, Identity | null>>((done) => {
      queue.push({ refs: missing, done });
      timer ??= setTimeout(flush, 25);
    });
    for (const r of missing)
      if (fetched.has(refKey(r))) out.set(refKey(r), fetched.get(refKey(r))!);
  }
  return out;
}

/** The fan-club subjects an identity spans, canonical (TMDB person) first. */
export function identitySubjects(identity: Identity | null | undefined) {
  const subjects: { kind: 'person' | 'artist'; id: number }[] = [];
  if (identity?.tmdb) subjects.push({ kind: 'person', id: identity.tmdb });
  if (identity?.deezer) subjects.push({ kind: 'artist', id: identity.deezer });
  return subjects;
}

export function useIdentities(refs: SourceRef[], enabled = true) {
  const key = refs.map(refKey).sort().join(',');
  return useQuery({
    queryKey: ['identity', key],
    queryFn: () => resolveIdentities(refs),
    enabled: enabled && refs.length > 0,
    staleTime: Infinity,
    retry: 1,
  });
}

export function useIdentity(ref: SourceRef | null) {
  const q = useIdentities(ref ? [ref] : [], !!ref);
  return {
    identity: ref ? (q.data?.get(refKey(ref)) ?? null) : null,
    isLoading: q.isLoading && !!ref,
  };
}

export const identityKey = refKey;
