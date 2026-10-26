import {
  backdropUrl,
  posterUrl,
  profileUrl,
  tmdbMovieUrl,
  tmdbPersonUrl,
  tmdbTvUrl,
  type MovieDetails,
  type PersonDetails,
  type TvDetails,
} from '../lib/tmdb';
import {
  artistImage,
  deezerArtistUrl,
  type DzAlbum,
  type DzArtist,
} from '../lib/deezer';
import type { SubjectKind } from './data';
import { identitySubjects, type Identity } from '../lib/identity';

/** Anything a fan club can be launched for — a film, show, person or artist. */
export interface FanSubject {
  kind: SubjectKind;
  id: number;
  name: string;
  /** Square-ish/portrait image used as the token logo by default. */
  image: string | null;
  /** Alternate image the creator can pick. */
  altImage: string | null;
  /** Canonical page for the subject (TMDB or Deezer); stamped into token metadata. */
  sourceUrl: string;
  /** Same real person in other catalogs — their clubs count as this club. */
  aliases?: { kind: SubjectKind; id: number }[];
  /** Other catalog pages for the same person, also stamped into metadata. */
  extraUrls?: string[];
  /** Wikidata item when the identity is known. */
  wikidata?: string;
}

/**
 * One real person = one fan club. When a person is linked across catalogs,
 * the TMDB person becomes the canonical subject and the others are aliases,
 * so launching from their artist page or their actor page targets the same club.
 */
export function canonicalize(
  base: FanSubject,
  identity: Identity | null | undefined,
): FanSubject {
  const subjects = identitySubjects(identity);
  if (!identity || subjects.length === 0) return base;
  const all = [...subjects];
  if (!all.some((x) => x.kind === base.kind && x.id === base.id))
    all.push({ kind: base.kind as 'person' | 'artist', id: base.id });
  const [canonical, ...aliases] = all;
  const urlFor = (x: { kind: SubjectKind; id: number }) =>
    x.kind === 'artist' ? deezerArtistUrl(x.id) : tmdbPersonUrl(x.id);
  return {
    ...base,
    kind: canonical.kind,
    id: canonical.id,
    sourceUrl: urlFor(canonical),
    aliases,
    extraUrls: aliases.map(urlFor),
    wikidata: identity.qid,
  };
}

export function movieSubject(m: MovieDetails): FanSubject {
  return {
    kind: 'movie',
    id: m.id,
    name: m.title,
    image: posterUrl(m, 'w500'),
    altImage: backdropUrl(m, 'w780'),
    sourceUrl: tmdbMovieUrl(m.id),
  };
}

export function tvSubject(t: TvDetails): FanSubject {
  return {
    kind: 'tv',
    id: t.id,
    name: t.title,
    image: posterUrl(t, 'w500'),
    altImage: backdropUrl(t, 'w780'),
    sourceUrl: tmdbTvUrl(t.id),
  };
}

export function personSubject(p: PersonDetails): FanSubject {
  const extra = p.movie_credits?.cast.find((c) => c.backdrop_path);
  return {
    kind: 'person',
    id: p.id,
    name: p.name,
    image: profileUrl(p.profile_path, 'h632'),
    altImage: extra ? backdropUrl(extra, 'w780') : null,
    sourceUrl: tmdbPersonUrl(p.id),
  };
}

export function artistSubject(a: DzArtist, topAlbum?: DzAlbum): FanSubject {
  return {
    kind: 'artist',
    id: a.id,
    name: a.name,
    image: artistImage(a, 'xl'),
    altImage: topAlbum?.cover_xl ?? topAlbum?.cover_big ?? null,
    sourceUrl: deezerArtistUrl(a.id),
  };
}
