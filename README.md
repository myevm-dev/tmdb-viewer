# Reel — Movies & Fan Clubs

A streaming-style movie browser (TMDB) with an on-chain **Fan Club launchpad**: anyone can launch a fan token for any film through the [Clanker](https://www.clanker.world) v4 factory, with its own Uniswap v4 pool on Base.

## Features

- **Streaming UI** — rotating hero with trailers, horizontal shelves (Trending, Top 10, Now Playing, Popular, Coming Soon), hover-expand tiles, detail pages with cast and recommendations, infinite-scroll browse and search, and My List (saved locally; favorites from the old version carry over).
- **Wallet (ethers.js v6)** — EIP-6963 multi-wallet discovery with a `window.ethereum` fallback, silent reconnect, Base network switch/add, ETH balance, copy/explorer/disconnect menu.
- **Fan Clubs**
  - Every movie page has a **Fan Club** panel. With no club yet, it offers a one-click **Launch fan club** flow.
  - Launches build the deploy call with `clanker-sdk/v4` (`getDeployTransaction`), encode it with ethers, gas-estimate (surfaces reverts before the wallet prompt), send through the connected signer, and parse `TokenCreated` from the receipt.
  - Options: name, ticker, description, poster/backdrop image, launch curve (Standard / Tiered / Premiere), swap fee (flat 1% or dynamic 1–5%), optional creator buy, optional creator vault with lockup.
  - Tokens are tagged with social context `interface: "TMDB Fan Club"` and `messageId: movie/<tmdbId>`, so clubs launched by anyone are discovered through the Clanker API and mapped back to their movie.
  - Live price, market cap, 24h change, volume, liquidity and trades come from DexScreener, with an embedded chart. **When no pool or chart exists yet, designed placeholders are shown** (detail panel and launchpad cards).
  - Connected wallets see their stake in each club.
  - `/fan-clubs` launchpad: totals, Top / New / Gainers sorting, and a movie picker that deep-links into the launch flow.

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

### Clanker API proxy

The Clanker API doesn't send CORS headers, so the app calls it through `/clanker-api`:

- **Dev:** proxied by Vite (`vite.config.ts`).
- **Vercel:** proxied by `vercel.json` rewrites — deploy as-is.
- **Static hosts (e.g. Surge):** no proxy, so global discovery is unavailable; the app falls back to fan clubs launched from the current browser and shows a notice. Point `VITE_CLANKER_API` at any proxy that forwards to `https://www.clanker.world/api` to enable it.

## Stack

Vite · React 19 · TypeScript · React Router 7 · TanStack Query 5 · ethers 6 · clanker-sdk 4 (code-split, loaded only when launching).

---

Movie data from [TMDB](https://www.themoviedb.org). This product uses the TMDB API but is not endorsed or certified by TMDB. Fan tokens are speculative and not investments.
