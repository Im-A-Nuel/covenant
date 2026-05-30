"use client";

import { Wallet, AlertTriangle, LogOut } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { shortAddr } from "@/lib/utils";
import { CHAIN } from "@/lib/chain";

export function WalletButton() {
  const { account, connecting, hasWallet, correctChain, connect, switchChain, disconnect } = useWallet();

  if (!account) {
    return (
      <Button onClick={connect} disabled={connecting} size="sm">
        <Wallet className="h-4 w-4" />
        {connecting ? "Connecting…" : hasWallet ? "Connect MetaMask" : "Install MetaMask"}
      </Button>
    );
  }

  if (!correctChain) {
    return (
      <Button onClick={switchChain} variant="danger" size="sm">
        <AlertTriangle className="h-4 w-4" />
        Switch to {CHAIN.name}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 h-8 text-xs">
        <span className="h-2 w-2 rounded-full bg-good" style={{ animation: "pulse-ring 2s infinite" }} />
        <span className="font-mono text-ink">{shortAddr(account)}</span>
      </div>
      <Button onClick={disconnect} variant="ghost" size="icon" className="h-8 w-8" title="Disconnect">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
