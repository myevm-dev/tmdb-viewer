import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FilmIcon, RocketIcon, UsersIcon } from '../components/Icons';

interface Plan {
  title: string;
  body: string;
}

function ComingSoon({
  eyebrow,
  title,
  lede,
  plans,
  icon,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  plans: Plan[];
  icon: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="page soon-page">
      <section className="soon-page__hero">
        <span className="soon-page__icon" aria-hidden>
          {icon}
        </span>
        <span className="hero__eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="muted">{lede}</p>
        <div className="soon-page__actions">{actions}</div>
      </section>
      <section className="how" aria-label="What's planned">
        {plans.map((p, i) => (
          <div key={p.title} className="how__step">
            <span className="how__n">0{i + 1}</span>
            <strong>{p.title}</strong>
            <span className="muted">{p.body}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

export function Watch() {
  return (
    <ComingSoon
      eyebrow="Watch · Coming soon"
      title={
        <>
          Classic films, <em>streamed in full.</em>
        </>
      }
      lede="A catalog of public-domain movies you can stream or keep for a small fee. It shares your account, wallet and My List with Fan Clubs."
      icon={<FilmIcon size={28} />}
      plans={[
        {
          title: 'Public-domain catalog',
          body: 'Silent-era classics, noir, sci-fi and cult films whose copyright has expired, restored where possible.',
        },
        {
          title: 'Pay per film',
          body: 'Stream a title or keep it in your library. No subscription.',
        },
        {
          title: 'Linked to fan clubs',
          body: 'Every film and its cast link to their fan clubs, so watching and fandom live side by side.',
        },
      ]}
      actions={
        <>
          <Link className="btn btn--gold btn--lg" to="/fan-clubs">
            <RocketIcon size={18} /> Explore fan clubs
          </Link>
          <Link className="btn btn--glass btn--lg" to="/docs#watch">
            How Watch will work
          </Link>
        </>
      }
    />
  );
}

export function Teams() {
  return (
    <ComingSoon
      eyebrow="Fan Clubs · Teams · Coming soon"
      title={
        <>
          Teams and athletes are <em>next.</em>
        </>
      }
      lede="Fan clubs for sports teams and the athletes on them. Athletes plug into the same identity system as actors and musicians, so one person keeps one profile and one club."
      icon={<UsersIcon size={28} />}
      plans={[
        {
          title: 'Team clubs',
          body: 'A fan club for every team, with rosters linking to each player.',
        },
        {
          title: 'Athlete profiles',
          body: 'Athletes who also act or make music show up once, with every side of their career together.',
        },
        {
          title: 'Same launchpad',
          body: 'Team and athlete clubs launch, trade and rank exactly like film and people clubs.',
        },
      ]}
      actions={
        <>
          <Link className="btn btn--gold btn--lg" to="/people/popular">
            Browse people
          </Link>
          <Link className="btn btn--glass btn--lg" to="/docs#identity">
            How profiles link
          </Link>
        </>
      }
    />
  );
}
