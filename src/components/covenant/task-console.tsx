"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot, Loader2, Play, Sparkles, CheckCircle2, XCircle, AlertTriangle,
  CreditCard, FileText, Link2, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/lib/wallet";
import { useStore } from "@/lib/store";
import { planTask, generateReport } from "@/lib/venice";
import { requestPaidData, settleAndDeliver } from "@/lib/x402";
import { evaluatePolicy } from "@/lib/policy";
import { executeCovenantPayment } from "@/lib/delegation";
import type { Covenant, PaymentRequest, PolicyResult, AgentStep, VeniceMeta, AuditEntry } from "@/lib/types";
import { uid } from "@/lib/utils";
import { explorerTx } from "@/lib/chain";

type Phase = "idle" | "planning" | "requesting" | "deciding" | "awaiting_user" | "paying" | "reporting" | "done" | "blocked";

export function TaskConsole({ covenant }: { covenant: Covenant }) {
  const { account } = useWallet();
  const { audit, updateCovenant, getSigned, addAudit } = useStore();

  const [task, setTask] = React.useState("Analyze whether ETH has short-term risk. Use paid data only if necessary.");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [steps, setSteps] = React.useState<AgentStep[]>([]);
  const [plan, setPlan] = React.useState<string[]>([]);
  const [planMeta, setPlanMeta] = React.useState<VeniceMeta>();
  const [payment, setPayment] = React.useState<PaymentRequest>();
  const [policy, setPolicy] = React.useState<PolicyResult>();
  const [report, setReport] = React.useState<string>();
  const [reportMeta, setReportMeta] = React.useState<VeniceMeta>();
  const [txHash, setTxHash] = React.useState<string>();
  const [execMode, setExecMode] = React.useState<"real" | "simulated">();
  const [execNote, setExecNote] = React.useState<string>();

  const pushStep = (s: AgentStep) => setSteps((p) => [...p, s]);
  const patchStep = (id: string, patch: Partial<AgentStep>) =>
    setSteps((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  function resetRun() {
    setSteps([]); setPlan([]); setPayment(undefined); setPolicy(undefined);
    setReport(undefined); setTxHash(undefined); setExecMode(undefined); setExecNote(undefined);
  }

  async function run() {
    resetRun();
    setPhase("planning");

    // 1. PLAN (Venice)
    const s1 = uid("step"); pushStep({ id: s1, label: "Plan task with Venice AI", status: "running" });
    const { plan: p, meta } = await planTask(task, covenant);
    setPlan(p.steps); setPlanMeta(meta);
    patchStep(s1, { status: "done", detail: p.summary });

    if (!p.needsPaidData) {
      await finishWithoutPayment();
      return;
    }

    // 2. REQUEST (x402)
    setPhase("requesting");
    const s2 = uid("step"); pushStep({ id: s2, label: "Call x402 service", status: "running" });
    const res = await requestPaidData();
    if (res.status === "ok") {
      patchStep(s2, { status: "done", detail: "Free data sufficient — no payment needed." });
      await finishWithoutPayment();
      return;
    }
    setPayment(res.payment);
    patchStep(s2, { status: "done", detail: `402 Payment Required · ${res.payment.price} USDC` });

    // 3. POLICY
    setPhase("deciding");
    const s3 = uid("step"); pushStep({ id: s3, label: "Policy engine check", status: "running" });
    const decision = evaluatePolicy(covenant, res.payment, audit);
    setPolicy(decision);
    patchStep(s3, {
      status: decision.decision === "blocked" ? "blocked" : "done",
      detail: decision.reason,
    });

    if (decision.decision === "blocked") {
      setPhase("blocked");
      recordAudit(res.payment, decision, "blocked", undefined, "simulated");
      return;
    }
    if (decision.decision === "needs_user") {
      setPhase("awaiting_user");
      return;
    }
    await pay(res.payment, res.endpoint, decision);
  }

  async function pay(p: PaymentRequest, endpoint: string, decision: PolicyResult) {
    setPhase("paying");
    const s4 = uid("step"); pushStep({ id: s4, label: "Redeem ERC-7710 delegated payment", status: "running" });

    const signed = getSigned(covenant.id);
    let mode: "real" | "simulated" = "simulated";
    let hash = "0x" + uid("sim").replace(/[^a-f0-9]/g, "0").padEnd(64, "0");
    let note: string | undefined;

    if (signed && account) {
      const result = await executeCovenantPayment(signed, account, p.payTo as `0x${string}`, p.price);
      mode = result.mode; hash = result.transactionHash; note = result.note;
    } else {
      note = "No signed delegation in memory (simulated covenant) — settlement simulated.";
    }
    setTxHash(hash); setExecMode(mode); setExecNote(note);
    patchStep(s4, { status: "done", detail: `${mode === "real" ? "On-chain" : "Simulated"} redemption · ${hash.slice(0, 14)}…` });

    // settle + deliver
    const s5 = uid("step"); pushStep({ id: s5, label: "Receive paid resource", status: "running" });
    const delivered = await settleAndDeliver(endpoint, hash);
    const paidData = JSON.stringify((delivered as { resource?: unknown }).resource ?? delivered);
    patchStep(s5, { status: "done", detail: "Paid data delivered." });

    // budget
    const newRemaining = Math.max(0, covenant.remainingBudget - p.price);
    updateCovenant(covenant.id, {
      remainingBudget: newRemaining,
      status: newRemaining <= 0 ? "depleted" : covenant.status,
    });

    // report
    setPhase("reporting");
    const s6 = uid("step"); pushStep({ id: s6, label: "Generate final report with Venice", status: "running" });
    const { report: r, meta } = await generateReport(task, paidData, covenant);
    setReport(r); setReportMeta(meta);
    patchStep(s6, { status: "done" });

    recordAudit(p, decision, "completed", hash, mode, newRemaining);
    setPhase("done");
  }

  async function finishWithoutPayment() {
    setPhase("reporting");
    const s = uid("step"); pushStep({ id: s, label: "Generate report (no payment)", status: "running" });
    const { report: r, meta } = await generateReport(task, null, covenant);
    setReport(r); setReportMeta(meta);
    patchStep(s, { status: "done" });
    setPhase("done");
  }

  function recordAudit(
    p: PaymentRequest, decision: PolicyResult, status: AuditEntry["status"],
    hash: string | undefined, mode: "real" | "simulated", remaining = covenant.remainingBudget
  ) {
    addAudit({
      id: uid("audit"),
      covenantId: covenant.id,
      task,
      agent: covenant.agent,
      service: p.service,
      resource: p.resource,
      amount: p.price,
      decision: decision.decision,
      reason: decision.reason,
      transactionHash: hash,
      execMode: mode,
      remainingBudget: remaining,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  const running = ["planning", "requesting", "deciding", "paying", "reporting"].includes(phase);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="h-4 w-4 text-brand" /> Agent Task Console</CardTitle>
        <CardDescription>Give the agent a task. It plans, decides, and pays — only under covenant.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea rows={3} value={task} onChange={(e) => setTask(e.target.value)} disabled={running} />
        <div className="flex items-center gap-2">
          <Button onClick={run} disabled={running} size="lg" className="flex-1">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Agent working…" : "Run agent"}
          </Button>
          {planMeta && (
            <Badge tone={planMeta.mode === "real" ? "good" : "warn"}>
              <Sparkles className="h-3 w-3" /> Venice: {planMeta.model}
            </Badge>
          )}
        </div>

        {/* Steps timeline */}
        {steps.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border bg-surface-2/40 p-4">
            {steps.map((s) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-3">
                <StepIcon status={s.status} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink">{s.label}</div>
                  {s.detail && <div className="text-xs text-muted">{s.detail}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Payment + policy decision */}
        <AnimatePresence>
          {payment && policy && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <PaymentDecisionPanel
                payment={payment}
                policy={policy}
                awaiting={phase === "awaiting_user"}
                onApprove={() => pay(payment, "/api/x402/sentiment", { ...policy, decision: "approved" })}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Execution result */}
        {txHash && (
          <div className="rounded-xl border border-border bg-surface-2/40 p-4 text-sm">
            <div className="mb-1 flex items-center gap-2 text-ink">
              <CreditCard className="h-4 w-4 text-good" /> Payment settled
              <Badge tone={execMode === "real" ? "good" : "warn"}>{execMode === "real" ? "on-chain" : "simulated"}</Badge>
            </div>
            <a href={explorerTx(txHash)} target="_blank" rel="noreferrer" className="flex items-center gap-1 break-all font-mono text-xs text-brand hover:underline">
              {txHash} <Link2 className="h-3 w-3 shrink-0" />
            </a>
            {execNote && <p className="mt-1 text-xs text-faint">{execNote}</p>}
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="rounded-xl border border-border bg-gradient-to-b from-surface-2/60 to-surface/60 p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-ink"><FileText className="h-4 w-4 text-brand" /> Final report</div>
              {reportMeta && <Badge tone="violet"><Sparkles className="h-3 w-3" /> {reportMeta.model}</Badge>}
            </div>
            <div className="prose-report whitespace-pre-wrap text-sm leading-relaxed text-muted">{report}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepIcon({ status }: { status: AgentStep["status"] }) {
  if (status === "running") return <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-brand" />;
  if (status === "done") return <CheckCircle2 className="mt-0.5 h-4 w-4 text-good" />;
  if (status === "blocked") return <XCircle className="mt-0.5 h-4 w-4 text-bad" />;
  return <div className="mt-1 h-3 w-3 rounded-full border border-border" />;
}

function PaymentDecisionPanel({
  payment, policy, awaiting, onApprove,
}: {
  payment: PaymentRequest; policy: PolicyResult; awaiting: boolean; onApprove: () => void;
}) {
  const tone = policy.decision === "approved" ? "good" : policy.decision === "blocked" ? "bad" : "warn";
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-ink">
          <CreditCard className="h-4 w-4 text-brand" /> {payment.resource}
          <span className="font-mono text-muted">· {payment.price} USDC</span>
        </div>
        <Badge tone={tone}>{policy.decision.replace("_", " ")}</Badge>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {policy.checks.map((c) => (
          <div key={c.label} className="flex items-start gap-2 text-xs">
            {c.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bad" />}
            <span className="text-muted"><span className="text-ink">{c.label}</span> — {c.detail}</span>
          </div>
        ))}
      </div>
      {awaiting && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn/10 p-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warn" />
          <span className="flex-1 text-xs text-warn">Price exceeds the per-request limit. Approve to redeem anyway?</span>
          <Button size="sm" variant="good" onClick={onApprove}>
            <ShieldCheck className="h-3.5 w-3.5" /> Approve & pay
          </Button>
        </div>
      )}
    </div>
  );
}
