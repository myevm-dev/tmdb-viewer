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
  /** Set for TV shows (normalized into the same shape); undefined means movie. */
  media_type?: MediaType;
}

export type MediaType = 'movie' | 'tv';

/** Route segment for a title: /movie/:id or /tv/:id */
export const mediaPath = (m: Pick<Movie, 'id' | 'media_type'>) =>
  `/${m.media_type === 'tv' ? 'tv' : 'movie'}/${m.id}`;

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

export const profileUrl = (
  path: string | null | undefined,
  size: 'w185' | 'h632' | 'original' = 'w185',
) => (path ? `${BASE_IMG_URL}${size}${path}` : null);

export const releaseYear = (m: Pick<Movie, 'release_date'>) =>
  m.release_date ? new Date(m.release_date).getFullYear() : null;

export const formatRuntime = (min: number | null) =>
  min ? `${Math.floor(min / 60)}h ${min % 60}m` : null;

export function pickTrailer(details: Pick<MovieDetails, 'videos'>) {
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

export const tmdbPersonUrl = (id: PersonID) =>
  `https://www.themoviedb.org/person/${id}`;

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export type PersonID = number;

export interface Person {
  id: PersonID;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
  popularity?: number;
  gender?: number;
  known_for?: (Movie & { media_type?: string; name?: string })[];
}

export interface PersonCredit extends Movie {
  character?: string;
  job?: string;
  credit_id: string;
  popularity?: number;
}

export interface PersonDetails extends Person {
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  also_known_as: string[];
  homepage: string | null;
  imdb_id: string | null;
  movie_credits?: { cast: PersonCredit[]; crew: PersonCredit[] };
  tv_credits?: { cast: PersonCredit[]; crew: PersonCredit[] };
  external_ids?: {
    instagram_id?: string | null;
    twitter_id?: string | null;
    tiktok_id?: string | null;
    imdb_id?: string | null;
  };
}

export const PEOPLE_CATEGORIES = {
  popular: { title: 'Popular People', path: 'person/popular' },
  trending: { title: 'Trending People', path: 'trending/person/week' },
} as const;

export type PeopleCategory = keyof typeof PEOPLE_CATEGORIES;

export const isPeopleCategory = (v: string | undefined): v is PeopleCategory =>
  !!v && v in PEOPLE_CATEGORIES;

export const getPeople = (category: PeopleCategory, page = 1) =>
  call<Page<Person>>(PEOPLE_CATEGORIES[category].path, { page });

export const getPerson = (id: PersonID) =>
  call<PersonDetails>(`person/${id}`, {
    append_to_response: 'movie_credits,tv_credits,external_ids',
  });

export const searchPeople = (query: string, page = 1) =>
  call<Page<Person>>('search/person', { query, page, include_adult: 'false' });

export const age = (birthday: string | null, deathday?: string | null) => {
  if (!birthday) return null;
  const end = deathday ? new Date(deathday) : new Date();
  const b = new Date(birthday);
  let a = end.getFullYear() - b.getFullYear();
  if (end < new Date(end.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
};

/** A person's films as cast or crew, de-duplicated and sorted by popularity. */
// Talk, news and reality appearances would swamp an actor's TV credits.
const NON_SCRIPTED_TV = new Set([10763, 10764, 10767]);

/** A person's films and TV shows, de-duplicated and sorted by popularity. */
export function filmography(p: PersonDetails, limit = 40) {
  const seen = new Map<string, PersonCredit>();
  const tv = [...(p.tv_credits?.cast ?? []), ...(p.tv_credits?.crew ?? [])]
    .filter((c) => !(c.genre_ids ?? []).some((g) => NON_SCRIPTED_TV.has(g)))
    .map(
      (c) =>
        ({
          ...tvToMovie(c as unknown as RawTv),
          character: c.character,
          job: c.job,
          credit_id: c.credit_id,
          popularity: c.popularity,
        }) as PersonCredit,
    );
  const all = [
    ...(p.movie_credits?.cast ?? []),
    ...(p.movie_credits?.crew ?? []),
    ...tv,
  ];
  for (const c of all) {
    const key = `${c.media_type ?? 'movie'}:${c.id}`;
    if (!seen.has(key)) seen.set(key, c);
  }
  return [...seen.values()]
    .filter((c) => c.backdrop_path || c.poster_path)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* TV shows — normalized into the Movie shape (title, release_date)    */
/* so tiles, rows, grids and the hero work unchanged.                  */
/* ------------------------------------------------------------------ */

export type TvID = number;

interface RawTv {
  id: TvID;
  name: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  origin_country?: string[];
}

export interface TvDetails extends Movie {
  name: string;
  genres: Genre[];
  tagline: string | null;
  status: string;
  in_production: boolean;
  first_air_date?: string;
  last_air_date?: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  homepage: string | null;
  networks: { id: number; name: string; logo_path: string | null }[];
  created_by: { id: number; name: string; profile_path: string | null }[];
  seasons: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
  }[];
  aggregate_credits?: {
    cast: {
      id: number;
      name: string;
      profile_path: string | null;
      roles: { character: string; episode_count: number }[];
      total_episode_count: number;
    }[];
  };
  videos?: MovieDetails['videos'];
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
}

export function tvToMovie<T extends RawTv>(t: T) {
  return {
    ...t,
    title: t.name,
    release_date: t.first_air_date,
    media_type: 'tv' as const,
  };
}

const tvPage = (p: Page<RawTv>): Page<Movie> => ({
  ...p,
  results: p.results.map(tvToMovie),
});

export const TV_CATEGORIES = {
  trending: { title: 'Trending TV', path: 'trending/tv/week' },
  popular: { title: 'Popular TV', path: 'tv/popular' },
  top_rated: { title: 'Top Rated TV', path: 'tv/top_rated' },
  on_the_air: { title: 'On The Air', path: 'tv/on_the_air' },
  airing_today: { title: 'Airing Today', path: 'tv/airing_today' },
} as const;

export type TvCategory = keyof typeof TV_CATEGORIES;

export const isTvCategory = (v: string | undefined): v is TvCategory =>
  !!v && v in TV_CATEGORIES;

export const getTvCategory = (category: TvCategory, page = 1) =>
  call<Page<RawTv>>(TV_CATEGORIES[category].path, { page }).then(tvPage);

export const getTv = (id: TvID) =>
  call<TvDetails & RawTv>(`tv/${id}`, {
    append_to_response: 'aggregate_credits,videos,content_ratings',
  }).then((t) => tvToMovie(t) as TvDetails);

export const getTvRecommendations = (id: TvID) =>
  call<Page<RawTv>>(`tv/${id}/recommendations`).then(tvPage);

export const searchTv = (query: string, page = 1) =>
  call<Page<RawTv>>('search/tv', { query, page, include_adult: 'false' }).then(
    tvPage,
  );

export const tvRating = (t: TvDetails) =>
  t.content_ratings?.results.find((r) => r.iso_3166_1 === 'US')?.rating ?? null;

export const tmdbTvUrl = (id: TvID) => `https://www.themoviedb.org/tv/${id}`;

/** "2019–2023", "2021–" (still running) or "2024" */
export function airYears(t: TvDetails) {
  const start = t.first_air_date?.slice(0, 4);
  if (!start) return null;
  const end = t.last_air_date?.slice(0, 4);
  if (t.in_production || t.status === 'Returning Series') return `${start}–`;
  return end && end !== start ? `${start}–${end}` : start;
}
