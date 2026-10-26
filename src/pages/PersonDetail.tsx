import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  age,
  backdropUrl,
  filmography,
  getPerson,
  profileUrl,
} from '../lib/tmdb';
import Row from '../components/Row';
import { MovieTile } from '../components/MovieTile';
import { FollowButton } from '../components/PersonCard';
import FanClubPanel from '../fanclub/FanClubPanel';
import { personSubject } from '../fanclub/subject';
import { useFanClubSubjects } from '../fanclub/useFanClubSubjects';
import { ExternalIcon, RocketIcon, UsersIcon } from '../components/Icons';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export default function PersonDetail() {
  const { personId } = useParams();
  const id = Number(personId);
  const { hash } = useLocation();
  const [bioOpen, setBioOpen] = useState(false);
  const clubs = useFanClubSubjects();

  const q = useQuery({
    queryKey: ['person', id],
    queryFn: () => getPerson(id),
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
    setBioOpen(false);
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
          Couldn’t load this person. <Link to="/people">Browse people</Link>
        </div>
      </div>
    );
  }

  const p = q.data;
  const known = filmography(p, 30);
  const latest = [...known]
    .filter((c) => c.release_date)
    .sort((a, b) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
    .slice(0, 20);
  const backdrop = known.find((c) => c.backdrop_path);
  const photo = profileUrl(p.profile_path, 'h632');
  const years = age(p.birthday, p.deathday);
  const hasClub = clubs.has('person', p.id);
  const ext = p.external_ids ?? {};
  const socials = [
    ext.instagram_id && [
      'Instagram',
      `https://instagram.com/${ext.instagram_id}`,
    ],
    ext.twitter_id && ['X', `https://x.com/${ext.twitter_id}`],
    ext.tiktok_id && ['TikTok', `https://www.tiktok.com/@${ext.tiktok_id}`],
    (ext.imdb_id || p.imdb_id) && [
      'IMDb',
      `https://www.imdb.com/name/${ext.imdb_id || p.imdb_id}`,
    ],
  ].filter(Boolean) as [string, string][];
  const bio = p.biography?.trim();

  return (
    <div className="detail detail--person">
      <section className="detail__hero">
        {backdrop && (
          <img
            className="detail__bg detail__bg--soft"
            src={backdropUrl(backdrop, 'original')!}
            alt=""
          />
        )}
        <div className="detail__shade" />
        <div className="detail__content">
          {photo ? (
            <img className="detail__poster" src={photo} alt={p.name} />
          ) : (
            <div className="detail__poster person__ph person__ph--lg">
              {p.name.slice(0, 1)}
            </div>
          )}
          <div className="detail__text">
            <span className="hero__eyebrow">
              {p.known_for_department ?? 'Person'}
            </span>
            <h1 className="detail__title">{p.name}</h1>
            <div className="hero__meta">
              {p.birthday && (
                <span>
                  Born {formatDate(p.birthday)}
                  {years !== null && !p.deathday ? ` (age ${years})` : ''}
                </span>
              )}
              {p.deathday && (
                <span className="dot-sep">
                  Died {formatDate(p.deathday)}
                  {years !== null ? ` (aged ${years})` : ''}
                </span>
              )}
              {p.place_of_birth && (
                <span className="dot-sep">{p.place_of_birth}</span>
              )}
            </div>
            <div className="hero__actions">
              <FollowButton id={p.id} size="lg" />
              <a className="btn btn--gold-ghost btn--lg" href="#fan-club">
                {hasClub ? (
                  <>
                    <UsersIcon size={18} /> Fan club
                  </>
                ) : (
                  <>
                    <RocketIcon size={18} /> Launch fan club
                  </>
                )}
              </a>
            </div>
            {bio && (
              <div className={`bio ${bioOpen ? 'is-open' : ''}`}>
                <p className="detail__overview">{bio}</p>
                {bio.length > 420 && (
                  <button
                    className="link-btn"
                    onClick={() => setBioOpen((o) => !o)}
                  >
                    {bioOpen ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
            {socials.length > 0 && (
              <div className="socials">
                {socials.map(([label, url]) => (
                  <a
                    key={label}
                    className="pill"
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {label} <ExternalIcon size={12} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="shelves shelves--detail">
        <FanClubPanel subject={personSubject(p)} />

        {known.length > 0 && (
          <Row title="Known for">
            {known.map((m) => (
              <MovieTile key={m.id} movie={m} />
            ))}
          </Row>
        )}

        {latest.length > 0 && (
          <Row title="Latest & upcoming">
            {latest.map((m) => (
              <MovieTile key={m.id} movie={m} />
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
