/**
 * Deezer public API (no key needed for catalog reads). Deezer doesn't send
 * CORS headers, so requests go through /deezer-api — proxied by Vite in dev
 * and by vercel.json rewrites in production.
 */
const BASE = (import.meta.env.VITE_DEEZER_API || '/deezer-api').replace(
  /\/$/,
  '',
);

export type ArtistID = number;

export interface DzArtist {
  id: ArtistID;
  name: string;
  link?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  nb_album?: number;
  nb_fan?: number;
  position?: number;
}

export interface DzAlbum {
  id: number;
  title: string;
  cover_medium?: string;
  cover_big?: string;
  cover_xl?: string;
  release_date?: string;
  record_type?: string;
  fans?: number;
}

export interface DzTrack {
  id: number;
  title: string;
  title_short?: string;
  duration: number;
  preview?: string;
  rank?: number;
  explicit_lyrics?: boolean;
  link?: string;
  artist: { id: ArtistID; name: string };
  album: DzAlbum;
}

export interface DzGenre {
  id: number;
  name: string;
  picture_medium?: string;
}

export interface DzList<T> {
  data: T[];
  total?: number;
  next?: string;
}

async function call<T>(
  path: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(`${BASE}/${path}`, window.location.origin);
  for (const [k, v] of Object.entries(params))
    url.searchParams.set(k, String(v));
  const res = await fetch(url);
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.includes('json'))
    throw new Error(`Music catalog unavailable (${res.status})`);
  const body = await res.json();
  // Deezer reports errors with HTTP 200 and an { error } body.
  if (body?.error) throw new Error(body.error.message ?? 'Deezer error');
  return body as T;
}

export const getChartArtists = (genreId = 0, limit = 50) =>
  call<DzList<DzArtist>>(`chart/${genreId}/artists`, { limit });

export const getGenres = () =>
  call<DzList<DzGenre>>('genre').then((r) => r.data.filter((g) => g.id !== 0));

export const getArtist = (id: ArtistID) => call<DzArtist>(`artist/${id}`);

export const getArtistTop = (id: ArtistID, limit = 10) =>
  call<DzList<DzTrack>>(`artist/${id}/top`, { limit }).then((r) => r.data);

export const getArtistAlbums = (id: ArtistID, limit = 30) =>
  call<DzList<DzAlbum>>(`artist/${id}/albums`, { limit }).then((r) => r.data);

export const getArtistRelated = (id: ArtistID, limit = 20) =>
  call<DzList<DzArtist>>(`artist/${id}/related`, { limit }).then((r) => r.data);

export const searchArtists = (q: string, index = 0, limit = 30) =>
  call<DzList<DzArtist>>('search/artist', { q, index, limit });

export const artistImage = (
  a: DzArtist,
  size: 'medium' | 'big' | 'xl' = 'big',
) =>
  (size === 'xl'
    ? a.picture_xl
    : size === 'big'
      ? a.picture_big
      : a.picture_medium) ??
  a.picture_medium ??
  null;

export const deezerArtistUrl = (id: ArtistID) =>
  `https://www.deezer.com/artist/${id}`;

export const formatDuration = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
