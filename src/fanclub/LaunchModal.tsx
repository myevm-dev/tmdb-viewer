import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Modal from '../components/Modal';
import { useWallet, errorMessage } from '../wallet/WalletProvider';
import {
  FEE_PRESETS,
  LIQUIDITY_PRESETS,
  launchFanClub,
  type FeePreset,
  type LaunchStatus,
  type LiquidityPreset,
} from './deploy';
import { CHAIN, PLATFORM_FEE, links } from './config';
import { backdropUrl, posterUrl, type MovieDetails } from '../lib/tmdb';
import { suggestSymbol, shortAddress } from '../lib/format';
import { CheckIcon, ExternalIcon, RocketIcon } from '../components/Icons';
import type { FanClubToken } from './data';

interface Props {
  movie: MovieDetails;
  open: boolean;
  onClose: () => void;
  onLaunched?: (t: FanClubToken) => void;
}

export default function LaunchModal({
  movie,
  open,
  onClose,
  onLaunched,
}: Props) {
  const wallet = useWallet();
  const poster = posterUrl(movie, 'w500');
  const backdrop = backdropUrl(movie, 'w780');

  const [name, setName] = useState(`${movie.title} Fan Club`);
  const [symbol, setSymbol] = useState(suggestSymbol(movie.title));
  const [description, setDescription] = useState(
    `The official fan club token for ${movie.title}. Hold it to rep the fandom.`,
  );
  const [image, setImage] = useState(poster ?? backdrop ?? '');
  const [liquidity, setLiquidity] = useState<LiquidityPreset>('Standard');
  const [fee, setFee] = useState<FeePreset>('StaticBasic');
  const [devBuy, setDevBuy] = useState('0');
  const [vaultPercent, setVaultPercent] = useState(0);
  const [vaultDays, setVaultDays] = useState(30);
  const [advanced, setAdvanced] = useState(false);
  const [status, setStatus] = useState<LaunchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStatus(null);
      setError(null);
    }
  }, [open]);

  const devBuyNum = Number(devBuy) || 0;
  const balance = wallet.balance ? Number(wallet.balance) : null;

  const problems = useMemo(() => {
    const p: string[] = [];
    if (!name.trim()) p.push('Name is required.');
    if (!/^[A-Za-z0-9]{2,12}$/.test(symbol.trim()))
      p.push('Ticker must be 2–12 letters/numbers.');
    if (!image) p.push('Pick an image.');
    if (devBuyNum < 0 || devBuyNum > 10)
      p.push('Creator buy must be between 0 and 10 ETH.');
    if (balance !== null && devBuyNum > balance)
      p.push('Creator buy exceeds your balance.');
    return p;
  }, [name, symbol, image, devBuyNum, balance]);

  const busy = status !== null && status.step !== 'done';

  async function submit() {
    setError(null);
    try {
      if (!wallet.isCorrectChain) await wallet.switchChain();
      const signer = await wallet.getSigner();
      const token = await launchFanClub(
        signer,
        {
          movieId: movie.id,
          movieTitle: movie.title,
          name,
          symbol,
          description,
          image,
          liquidity,
          fee,
          devBuyEth: devBuyNum,
          vaultPercent,
          vaultDays,
        },
        setStatus,
      );
      wallet.refreshBalance();
      onLaunched?.(token);
    } catch (e) {
      setStatus(null);
      setError(errorMessage(e));
    }
  }

  const creatorShare = PLATFORM_FEE ? (10_000 - PLATFORM_FEE.bps) / 100 : 100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissable={!busy}
      size="lg"
      title={
        <span className="launch-title">
          <RocketIcon size={20} /> Launch the {movie.title} Fan Club
        </span>
      }
    >
      {status?.step === 'done' ? (
        <div className="launch-done">
          <div className="launch-done__badge">
            <CheckIcon size={30} />
          </div>
          <h3>{status.token.name} is live</h3>
          <p className="muted">
            ${status.token.symbol} deployed on {CHAIN.name} with a Uniswap v4
            pool via Clanker.
          </p>
          <code className="addr">{status.token.address}</code>
          <div className="btn-row">
            <a
              className="btn btn--gold"
              href={links.uniswap(status.token.address)}
              target="_blank"
              rel="noreferrer"
            >
              Buy on Uniswap
            </a>
            <a
              className="btn btn--ghost"
              href={links.tx(status.hash)}
              target="_blank"
              rel="noreferrer"
            >
              Transaction <ExternalIcon size={14} />
            </a>
            <button className="btn btn--ghost" onClick={onClose}>
              Back to the film
            </button>
          </div>
        </div>
      ) : (
        <div className="launch">
          <div className="launch__preview">
            <div className="token-preview">
              {image ? (
                <img src={image} alt="" />
              ) : (
                <div className="token-preview__blank" />
              )}
              <div className="token-preview__meta">
                <span className="chip chip--gold">FAN CLUB</span>
                <strong>{name || 'Unnamed'}</strong>
                <span className="mono">${symbol.toUpperCase() || '—'}</span>
              </div>
            </div>
            <dl className="facts">
              <div>
                <dt>Supply</dt>
                <dd>100B</dd>
              </div>
              <div>
                <dt>Pool</dt>
                <dd>Uniswap v4 · WETH</dd>
              </div>
              <div>
                <dt>LP</dt>
                <dd>Locked forever</dd>
              </div>
              <div>
                <dt>Your rewards</dt>
                <dd>{creatorShare}% of fees</dd>
              </div>
            </dl>
          </div>

          <div className="launch__form">
            <div className="field-row">
              <label className="field">
                <span>Name</span>
                <input
                  value={name}
                  maxLength={48}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="field field--narrow">
                <span>Ticker</span>
                <input
                  value={symbol}
                  maxLength={12}
                  onChange={(e) =>
                    setSymbol(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                    )
                  }
                  disabled={busy}
                />
              </label>
            </div>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={2}
                value={description}
                maxLength={280}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
              />
            </label>

            <div className="field">
              <span>Token image</span>
              <div className="image-picks">
                {[poster, backdrop].filter(Boolean).map((src) => (
                  <button
                    key={src}
                    type="button"
                    className={`image-pick ${image === src ? 'is-active' : ''}`}
                    onClick={() => setImage(src!)}
                    disabled={busy}
                  >
                    <img src={src!} alt="" />
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>Launch curve</span>
              <div className="segmented">
                {(Object.keys(LIQUIDITY_PRESETS) as LiquidityPreset[]).map(
                  (k) => (
                    <button
                      key={k}
                      type="button"
                      className={liquidity === k ? 'is-active' : ''}
                      onClick={() => setLiquidity(k)}
                      disabled={busy}
                    >
                      {LIQUIDITY_PRESETS[k].label}
                    </button>
                  ),
                )}
              </div>
              <small className="muted">
                {LIQUIDITY_PRESETS[liquidity].blurb}
              </small>
            </div>

            <div className="field">
              <span>Swap fee</span>
              <div className="segmented">
                {(Object.keys(FEE_PRESETS) as FeePreset[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={fee === k ? 'is-active' : ''}
                    onClick={() => setFee(k)}
                    disabled={busy}
                  >
                    {FEE_PRESETS[k].label}
                  </button>
                ))}
              </div>
              <small className="muted">{FEE_PRESETS[fee].blurb}</small>
            </div>

            <button
              type="button"
              className="link-btn"
              onClick={() => setAdvanced((a) => !a)}
            >
              {advanced ? 'Hide' : 'Show'} creator options
            </button>

            {advanced && (
              <div className="advanced">
                <label className="field">
                  <span>Creator buy (ETH)</span>
                  <input
                    inputMode="decimal"
                    value={devBuy}
                    onChange={(e) =>
                      setDevBuy(e.target.value.replace(/[^0-9.]/g, ''))
                    }
                    disabled={busy}
                  />
                  <small className="muted">
                    Buy in the same transaction, before anyone else can.
                  </small>
                </label>
                <label className="field">
                  <span>Creator vault: {vaultPercent}% of supply</span>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={vaultPercent}
                    onChange={(e) => setVaultPercent(Number(e.target.value))}
                    disabled={busy}
                  />
                </label>
                {vaultPercent > 0 && (
                  <label className="field">
                    <span>Vault lockup: {vaultDays} days</span>
                    <input
                      type="range"
                      min={7}
                      max={365}
                      value={vaultDays}
                      onChange={(e) => setVaultDays(Number(e.target.value))}
                      disabled={busy}
                    />
                  </label>
                )}
              </div>
            )}

            {problems.length > 0 && !busy && (
              <p className="form-hint">{problems[0]}</p>
            )}
            {error && <p className="form-error">{error}</p>}

            {busy && (
              <ol className="steps">
                <Step
                  label="Preparing Clanker v4 deployment"
                  state={stepState(status, 'building')}
                />
                <Step
                  label="Confirm in your wallet"
                  state={stepState(status, 'confirm')}
                />
                <Step
                  label={
                    status?.step === 'pending' ? (
                      <>
                        Deploying ·{' '}
                        <a
                          href={links.tx(status.hash)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shortAddress(status.hash)}
                        </a>
                      </>
                    ) : (
                      'Deploying token & pool'
                    )
                  }
                  state={stepState(status, 'pending')}
                />
              </ol>
            )}

            {!wallet.address ? (
              <button
                className="btn btn--gold btn--block"
                onClick={wallet.openModal}
              >
                Connect wallet to launch
              </button>
            ) : (
              <button
                className="btn btn--gold btn--block"
                onClick={submit}
                disabled={busy || problems.length > 0}
              >
                {busy ? (
                  <>
                    <span className="spinner spinner--sm" /> Launching…
                  </>
                ) : !wallet.isCorrectChain ? (
                  `Switch to ${CHAIN.name} & launch`
                ) : (
                  <>
                    <RocketIcon size={18} /> Launch fan club
                    {devBuyNum > 0 ? ` + buy ${devBuyNum} ETH` : ''}
                  </>
                )}
              </button>
            )}
            <p className="fine-print">
              Deploys an ERC-20 through the Clanker v4 factory with a Uniswap v4
              pool on {CHAIN.name}. You pay gas
              {devBuyNum > 0 ? ' plus your creator buy' : ''}. Tokens are
              speculative — launch responsibly.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

const ORDER = ['building', 'confirm', 'pending', 'done'] as const;
function stepState(status: LaunchStatus | null, step: (typeof ORDER)[number]) {
  if (!status) return 'todo';
  const cur = ORDER.indexOf(status.step);
  const me = ORDER.indexOf(step);
  return cur > me ? 'done' : cur === me ? 'active' : 'todo';
}

function Step({ label, state }: { label: ReactNode; state: string }) {
  return (
    <li className={`step step--${state}`}>
      <span className="step__dot">
        {state === 'done' ? (
          <CheckIcon size={12} />
        ) : state === 'active' ? (
          <span className="spinner spinner--xs" />
        ) : null}
      </span>
      <span>{label}</span>
    </li>
  );
}
