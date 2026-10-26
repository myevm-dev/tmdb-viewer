import { createStore } from './storage';

export type FollowKind = 'person' | 'artist';
type Key = `${FollowKind}:${number}`;

/** People and music artists the viewer follows ("person:123", "artist:456"). */
const followingStore = createStore<Key[]>('reel:following', []);

// Follows saved before artists existed stored bare TMDB person ids.
const normalize = (list: (Key | number)[]): Key[] =>
  list.map((k) => (typeof k === 'number' ? (`person:${k}` as Key) : k));

export function useFollowing() {
  const list = normalize(followingStore.use() as (Key | number)[]);
  const key = (kind: FollowKind, id: number) => `${kind}:${id}` as Key;
  const entries = list.map((k) => {
    const [kind, id] = k.split(':');
    return { kind: kind as FollowKind, id: Number(id) };
  });
  return {
    entries,
    count: list.length,
    has: (kind: FollowKind, id: number) => list.includes(key(kind, id)),
    toggle: (kind: FollowKind, id: number) =>
      followingStore.set((prev) => {
        const cur = normalize(prev as (Key | number)[]);
        const k = key(kind, id);
        return cur.includes(k) ? cur.filter((x) => x !== k) : [k, ...cur];
      }),
  };
}
