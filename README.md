# Fancast

**Every fandom gets a cast.**

Fancast is a streaming-style browser for movies, TV shows and the people who make them (TMDB) plus music artists (Deezer), with an on-chain **Fan Club launchpad**: anyone can launch a fan token for any film, show, star or artist through the [Clanker](https://www.clanker.world) v4 factory, with its own Uniswap v4 pool on Base.

## Site map

Two spaces share one account, wallet, search and My List. Switch between them with the toggle next to the logo.

| Space | Sections |
| --- | --- |
| **Fan Clubs** | Home · Launchpad · Titles (Movies, TV shows) · People (Actors & creators, Music artists) · Teams *(soon)* |
| **Watch** *(soon)* | Public-domain films to stream or keep for a fee |

Search, **Docs** (`/docs`), My List and the wallet sit on the right of the top bar. The structure lives in `src/lib/spaces.ts`: adding a section, or giving Watch its own tabs, is a one-line change there. Below 1100px, the space toggle and section tabs move to a second, scrollable row.

## Features

- **Streaming UI** — rotating hero with trailers, horizontal shelves (Trending, Top 10, Now Playing, Popular, Coming Soon), hover-expand tiles, detail pages with cast and recommendations, infinite-scroll browse and search, and My List (saved locally; favorites from the old version carry over).
- **People** — actors and directors get the same treatment as films: a People section (popular / trending), person pages with bio, socials, "Known for" and "Latest & upcoming" rows, a People tab in search, clickable cast and director credits, and **Follow** to track people in My List.
- **TV shows** — TMDB TV catalog with Trending / Popular / Top Rated / On The Air / Airing Today, show pages with seasons, cast (episode counts), creators, rating, trailer and recommendations; save shows to My List. People pages include TV credits (talk and reality appearances filtered out).
- **Music** — Deezer artist charts by genre, artist pages with 30-second previews of top tracks, albums, "Fans also like", follow, and a Music tab in search.
- **One identity per person** — actors and musicians are linked through Wikidata (see below), so a crossover star shows once in search, their actor page includes their music, their artist page includes their screen work, and following either follows them.
- **Wallet (ethers.js v6)** — EIP-6963 multi-wallet discovery with a `window.ethereum` fallback, silent reconnect, Base network switch/add, ETH balance, copy/explorer/disconnect menu.
- **Fan Clubs**
  - Every movie, TV show, person and music artist page has a **Fan Club** panel. With no club yet, it offers a one-click **Launch fan club** flow.
  - Launches build the deploy call with `clanker-sdk/v4` (`getDeployTransaction`), encode it with ethers, gas-estimate (surfaces reverts before the wallet prompt), send through the connected signer, and parse `TokenCreated` from the receipt.
  - Options: name, ticker, description, poster/backdrop image, launch curve (Standard / Tiered / Premiere), swap fee (flat 1% or dynamic 1–5%), optional creator buy, optional creator vault with lockup.
  - Tokens are tagged with social context `interface: "Fancast"` (clubs tagged with the earlier `"TMDB Fan Club"` are still discovered) and `messageId: movie/<id>`, `tv/<id>`, `person/<id>` (TMDB) or `artist/<id>` (Deezer), so clubs launched by anyone are discovered and mapped back to their subject.
  - Live price, market cap, 24h change, volume, liquidity and trades come from DexScreener, with an embedded chart. **When no pool or chart exists yet, designed placeholders are shown** (detail panel and launchpad cards).
  - Connected wallets see their stake in each club.
  - `/fan-clubs` launchpad: totals, Films / TV / People / Music filter, Top / New / Gainers sorting, and a movie-or-person picker that deep-links into the launch flow.

## Identity (one person, one club)

Fancast keys every real person to their **Wikidata item** (Q-id). Each catalog plugs in through the Wikidata property that stores its id, so adding a source is one line — not a matcher for every pair of sources.

| Catalog | Wikidata property |
| --- | --- |
| TMDB person | `P4985` |
| Deezer artist | `P2722` |
| Sports (planned) | the athlete catalog's property, or name + date of birth where none exists |

- **Exact links only:** no fuzzy name matching, so different people who share a name are never merged. If Wikidata has no link, profiles simply stay separate.
- **One fan club per person:** when linked, the TMDB person is the canonical club subject and other catalog ids are aliases. Clubs launched from any page — or before linking existed — are found everywhere, and the earliest stays the official club. New launches stamp the Wikidata id (`wd:Q…`) and every catalog URL into the token metadata.
- **Search:** the **All** tab merges people and artists so each person appears once (e.g. "Acting · Music").
- **Efficient:** lookups are batched into one SPARQL query per screen, cached a day at the CDN by `/api/identity` (with a proper User-Agent), and a week in the browser. Without the API (static hosts) the browser queries Wikidata directly. If Wikidata is unavailable, pages still work, just unlinked.

## Live market data (indexer)

Once trading picks up, Fancast tracks every club itself instead of asking outside sites on each page view.

- **What it indexes:** Clanker v4 `TokenCreated` events tagged `Fancast` (new clubs) and Uniswap v4 `Swap` events on those pools (every buy and sell), straight from Base via `eth_getLogs`.
- **What it computes:** price, market cap, 1h/24h change, 1h/24h volume, buys vs sells, unique traders, a **trending score**, and OHLCV candles.
- **Trending score:** recent money and breadth of buyers — `3·ln(1+vol1h) + ln(1+vol24h) + 2·√traders24h + 1.5·ln(1+buys1h)` — multiplied by a freshness decay (`e^(−hours since last trade / 12)`), plus a short boost for clubs launched in the last 2 hours.
- **API (Vercel Functions):** `/api/clubs?sort=trending|new|top|gainers|volume&kind=&subject=`, `/api/club?address=`, `/api/trades`, `/api/candles?address=&tf=5m|15m|1h|4h|1d`, `/api/sync`.
- **Efficient by design:** responses are cached at the CDN for 5–15 s, so a traffic spike costs one database query. Any read older than 15 s triggers a background sync, so no cron is required (Vercel Hobby only allows daily crons). A sync takes a short lease so concurrent requests never double-index.
- **UI:** Trending is the default sort on Home and the launchpad, clubs get Fancast's own candlestick chart (with placeholders when there are no trades), a recent-trades table, and the launchpad shows a live activity feed. Without the indexer, everything falls back to the Clanker API and DexScreener.

### Turn it on (Vercel)

1. **Storage → Create → Neon Postgres** on the Vercel project. This sets `DATABASE_URL`.
2. Add `RPC_URL` — a Base RPC with `eth_getLogs` (Alchemy, QuickNode, etc.).
3. Add `INDEXER_START_BLOCK` — the Base block of your first launch (or leave unset to backfill ~7 days).
4. Redeploy. Tables are created automatically on first request.
5. Optional: keep data hot with no visitors by pinging `/api/sync` every minute (Vercel Cron on Pro, or any uptime monitor). Set `CRON_SECRET` to protect it.

### Try it locally

```bash
npm run mock-chain                      # fake Base with launches + swaps on :8545
cat > .env.local <<'ENV'
DATABASE_URL=pglite:./.data
RPC_URL=http://localhost:8545
ETH_USD_FEED=0x00000000000000000000000000000000000feed0
INDEXER_START_BLOCK=39990000
ENV
npm run dev                             # /api routes are served by Vite in dev
curl -X POST localhost:8545/admin/tick  # simulate more trades
```

## Brand

Logo files live in `public/brand/`: the fan mark (five blades opening from one point), the primary lockup for dark and light backgrounds, a stacked lockup, and one-color white/black versions. App icons (`favicon.svg`, `favicon.ico`, `icon-192/512.png`, maskable, `apple-touch-icon.png`) and the 1200×630 social card (`og.png`) are in `public/`. Colors: ink `#0E0E13`, bone `#F4F2EE`, gold `#F5C451`, deep gold `#C98A14`. The wordmark is Bricolage Grotesque ExtraBold (SIL OFL), outlined.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # typecheck + production build into ./build
npm run preview
```

Copy `.env.example` to `.env` to configure:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_TMDB_API_KEY` | key from the original project | TMDB v3 API key |
| `VITE_CHAIN_ID` | `8453` | `8453` Base, `84532` Base Sepolia |
| `VITE_RPC_URL` | public Base RPC | Read-only calls (fan token balances) |
| `VITE_CLANKER_API` | `/clanker-api` | Clanker API base (proxied, see below) |
| `VITE_PLATFORM_FEE_RECIPIENT` | — | Optional: route a share of LP rewards to the platform |
| `VITE_PLATFORM_FEE_BPS` | `2000` | Platform share in bps (max 5000) when a recipient is set |

### API proxies

Deezer's catalog API has no CORS headers either, so it is proxied at `/deezer-api` the same way (Vite in dev, `vercel.json` on Vercel). On hosts without the proxy, music rows hide themselves.

### Clanker API proxy

The Clanker API doesn't send CORS headers, so the app calls it through `/clanker-api`:

- **Dev:** proxied by Vite (`vite.config.ts`).
- **Vercel:** proxied by `vercel.json` rewrites — deploy as-is.
- **Static hosts (e.g. Surge):** no proxy, so global discovery is unavailable; the app falls back to fan clubs launched from the current browser and shows a notice. Point `VITE_CLANKER_API` at any proxy that forwards to `https://www.clanker.world/api` to enable it.

## Stack

Vite · React 19 · TypeScript · React Router 7 · TanStack Query 5 · ethers 6 · clanker-sdk 4 (code-split, loaded only when launching) · lightweight-charts · Vercel Functions + Postgres (indexer).

---

Movie data from [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB. Fan tokens are speculative and not investments.
