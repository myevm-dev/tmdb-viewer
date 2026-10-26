import { createStore } from './storage';
import type { PersonID } from './tmdb';

const followingStore = createStore<PersonID[]>('reel:following', []);

/** People the viewer follows — the people equivalent of My List. */
export function useFollowing() {
  const list = followingStore.use();
  return {
    list,
    has: (id: PersonID) => list.includes(id),
    toggle: (id: PersonID) =>
      followingStore.set((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev],
      ),
  };
}
