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
        <Link to="/" className="logo" aria-label="Fancast home">
          <img src="/brand/fancast-logo.svg" alt="Fancast" width="130" height="30" />
        </Link>

        <nav className="nav__links">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/browse/popular">Movies</NavLink>
          <NavLink to="/shows">TV</NavLink>
          <NavLink to="/people">People</NavLink>
          <NavLink to="/music">Music</NavLink>
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
              placeholder="Movies, shows, people, artists"
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
        <NavLink to="/shows">TV</NavLink>
        <NavLink to="/people">People</NavLink>
        <NavLink to="/music">Music</NavLink>
        <NavLink to="/fan-clubs">Fan Clubs</NavLink>
        <NavLink to="/my-list">My List</NavLink>
      </nav>
    </header>
  );
}
