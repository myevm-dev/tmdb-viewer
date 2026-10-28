import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArtistCard } from '../components/PersonCard';
import { getChartArtists, getGenres } from '../lib/deezer';
import SectionTabs from '../components/SectionTabs';

/** Top artists chart, filterable by genre (Deezer). */
export default function Music() {
  const [params, setParams] = useSearchParams();
  const genre = Number(params.get('genre') ?? 0) || 0;

  const genres = useQuery({
    queryKey: ['dz-genres'],
    queryFn: getGenres,
    staleTime: Infinity,
  });
  const chart = useQuery({
    queryKey: ['dz-chart', genre],
    queryFn: () => getChartArtists(genre, 60),
    staleTime: 10 * 60_000,
  });
  const genreName = genres.data?.find((g) => g.id === genre)?.name;

  return (
    <div className="page">
      <SectionTabs section="people" />
      <div className="page__head">
        <h1>{genreName ? `Top ${genreName} Artists` : 'Top Artists'}</h1>
      </div>
      <nav className="pills pills--scroll">
        <button
          className={`pill ${genre === 0 ? 'active' : ''}`}
          onClick={() => setParams({}, { replace: true })}
        >
          All
        </button>
        {genres.data?.map((g) => (
          <button
            key={g.id}
            className={`pill ${genre === g.id ? 'active' : ''}`}
            onClick={() =>
              setParams({ genre: String(g.id) }, { replace: true })
            }
          >
            {g.name}
          </button>
        ))}
      </nav>

      {chart.isLoading ? (
        <div className="people-grid">
          {Array.from({ length: 18 }, (_, i) => (
            <div key={i} className="skeleton skeleton--person" />
          ))}
        </div>
      ) : chart.error ? (
        <div className="empty">
          The music catalog is unavailable right now. Please try again shortly.
        </div>
      ) : chart.data?.data.length ? (
        <div className="people-grid">
          {chart.data.data.map((a, i) => (
            <ArtistCard
              key={a.id}
              artist={a}
              subtitle={`#${a.position ?? i + 1} on the chart`}
            />
          ))}
        </div>
      ) : (
        <div className="empty">No artists in this chart yet.</div>
      )}
    </div>
  );
}
