import { useEffect, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { ConnectButton } from '../wallet/WalletUI';
import { BookIcon, BookmarkIcon, CloseIcon, SearchIcon } from './Icons';
import { SECTIONS, SPACES, spaceOf, type NavItem } from '../lib/spaces';

function SpaceSwitch({ pathname }: { pathname: string }) {
  const current = spaceOf(pathname);
  return (
    <nav className="spaces" aria-label="Spaces">
      {SPACES.map((s) => (
        <Link
          key={s.id}
          to={s.to}
          className={`spaces__item ${current === s.id ? 'is-active' : ''}`}
          aria-current={current === s.id ? 'page' : undefined}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

function SectionLinks({
  items,
  pathname,
  className,
}: {
  items: NavItem[];
  pathname: string;
  className: string;
}) {
  if (!items.length) return null;
  return (
    <nav className={className} aria-label="Sections">
      {items.map((item) => {
        const active = item.match.test(pathname);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={active ? 'active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
            {item.soon && <span className="soon">Soon</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const onSearch = pathname === '/search';
  const [query, setQuery] = useState(onSearch ? (params.get('q') ?? '') : '');
  const [open, setOpen] = useState(onSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const space = spaceOf(pathname);
  const sections = space ? SECTIONS[space] : [];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keep the active section visible in the scrolling mobile tab strip.
  useEffect(() => {
    const strip = mobileRef.current;
    const el = strip?.querySelector<HTMLElement>('.nav__mobile-links a.active');
    if (!strip || !el || strip.scrollWidth <= strip.clientWidth) return;
    const pad = 24;
    if (el.offsetLeft + el.offsetWidth > strip.scrollLeft + strip.clientWidth - pad)
      strip.scrollLeft = el.offsetLeft + el.offsetWidth - strip.clientWidth + pad;
    else if (el.offsetLeft < strip.scrollLeft) strip.scrollLeft = el.offsetLeft - pad;
  }, [pathname]);

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
    <header
      className={`nav ${scrolled ? 'nav--solid' : ''} ${open ? 'nav--searching' : ''}`}
    >
      <div className="nav__inner">
        <Link to="/" className="logo" aria-label="Fancast home">
          <img
            src="/brand/fancast-logo.svg"
            alt="Fancast"
            width="130"
            height="30"
          />
        </Link>

        <div className="nav__primary">
          <SpaceSwitch pathname={pathname} />
          <SectionLinks
            items={sections}
            pathname={pathname}
            className="nav__links"
          />
        </div>

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
              aria-label="Search"
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
          <NavLink to="/docs" className="nav__util" title="Docs">
            <BookIcon size={18} />
            <span>Docs</span>
          </NavLink>
          <NavLink
            to="/my-list"
            className="nav__util nav__util--icon"
            title="My List"
            aria-label="My List"
          >
            <BookmarkIcon size={18} />
          </NavLink>
          <ConnectButton />
        </div>
      </div>

      <div className="nav__mobile" ref={mobileRef}>
        <SpaceSwitch pathname={pathname} />
        <SectionLinks
          items={sections}
          pathname={pathname}
          className="nav__mobile-links"
        />
      </div>
    </header>
  );
}
