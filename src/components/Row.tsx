import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from './Icons';

interface RowProps {
  title: ReactNode;
  href?: string;
  children: ReactNode;
  loading?: boolean;
  variant?: 'tile' | 'rank' | 'card';
  action?: ReactNode;
}

/** Horizontally scrolling shelf with snap + paging arrows. */
export default function Row({
  title,
  href,
  children,
  loading,
  variant = 'tile',
  action,
}: RowProps) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = () => {
    const el = track.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [children]);

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (el)
      el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <section className={`row row--${variant}`}>
      <div className="row__head">
        <h2>
          {href ? (
            <Link to={href}>
              {title} <ChevronRight size={18} />
            </Link>
          ) : (
            title
          )}
        </h2>
        {action}
      </div>
      <div className="row__wrap">
        {!edges.start && (
          <button
            className="row__arrow row__arrow--left"
            onClick={() => page(-1)}
            aria-label="Scroll left"
          >
            <ChevronLeft size={28} />
          </button>
        )}
        <div className="row__track" ref={track} onScroll={measure}>
          {loading
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={`skeleton skeleton--${variant}`} />
              ))
            : children}
        </div>
        {!edges.end && (
          <button
            className="row__arrow row__arrow--right"
            onClick={() => page(1)}
            aria-label="Scroll right"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </section>
  );
}
