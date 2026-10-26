import { Link } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import { useMyListMovies } from './MyListRow';

export default function MyList() {
  const { movies, loading, count } = useMyListMovies();
  return (
    <div className="page">
      <div className="page__head">
        <h1>My List</h1>
        {count > 0 && <span className="muted">{count} saved</span>}
      </div>
      <MovieGrid
        movies={movies}
        loading={loading && !movies.length}
        empty={
          <>
            No movies found. Tap <strong>+</strong> on any title to save it
            here. <Link to="/browse/popular">Browse popular movies</Link>
          </>
        }
      />
    </div>
  );
}
