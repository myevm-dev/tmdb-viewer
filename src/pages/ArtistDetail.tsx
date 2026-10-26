import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  artistImage,
  deezerArtistUrl,
  getArtist,
  getArtistAlbums,
  getArtistRelated,
  getArtistTop,
} from '../lib/deezer';
import TrackList, { PauseIcon, usePreview } from '../components/TrackList';
import { useIdentity } from '../lib/identity';
import { filmography, getPerson } from '../lib/tmdb';
import { MovieTile } from '../components/MovieTile';
import Row from '../components/Row';
import { ArtistCard, FollowButton } from '../components/PersonCard';
import FanClubPanel from '../fanclub/FanClubPanel';
import { artistSubject, canonicalize } from '../fanclub/subject';
import { useFanClubSubjects } from '../fanclub/useFanClubSubjects';
import { compact } from '../lib/format';
import {
  ExternalIcon,
  PlayIcon,
  RocketIcon,
  UsersIcon,
} from '../components/Icons';

export default function ArtistDetail() {
  const { artistId } = useParams();
  const id = Number(artistId);
  const { hash } = useLocation();
  const clubs = useFanClubSubjects();
  const preview = usePreview();
  const ok = Number.isFinite(id);

  const artist = useQuery({
    queryKey: ['artist', id],
    queryFn: () => getArtist(id),
    enabled: ok,
  });
  const top = useQuery({
    queryKey: ['artist-top', id],
    queryFn: () => getArtistTop(id, 10),
    enabled: ok,
  });
  const albums = useQuery({
    queryKey: ['artist-albums', id],
    queryFn: () => getArtistAlbums(id),
    enabled: ok,
  });
  const related = useQuery({
    queryKey: ['artist-related', id],
    queryFn: () => getArtistRelated(id),
    enabled: ok,
  });
  // Same real person on screen? (Wikidata links the Deezer artist to a TMDB person.)
  const { identity, isLoading: identityLoading } = useIdentity(
    ok ? { source: 'deezer', id } : null,
  );
  const person = useQuery({
    queryKey: ['person', identity?.tmdb],
    queryFn: () => getPerson(identity!.tmdb!),
    enabled: !!identity?.tmdb,
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (!artist.data) return;
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
  }, [artist.data, hash, id]);

  if (artist.isLoading) {
    return (
      <div className="detail">
        <div className="detail__hero skeleton" />
      </div>
    );
  }

  if (artist.error || !artist.data) {
    return (
      <div className="page">
        <div className="empty">
          Couldn’t load this artist. <Link to="/music">Browse music</Link>
        </div>
      </div>
    );
  }

  const a = artist.data;
  const photo = artistImage(a, 'xl');
  const tracks = top.data ?? [];
  const albumList = (albums.data ?? [])
    .filter((al) => al.record_type !== 'single')
    .slice(0, 20);
  const subject = canonicalize(artistSubject(a, albumList[0]), identity);
  const hasClub = [subject, ...(subject.aliases ?? [])].some((x) =>
    clubs.has(x.kind, x.id),
  );
  const screen = person.data ? filmography(person.data, 20) : [];
  const roles = ['Music artist', person.data?.known_for_department].filter(
    Boolean,
  );

  return (
    <div className="detail detail--artist">
      <section className="detail__hero">
        {photo && (
          <img className="detail__bg detail__bg--soft" src={photo} alt="" />
        )}
        <div className="detail__shade" />
        <div className="detail__content">
          {photo ? (
            <img
              className="detail__poster detail__poster--round"
              src={photo}
              alt={a.name}
            />
          ) : (
            <div className="detail__poster detail__poster--round person__ph person__ph--lg">
              {a.name.slice(0, 1)}
            </div>
          )}
          <div className="detail__text">
            <span className="hero__eyebrow">{roles.join(' · ')}</span>
            <h1 className="detail__title">{a.name}</h1>
            <div className="hero__meta">
              {!!a.nb_fan && <span>{compact(a.nb_fan)} fans</span>}
              {!!a.nb_album && (
                <span className="dot-sep">{a.nb_album} releases</span>
              )}
            </div>
            <div className="hero__actions">
              <button
                className="btn btn--light btn--lg"
                disabled={!tracks[0]?.preview}
                onClick={() => tracks[0] && preview.toggle(tracks[0])}
              >
                {preview.playing === tracks[0]?.id ? (
                  <PauseIcon size={20} />
                ) : (
                  <PlayIcon size={20} />
                )}{' '}
                {preview.playing === tracks[0]?.id ? 'Pause' : 'Play top song'}
              </button>
              {/* Following a linked artist follows the person, so both pages agree. */}
              <FollowButton
                id={identity?.tmdb ?? a.id}
                kind={identity?.tmdb ? 'person' : 'artist'}
                size="lg"
              />
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
            <div className="socials">
              <a
                className="pill"
                href={a.link ?? deezerArtistUrl(a.id)}
                target="_blank"
                rel="noreferrer"
              >
                Deezer <ExternalIcon size={12} />
              </a>
              {identity?.tmdb && (
                <Link
                  className="pill pill--gold"
                  to={`/person/${identity.tmdb}`}
                >
                  Full profile · film & TV
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="shelves shelves--detail">
        <TrackList tracks={tracks} preview={preview} />

        <FanClubPanel subject={subject} pending={identityLoading} />

        {screen.length > 0 && (
          <Row title="On screen" href={`/person/${identity!.tmdb}`}>
            {screen.map((m) => (
              <MovieTile key={`${m.media_type ?? 'movie'}-${m.id}`} movie={m} />
            ))}
          </Row>
        )}

        {albumList.length > 0 && (
          <Row title="Albums" variant="card">
            {albumList.map((al) => (
              <a
                key={al.id}
                className="album"
                href={`https://www.deezer.com/album/${al.id}`}
                target="_blank"
                rel="noreferrer"
              >
                {al.cover_big ? (
                  <img src={al.cover_big} alt="" loading="lazy" />
                ) : (
                  <div className="season__ph">♪</div>
                )}
                <strong>{al.title}</strong>
                <span className="muted small">
                  {al.release_date?.slice(0, 4)}
                  {al.record_type
                    ? ` · ${al.record_type === 'ep' ? 'EP' : al.record_type[0].toUpperCase() + al.record_type.slice(1)}`
                    : ''}
                </span>
              </a>
            ))}
          </Row>
        )}

        {(related.data?.length ?? 0) > 0 && (
          <Row title="Fans also like" variant="card">
            {related.data!.map((r) => (
              <ArtistCard key={r.id} artist={r} />
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}
