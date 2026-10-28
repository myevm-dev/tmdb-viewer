import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CHAIN, PLATFORM_FEE } from '../fanclub/config';
import { FEE_PRESETS, LIQUIDITY_PRESETS } from '../fanclub/deploy';

interface DocSection {
  id: string;
  group: string;
  title: string;
  body: ReactNode;
}

const pct = (bps: number) => `${(bps / 100).toLocaleString('en-US')}%`;

const SECTIONS: DocSection[] = [
  {
    id: 'overview',
    group: 'Start here',
    title: 'What is Fancast?',
    body: (
      <>
        <p>
          Fancast is home to fan clubs for the people and stories you love,
          and a place to watch classic films. It has two spaces that share one
          account, wallet, search and My List:
        </p>
        <ul>
          <li>
            <strong>Fan Clubs.</strong> Discover movies, TV shows, actors,
            creators and music artists, and launch or join a fan club for any
            of them.
          </li>
          <li>
            <strong>Watch</strong> <span className="soon">Soon</span>. Stream
            or keep public-domain films for a small fee.
          </li>
        </ul>
        <p>
          Switch spaces from the toggle next to the logo. Search, Docs, My List
          and your wallet are always on the right.
        </p>
      </>
    ),
  },
  {
    id: 'navigating',
    group: 'Start here',
    title: 'Finding your way around',
    body: (
      <>
        <p>Inside Fan Clubs, everything is grouped by what a club is for:</p>
        <ul>
          <li>
            <strong>Home</strong>: trending clubs, what's popular now, and your
            list.
          </li>
          <li>
            <strong>Launchpad</strong>: every club, ranked by trending, new,
            top or gainers, plus a live trade feed.
          </li>
          <li>
            <strong>Titles</strong>: <Link to="/browse/popular">Movies</Link>{' '}
            and <Link to="/shows/trending">TV shows</Link>.
          </li>
          <li>
            <strong>People</strong>:{' '}
            <Link to="/people/popular">Actors &amp; creators</Link> and{' '}
            <Link to="/music">Music artists</Link>.
          </li>
          <li>
            <strong>Teams</strong> <span className="soon">Soon</span>: sports
            teams and athletes.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'fan-clubs',
    group: 'Fan Clubs',
    title: 'What a fan club is',
    body: (
      <>
        <p>
          A fan club is a token tied to one film, show, person or artist. It
          is launched through the Clanker v4 factory on {CHAIN.name} and gets
          its own Uniswap v4 pool, so anyone can join by buying in and leave by
          selling.
        </p>
        <p>
          Each subject has one official club: the earliest one launched for it.
          Clubs launched for the same person from different pages (for example
          their actor page and their artist page) count as the same subject.
        </p>
      </>
    ),
  },
  {
    id: 'launching',
    group: 'Fan Clubs',
    title: 'Launching a club',
    body: (
      <>
        <ol>
          <li>Connect a wallet (top right).</li>
          <li>
            Open any movie, show, person or artist page and choose{' '}
            <strong>Launch fan club</strong>, or start from the{' '}
            <Link to="/fan-clubs">Launchpad</Link>.
          </li>
          <li>
            Set the name, ticker, description and image. They are filled in for
            you from the subject.
          </li>
          <li>
            Pick a launch curve and a swap fee, and optionally a creator buy
            and a creator vault.
          </li>
          <li>
            Confirm the single transaction in your wallet. The club appears as
            soon as it's mined.
          </li>
        </ol>
        <h3>Launch curves</h3>
        <ul>
          {Object.values(LIQUIDITY_PRESETS).map((p) => (
            <li key={p.label}>
              <strong>{p.label}</strong>: {p.blurb}
            </li>
          ))}
        </ul>
        <h3>Creator options</h3>
        <ul>
          <li>
            <strong>Creator buy</strong>: buy some of the club with ETH in the
            same transaction, before anyone else can.
          </li>
          <li>
            <strong>Creator vault</strong>: set aside a share of the supply for
            yourself, locked for at least 7 days.
          </li>
        </ul>
        <p className="muted">
          You pay the network fee for the launch transaction in ETH.
        </p>
      </>
    ),
  },
  {
    id: 'fees',
    group: 'Fan Clubs',
    title: 'Fees & rewards',
    body: (
      <>
        <p>Every trade in a club's pool pays a swap fee:</p>
        <ul>
          {Object.values(FEE_PRESETS).map((p) => (
            <li key={p.label}>
              <strong>{p.label}</strong>: {p.blurb}
            </li>
          ))}
        </ul>
        <p>
          The launcher's wallet receives the club's liquidity-pool rewards from
          those fees
          {PLATFORM_FEE ? (
            <>
              , with <strong>{pct(PLATFORM_FEE.bps)}</strong> going to Fancast
              to run the platform
            </>
          ) : null}
          . Rewards are claimed through Clanker.
        </p>
      </>
    ),
  },
  {
    id: 'trading',
    group: 'Fan Clubs',
    title: 'Trading, charts & trending',
    body: (
      <>
        <p>
          Every club page links to Uniswap to buy or sell, and shows price,
          market cap, 24-hour change, volume, a candlestick chart and recent
          trades. Before a club's first trade, you'll see a placeholder instead
          of a chart.
        </p>
        <p>
          <strong>Trending</strong> ranks clubs by recent volume and how many
          different people are buying, fades clubs that go quiet, and gives
          brand-new clubs a short boost.
        </p>
        <p>
          Connected wallets see how much of each club they hold.
        </p>
      </>
    ),
  },
  {
    id: 'identity',
    group: 'Fan Clubs',
    title: 'One person, one profile',
    body: (
      <>
        <p>
          Some people are both actors and musicians. Fancast links their
          profiles through Wikidata, so a crossover star appears once in
          search, their actor page shows their music, their artist page shows
          their screen work, and following either follows them.
        </p>
        <p>
          Links are exact: profiles are only joined when Wikidata says they
          are the same person, never by matching names. If there is no link,
          the profiles stay separate.
        </p>
        <p>Athletes will join the same system when Teams launches.</p>
      </>
    ),
  },
  {
    id: 'watch',
    group: 'Watch',
    title: 'Watch (coming soon)',
    body: (
      <>
        <p>
          Watch will be a catalog of public-domain films (movies whose
          copyright has expired) that you can stream or keep for a small fee,
          with no subscription.
        </p>
        <p>
          It shares your account, wallet and My List with Fan Clubs, and every
          film links to its fan club and cast.
        </p>
      </>
    ),
  },
  {
    id: 'wallet',
    group: 'Account',
    title: 'Wallet & network',
    body: (
      <>
        <p>
          Fancast works with any browser wallet (MetaMask, Coinbase Wallet,
          Rabby and others). It finds the wallets you have installed and
          reconnects you automatically next time.
        </p>
        <p>
          Clubs live on <strong>{CHAIN.name}</strong>. If your wallet is on
          another network, Fancast asks it to switch (and adds {CHAIN.name} if
          it's missing).
        </p>
      </>
    ),
  },
  {
    id: 'my-list',
    group: 'Account',
    title: 'My List & following',
    body: (
      <p>
        Save films and shows, and follow people and artists, from any page.{' '}
        <Link to="/my-list">My List</Link> (the bookmark icon) keeps them in
        one place. It's stored in this browser.
      </p>
    ),
  },
  {
    id: 'risks',
    group: 'Legal',
    title: 'Risks & disclaimers',
    body: (
      <>
        <ul>
          <li>
            Fan club tokens are speculative collectibles, not investments. Their
            price can go to zero.
          </li>
          <li>
            Anyone can launch a club. A club is not endorsed by, or affiliated
            with, the person, studio, label or team it is about.
          </li>
          <li>
            Blockchain transactions are final. Check every transaction in your
            wallet before you confirm it.
          </li>
        </ul>
        <p className="muted">
          Movie, TV and people data from TMDB. This product uses the TMDB API
          but is not endorsed or certified by TMDB. Music data and previews
          from Deezer. Identity links from Wikidata.
        </p>
      </>
    ),
  },
];

const GROUPS = [...new Set(SECTIONS.map((s) => s.group))];

export default function Docs() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: '-20% 0px -65% 0px' },
    );
    els.forEach((el) => io.observe(el));
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
    else window.scrollTo({ top: 0 });
    return () => io.disconnect();
  }, []);

  return (
    <div className="page docs">
      <aside className="docs__nav" aria-label="Docs contents">
        {GROUPS.map((g) => (
          <div key={g} className="docs__group">
            <span className="docs__group-title">{g}</span>
            {SECTIONS.filter((s) => s.group === g).map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={active === s.id ? 'is-active' : undefined}
                aria-current={active === s.id ? 'true' : undefined}
              >
                {s.title}
              </a>
            ))}
          </div>
        ))}
      </aside>
      <article className="docs__body">
        <header className="docs__head">
          <span className="hero__eyebrow">Docs</span>
          <h1>How Fancast works</h1>
        </header>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="docs__section">
            <h2>{s.title}</h2>
            {s.body}
          </section>
        ))}
      </article>
    </div>
  );
}
