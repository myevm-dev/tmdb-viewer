import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatDuration, type DzTrack } from '../lib/deezer';
import { PlayIcon } from './Icons';

export function PauseIcon({ size = 16 }: { size?: number }) {
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
export function usePreview() {
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

export type Preview = ReturnType<typeof usePreview>;

export default function TrackList({
  tracks,
  preview,
  title = 'Popular',
  action,
}: {
  tracks: DzTrack[];
  preview: Preview;
  title?: string;
  action?: ReactNode;
}) {
  if (!tracks.length) return null;
  return (
    <section className="tracks">
      <div className="tracks__head">
        <h2>{title}</h2>
        {action}
      </div>
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
  );
}
