/**
 * Server-side configuration for the Fancast indexer (Vercel Functions).
 * Everything is driven by environment variables so the same code runs on
 * Base mainnet, Base Sepolia, or a local test chain.
 */

const env = (k: string) => process.env[k]?.trim() || undefined;

interface ChainAddresses {
  rpc: string;
  clankerFactory: string;
  poolManager: string;
  weth: string;
}

// Clanker v4 factory (from clanker-sdk) and Uniswap v4 PoolManager
// (developers.uniswap.org/docs/protocols/v4/deployments).
const CHAINS: Record<number, ChainAddresses> = {
  8453: {
    rpc: 'https://mainnet.base.org',
    clankerFactory: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
    poolManager: '0x498581fF718922c3f8e6A244956aF099B2652b2b',
    weth: '0x4200000000000000000000000000000000000006',
  },
  84532: {
    rpc: 'https://sepolia.base.org',
    clankerFactory: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
    poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
    weth: '0x4200000000000000000000000000000000000006',
  },
};

export const CHAIN_ID = Number(env('CHAIN_ID') ?? env('VITE_CHAIN_ID') ?? 8453);
const chain = CHAINS[CHAIN_ID] ?? CHAINS[8453];

export const config = {
  chainId: CHAIN_ID,
  rpcUrl: env('RPC_URL') ?? chain.rpc,
  databaseUrl: env('DATABASE_URL') ?? env('POSTGRES_URL'),
  clankerFactory: (
    env('CLANKER_FACTORY') ?? chain.clankerFactory
  ).toLowerCase(),
  poolManager: (env('POOL_MANAGER') ?? chain.poolManager).toLowerCase(),
  weth: chain.weth.toLowerCase(),
  /** First block to index. Defaults to ~7 days back on the very first sync. */
  startBlock: env('INDEXER_START_BLOCK')
    ? Number(env('INDEXER_START_BLOCK'))
    : undefined,
  lookbackBlocks: Number(env('INDEXER_LOOKBACK_BLOCKS') ?? 7 * 24 * 60 * 30),
  /** Max blocks per eth_getLogs call; halves automatically when the RPC complains. */
  maxBlockRange: Number(env('INDEXER_MAX_BLOCK_RANGE') ?? 2000),
  confirmations: Number(env('INDEXER_CONFIRMATIONS') ?? 2),
  /** Reads trigger a background sync when data is older than this. */
  staleMs: Number(env('INDEXER_STALE_MS') ?? 15_000),
  /** Wall-clock budget for one sync run. */
  budgetMs: Number(env('INDEXER_BUDGET_MS') ?? 20_000),
  blockTimeSec: 2,
  /** Optional Chainlink ETH/USD aggregator; otherwise Coinbase spot price. */
  ethUsdFeed: env('ETH_USD_FEED'),
  cronSecret: env('CRON_SECRET'),
  /** Social-context tags that identify Fancast launches (current + legacy). */
  interfaces: ['Fancast', 'TMDB Fan Club'],
  totalSupply: 100_000_000_000, // every Clanker v4 token
};

export const TOKEN_CREATED =
  'event TokenCreated(address msgSender, address indexed tokenAddress, address indexed tokenAdmin, string tokenImage, string tokenName, string tokenSymbol, string tokenMetadata, string tokenContext, int24 startingTick, address poolHook, bytes32 poolId, address pairedToken, address locker, address mevModule, uint256 extensionsSupply, address[] extensions)';

export const SWAP =
  'event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)';
