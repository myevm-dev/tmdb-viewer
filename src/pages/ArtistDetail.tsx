import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  artistImage,
  deezerArtistUrl,
  formatDuration,
  getArtist,
  getArtistAlbums,
  getArtistRelated,
  getArtistTop,
  type DzTrack,
} from '../lib/deezer';
import Row from '../components/Row';
import { ArtistCard, FollowButton } from '../components/PersonCard';
import FanClubPanel from '../fanclub/FanClubPanel';
import { artistSubject } from '../fanclub/subject';
import { useFanClubSubjects } from '../fanclub/useFanClubSubjects';
import { compact } from '../lib/format';
import {
  ExternalIcon,
  PlayIcon,
  RocketIcon,
  UsersIcon,
} from '../components/Icons';

function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  );
}

/** 30-second previews; one track plays at a time. */
function usePreview() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const toggle = (t: DzTrack) => {
    if (!t.preview) return;
    if (playing === t.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const a = new Audio(t.preview);
    a.volume = 0.8;
    a.onended = () => setPlaying(null);
    a.play().catch(() => setPlaying(null));
    audio.current = a;
    setPlaying(t.id);
  };
  return { playing, toggle };
}

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
  const hasClub = clubs.has('artist', a.id);

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
            <span className="hero__eyebrow">Music artist</span>
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
              <FollowButton id={a.id} kind="artist" size="lg" />
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
            </div>
          </div>
        </div>
      </section>

      <div className="shelves shelves--detail">
        {tracks.length > 0 && (
          <section className="tracks">
            <h2>Popular</h2>
            <ol>
              {tracks.map((t, i) => (
                <li
                  key={t.id}
                  className={preview.playing === t.id ? 'is-playing' : ''}
                >
                  <button
                    className="track__play"
                    onClick={() => preview.toggle(t)}
                    disabled={!t.preview}
                    aria-label={
                      preview.playing === t.id
                        ? `Pause ${t.title}`
                        : `Play ${t.title}`
                    }
                  >
                    <span className="track__num">{i + 1}</span>
                    {preview.playing === t.id ? (
                      <PauseIcon size={14} />
                    ) : (
                      <PlayIcon size={14} />
                    )}
                  </button>
                  {t.album.cover_medium && (
                    <img src={t.album.cover_medium} alt="" loading="lazy" />
                  )}
                  <div className="track__title">
                    <strong>{t.title_short ?? t.title}</strong>
                    <span className="muted small">
                      {t.explicit_lyrics && (
                        <span className="badge badge--xs">E</span>
                      )}{' '}
                      {t.album.title}
                    </span>
                  </div>
                  <span className="muted small track__dur">
                    {formatDuration(t.duration)}
                  </span>
                </li>
              ))}
            </ol>
            <p className="fine-print">30-second previews courtesy of Deezer.</p>
          </section>
        )}

        <FanClubPanel subject={artistSubject(a, albumList[0])} />

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
