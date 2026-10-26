/**
 * Minimal JSON-RPC "Base" for exercising the indexer locally without a real node.
 * Emits real ABI-encoded Clanker TokenCreated and Uniswap v4 Swap logs.
 *
 *   node scripts/mock-chain.mjs            # listens on :8545, seeds a demo market
 *   curl -X POST localhost:8545/admin/tick # mines a block with a few random swaps
 */
import http from 'node:http';
import { AbiCoder, Interface, keccak256, toBeHex, zeroPadValue } from 'ethers';

const PORT = Number(process.env.MOCK_PORT ?? 8545);
const FACTORY = '0xE85A59c628F7d27878ACeB4bf3b35733630083a9';
const POOL_MANAGER = '0x498581fF718922c3f8e6A244956aF099B2652b2b';
const WETH = '0x4200000000000000000000000000000000000006';
const FEED = '0x00000000000000000000000000000000000feed0';
const ETH_USD = 3500;
const MAX_RANGE = 3000; // mimic RPC providers that cap eth_getLogs ranges

const iface = new Interface([
  'event TokenCreated(address msgSender, address indexed tokenAddress, address indexed tokenAdmin, string tokenImage, string tokenName, string tokenSymbol, string tokenMetadata, string tokenContext, int24 startingTick, address poolHook, bytes32 poolId, address pairedToken, address locker, address mevModule, uint256 extensionsSupply, address[] extensions)',
  'event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)',
]);

const now = Math.floor(Date.now() / 1000);
let head = 40_000_000;
const headTs = () => now; // head is always "now"
const tsOf = (b) => headTs() - (head - b) * 2;

const logs = [];
const txs = new Map();
let nonce = 0;
const hash = () => keccak256(toBeHex(++nonce, 32));
const traders = Array.from({ length: 12 }, (_, i) => '0x' + (i + 1).toString(16).padStart(4, '0').repeat(10));

function push(address, encoded, block, from) {
  const txHash = hash();
  txs.set(txHash, { from, block });
  logs.push({ address, topics: encoded.topics, data: encoded.data, blockNumber: block, transactionHash: txHash, logIndex: logs.filter((l) => l.blockNumber === block).length });
}

const clubs = [];
function launch({ token, name, symbol, ctx, block, image = '' }) {
  const poolId = keccak256(AbiCoder.defaultAbiCoder().encode(['address', 'address'], [token, WETH]));
  const enc = iface.encodeEventLog('TokenCreated', [
    traders[0], token, traders[0], image, name, symbol, '{}', JSON.stringify(ctx), -230400,
    '0x0000000000000000000000000000000000000001', poolId, WETH,
    '0x0000000000000000000000000000000000000002', '0x0000000000000000000000000000000000000003', 0n, [],
  ]);
  push(FACTORY, enc, block, traders[0]);
  const c = { token, poolId, token0IsClub: BigInt(token) < BigInt(WETH), price: Math.pow(1.0001, -230400) };
  clubs.push(c);
  return c;
}

function swap(c, { buy, eth, block, trader }) {
  const impact = 1 + (buy ? 1 : -1) * Math.min(eth, 5) * 0.08;
  const before = c.price;
  c.price = c.price * impact;
  const avg = (before + c.price) / 2;
  const clubAmt = BigInt(Math.floor((eth / avg) * 1e6)) * 10n ** 12n;
  const ethAmt = BigInt(Math.floor(eth * 1e9)) * 10n ** 9n;
  const clubDelta = buy ? clubAmt : -clubAmt; // swapper's perspective
  const ethDelta = buy ? -ethAmt : ethAmt;
  const t1t0 = c.token0IsClub ? c.price : 1 / c.price;
  const sqrt = BigInt(Math.floor(Math.sqrt(t1t0) * 2 ** 48)) * 2n ** 48n;
  const enc = iface.encodeEventLog('Swap', [
    c.poolId, '0x6fF5693b99212Da76ad316178A184AB56D299b43',
    c.token0IsClub ? clubDelta : ethDelta, c.token0IsClub ? ethDelta : clubDelta,
    sqrt, 10n ** 18n, 0, 10000,
  ]);
  push(POOL_MANAGER, enc, block, trader);
}

