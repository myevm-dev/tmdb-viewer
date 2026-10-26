import { useSyncExternalStore } from 'react';

/**
 * Tiny localStorage-backed store with cross-tab sync, usable from React via
 * `useStore`. Reads/writes never throw (private mode, blocked storage, etc.).
 */
export function createStore<T>(
  key: string,
  initial: T,
  migrate?: () => T | undefined,
) {
  const listeners = new Set<() => void>();

  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
      const migrated = migrate?.();
      if (migrated !== undefined) return migrated;
    } catch {
      /* ignore */
    }
    return initial;
  };

  let state = read();

  const set = (next: T | ((prev: T) => T)) => {
    state = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === key) {
        state = read();
        listeners.forEach((l) => l());
      }
    });
  }

  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  return {
    get: () => state,
    set,
    subscribe,
    use: () => useSyncExternalStore(subscribe, () => state),
  };
}
