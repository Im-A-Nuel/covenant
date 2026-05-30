"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { PenLine, Loader2, ShieldCheck, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet";
import { useStore } from "@/lib/store";
import { createCovenantDelegation } from "@/lib/delegation";
import type { Covenant } from "@/lib/types";
import { uid } from "@/lib/utils";

export function CovenantBuilder({ onCreated }: { onCreated?: (id: string) => void }) {
  const { account, correctChain, ensureSmartAccount, creatingSA } = useWallet();
  const { addCovenant } = useStore();

  const [agent, setAgent] = React.useState("Research Agent");
  const [budget, setBudget] = React.useState("3");
  const [duration, setDuration] = React.useState("24");
  const [maxPer, setMaxPer] = React.useState("0.5");
  const [services, setServices] = React.useState("sentiment.demo, market-api.demo");
  const [purpose, setPurpose] = React.useState("research-data-purchase");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [signStep, setSignStep] = React.useState<string>();

  async function submit() {
    setError(undefined);
    setBusy(true);
    try {
      const now = Date.now();
      const expiresAt = new Date(now + Number(duration) * 3600_000).toISOString();
      const id = uid("covenant");
      const base: Covenant = {
        id,
        user: account ?? "0xSIMULATED",
        agent,
        token: "USDC",
        totalBudget: Number(budget),
        remainingBudget: Number(budget),
        durationHours: Number(duration),
        maxPerRequest: Number(maxPer),
        allowedServices: services.split(",").map((s) => s.trim()).filter(Boolean),
        purpose,
        createdAt: new Date().toISOString(),
        expiresAt,
        status: "active",
      };

      if (account && correctChain) {
        setSignStep("Creating MetaMask Smart Account…");
        const sa = await ensureSmartAccount();
        if (!sa) throw new Error("Could not create smart account");
        setSignStep("Sign the ERC-7710 delegation in MetaMask…");
        const signed = await createCovenantDelegation(sa, account, Number(budget));
        base.smartAccount = sa.address;
        base.delegation = {
          delegation: {
            delegator: signed.delegation.delegator,
            delegate: signed.delegation.delegate,
            authority: signed.delegation.authority,
            caveats: signed.delegation.caveats,
            salt: String(signed.delegation.salt),
            signature: signed.signature,
          },
          signature: signed.signature,
          delegationManager: signed.delegationManager,
          chainId: signed.chainId,
          mode: "real",
        };
        addCovenant(base, signed);
      } else {
        // Simulated mode (no wallet / wrong chain) — app still runs end to end.
        base.delegation = {
          delegation: {
            delegator: "0xSIMULATED_SMART_ACCOUNT",
            delegate: "0xSIMULATED_AGENT",
            authority: "0x0000000000000000000000000000000000000000000000000000000000000000",
            caveats: [],
            salt: "0",
          },
          signature: "0xsimulated",
          delegationManager: "0xSIMULATED_DM",
          chainId: 84532,
          mode: "simulated",
        };
        addCovenant(base);
      }

      onCreated?.(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setSignStep(undefined);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-brand" /> Covenant Builder
            </CardTitle>
            <CardDescription>Define the spending policy your agent must obey.</CardDescription>
          </div>
          <Badge tone={account && correctChain ? "good" : "warn"}>
            {account && correctChain ? "On-chain signing" : "Simulated"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Agent">
            <Input value={agent} onChange={(e) => setAgent(e.target.value)} />
          </Field>
          <Field label="Purpose">
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </Field>
          <Field label="Total budget (USDC)">
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </Field>
          <Field label="Max per request (USDC)">
            <Input type="number" value={maxPer} onChange={(e) => setMaxPer(e.target.value)} />
          </Field>
          <Field label="Duration (hours)">
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
          <Field label="Allowed services (comma-separated)">
            <Input value={services} onChange={(e) => setServices(e.target.value)} />
          </Field>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/60 p-3 text-xs text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
          The total budget becomes an on-chain <span className="text-ink">erc20TransferAmount</span> caveat (hard cap).
          The per-request, service, purpose and duplicate rules are enforced off-chain by the policy engine.
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <Button onClick={submit} disabled={busy || creatingSA} className="w-full" size="lg">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {busy ? signStep ?? "Working…" : "Create & sign covenant"}
        </Button>
      </CardContent>
    </Card>
  );
}
