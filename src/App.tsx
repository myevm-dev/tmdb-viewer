import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import Navbar from './components/Navbar';
import { WalletModal } from './wallet/WalletUI';
import Home from './pages/Home';

const Browse = lazy(() => import('./pages/Browse'));
const Search = lazy(() => import('./pages/Search'));
const MovieDetail = lazy(() => import('./pages/MovieDetail'));
const MyList = lazy(() => import('./pages/MyList'));
const FanClubs = lazy(() => import('./pages/FanClubs'));
const People = lazy(() => import('./pages/People'));
const PersonDetail = lazy(() => import('./pages/PersonDetail'));

function TopLoader() {
  const fetching = useIsFetching();
  return (
    <div className={`top-loader ${fetching ? 'is-active' : ''}`} aria-hidden />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TopLoader />
      <Navbar />
      <main>
        <Suspense
          fallback={
            <div className="page">
              <div className="spinner spinner--center" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse/:category" element={<Browse />} />
            <Route path="/search" element={<Search />} />
            <Route path="/movie/:movieId" element={<MovieDetail />} />
            <Route
              path="/people"
              element={<Navigate to="/people/popular" replace />}
            />
            <Route path="/people/:category" element={<People />} />
            <Route path="/person/:personId" element={<PersonDetail />} />
            <Route path="/my-list" element={<MyList />} />
            <Route
              path="/favorites"
              element={<Navigate to="/my-list" replace />}
            />
            <Route path="/fan-clubs" element={<FanClubs />} />
            <Route
              path="*"
              element={
                <div className="page">
                  <div className="empty">
                    Page not found. <Link to="/">Go home</Link>
                  </div>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer className="footer">
        <span>
          Movie data from{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </span>
        <span>
          Fan clubs deploy via{' '}
          <a href="https://www.clanker.world" target="_blank" rel="noreferrer">
            Clanker
          </a>{' '}
          on Uniswap v4. Fan tokens are not investments.
        </span>
      </footer>
      <WalletModal />
    </BrowserRouter>
  );
}
