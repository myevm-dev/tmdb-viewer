import { useEffect, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { ConnectButton } from '../wallet/WalletUI';
import { CloseIcon, SearchIcon } from './Icons';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const onSearch = location.pathname === '/search';
  const [query, setQuery] = useState(onSearch ? (params.get('q') ?? '') : '');
  const [open, setOpen] = useState(onSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!onSearch) {
      setQuery('');
      setOpen(false);
    }
  }, [onSearch]);

  const update = (q: string) => {
    setQuery(q);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (q.trim())
        navigate(`/search?q=${encodeURIComponent(q.trim())}`, {
          replace: onSearch,
        });
    }, 350);
  };

  return (
    <header className={`nav ${scrolled ? 'nav--solid' : ''}`}>
      <div className="nav__inner">
        <Link to="/" className="logo" aria-label="Reel home">
          <svg viewBox="0 0 64 64" width="26" height="26" aria-hidden>
            <circle
              cx="32"
              cy="32"
              r="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
            />
            <circle cx="32" cy="32" r="4.5" fill="currentColor" />
            <circle cx="32" cy="21" r="3" fill="currentColor" />
            <circle cx="32" cy="43" r="3" fill="currentColor" />
            <circle cx="21" cy="32" r="3" fill="currentColor" />
            <circle cx="43" cy="32" r="3" fill="currentColor" />
          </svg>
          <span>REEL</span>
        </Link>

        <nav className="nav__links">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/browse/popular">Movies</NavLink>
          <NavLink to="/fan-clubs" className="nav__fan">
            Fan Clubs
          </NavLink>
          <NavLink to="/my-list">My List</NavLink>
        </nav>

        <div className="nav__right">
          <div className={`search ${open ? 'is-open' : ''}`}>
            <button
              className="icon-btn"
              aria-label="Search"
              onClick={() => {
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
            >
              <SearchIcon />
            </button>
            <input
              ref={inputRef}
              value={query}
              placeholder="Titles, franchises, years"
              onChange={(e) => update(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  clearTimeout(timer.current);
                  navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                }
                if (e.key === 'Escape') setOpen(false);
              }}
              onBlur={() => !query && setOpen(false)}
            />
            {open && query && (
              <button
                className="icon-btn icon-btn--sm"
                aria-label="Clear search"
                onClick={() => update('')}
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>
          <ConnectButton />
        </div>
      </div>
      <nav className="nav__mobile">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/browse/popular">Movies</NavLink>
        <NavLink to="/fan-clubs">Fan Clubs</NavLink>
        <NavLink to="/my-list">My List</NavLink>
      </nav>
    </header>
  );
}
