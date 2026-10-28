import { Link, useLocation } from 'react-router-dom';
import { SUBSECTIONS } from '../lib/spaces';

/** Movies | TV shows, or Actors & creators | Music artists. */
export default function SectionTabs({
  section,
}: {
  section: keyof typeof SUBSECTIONS;
}) {
  const { pathname } = useLocation();
  return (
    <nav className="section-tabs" aria-label={section === 'titles' ? 'Titles' : 'People'}>
      {SUBSECTIONS[section].map((t) => {
        const active = t.match.test(pathname);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`section-tabs__item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
