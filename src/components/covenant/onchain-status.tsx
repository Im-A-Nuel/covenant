"use client";

import * as React from "react";
import { Rocket, Coins, RefreshCw, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet";
import { isDeployed, deploySmartAccount } from "@/lib/smart-account";
import { usdcBalance, explorerTx } from "@/lib/chain";
import { fromUnits, formatUSDC, shortAddr } from "@/lib/utils";
import type { Covenant } from "@/lib/types";

/**
 * On-chain readiness for REAL ERC-7710 settlement.
 * Redemption only settles on-chain when the delegator smart account is
 * (a) deployed and (b) holds USDC. This panel surfaces both and lets the
 * owner deploy with one transaction (no bundler) and fund via a faucet.
 */
export function OnChainStatus({ covenant }: { covenant: Covenant }) {
  const { account, correctChain, ensureSmartAccount } = useWallet();
  const sa = covenant.smartAccount;
  const isOwner = !!account && account.toLowerCase() === String(covenant.user).toLowerCase();

  const [deployed, setDeployed] = React.useState<boolean>();
  const [balance, setBalance] = React.useState<bigint>();
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [txHash, setTxHash] = React.useState<string>();

  const refresh = React.useCallback(async () => {
    if (!sa) return;
    setLoading(true);
    setError(undefined);
    try {
      const [d, b] = await Promise.all([isDeployed(sa), usdcBalance(sa)]);
      setDeployed(d);
      setBalance(b);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sa]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function deploy() {
    if (!account) return;
    setBusy(true);
    setError(undefined);
    try {
      const acct = await ensureSmartAccount();
      if (!acct) throw new Error("Could not load smart account");
      const hash = await deploySmartAccount(account, acct);
      setTxHash(hash);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!sa || covenant.delegation?.mode !== "real") return null;

  const funded = balance !== undefined && balance > 0n;
  const ready = deployed === true && funded;

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-surface-2/50 p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-ink">
          <Rocket className="h-3.5 w-3.5 text-brand" /> On-chain settlement
        </span>
        <div className="flex items-center gap-2">
          <Badge tone={ready ? "good" : "warn"}>{ready ? "ready" : "not ready"}</Badge>
          <button onClick={refresh} disabled={loading} className="text-faint hover:text-ink disabled:opacity-50" title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <StatusRow
        ok={deployed === true}
        label="Smart account deployed"
        value={deployed === undefined ? "checking…" : deployed ? "deployed" : "not deployed"}
      />
      <StatusRow
        ok={funded}
        icon={<Coins className="h-3.5 w-3.5 text-faint" />}
        label="USDC balance"
        value={balance === undefined ? "checking…" : `${formatUSDC(fromUnits(balance))} USDC`}
      />

      {deployed === false && isOwner && correctChain && (
        <Button variant="outline" size="sm" className="w-full" onClick={deploy} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
          {busy ? "Deploying…" : "Deploy smart account"}
        </Button>
      )}

      {deployed === true && !funded && (
        <div className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/10 p-2 text-warn">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Fund <span className="font-mono">{shortAddr(sa, 6)}</span> with Base Sepolia USDC to settle on-chain.{" "}
            <a className="underline" href="https://faucet.circle.com" target="_blank" rel="noreferrer">Circle faucet ↗</a>
          </span>
        </div>
      )}

      {ready && (
        <p className="flex items-center gap-1.5 text-good">
          <CheckCircle2 className="h-3.5 w-3.5" /> Ready — redemption will settle on-chain.
        </p>
      )}

      {txHash && (
        <a href={explorerTx(txHash)} target="_blank" rel="noreferrer" className="flex items-center gap-1 break-all font-mono text-brand hover:underline">
          deploy tx: {shortAddr(txHash, 8)} <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      )}

      {error && <p className="text-bad">{error}</p>}
    </div>
  );
}

function StatusRow({ ok, label, value, icon }: { ok: boolean; label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-faint">
        {icon ?? (ok ? <CheckCircle2 className="h-3.5 w-3.5 text-good" /> : <AlertTriangle className="h-3.5 w-3.5 text-warn" />)}
        {label}
      </span>
      <span className={ok ? "text-good" : "text-muted"}>{value}</span>
    </div>
  );
}
