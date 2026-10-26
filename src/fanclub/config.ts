import { getAddress, isAddress } from 'ethers';

interface ChainConfig {
  id: number;
  hex: string;
  name: string;
  slug: string; // dexscreener / geckoterminal network slug
  rpc: string;
  explorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  uniswapChain: string;
}

const CHAINS: Record<number, ChainConfig> = {
  8453: {
    id: 8453,
    hex: '0x2105',
    name: 'Base',
    slug: 'base',
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    uniswapChain: 'base',
  },
  84532: {
    id: 84532,
    hex: '0x14a34',
    name: 'Base Sepolia',
    slug: 'base-sepolia',
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    uniswapChain: 'base_sepolia',
  },
};

const envChain = Number(import.meta.env.VITE_CHAIN_ID || 8453);
export const CHAIN: ChainConfig = CHAINS[envChain] ?? CHAINS[8453];
if (import.meta.env.VITE_RPC_URL) CHAIN.rpc = import.meta.env.VITE_RPC_URL;

/** Social-context interface tag stamped on every fan club token we deploy. */
export const FAN_CLUB_INTERFACE = 'TMDB Fan Club';
export const FAN_CLUB_PLATFORM = 'tmdb';

export const CLANKER_API = (
  import.meta.env.VITE_CLANKER_API || '/clanker-api'
).replace(/\/$/, '');

const rawFeeRecipient = import.meta.env.VITE_PLATFORM_FEE_RECIPIENT;
export const PLATFORM_FEE =
  rawFeeRecipient && isAddress(rawFeeRecipient)
    ? {
        recipient: getAddress(rawFeeRecipient),
        bps: Math.min(
          Math.max(Number(import.meta.env.VITE_PLATFORM_FEE_BPS || 2000), 0),
          5000,
        ),
      }
    : null;

export const links = {
  token: (a: string) => `${CHAIN.explorer}/token/${a}`,
  tx: (h: string) => `${CHAIN.explorer}/tx/${h}`,
  address: (a: string) => `${CHAIN.explorer}/address/${a}`,
  clanker: (a: string) => `https://www.clanker.world/clanker/${a}`,
  uniswap: (a: string) =>
    `https://app.uniswap.org/swap?chain=${CHAIN.uniswapChain}&inputCurrency=NATIVE&outputCurrency=${a}`,
  dexscreener: (a: string) => `https://dexscreener.com/${CHAIN.slug}/${a}`,
  dexscreenerEmbed: (pairOrToken: string) =>
    `https://dexscreener.com/${CHAIN.slug}/${pairOrToken}?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15`,
};
