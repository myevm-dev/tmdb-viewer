import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BrowserProvider,
  JsonRpcSigner,
  formatEther,
  getAddress,
  type Eip1193Provider,
} from 'ethers';
import { CHAIN } from '../fanclub/config';

interface EIP1193 extends Eip1193Provider {
  on?: (event: string, cb: (...args: any[]) => void) => void;
  removeListener?: (event: string, cb: (...args: any[]) => void) => void;
}

export interface WalletInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface WalletDetail {
  info: WalletInfo;
  provider: EIP1193;
}

interface WalletState {
  wallets: WalletDetail[];
  active: WalletDetail | null;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  connecting: boolean;
  error: string | null;
  isCorrectChain: boolean;
  provider: BrowserProvider | null;
  connect: (wallet: WalletDetail) => Promise<void>;
  disconnect: () => void;
  switchChain: () => Promise<void>;
  getSigner: () => Promise<JsonRpcSigner>;
  refreshBalance: () => void;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const WalletContext = createContext<WalletState | null>(null);
const LAST_WALLET_KEY = 'reel:last-wallet';

const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSet = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
};

const INJECTED_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#22222b"/><path d="M8 11h16v12H8z" fill="none" stroke="#f5c451" stroke-width="2"/><path d="M8 11l3-3h10l3 3" fill="none" stroke="#f5c451" stroke-width="2"/><circle cx="21" cy="17" r="1.6" fill="#f5c451"/></svg>',
  );

function errorMessage(e: unknown): string {
  const err = e as {
    code?: number | string;
    shortMessage?: string;
    message?: string;
    info?: { error?: { message?: string } };
  };
  if (err?.code === 4001 || err?.code === 'ACTION_REJECTED')
    return 'Request rejected in wallet.';
  return (
    err?.shortMessage ||
    err?.info?.error?.message ||
    err?.message ||
    'Something went wrong.'
  );
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<WalletDetail[]>([]);
  const [active, setActive] = useState<WalletDetail | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [balanceNonce, setBalanceNonce] = useState(0);
  const restoreTried = useRef(false);

  // --- EIP-6963 multi-wallet discovery (+ legacy window.ethereum fallback)
  useEffect(() => {
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<WalletDetail>).detail;
      if (!detail?.info?.uuid) return;
      setWallets((prev) =>
        prev.some((w) => w.info.uuid === detail.info.uuid)
          ? prev
          : [...prev, detail],
      );
    };
    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    const fallbackTimer = setTimeout(() => {
      const injected = (window as unknown as { ethereum?: EIP1193 }).ethereum;
      if (!injected) return;
      setWallets((prev) =>
        prev.length || prev.some((w) => w.provider === injected)
          ? prev
          : [
              {
                info: {
                  uuid: 'injected',
                  name: 'Browser Wallet',
                  icon: INJECTED_ICON,
                  rdns: 'injected',
                },
                provider: injected,
              },
            ],
      );
    }, 400);

    return () => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const provider = useMemo(
    // 'any' lets the provider follow network switches instead of throwing.
    () => (active ? new BrowserProvider(active.provider, 'any') : null),
    [active],
  );

  // --- Silent reconnect to the last used wallet
  useEffect(() => {
    if (restoreTried.current || !wallets.length) return;
    const last = safeGet(LAST_WALLET_KEY);
    if (!last) {
      restoreTried.current = true;
      return;
    }
    const match = wallets.find((w) => w.info.rdns === last);
    if (!match) return; // wait — it may announce later
    restoreTried.current = true;
    match.provider
      .request({ method: 'eth_accounts' })
      .then(async (accounts: string[]) => {
        if (!accounts?.length) return;
        const cid = await match.provider.request({ method: 'eth_chainId' });
        setActive(match);
        setAddress(getAddress(accounts[0]));
        setChainId(Number(cid));
      })
      .catch(() => {});
  }, [wallets]);

  // --- Wallet events
  useEffect(() => {
    const p = active?.provider;
    if (!p?.on) return;
    const onAccounts = (accounts: string[]) => {
      if (!accounts?.length) {
        setActive(null);
        setAddress(null);
        setChainId(null);
        setBalance(null);
        safeSet(LAST_WALLET_KEY, null);
      } else setAddress(getAddress(accounts[0]));
    };
    const onChain = (cid: string) => setChainId(Number(cid));
    p.on('accountsChanged', onAccounts);
    p.on('chainChanged', onChain);
    return () => {
      p.removeListener?.('accountsChanged', onAccounts);
      p.removeListener?.('chainChanged', onChain);
    };
  }, [active]);

  // --- Balance on the launch chain
  useEffect(() => {
    let cancelled = false;
    if (!provider || !address || chainId !== CHAIN.id) {
      setBalance(null);
      return;
    }
    provider
      .getBalance(address)
      .then((b) => !cancelled && setBalance(formatEther(b)))
      .catch(() => !cancelled && setBalance(null));
    return () => {
      cancelled = true;
    };
  }, [provider, address, chainId, balanceNonce]);

  const connect = useCallback(async (wallet: WalletDetail) => {
    setConnecting(true);
    setError(null);
    try {
      const accounts: string[] = await wallet.provider.request({
        method: 'eth_requestAccounts',
      });
      if (!accounts?.length) throw new Error('No accounts returned.');
      const cid = await wallet.provider.request({ method: 'eth_chainId' });
      setActive(wallet);
      setAddress(getAddress(accounts[0]));
      setChainId(Number(cid));
      safeSet(LAST_WALLET_KEY, wallet.info.rdns);
      setModalOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // Best effort: some wallets support revoking the site permission.
    active?.provider
      .request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      })
      .catch(() => {});
    setActive(null);
    setAddress(null);
    setChainId(null);
    setBalance(null);
    safeSet(LAST_WALLET_KEY, null);
  }, [active]);

  const switchChain = useCallback(async () => {
    if (!active) return;
    setError(null);
    try {
      await active.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN.hex }],
      });
    } catch (e) {
      const code = (
        e as { code?: number; data?: { originalError?: { code?: number } } }
      ).code;
      const nested = (e as { data?: { originalError?: { code?: number } } })
        .data?.originalError?.code;
      if (code === 4902 || nested === 4902) {
        await active.provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: CHAIN.hex,
              chainName: CHAIN.name,
              nativeCurrency: CHAIN.nativeCurrency,
              rpcUrls: [CHAIN.rpc],
              blockExplorerUrls: [CHAIN.explorer],
            },
          ],
        });
      } else {
        setError(errorMessage(e));
        throw e;
      }
    }
  }, [active]);

  const getSigner = useCallback(async () => {
    if (!provider) throw new Error('Connect a wallet first.');
    return provider.getSigner();
  }, [provider]);

  const value: WalletState = {
    wallets,
    active,
    address,
    chainId,
    balance,
    connecting,
    error,
    isCorrectChain: chainId === CHAIN.id,
    provider,
    connect,
    disconnect,
    switchChain,
    getSigner,
    refreshBalance: () => setBalanceNonce((n) => n + 1),
    modalOpen,
    openModal: () => {
      setError(null);
      setModalOpen(true);
    },
    closeModal: () => setModalOpen(false),
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}

export { errorMessage };
