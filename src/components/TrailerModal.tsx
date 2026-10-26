import Modal from './Modal';

export default function TrailerModal({
  videoKey,
  onClose,
}: {
  videoKey: string | null;
  onClose: () => void;
}) {
  return (
    <Modal open={!!videoKey} onClose={onClose} size="video">
      {videoKey && (
        <div className="video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
            title="Trailer"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      )}
    </Modal>
  );
}
