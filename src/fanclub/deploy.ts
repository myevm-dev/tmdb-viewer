import {
  Interface,
  getAddress,
  hexlify,
  randomBytes,
  type JsonRpcSigner,
} from 'ethers';
import {
  CHAIN,
  FAN_CLUB_INTERFACE,
  FAN_CLUB_PLATFORM,
  PLATFORM_FEE,
} from './config';
import { saveLocalFanClub, type FanClubToken } from './data';
import type { FanSubject } from './subject';

export type LiquidityPreset = 'Standard' | 'Project' | 'TwentyETH';
export type FeePreset = 'StaticBasic' | 'DynamicBasic';

export const LIQUIDITY_PRESETS: Record<
  LiquidityPreset,
  { label: string; blurb: string; startTick: number }
> = {
  Standard: {
    label: 'Standard',
    blurb: 'All liquidity in one wide range. Starts at ~10 ETH market cap.',
    startTick: -230400,
  },
  Project: {
    label: 'Tiered',
    blurb: 'Liquidity spread across 5 ranges for smoother price discovery.',
    startTick: -230400,
  },
  TwentyETH: {
    label: 'Premiere',
    blurb: 'Higher starting valuation (~20 ETH) for established fandoms.',
    startTick: -223400,
  },
};

export const FEE_PRESETS: Record<FeePreset, { label: string; blurb: string }> =
  {
    StaticBasic: { label: 'Flat 1%', blurb: '1% swap fee on every trade.' },
    DynamicBasic: {
      label: 'Dynamic 1–5%',
      blurb: 'Fee rises with volatility to deter snipers.',
    },
  };

export interface LaunchInput {
  subject: FanSubject;
  name: string;
  symbol: string;
  description: string;
  image: string;
  liquidity: LiquidityPreset;
  fee: FeePreset;
  devBuyEth: number;
  vaultPercent: number;
  vaultDays: number;
}

export type LaunchStatus =
  | { step: 'building' }
  | { step: 'confirm' }
  | { step: 'pending'; hash: string }
  | { step: 'done'; hash: string; token: FanClubToken };

export async function launchFanClub(
  signer: JsonRpcSigner,
  input: LaunchInput,
  onStatus: (s: LaunchStatus) => void,
): Promise<FanClubToken> {
  onStatus({ step: 'building' });

  // Code-split: the Clanker SDK (and zod) only load when someone launches.
  const [{ Clanker }, { POOL_POSITIONS, FEE_CONFIGS }] = await Promise.all([
    import('clanker-sdk/v4'),
    import('clanker-sdk'),
  ]);

  const admin = getAddress(await signer.getAddress());
  const recipients = PLATFORM_FEE
    ? [
        {
          admin,
          recipient: admin,
          bps: 10_000 - PLATFORM_FEE.bps,
          token: 'Both' as const,
        },
        {
          admin: PLATFORM_FEE.recipient as `0x${string}`,
          recipient: PLATFORM_FEE.recipient as `0x${string}`,
          bps: PLATFORM_FEE.bps,
          token: 'Both' as const,
        },
      ].filter((r) => r.bps > 0)
    : [{ admin, recipient: admin, bps: 10_000, token: 'Both' as const }];

  const preset = LIQUIDITY_PRESETS[input.liquidity];

  const clanker = new Clanker();
  const tx = await clanker.getDeployTransaction({
    chainId: CHAIN.id as 8453,
    name: input.name.trim(),
    symbol: input.symbol.trim().toUpperCase(),
    image: input.image,
    tokenAdmin: admin as `0x${string}`,
    salt: hexlify(randomBytes(32)) as `0x${string}`,
    metadata: {
      description: input.description.trim(),
      socialMediaUrls: [{ platform: 'website', url: input.subject.tmdbUrl }],
    },
    context: {
      interface: FAN_CLUB_INTERFACE,
      platform: FAN_CLUB_PLATFORM,
      // e.g. "movie/27205" or "person/6193" — how clubs map back to TMDB.
      messageId: `${input.subject.kind}/${input.subject.id}`,
      id: `${input.subject.kind}-${input.subject.id}`,
    },
    pool: {
      pairedToken: 'WETH',
      tickIfToken0IsClanker: preset.startTick,
      tickSpacing: 200,
      positions: POOL_POSITIONS[input.liquidity],
    },
    fees: FEE_CONFIGS[input.fee],
    rewards: { recipients },
    ...(input.devBuyEth > 0 ? { devBuy: { ethAmount: input.devBuyEth } } : {}),
    ...(input.vaultPercent > 0
      ? {
          vault: {
            percentage: input.vaultPercent,
            lockupDuration: Math.max(7, input.vaultDays) * 86_400,
            vestingDuration: 0,
          },
        }
      : {}),
  } as Parameters<typeof clanker.getDeployTransaction>[0]);

  // Encode + send with ethers (verified byte-identical to viem's encoding).
  const iface = new Interface(tx.abi as never);
  const data = iface.encodeFunctionData(
    tx.functionName,
    tx.args as unknown as unknown[],
  );
  const request = {
    to: tx.address,
    data,
    value: tx.value ?? 0n,
    chainId: CHAIN.id,
  };

  // Surfaces revert reasons (bad params, insufficient ETH) before the wallet prompt.
  const gas = await signer.estimateGas(request);

  onStatus({ step: 'confirm' });
  const sent = await signer.sendTransaction({
    ...request,
    gasLimit: (gas * 12n) / 10n,
  });
  onStatus({ step: 'pending', hash: sent.hash });

  const receipt = await sent.wait();
  if (!receipt || receipt.status !== 1)
    throw new Error('Deployment transaction reverted.');

  let tokenAddress: string | undefined;
  let poolId: string | undefined;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'TokenCreated') {
        tokenAddress = parsed.args.tokenAddress;
        poolId = parsed.args.poolId;
        break;
      }
    } catch {
      /* not a factory log */
    }
  }
  tokenAddress ??= tx.expectedAddress;
  if (!tokenAddress)
    throw new Error('Deployed, but could not determine the token address.');

  const token: FanClubToken = {
    address: getAddress(tokenAddress),
    kind: input.subject.kind,
    subjectId: input.subject.id,
    name: input.name.trim(),
    symbol: input.symbol.trim().toUpperCase(),
    image: input.image,
    createdAt: new Date().toISOString(),
    deployer: admin,
    txHash: sent.hash,
    poolId,
    source: 'local',
  };
  saveLocalFanClub(token);
  onStatus({ step: 'done', hash: sent.hash, token });
  return token;
}
