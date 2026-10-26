import { useMemo } from 'react';
import { useAllFanClubs } from './hooks';
import type { SubjectKind } from './data';

/** Which movies/people already have a fan club (for badges on tiles). */
export function useFanClubSubjects() {
  const { tokens } = useAllFanClubs('new');
  return useMemo(() => {
    const keys = new Set(tokens.map((t) => `${t.kind}:${t.subjectId}`));
    return {
      has: (kind: SubjectKind, id: number) => keys.has(`${kind}:${id}`),
    };
  }, [tokens]);
}
