import Modal from './Modal';
import { ExternalIcon } from './Icons';

/**
 * YouTube rejects embeds that arrive without a Referer (player "Error 153"),
 * which happens when the host sends `Referrer-Policy: no-referrer` /
 * `same-origin`. We pin the iframe's own policy and identify our origin so the
 * player works regardless of how the page is hosted.
 */
export default function TrailerModal({
  videoKey,
  onClose,
}: {
  videoKey: string | null;
  onClose: () => void;
}) {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
    origin: window.location.origin,
    widget_referrer: window.location.href,
  });

  return (
    <Modal open={!!videoKey} onClose={onClose} size="video">
      {videoKey && (
        <>
          <div className="video">
            <iframe
              src={`https://www.youtube.com/embed/${videoKey}?${params}`}
              title="Trailer"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen; web-share"
              allowFullScreen
            />
          </div>
          <a
            className="video__fallback"
            href={`https://www.youtube.com/watch?v=${videoKey}`}
            target="_blank"
            rel="noreferrer"
          >
            Trouble playing? Watch on YouTube <ExternalIcon size={14} />
          </a>
        </>
      )}
    </Modal>
  );
}
