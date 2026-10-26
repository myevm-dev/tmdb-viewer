import { useEffect, useRef, useState } from 'react';
import Modal from '../components/Modal';
import { useWallet } from './WalletProvider';
import { CHAIN, links } from '../fanclub/config';
import { shortAddress } from '../lib/format';
import {
  CopyIcon,
  ExternalIcon,
  LogoutIcon,
  WalletIcon,
} from '../components/Icons';

export function WalletModal() {
  const { modalOpen, closeModal, wallets, connect, connecting, error } =
    useWallet();

  return (
    <Modal
      open={modalOpen}
      onClose={closeModal}
      title="Connect a wallet"
      size="sm"
    >
      {wallets.length ? (
        <ul className="wallet-list">
          {wallets.map((w) => (
            <li key={w.info.uuid}>
              <button
                className="wallet-option"
                onClick={() => connect(w)}
                disabled={connecting}
              >
                <img src={w.info.icon} alt="" width={32} height={32} />
                <span>{w.info.name}</span>
                {connecting && <span className="spinner spinner--sm" />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-wallets">
          <WalletIcon size={36} />
          <p>No browser wallet detected.</p>
          <p className="muted">
            Install a wallet like{' '}
            <a
              href="https://www.coinbase.com/wallet"
              target="_blank"
              rel="noreferrer"
            >
              Coinbase Wallet
            </a>
            ,{' '}
            <a href="https://rabby.io" target="_blank" rel="noreferrer">
              Rabby
            </a>{' '}
            or{' '}
            <a href="https://metamask.io" target="_blank" rel="noreferrer">
              MetaMask
            </a>
            , then reload.
          </p>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <p className="fine-print">
        Fan clubs launch on {CHAIN.name}. Connecting only shares your public
        address.
      </p>
    </Modal>
  );
}

function Identicon({ address, size = 22 }: { address: string; size?: number }) {
  const h1 = parseInt(address.slice(2, 8), 16) % 360;
  const h2 = parseInt(address.slice(-6), 16) % 360;
  return (
    <span
      className="identicon"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from ${h1}deg, hsl(${h1} 80% 60%), hsl(${h2} 75% 55%), hsl(${h1} 80% 60%))`,
      }}
    />
  );
}

export function ConnectButton() {
  const {
    address,
    openModal,
    isCorrectChain,
    switchChain,
    balance,
    disconnect,
    active,
  } = useWallet();
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) =>
      !ref.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menu]);

  if (!address) {
    return (
      <button className="btn btn--gold btn--sm" onClick={openModal}>
        <WalletIcon size={16} /> <span className="hide-xs">Connect</span>
      </button>
    );
  }

  if (!isCorrectChain) {
    return (
      <button
        className="btn btn--warn btn--sm"
        onClick={() => switchChain().catch(() => {})}
      >
        Switch to {CHAIN.name}
      </button>
    );
  }

  return (
    <div className="wallet-pill-wrap" ref={ref}>
      <button className="wallet-pill" onClick={() => setMenu((m) => !m)}>
        {balance !== null && (
          <span className="wallet-pill__bal">
            {Number(balance).toFixed(4)} ETH
          </span>
        )}
        <span className="wallet-pill__addr">
          <Identicon address={address} />
          {shortAddress(address)}
        </span>
      </button>
      {menu && (
        <div className="menu">
          <div className="menu__head">
            <Identicon address={address} size={36} />
            <div>
              <div className="mono">{shortAddress(address)}</div>
              <div className="muted small">
                {active?.info.name} · {CHAIN.name}
              </div>
            </div>
          </div>
          <button
            className="menu__item"
            onClick={() => {
              navigator.clipboard?.writeText(address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            <CopyIcon size={16} /> {copied ? 'Copied!' : 'Copy address'}
          </button>
          <a
            className="menu__item"
            href={links.address(address)}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalIcon size={16} /> View on explorer
          </a>
          <button
            className="menu__item menu__item--danger"
            onClick={() => {
              disconnect();
              setMenu(false);
            }}
          >
            <LogoutIcon size={16} /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
