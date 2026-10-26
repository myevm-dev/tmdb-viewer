import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  airYears,
  backdropUrl,
  getTv,
  getTvRecommendations,
  pickTrailer,
  posterUrl,
  tvRating,
} from '../lib/tmdb';
import Row from '../components/Row';
import { ListButton, MovieTile } from '../components/MovieTile';
import TrailerModal from '../components/TrailerModal';
import FanClubPanel from '../fanclub/FanClubPanel';
import PersonCard from '../components/PersonCard';
import { tvSubject } from '../fanclub/subject';
import { PlayIcon, StarIcon, UsersIcon } from '../components/Icons';

export default function TvDetail() {
  const { tvId } = useParams();
  const id = Number(tvId);
  const { hash } = useLocation();
  const [trailer, setTrailer] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['tv', id],
    queryFn: () => getTv(id),
    enabled: Number.isFinite(id),
  });
  const recs = useQuery({
    queryKey: ['tv-recs', id],
    queryFn: () => getTvRecommendations(id),
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
          Couldn’t load this show. <Link to="/shows/trending">Browse TV</Link>
        </div>
      </div>
    );
  }

  const t = q.data;
  const trailerVideo = pickTrailer(t);
  const rating = tvRating(t);
  const years = airYears(t);
  const cast = (t.aggregate_credits?.cast ?? []).slice(0, 18);
  const seasons = t.seasons.filter((s) => s.season_number > 0);
  const poster = posterUrl(t, 'w500');
  const backdrop = backdropUrl(t, 'original');

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
              alt={`${t.title} poster`}
            />
          )}
          <div className="detail__text">
            <span className="hero__eyebrow">
              TV series{t.networks[0] ? ` · ${t.networks[0].name}` : ''}
            </span>
            <h1 className="detail__title">{t.title}</h1>
            {t.tagline && <p className="detail__tagline">{t.tagline}</p>}
            <div className="hero__meta">
              {t.vote_average > 0 && (
                <span className="rating">
                  <StarIcon size={14} /> {t.vote_average.toFixed(1)}
                  <span className="muted small">
                    {' '}
                    ({t.vote_count.toLocaleString()})
                  </span>
                </span>
              )}
              {years && <span>{years}</span>}
              {rating && <span className="badge">{rating}</span>}
              <span>
                {t.number_of_seasons} season
                {t.number_of_seasons === 1 ? '' : 's'}
              </span>
              <span className="dot-sep">{t.number_of_episodes} episodes</span>
            </div>
            <div className="genres">
              {t.genres.map((g) => (
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
              <ListButton id={t.id} kind="tv" className="round-btn--lg" />
            </div>
            <p className="detail__overview">{t.overview}</p>
            {t.created_by.length > 0 && (
              <p className="muted">
                Created by{' '}
                {t.created_by.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && ', '}
                    <Link className="text link-u" to={`/person/${c.id}`}>
                      {c.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="shelves shelves--detail">
        <FanClubPanel subject={tvSubject(t)} />

        {seasons.length > 0 && (
          <Row title="Seasons" variant="card">
            {seasons.map((s) => (
              <div key={s.id} className="season">
                {s.poster_path ? (
                  <img src={posterUrl(s, 'w342')!} alt="" loading="lazy" />
                ) : (
                  <div className="season__ph">{s.season_number}</div>
                )}
                <strong>{s.name}</strong>
                <span className="muted small">
                  {s.episode_count} episodes
                  {s.air_date ? ` · ${s.air_date.slice(0, 4)}` : ''}
                </span>
              </div>
            ))}
          </Row>
        )}

        {cast.length > 0 && (
          <Row title="Cast" variant="card">
            {cast.map((c) => (
              <PersonCard
                key={c.id}
                person={c}
                subtitle={`${c.roles[0]?.character || 'Cast'} · ${c.total_episode_count} ep`}
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
