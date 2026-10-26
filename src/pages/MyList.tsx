import { Link } from 'react-router-dom';
import MovieGrid from '../components/MovieGrid';
import PeopleGrid from '../components/PeopleGrid';
import { useMyListMovies, useFollowedPeople } from './MyListRow';

export default function MyList() {
  const { movies, loading, count } = useMyListMovies();
  const people = useFollowedPeople();

  return (
    <div className="page">
      <div className="page__head">
        <h1>My List</h1>
        {count + people.count > 0 && (
          <span className="muted">
            {count} {count === 1 ? 'film' : 'films'} · {people.count} following
          </span>
        )}
      </div>

      <h2 className="sub-head">Films</h2>
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

      <h2 className="sub-head">Following</h2>
      <PeopleGrid
        people={people.people}
        loading={people.loading && !people.people.length}
        empty={
          <>
            You’re not following anyone yet. Tap <strong>Follow</strong> on an
            actor or director to track them here.{' '}
            <Link to="/people">Browse people</Link>
          </>
        }
      />
    </div>
  );
}
