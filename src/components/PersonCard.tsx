import { Link } from 'react-router-dom';
import { profileUrl, type Person } from '../lib/tmdb';
import { useFollowing } from '../lib/following';
import { useFanClubSubjects } from '../fanclub/useFanClubSubjects';
import { CheckIcon, PlusIcon } from './Icons';

export function FollowButton({
  id,
  size = 'sm',
}: {
  id: number;
  size?: 'sm' | 'lg';
}) {
  const { has, toggle } = useFollowing();
  const on = has(id);
  return (
    <button
      className={`follow-btn follow-btn--${size} ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
    >
      {on ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
      {on ? 'Following' : 'Follow'}
    </button>
  );
}

/** Round headshot card used for cast lists, people rows and grids. */
export default function PersonCard({
  person,
  subtitle,
}: {
  person: Pick<Person, 'id' | 'name' | 'profile_path'>;
  subtitle?: string;
}) {
  const img = profileUrl(person.profile_path);
  const hasClub = useFanClubSubjects().has('person', person.id);
  return (
    <Link to={`/person/${person.id}`} className="person">
      <div className="person__photo">
        {img ? (
          <img src={img} alt="" loading="lazy" />
        ) : (
          <div className="person__ph">{person.name.slice(0, 1)}</div>
        )}
        {hasClub && (
          <span className="chip chip--gold person__club">FAN CLUB</span>
        )}
      </div>
      <strong>{person.name}</strong>
      {subtitle && <span className="muted small">{subtitle}</span>}
      <FollowButton id={person.id} />
    </Link>
  );
}
