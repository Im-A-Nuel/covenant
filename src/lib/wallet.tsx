"use client";

import * as React from "react";
import type { Address, EIP1193Provider } from "viem";
import { getInjected, setInjectedProvider, CHAIN } from "./chain";
import { createUserSmartAccount, type SmartAccount } from "./smart-account";

/** A wallet announced via EIP-6963 (multi-wallet discovery). */
export interface WalletInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}
export interface Eip6963Detail {
  info: WalletInfo;
  provider: EIP1193Provider;
}

interface WalletState {
  account?: Address;
  chainId?: number;
  smartAccount?: SmartAccount;
  connecting: boolean;
  creatingSA: boolean;
  error?: string;
  hasWallet: boolean;
  correctChain: boolean;
  wallets: Eip6963Detail[];
  connect: (provider?: EIP1193Provider) => Promise<void>;
  ensureSmartAccount: () => Promise<SmartAccount | undefined>;
  switchChain: () => Promise<void>;
  disconnect: () => void;
}

const Ctx = React.createContext<WalletState | null>(null);

const CHAIN_HEX = "0x" + CHAIN.id.toString(16);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = React.useState<Address>();
  const [chainId, setChainId] = React.useState<number>();
  const [smartAccount, setSmartAccount] = React.useState<SmartAccount>();
  const [connecting, setConnecting] = React.useState(false);
  const [creatingSA, setCreatingSA] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [hasWallet, setHasWallet] = React.useState(false);
  const [wallets, setWallets] = React.useState<Eip6963Detail[]>([]);

  // EIP-6963: discover every injected wallet so the user can pick one.
  React.useEffect(() => {
    const onAnnounce = (e: Event) => {
      const d = (e as CustomEvent<Eip6963Detail>).detail;
      if (!d?.info?.uuid) return;
      setWallets((prev) => (prev.some((w) => w.info.uuid === d.info.uuid) ? prev : [...prev, d]));
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  }, []);

  React.useEffect(() => {
    const p = getInjected();
    setHasWallet(!!p);
    if (!p) return;
    p.request({ method: "eth_chainId" }).then((c) => setChainId(parseInt(c as string, 16))).catch(() => {});
    p.request({ method: "eth_accounts" }).then((accs) => {
      const a = (accs as string[])?.[0] as Address | undefined;
      if (a) setAccount(a);
    }).catch(() => {});

    const onAccounts = (accs: unknown) => {
      const a = (accs as string[])?.[0] as Address | undefined;
      setAccount(a);
      setSmartAccount(undefined);
    };
    const onChain = (c: unknown) => {
      setChainId(parseInt(c as string, 16));
      setSmartAccount(undefined);
    };
    (p as unknown as { on?: (e: string, cb: (a: unknown) => void) => void }).on?.("accountsChanged", onAccounts);
    (p as unknown as { on?: (e: string, cb: (a: unknown) => void) => void }).on?.("chainChanged", onChain);
    return () => {
      (p as unknown as { removeListener?: (e: string, cb: (a: unknown) => void) => void }).removeListener?.("accountsChanged", onAccounts);
      (p as unknown as { removeListener?: (e: string, cb: (a: unknown) => void) => void }).removeListener?.("chainChanged", onChain);
    };
  }, []);

  const switchChain = React.useCallback(async () => {
    const p = getInjected();
    if (!p) return;
    try {
      await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
    } catch (err) {
      if ((err as { code?: number }).code === 4902) {
        await p.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CHAIN_HEX,
              chainName: CHAIN.name,
              nativeCurrency: CHAIN.nativeCurrency,
              rpcUrls: [CHAIN.rpcUrls.default.http[0]],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            },
          ],
        });
      }
    }
  }, []);

  const connect = React.useCallback(async (provider?: EIP1193Provider) => {
    const p = provider ?? getInjected();
    if (!p) {
      setError("No wallet found. Install MetaMask to continue.");
      return;
    }
    setInjectedProvider(p); // route all later requests to the picked wallet
    setConnecting(true);
    setError(undefined);
    try {
      const accs = (await p.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accs[0] as Address);
      const c = (await p.request({ method: "eth_chainId" })) as string;
      const id = parseInt(c, 16);
      setChainId(id);
      if (id !== CHAIN.id) await switchChain();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }, [switchChain]);

  const ensureSmartAccount = React.useCallback(async () => {
    if (smartAccount) return smartAccount;
    if (!account) {
      setError("Connect a wallet first.");
      return undefined;
    }
    setCreatingSA(true);
    setError(undefined);
    try {
      const sa = await createUserSmartAccount(account);
      setSmartAccount(sa);
      return sa;
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      setCreatingSA(false);
    }
  }, [account, smartAccount]);

  const disconnect = React.useCallback(() => {
    setAccount(undefined);
    setSmartAccount(undefined);
    setInjectedProvider(undefined);
  }, []);

  const value: WalletState = {
    account,
    chainId,
    smartAccount,
    connecting,
    creatingSA,
    error,
    hasWallet,
    correctChain: chainId === CHAIN.id,
    wallets,
    connect,
    ensureSmartAccount,
    switchChain,
    disconnect,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
