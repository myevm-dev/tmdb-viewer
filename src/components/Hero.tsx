import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  backdropUrl,
  getMovie,
  pickTrailer,
  releaseYear,
  type Movie,
} from '../lib/tmdb';
import { useFanClubSubjects } from '../fanclub/useFanClubSubjects';
import { InfoIcon, PlayIcon, RocketIcon, StarIcon, UsersIcon } from './Icons';
import { ListButton } from './MovieTile';
import TrailerModal from './TrailerModal';

const ROTATE_MS = 9000;

export default function Hero({ movies }: { movies: Movie[] }) {
  const featured = movies.filter((m) => m.backdrop_path).slice(0, 6);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [trailer, setTrailer] = useState<string | null>(null);
  const clubs = useFanClubSubjects();
  const movie = featured[index];

  const details = useQuery({
    queryKey: ['movie', movie?.id],
    queryFn: () => getMovie(movie!.id),
    enabled: !!movie,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (paused || trailer || featured.length < 2) return;
    const t = setTimeout(
      () => setIndex((i) => (i + 1) % featured.length),
      ROTATE_MS,
    );
    return () => clearTimeout(t);
  }, [index, paused, trailer, featured.length]);

  if (!movie) return <div className="hero hero--empty skeleton" />;

  const trailerKey = details.data ? pickTrailer(details.data)?.key : undefined;
  const genres = details.data?.genres.slice(0, 3).map((g) => g.name) ?? [];
  const hasClub = clubs.has('movie', movie.id);

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {featured.map((m, i) => (
        <img
          key={m.id}
          className={`hero__bg ${i === index ? 'is-active' : ''}`}
          src={backdropUrl(m, 'original')!}
          alt=""
          aria-hidden={i !== index}
        />
      ))}
      <div className="hero__shade" />

      <div className="hero__content" key={movie.id}>
        <span className="hero__eyebrow">#{index + 1} trending this week</span>
        <h1 className="hero__title">{movie.title}</h1>
        <div className="hero__meta">
          {movie.vote_average > 0 && (
            <span className="rating">
              <StarIcon size={14} /> {movie.vote_average.toFixed(1)}
            </span>
          )}
          {releaseYear(movie) && <span>{releaseYear(movie)}</span>}
          {genres.map((g) => (
            <span key={g} className="dot-sep">
              {g}
            </span>
          ))}
        </div>
        <p className="hero__overview">{movie.overview}</p>
        <div className="hero__actions">
          <button
            className="btn btn--light btn--lg"
            onClick={() => trailerKey && setTrailer(trailerKey)}
            disabled={!trailerKey}
          >
            <PlayIcon size={20} />{' '}
            {trailerKey || details.isLoading ? 'Trailer' : 'No trailer'}
          </button>
          <Link className="btn btn--glass btn--lg" to={`/movie/${movie.id}`}>
            <InfoIcon size={20} /> More info
          </Link>
          <Link
            className="btn btn--gold-ghost btn--lg"
            to={`/movie/${movie.id}#fan-club`}
          >
            {hasClub ? (
              <>
                <UsersIcon size={18} /> Fan club
              </>
            ) : (
              <>
                <RocketIcon size={18} /> Launch fan club
              </>
            )}
          </Link>
          <ListButton id={movie.id} className="round-btn--lg" />
        </div>
      </div>

      <div className="hero__dots" role="tablist">
        {featured.map((m, i) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={i === index}
            aria-label={m.title}
            className={`hero__dot ${i === index ? 'is-active' : ''} ${paused ? 'is-paused' : ''}`}
            onClick={() => setIndex(i)}
            style={{ ['--dur' as string]: `${ROTATE_MS}ms` }}
          >
            <span />
          </button>
        ))}
      </div>

      <TrailerModal videoKey={trailer} onClose={() => setTrailer(null)} />
    </section>
  );
}
