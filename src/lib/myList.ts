import { createStore } from './storage';
import type { MovieID } from './tmdb';

// Migrates favorites saved by the previous Redux version of the app.
const myListStore = createStore<MovieID[]>('reel:my-list', [], () => {
  const legacy = localStorage.getItem('tmdb-viewer');
  if (!legacy) return undefined;
  const parsed = JSON.parse(legacy) as { favorites?: MovieID[] };
  return Array.isArray(parsed.favorites) ? parsed.favorites : undefined;
});

export function useMyList() {
  const list = myListStore.use();
  return {
    list,
    has: (id: MovieID) => list.includes(id),
    toggle: (id: MovieID) =>
      myListStore.set((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev],
      ),
  };
}
