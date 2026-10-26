import { Link } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import { useMyListMovies, useFollowed, FollowedCard } from './MyListRow';

export default function MyList() {
  const { movies, loading, count } = useMyListMovies();
  const followed = useFollowed();

  return (
    <div className="page">
      <div className="page__head">
        <h1>My List</h1>
        {count + followed.count > 0 && (
          <span className="muted">
            {count} saved · {followed.count} following
          </span>
        )}
      </div>

      <h2 className="sub-head">Films & shows</h2>
      <MovieGrid
        movies={movies}
        loading={loading && !movies.length}
        empty={
          <>
            No movies found. Tap <strong>+</strong> on any film or show to save
            it here. <Link to="/browse/popular">Browse popular movies</Link>
          </>
        }
      />

      <h2 className="sub-head">Following</h2>
      {followed.items.length ? (
        <div className="people-grid">
          {followed.items.map((it) => (
            <FollowedCard key={`${it.kind}-${it.data.id}`} item={it} />
          ))}
        </div>
      ) : followed.loading ? (
        <div className="people-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton skeleton--person" />
          ))}
        </div>
      ) : (
        <div className="empty">
          You’re not following anyone yet. Tap <strong>Follow</strong> on an
          actor, director or music artist to track them here.{' '}
          <Link to="/people">Browse people</Link> ·{' '}
          <Link to="/music">Browse music</Link>
        </div>
      )}
    </div>
  );
}
