import { createStore } from './storage';
import type { MediaType } from './tmdb';

/** Saved titles, keyed "movie:123" / "tv:456" (movie and TV ids overlap). */
type Key = `${MediaType}:${number}`;

const myListStore = createStore<Key[]>('reel:my-list', [], () => {
  // Favorites saved by the original Redux version of the app.
  const legacy = localStorage.getItem('tmdb-viewer');
  if (!legacy) return undefined;
  const parsed = JSON.parse(legacy) as { favorites?: number[] };
  return Array.isArray(parsed.favorites)
    ? parsed.favorites.map((id) => `movie:${id}` as Key)
    : undefined;
});

// Lists saved before TV support stored bare movie ids.
const normalize = (list: (Key | number)[]): Key[] =>
  list.map((k) => (typeof k === 'number' ? (`movie:${k}` as Key) : k));

export function useMyList() {
  const list = normalize(myListStore.use() as (Key | number)[]);
  const key = (kind: MediaType, id: number) => `${kind}:${id}` as Key;
  return {
    entries: list.map((k) => {
      const [kind, id] = k.split(':');
      return { kind: kind as MediaType, id: Number(id) };
    }),
    count: list.length,
    has: (kind: MediaType, id: number) => list.includes(key(kind, id)),
    toggle: (kind: MediaType, id: number) =>
      myListStore.set((prev) => {
        const cur = normalize(prev as (Key | number)[]);
        const k = key(kind, id);
        return cur.includes(k) ? cur.filter((x) => x !== k) : [k, ...cur];
      }),
  };
}
