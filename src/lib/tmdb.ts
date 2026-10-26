const BASE_API_URL = 'https://api.themoviedb.org/3/';
const BASE_IMG_URL = 'https://image.tmdb.org/t/p/';

// Public read-only key shipped with the original project; override via VITE_TMDB_API_KEY.
const API_KEY =
  import.meta.env.VITE_TMDB_API_KEY || '63683e7ba09287916ca1fd562d966e29';

export type MovieID = number;

export interface Genre {
  id: number;
  name: string;
}

export interface Movie {
  id: MovieID;
  title: string;
  release_date?: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
}

export interface MovieDetails extends Movie {
  genres: Genre[];
  runtime: number | null;
  tagline: string | null;
  status: string;
  homepage: string | null;
  imdb_id: string | null;
  credits?: {
    cast: {
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }[];
    crew: { id: number; name: string; job: string }[];
  };
  videos?: {
    results: {
      key: string;
      site: string;
      type: string;
      name: string;
      official: boolean;
    }[];
  };
  release_dates?: {
    results: {
      iso_3166_1: string;
      release_dates: { certification: string }[];
    }[];
  };
}

export interface Page<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

type Params = Record<string, string | number | undefined>;

async function call<T>(path: string, params: Params = {}): Promise<T> {
  const url = new URL(path, BASE_API_URL);
  url.searchParams.set('api_key', API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `${data.status_message ?? 'TMDB error'} (code ${data.status_code ?? res.status})`,
    );
  }
  return data as T;
}

export const CATEGORIES = {
  trending: { title: 'Trending This Week', path: 'trending/movie/week' },
  popular: { title: 'Popular', path: 'movie/popular' },
  top_rated: { title: 'Top Rated', path: 'movie/top_rated' },
  now_playing: { title: 'Now Playing', path: 'movie/now_playing' },
  upcoming: { title: 'Coming Soon', path: 'movie/upcoming' },
} as const;

export type Category = keyof typeof CATEGORIES;

export const isCategory = (v: string | undefined): v is Category =>
  !!v && v in CATEGORIES;

export const getCategory = (category: Category, page = 1) =>
  call<Page<Movie>>(CATEGORIES[category].path, { page });

export const getMovie = (id: MovieID) =>
  call<MovieDetails>(`movie/${id}`, {
    append_to_response: 'credits,videos,release_dates',
  });

export const getRecommendations = (id: MovieID) =>
  call<Page<Movie>>(`movie/${id}/recommendations`);

export const searchMovies = (query: string, page = 1) =>
  call<Page<Movie>>('search/movie', { query, page, include_adult: 'false' });

export const getGenres = () =>
  call<{ genres: Genre[] }>('genre/movie/list').then((r) => r.genres);

type PosterSize = 'w185' | 'w342' | 'w500' | 'w780' | 'original';
type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';

export const posterUrl = (
  m: Pick<Movie, 'poster_path'>,
  size: PosterSize = 'w342',
) => (m.poster_path ? `${BASE_IMG_URL}${size}${m.poster_path}` : null);

export const backdropUrl = (
  m: Pick<Movie, 'backdrop_path'>,
  size: BackdropSize = 'w1280',
) => (m.backdrop_path ? `${BASE_IMG_URL}${size}${m.backdrop_path}` : null);

export const profileUrl = (path: string | null) =>
  path ? `${BASE_IMG_URL}w185${path}` : null;

export const releaseYear = (m: Pick<Movie, 'release_date'>) =>
  m.release_date ? new Date(m.release_date).getFullYear() : null;

export const formatRuntime = (min: number | null) =>
  min ? `${Math.floor(min / 60)}h ${min % 60}m` : null;

export function pickTrailer(details: MovieDetails) {
  const vids =
    details.videos?.results.filter((v) => v.site === 'YouTube') ?? [];
  return (
    vids.find((v) => v.type === 'Trailer' && v.official) ??
    vids.find((v) => v.type === 'Trailer') ??
    vids.find((v) => v.type === 'Teaser') ??
    null
  );
}

export function certification(details: MovieDetails) {
  const us = details.release_dates?.results.find((r) => r.iso_3166_1 === 'US');
  return us?.release_dates.find((d) => d.certification)?.certification ?? null;
}

export const tmdbMovieUrl = (id: MovieID) =>
  `https://www.themoviedb.org/movie/${id}`;
