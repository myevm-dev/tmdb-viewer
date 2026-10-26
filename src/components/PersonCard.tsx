import { Link } from 'react-router-dom';
import { profileUrl, type Person } from '../lib/tmdb';
import { artistImage, type DzArtist } from '../lib/deezer';
import { useFollowing, type FollowKind } from '../lib/following';
import { useFanClubSubjects } from '../fanclub/useFanClubSubjects';
import { compact } from '../lib/format';
import { CheckIcon, PlusIcon } from './Icons';

export function FollowButton({
  id,
  kind = 'person',
  size = 'sm',
}: {
  id: number;
  kind?: FollowKind;
  size?: 'sm' | 'lg';
}) {
  const { has, toggle } = useFollowing();
  const on = has(kind, id);
  return (
    <button
      className={`follow-btn follow-btn--${size} ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(kind, id);
      }}
    >
      {on ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
      {on ? 'Following' : 'Follow'}
    </button>
  );
}

/** Round headshot card shared by people (TMDB) and music artists (Deezer). */
export function ProfileCard({
  kind,
  id,
  name,
  image,
  subtitle,
}: {
  kind: FollowKind;
  id: number;
  name: string;
  image: string | null;
  subtitle?: string;
}) {
  const hasClub = useFanClubSubjects().has(kind, id);
  return (
    <Link to={`/${kind}/${id}`} className={`person person--${kind}`}>
      <div className="person__photo">
        {image ? (
          <img src={image} alt="" loading="lazy" />
        ) : (
          <div className="person__ph">{name.slice(0, 1)}</div>
        )}
        {hasClub && (
          <span className="chip chip--gold person__club">FAN CLUB</span>
        )}
      </div>
      <strong>{name}</strong>
      {subtitle && <span className="muted small">{subtitle}</span>}
      <FollowButton id={id} kind={kind} />
    </Link>
  );
}

export default function PersonCard({
  person,
  subtitle,
}: {
  person: Pick<Person, 'id' | 'name' | 'profile_path'>;
  subtitle?: string;
}) {
  return (
    <ProfileCard
      kind="person"
      id={person.id}
      name={person.name}
      image={profileUrl(person.profile_path)}
      subtitle={subtitle}
    />
  );
}

export function ArtistCard({
  artist,
  subtitle,
}: {
  artist: DzArtist;
  subtitle?: string;
}) {
  return (
    <ProfileCard
      kind="artist"
      id={artist.id}
      name={artist.name}
      image={artistImage(artist, 'medium')}
      subtitle={
        subtitle ??
        (artist.nb_fan ? `${compact(artist.nb_fan)} fans` : 'Artist')
      }
    />
  );
}
