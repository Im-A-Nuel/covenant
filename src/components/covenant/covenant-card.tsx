"use client";

import { Wallet2, Clock, Target, Layers, Link2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Covenant } from "@/lib/types";
import { shortAddr, formatUSDC, timeAgo } from "@/lib/utils";
import { explorerAddr } from "@/lib/chain";

const statusTone = {
  active: "good",
  expired: "neutral",
  revoked: "bad",
  depleted: "warn",
} as const;

export function CovenantCard({ covenant }: { covenant: Covenant }) {
  const used = covenant.totalBudget - covenant.remainingBudget;
  const pct = covenant.totalBudget > 0 ? (used / covenant.totalBudget) * 100 : 0;
  const real = covenant.delegation?.mode === "real";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand" /> {covenant.agent}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge tone={real ? "violet" : "warn"}>{real ? "ERC-7710 signed" : "simulated"}</Badge>
            <Badge tone={statusTone[covenant.status]}>{covenant.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* budget bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>Budget used</span>
            <span className="font-mono text-ink">
              {formatUSDC(used)} / {formatUSDC(covenant.totalBudget)} USDC
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Meta icon={Target} label="Max / request" value={`${formatUSDC(covenant.maxPerRequest)} USDC`} />
          <Meta icon={Clock} label="Expires" value={timeAgo(covenant.expiresAt).replace("ago", "from now").replace(/^-/, "")} />
          <Meta icon={Layers} label="Purpose" value={covenant.purpose} />
          <Meta icon={Wallet2} label="Remaining" value={`${formatUSDC(covenant.remainingBudget)} USDC`} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {covenant.allowedServices.map((s) => (
            <Badge key={s} tone="neutral">{s}</Badge>
          ))}
        </div>

        {covenant.smartAccount && (
          <div className="space-y-1.5 rounded-lg border border-border bg-surface-2/50 p-3 text-xs">
            <Row label="Smart Account" value={shortAddr(covenant.smartAccount, 6)} href={explorerAddr(covenant.smartAccount)} />
            {covenant.delegation && (
              <>
                <Row label="Delegate (agent)" value={shortAddr(covenant.delegation.delegation.delegate, 6)} />
                <Row label="Delegation Mgr" value={shortAddr(covenant.delegation.delegationManager, 6)} />
                <Row label="Signature" value={shortAddr(covenant.delegation.signature, 8)} mono />
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Meta({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-faint" />
      <div className="min-w-0">
        <div className="text-[11px] text-faint">{label}</div>
        <div className="truncate text-ink">{value}</div>
      </div>
    </div>
  );
}

function Row({ label, value, href, mono }: { label: string; value: string; href?: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-faint">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-brand hover:underline">
          {value} <Link2 className="h-3 w-3" />
        </a>
      ) : (
        <span className={mono ? "font-mono text-muted" : "text-muted"}>{value}</span>
      )}
    </div>
  );
}
