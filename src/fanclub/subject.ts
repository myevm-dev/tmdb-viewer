import {
  backdropUrl,
  posterUrl,
  profileUrl,
  tmdbMovieUrl,
  tmdbPersonUrl,
  type MovieDetails,
  type PersonDetails,
} from '../lib/tmdb';
import type { SubjectKind } from './data';

/** Anything a fan club can be launched for — a film or a person. */
export interface FanSubject {
  kind: SubjectKind;
  id: number;
  name: string;
  /** Square-ish/portrait image used as the token logo by default. */
  image: string | null;
  /** Alternate image the creator can pick. */
  altImage: string | null;
  tmdbUrl: string;
}

export function movieSubject(m: MovieDetails): FanSubject {
  return {
    kind: 'movie',
    id: m.id,
    name: m.title,
    image: posterUrl(m, 'w500'),
    altImage: backdropUrl(m, 'w780'),
    tmdbUrl: tmdbMovieUrl(m.id),
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
    tmdbUrl: tmdbPersonUrl(p.id),
  };
}