// ---- Demo market -----------------------------------------------------------
const start = head - 4000; // ~2.2h ago
const dune = launch({ token: '0x1111111111111111111111111111111111111aaa', name: 'Dune: Part Two Fan Club', symbol: 'DUNE', block: start, ctx: { interface: 'Fancast', platform: 'fancast', messageId: 'movie/1000', id: 'movie-1000' }, image: 'https://image.tmdb.org/t/p/w500/p1000.jpg' });
const zen = launch({ token: '0x9999999999999999999999999999999999999bbb', name: 'Zendaya Fan Club', symbol: 'ZEN', block: start + 500, ctx: { interface: 'Fancast', platform: 'fancast', messageId: 'person/2000', id: 'person-2000' }, image: 'https://image.tmdb.org/t/p/h632/c2000.jpg' });
const legacy = launch({ token: '0x2222222222222222222222222222222222222ccc', name: 'Interstellar Fan Club', symbol: 'TARS', block: start + 900, ctx: { interface: 'TMDB Fan Club', messageId: 'movie/1003', id: '1003' }, image: 'https://image.tmdb.org/t/p/w500/p1003.jpg' });
launch({ token: '0x3333333333333333333333333333333333333ddd', name: 'Unrelated', symbol: 'NOPE', block: start + 950, ctx: { interface: 'SomeOtherApp' } });
const fresh = launch({ token: '0x5555555555555555555555555555555555555eee', name: 'Oppenheimer Fan Club', symbol: 'OPPY', block: head - 300, ctx: { interface: 'Fancast', messageId: 'movie/1001', id: 'movie-1001' }, image: 'https://image.tmdb.org/t/p/w500/p1001.jpg' });

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// DUNE: steady buying all session. ZEN: big early pump, quiet last hour. TARS: a few sells.
for (let b = start + 20; b < head; b += 60) swap(dune, { buy: rand() < 0.7, eth: 0.05 + rand() * 0.6, block: b, trader: traders[Math.floor(rand() * 12)] });
for (let b = start + 520; b < head - 1900; b += 40) swap(zen, { buy: rand() < 0.8, eth: 0.2 + rand() * 1.2, block: b, trader: traders[Math.floor(rand() * 12)] });
for (let b = start + 1000; b < head; b += 600) swap(legacy, { buy: false, eth: 0.02, block: b, trader: traders[3] });
swap(fresh, { buy: true, eth: 0.3, block: head - 120, trader: traders[5] });

// ---- JSON-RPC --------------------------------------------------------------
const hexN = (n) => '0x' + BigInt(n).toString(16);
function getLogs(f) {
  const from = Number(f.fromBlock), to = Number(f.toBlock);
  if (to - from + 1 > MAX_RANGE) throw Object.assign(new Error('block range too large'), { code: -32005 });
  const addr = f.address?.toLowerCase();
  const [t0, t1] = f.topics ?? [];
  const t1s = t1 ? (Array.isArray(t1) ? t1 : [t1]).map((x) => x.toLowerCase()) : null;
  return logs
    .filter((l) => l.blockNumber >= from && l.blockNumber <= to)
    .filter((l) => !addr || l.address.toLowerCase() === addr)
    .filter((l) => !t0 || l.topics[0] === t0)
    .filter((l) => !t1s || t1s.includes(l.topics[1].toLowerCase()))
    .map((l) => ({
      address: l.address, topics: l.topics, data: l.data, blockNumber: hexN(l.blockNumber),
      blockHash: zeroPadValue(toBeHex(l.blockNumber), 32), transactionHash: l.transactionHash,
      transactionIndex: '0x0', logIndex: hexN(l.logIndex), removed: false,
    }));
}

function handle({ method, params }) {
  switch (method) {
    case 'eth_chainId': return '0x2105';
    case 'net_version': return '8453';
    case 'eth_blockNumber': return hexN(head);
    case 'eth_getBlockByNumber': {
      const b = params[0] === 'latest' ? head : Number(params[0]);
      return { number: hexN(b), hash: zeroPadValue(toBeHex(b), 32), parentHash: zeroPadValue(toBeHex(b - 1), 32), timestamp: hexN(tsOf(b)), gasLimit: '0x1', gasUsed: '0x0', baseFeePerGas: '0x1', miner: WETH, extraData: '0x', difficulty: '0x0', nonce: '0x0000000000000000', transactions: [] };
    }
    case 'eth_getLogs': return getLogs(params[0]);
    case 'eth_getTransactionByHash': {
      const t = txs.get(params[0]);
      return t && { hash: params[0], from: t.from, to: POOL_MANAGER, input: '0x', value: '0x0', nonce: '0x1', gas: '0x1', gasPrice: '0x1', maxFeePerGas: '0x1', maxPriorityFeePerGas: '0x1', type: '0x2', chainId: '0x2105', blockNumber: hexN(t.block), blockHash: zeroPadValue(toBeHex(t.block), 32), transactionIndex: '0x0', v: '0x0', r: zeroPadValue('0x01', 32), s: zeroPadValue('0x02', 32), accessList: [] };
    }
    case 'eth_call': {
      const { to, data } = params[0];
      if (to?.toLowerCase() === FEED.toLowerCase()) {
        if (data.startsWith('0x313ce567')) return AbiCoder.defaultAbiCoder().encode(['uint8'], [8]);
        return AbiCoder.defaultAbiCoder().encode(['uint80', 'int256', 'uint256', 'uint256', 'uint80'], [1, BigInt(ETH_USD * 1e8), now, now, 1]);
      }
      return '0x';
    }
    default: throw Object.assign(new Error(`unsupported ${method}`), { code: -32601 });
  }
}

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.url === '/admin/tick') {
      head += 15;
      for (const c of [dune, zen, fresh]) if (rand() < 0.8) swap(c, { buy: rand() < 0.65, eth: 0.1 + rand(), block: head - Math.floor(rand() * 10), trader: traders[Math.floor(rand() * 12)] });
      res.end(JSON.stringify({ head }));
      return;
    }
    const reqs = JSON.parse(body || '{}');
    const one = (r) => {
      try { return { jsonrpc: '2.0', id: r.id, result: handle(r) }; }
      catch (e) { return { jsonrpc: '2.0', id: r.id, error: { code: e.code ?? -32000, message: e.message } }; }
    };
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(Array.isArray(reqs) ? reqs.map(one) : one(reqs)));
  });
}).listen(PORT, () => console.log(`mock chain on :${PORT} head=${head} clubs=${clubs.length} logs=${logs.length} feed=${FEED}`));
