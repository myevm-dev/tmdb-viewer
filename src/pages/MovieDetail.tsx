import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  backdropUrl,
  certification,
  formatRuntime,
  getMovie,
  getRecommendations,
  pickTrailer,
  posterUrl,
  releaseYear,
} from '../lib/tmdb';
import Row from '../components/Row';
import { ListButton, MovieTile } from '../components/MovieTile';
import TrailerModal from '../components/TrailerModal';
import FanClubPanel from '../fanclub/FanClubPanel';
import PersonCard from '../components/PersonCard';
import { movieSubject } from '../fanclub/subject';
import { PlayIcon, StarIcon, UsersIcon } from '../components/Icons';

export default function MovieDetail() {
  const { movieId } = useParams();
  const id = Number(movieId);
  const { hash } = useLocation();
  const [trailer, setTrailer] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['movie', id],
    queryFn: () => getMovie(id),
    enabled: Number.isFinite(id),
  });
  const recs = useQuery({
    queryKey: ['recs', id],
    queryFn: () => getRecommendations(id),
    enabled: Number.isFinite(id),
  });

  useEffect(() => {
    if (!q.data) return;
    if (hash === '#fan-club') {
      setTimeout(
        () =>
          document
            .getElementById('fan-club')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        150,
      );
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [q.data, hash, id]);

  if (q.isLoading) {
    return (
      <div className="detail">
        <div className="detail__hero skeleton" />
      </div>
    );
  }

  if (q.error || !q.data) {
    return (
      <div className="page">
        <div className="empty">
          Couldn’t load this movie. <Link to="/">Go home</Link>
        </div>
      </div>
    );
  }

  const m = q.data;
  const trailerVideo = pickTrailer(m);
  const cert = certification(m);
  const director = m.credits?.crew.find((c) => c.job === 'Director');
  const cast = m.credits?.cast.slice(0, 18) ?? [];
  const poster = posterUrl(m, 'w500');
  const backdrop = backdropUrl(m, 'original');

  return (
    <div className="detail">
      <section className="detail__hero">
        {backdrop && <img className="detail__bg" src={backdrop} alt="" />}
        <div className="detail__shade" />
        <div className="detail__content">
          {poster && (
            <img
              className="detail__poster"
              src={poster}
              alt={`${m.title} poster`}
            />
          )}
          <div className="detail__text">
            <h1 className="detail__title">{m.title}</h1>
            {m.tagline && <p className="detail__tagline">{m.tagline}</p>}
            <div className="hero__meta">
              {m.vote_average > 0 && (
                <span className="rating">
                  <StarIcon size={14} /> {m.vote_average.toFixed(1)}
                  <span className="muted small">
                    {' '}
                    ({m.vote_count.toLocaleString()})
                  </span>
                </span>
              )}
              {releaseYear(m) && (
                <time dateTime={m.release_date}>{releaseYear(m)}</time>
              )}
              {cert && <span className="badge">{cert}</span>}
              {formatRuntime(m.runtime) && (
                <span>{formatRuntime(m.runtime)}</span>
              )}
            </div>
            <div className="genres">
              {m.genres.map((g) => (
                <span key={g.id} className="pill pill--static">
                  {g.name}
                </span>
              ))}
            </div>
            <div className="hero__actions">
              <button
                className="btn btn--light btn--lg"
                disabled={!trailerVideo}
                onClick={() => trailerVideo && setTrailer(trailerVideo.key)}
              >
                <PlayIcon size={20} />{' '}
                {trailerVideo ? 'Play trailer' : 'No trailer'}
              </button>
              <a className="btn btn--gold-ghost btn--lg" href="#fan-club">
                <UsersIcon size={18} /> Fan club
              </a>
              <ListButton id={m.id} className="round-btn--lg" />
            </div>
            <p className="detail__overview">{m.overview}</p>
            {director && (
              <p className="muted">
                Directed by{' '}
                <Link className="text link-u" to={`/person/${director.id}`}>
                  {director.name}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="shelves shelves--detail">
        <FanClubPanel subject={movieSubject(m)} />

        {cast.length > 0 && (
          <Row title="Cast" variant="card">
            {cast.map((c) => (
              <PersonCard
                key={`${c.id}-${c.character}`}
                person={c}
                subtitle={c.character}
              />
            ))}
          </Row>
        )}

        {(recs.isLoading || (recs.data?.results.length ?? 0) > 0) && (
          <Row title="More like this" loading={recs.isLoading}>
            {recs.data?.results.map((r) => (
              <MovieTile key={r.id} movie={r} />
            ))}
          </Row>
        )}
      </div>

      <TrailerModal videoKey={trailer} onClose={() => setTrailer(null)} />
    </div>
  );
}
