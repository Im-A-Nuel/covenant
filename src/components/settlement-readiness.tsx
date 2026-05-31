"use client";

import * as React from "react";
import type { Address } from "viem";
import type { Covenant } from "@/lib/types";
import { useWallet } from "@/lib/wallet";
import { useStore } from "@/lib/store";
import { usdcBalance, explorerAddr, USDC_ADDRESS } from "@/lib/chain";
import { isDeployed, deploySmartAccount } from "@/lib/smart-account";
import { fromUnits, shortAddr } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const USDC_FAUCET = "https://faucet.circle.com/";

/**
 * Readiness panel for REAL on-chain settlement. A covenant's redemption only
 * truly settles on-chain when (1) the smart account is deployed and (2) it holds
 * enough USDC. This panel surfaces both and lets the user deploy + fund, turning
 * the run's settlement badge from "simulated" into "on-chain · verified".
 */
export function SettlementReadiness({ covenant }: { covenant: Covenant }) {
  const { account, correctChain, ensureSmartAccount } = useWallet();
  const { getSigned } = useStore();
  const { toast } = useToast();

  const saAddress = covenant.smartAccount as Address | undefined;
  const isReal = covenant.delegation?.mode === "real" && !!saAddress;
  const hasSigned = !!getSigned(covenant.id);

  const [deployed, setDeployed] = React.useState<boolean | null>(null);
  const [balance, setBalance] = React.useState<bigint | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [deploying, setDeploying] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!saAddress) return;
    setLoading(true);
    try {
      const [dep, bal] = await Promise.all([isDeployed(saAddress), usdcBalance(saAddress)]);
      setDeployed(dep);
      setBalance(bal);
    } catch {
      /* leave previous values */
    } finally {
      setLoading(false);
    }
  }, [saAddress]);

  React.useEffect(() => {
    if (isReal) void refresh();
  }, [isReal, refresh]);

  if (!isReal) return null;

  async function deploy() {
    if (!account) return;
    setDeploying(true);
    try {
      const sa = await ensureSmartAccount();
      if (!sa) throw new Error("Smart account unavailable");
      const hash = await deploySmartAccount(account, sa);
      toast(`Smart account deployed · ${shortAddr(hash, 4)}`);
      await refresh();
    } catch (e) {
      toast((e as Error).message || "Deployment failed", "error");
    } finally {
      setDeploying(false);
    }
  }

  const bal = balance != null ? fromUnits(balance) : null;
  const funded = bal != null && bal >= covenant.maxPerRequest;
  const ready = deployed === true && funded && hasSigned;

  return (
    <div className="ready">
      <div className="ready-head">
        <span className={`ready-dot ${ready ? "ok" : "warn"}`} />
        <h4>Settlement readiness</h4>
        <span className={`settle-badge ${ready ? "real" : "sim"}`}>
          {ready ? "ready · on-chain" : "will simulate"}
        </span>
      </div>

      <p className="ready-sub">
        Real redemption needs the smart account deployed and holding USDC. Otherwise the run still
        works but settlement is simulated.
      </p>

      <div className="ready-rows">
        <div className="ready-row">
          <span className="rk">Smart account</span>
          <a className="rv mono" href={explorerAddr(saAddress!)} target="_blank" rel="noreferrer">
            {shortAddr(saAddress!, 4)}
          </a>
        </div>
        <div className="ready-row">
          <span className="rk">Deployed</span>
          <span className="rv">
            {deployed === null ? "…" : deployed ? "yes" : "no"}
            {deployed === false && (
              <button className="ready-act" onClick={deploy} disabled={deploying || !correctChain}>
                {deploying ? "Deploying…" : "Deploy"}
              </button>
            )}
          </span>
        </div>
        <div className="ready-row">
          <span className="rk">USDC balance</span>
          <span className="rv">
            {bal === null ? "…" : `${bal.toFixed(2)} USDC`}
            {bal !== null && !funded && (
              <a className="ready-act" href={USDC_FAUCET} target="_blank" rel="noreferrer">
                Fund
              </a>
            )}
          </span>
        </div>
        <div className="ready-row">
          <span className="rk">Signed this session</span>
          <span className="rv">{hasSigned ? "yes" : "no — re-create to redeem"}</span>
        </div>
      </div>

      <div className="ready-foot">
        <button className="ready-refresh" onClick={refresh} disabled={loading}>
          {loading ? "Checking…" : "Refresh"}
        </button>
        <span className="muted" style={{ fontSize: 11.5 }}>
          Send testnet USDC ({shortAddr(USDC_ADDRESS, 4)}) to the smart account.
        </span>
      </div>
    </div>
  );
}
