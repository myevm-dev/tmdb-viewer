/**
 * Site map. Fancast has two spaces that share one account, wallet, search
 * and My List:
 *
 *   Fan Clubs  — discover titles, people and teams; launch and trade clubs
 *   Watch      — stream or buy public-domain films (coming soon)
 *
 * Docs sits outside both. Each space has its own section tabs; sections that
 * cover more than one catalog (Titles, People) get sub-tabs on the page.
 */

export type SpaceId = 'clubs' | 'watch';

export interface NavItem {
  label: string;
  to: string;
  /** Paths that light this item up (detail pages included). */
  match: RegExp;
  soon?: boolean;
}

export const SPACES: (NavItem & { id: SpaceId })[] = [
  {
    id: 'clubs',
    label: 'Fan Clubs',
    to: '/',
    match: /^\/(?!watch|docs)/,
  },
  { id: 'watch', label: 'Watch', to: '/watch', match: /^\/watch(\/|$)/ },
];

export const SECTIONS: Record<SpaceId, NavItem[]> = {
  clubs: [
    { label: 'Home', to: '/', match: /^\/$/ },
    { label: 'Launchpad', to: '/fan-clubs', match: /^\/fan-clubs(\/|$)/ },
    {
      label: 'Titles',
      to: '/browse/popular',
      match: /^\/(browse|shows|movie|tv)(\/|$)/,
    },
    {
      label: 'People',
      to: '/people/popular',
      match: /^\/(people|person|music|artist)(\/|$)/,
    },
    { label: 'Teams', to: '/teams', match: /^\/teams(\/|$)/, soon: true },
  ],
  watch: [],
};

/** Sub-tabs for sections that span more than one catalog. */
export const SUBSECTIONS = {
  titles: [
    { label: 'Movies', to: '/browse/popular', match: /^\/(browse|movie)(\/|$)/ },
    { label: 'TV shows', to: '/shows/trending', match: /^\/(shows|tv)(\/|$)/ },
  ],
  people: [
    {
      label: 'Actors & creators',
      to: '/people/popular',
      match: /^\/(people|person)(\/|$)/,
    },
    {
      label: 'Music artists',
      to: '/music',
      match: /^\/(music|artist)(\/|$)/,
    },
  ],
} satisfies Record<string, NavItem[]>;

export function spaceOf(pathname: string): SpaceId | null {
  if (/^\/docs(\/|$)/.test(pathname)) return null;
  return SPACES.find((s) => s.match.test(pathname))?.id ?? 'clubs';
}
