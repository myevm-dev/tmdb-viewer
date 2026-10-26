import { Link } from 'react-router-dom';
import {
  backdropUrl,
  mediaPath,
  posterUrl,
  releaseYear,
  type MediaType,
  type Movie,
} from '../lib/tmdb';
import { useMyList } from '../lib/myList';
import { useFanClubSubjects } from '../fanclub/useFanClubSubjects';
import { CheckIcon, PlusIcon, StarIcon } from './Icons';

export function ListButton({
  id,
  kind = 'movie',
  className = '',
}: {
  id: number;
  kind?: MediaType;
  className?: string;
}) {
  const { has, toggle } = useMyList();
  const inList = has(kind, id);
  return (
    <button
      className={`round-btn ${inList ? 'is-on' : ''} ${className}`}
      aria-label={inList ? 'Remove from My List' : 'Add to My List'}
      title={inList ? 'Remove from My List' : 'Add to My List'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(kind, id);
      }}
    >
      {inList ? <CheckIcon size={16} /> : <PlusIcon size={16} />}
    </button>
  );
}

/** Landscape 16:9 tile — the main streaming-style card. */
export function MovieTile({ movie }: { movie: Movie }) {
  const img = backdropUrl(movie, 'w780') ?? posterUrl(movie, 'w500');
  const kind = movie.media_type ?? 'movie';
  const hasClub = useFanClubSubjects().has(kind, movie.id);
  return (
    <Link to={mediaPath(movie)} className="tile">
      <div className="tile__media">
        {img ? (
          <img src={img} alt="" loading="lazy" />
        ) : (
          <div className="tile__noimg">{movie.title}</div>
        )}
        <div className="tile__shade" />
        {hasClub && (
          <span className="chip chip--gold tile__club">FAN CLUB</span>
        )}
        <div className="tile__title">{movie.title}</div>
      </div>
      <div className="tile__info">
        <div className="tile__meta">
          {movie.vote_average > 0 && (
            <span className="rating">
              <StarIcon size={12} /> {movie.vote_average.toFixed(1)}
            </span>
          )}
          {releaseYear(movie) && <span>{releaseYear(movie)}</span>}
        </div>
        <ListButton id={movie.id} kind={kind} />
      </div>
    </Link>
  );
}

/** Portrait poster with a giant rank numeral — "Top 10" row. */
export function RankTile({ movie, rank }: { movie: Movie; rank: number }) {
  const img = posterUrl(movie, 'w342');
  return (
    <Link
      to={mediaPath(movie)}
      className="rank-tile"
      aria-label={`#${rank} ${movie.title}`}
    >
      <span className="rank-tile__num" aria-hidden>
        {rank}
      </span>
      <div className="rank-tile__poster">
        {img ? (
          <img src={img} alt="" loading="lazy" />
        ) : (
          <div className="tile__noimg">{movie.title}</div>
        )}
      </div>
    </Link>
  );
}
