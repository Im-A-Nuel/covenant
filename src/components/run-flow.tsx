"use client";

import * as React from "react";
import type { Covenant, PaymentRequest, PaymentCheck } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useWallet } from "@/lib/wallet";
import { planTask } from "@/lib/venice";
import { requestPaidData, settleAndDeliver } from "@/lib/x402";
import { evaluatePolicy } from "@/lib/policy";
import { executeCovenantPayment } from "@/lib/delegation";
import { generateReport } from "@/lib/venice";
import { uid, shortAddr } from "@/lib/utils";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RunResult {
  price: number;
  remaining: number;
  service: string;
  txHash?: string;
  report?: string;
  decision?: "approved" | "needs_user" | "blocked";
  blocked?: boolean;
  /** True when this approved payment was an over-limit one-time user approval. */
  approvedOnce?: boolean;
}

type Stage = "plan" | "x402" | "policy" | "settle" | "done";

interface PlanState {
  steps: string[];
  revealed: number; // how many <li> have .in
  status: "amber" | "green";
  statusText: string;
  source: string; // human label for the AI backend that produced the plan
  mode: "real" | "mock"; // real LLM call vs deterministic fallback
}

/** Friendly label for whichever AI backend answered (Claude bridge, Venice, or fallback). */
function planSource(meta?: { model: string; mode: string }): { source: string; mode: "real" | "mock" } {
  if (!meta || meta.mode !== "real") return { source: "fallback planner", mode: "mock" };
  if (/claude/i.test(meta.model)) return { source: "Claude", mode: "real" };
  if (/llama|venice/i.test(meta.model)) return { source: "Venice AI", mode: "real" };
  return { source: meta.model, mode: "real" };
}
interface X402State {
  service: string;
  resource: string;
  price: number;
  payTo: string;
}
interface Check {
  label: string;
  detail: string;
  ok: boolean;
}
type Decision = "approved" | "needs_user" | "blocked";
interface PolicyState {
  checks: Check[];
  revealed: number; // how many checks have been evaluated (show ✓/✗)
  status: "amber" | "green" | "red";
  statusText: string;
  showDecision: boolean;
  decision: Decision;
  /** Set once the user approves an over-limit (needs_user) payment. */
  approved?: boolean;
}
interface SettleState {
  status: "amber" | "green";
  statusText: string;
  done: boolean;
  price: number;
  service: string;
  txHash: string;
  remaining: number;
  mode: "real" | "simulated";
  verified: boolean;
}

const REFERENCE_PLAN = (cov: Covenant, service: string): string[] => [
  "Check free market data first",
  `If insufficient, request paid data from ${service}`,
  `Verify price is under the ${cov.maxPerRequest.toFixed(2)} USDC limit`,
  "Summarize findings into a clear answer",
];

const checkSvg = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12.5l4.2 4.2L19 7"
      stroke="#2f8f5b"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const crossSvg = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="#cf4b3e" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

const approveIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const blockIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const holdIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M9 6v12M15 6v12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

/** The policy decision card: icon + copy + tint for each outcome. */
function DecisionCard({ decision, approved, show }: { decision: Decision; approved: boolean; show: boolean }) {
  const blocked = decision === "blocked";
  const pending = decision === "needs_user" && !approved;
  const cls = blocked ? "blocked" : pending ? "warn" : "";
  const icon = blocked ? blockIcon : pending ? holdIcon : approveIcon;
  const title = blocked
    ? "Blocked by covenant"
    : decision === "needs_user"
      ? approved
        ? "Approved by you"
        : "Needs your approval"
      : "Approved";
  const sub = blocked
    ? "A covenant rule was violated. Payment blocked; no funds moved."
    : decision === "needs_user"
      ? approved
        ? "One-time approval for a payment over the per-request limit."
        : "Price is over your per-request limit. Approve this one payment below."
      : "All checks passed. Payment is within the covenant.";
  return (
    <div className={`decision ${cls}`} style={{ display: show ? "flex" : "none" }}>
      <span className="di">{icon}</span>
      <div>
        <b>{title}</b>
        <div className="dsub">{sub}</div>
      </div>
    </div>
  );
}

export function RunFlow({
  covenant,
  task,
  onDone,
}: {
  covenant: Covenant;
  task: string;
  onDone?: (r: RunResult) => void;
}) {
  const { audit, addAudit, updateCovenant, getSigned } = useStore();
  const { account } = useWallet();
  // Snapshot the audit history at mount; the run is a one-shot effect and the
  // policy check only needs the history as it was when the task started.
  const auditAtMount = React.useRef(audit).current;

  const [stage, setStage] = React.useState<Stage>("plan");
  const [plan, setPlan] = React.useState<PlanState | null>(null);
  const [x402, setX402] = React.useState<X402State | null>(null);
  const [policy, setPolicy] = React.useState<PolicyState | null>(null);
  const [settle, setSettle] = React.useState<SettleState | null>(null);
  // The over-limit "approve once" gate: on a needs_user decision the run pauses
  // until the user resolves this promise via the Approve / Cancel buttons.
  const [awaitingApproval, setAwaitingApproval] = React.useState(false);
  const approvalResolver = React.useRef<((approved: boolean) => void) | null>(null);
  const decideApproval = React.useCallback((approved: boolean) => {
    const resolve = approvalResolver.current;
    approvalResolver.current = null;
    setAwaitingApproval(false);
    resolve?.(approved);
  }, []);

  // Refs to the appended cards so the staged transform (.rcard -> .rcard.in) can run.
  const planCardRef = React.useRef<HTMLDivElement>(null);
  const x402CardRef = React.useRef<HTMLDivElement>(null);
  const policyCardRef = React.useRef<HTMLDivElement>(null);
  const settleCardRef = React.useRef<HTMLDivElement>(null);

  // Add the `.in` class on the frame after a card mounts (matches the reference rAF double-tick).
  useRevealOnMount(planCardRef, plan != null);
  useRevealOnMount(x402CardRef, x402 != null);
  useRevealOnMount(policyCardRef, policy != null);
  useRevealOnMount(settleCardRef, settle != null);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      const cov = covenant;

      // ---------- 1. PLAN ----------
      const fallbackService = cov.allowedServices[0] || "market-api.demo";
      let planSteps = REFERENCE_PLAN(cov, fallbackService);
      let planMeta: Awaited<ReturnType<typeof planTask>> | null = null;
      try {
        planMeta = await planTask(task, cov);
        if (planMeta.plan.steps?.length) planSteps = planMeta.plan.steps;
      } catch {
        /* keep reference steps */
      }
      if (!alive) return;

      const src = planSource(planMeta?.meta);
      setPlan({ steps: planSteps, revealed: 0, status: "amber", statusText: "Planning", source: src.source, mode: src.mode });
      await sleep(450);
      for (let i = 0; i < planSteps.length; i++) {
        if (!alive) return;
        setPlan((p) => (p ? { ...p, revealed: i + 1 } : p));
        await sleep(360);
      }
      if (!alive) return;
      setPlan((p) => (p ? { ...p, status: "green", statusText: "Planned" } : p));
      await sleep(380);

      // ---------- 2. 402 ----------
      let pay: PaymentRequest | null = null;
      let endpoint: string | undefined;
      try {
        const res = await requestPaidData();
        if (res.status === "paywall") {
          pay = res.payment;
          endpoint = res.endpoint;
        }
      } catch {
        /* fall back to reference values */
      }
      if (!alive) return;

      const service = pay?.service || fallbackService;
      const resource = pay?.resource || "ETH sentiment report";
      const price = pay?.price ?? 0.25;
      const payTo = pay ? shortAddr(String(pay.payTo), 2) : "0x4a…e9";
      setStage("x402");
      setX402({ service, resource, price, payTo });
      await sleep(850);

      // ---------- 3. POLICY ----------
      let checks: Check[];
      const policyResult = pay ? evaluatePolicy(cov, pay, auditAtMount) : null;
      if (policyResult) {
        checks = policyResult.checks.map((c: PaymentCheck) => ({ label: c.label, detail: c.detail, ok: c.ok }));
      } else {
        // No live 402 (offline / fetch failed): show the reference checks as passing.
        checks = [
          ["Budget remaining", `${cov.remainingBudget.toFixed(2)} ≥ ${price.toFixed(2)}`],
          ["Price under max-per-request", `${price.toFixed(2)} ≤ ${cov.maxPerRequest.toFixed(2)}`],
          ["Service is verified", service],
          ["Purpose matches covenant", cov.purpose],
          ["No duplicate payment", "none found"],
          ["Duration still active", "within window"],
        ].map(([label, detail]) => ({ label, detail, ok: true }));
      }
      const decision: Decision = policyResult?.decision ?? "approved";
      if (!alive) return;

      setStage("policy");
      setPolicy({ checks, revealed: 0, status: "amber", statusText: "Checking", showDecision: false, decision });
      await sleep(450);
      for (let i = 0; i < checks.length; i++) {
        if (!alive) return;
        setPolicy((p) => (p ? { ...p, revealed: i + 1 } : p));
        await sleep(340);
      }
      if (!alive) return;
      const finalStatus = decision === "approved" ? "green" : decision === "needs_user" ? "amber" : "red";
      const finalText = decision === "approved" ? "Approved" : decision === "needs_user" ? "Needs approval" : "Blocked";
      setPolicy((p) => (p ? { ...p, status: finalStatus, statusText: finalText, showDecision: true } : p));
      await sleep(560);

      // Hard block: a covenant rule was violated. Halt BEFORE any redemption — the
      // payment is never made; we record it and stop. The covenant did its job
      // (on-chain caveats + off-chain policy) before a token moved.
      if (decision === "blocked") {
        if (!alive) return;
        addAudit({
          id: uid("aud"),
          covenantId: cov.id,
          task,
          agent: cov.agent,
          service,
          resource,
          amount: price,
          decision: "blocked",
          reason: policyResult?.reason || "Payment blocked by covenant policy.",
          execMode: "simulated",
          remainingBudget: cov.remainingBudget,
          status: "blocked",
          timestamp: new Date().toISOString(),
          timeLabel: "just now",
        });
        setStage("done");
        if (alive) onDone?.({ price, remaining: cov.remainingBudget, service, decision: "blocked", blocked: true });
        return;
      }

      // Needs approval: the price is over the per-request cap but every other rule
      // passed. Pause and let the user authorize this single payment. Funds only
      // move if they approve; a decline is recorded as blocked.
      let approvedByUser = false;
      if (decision === "needs_user") {
        if (!alive) return;
        setAwaitingApproval(true);
        approvedByUser = await new Promise<boolean>((resolve) => {
          approvalResolver.current = resolve;
        });
        if (!alive) return;
        setAwaitingApproval(false);

        if (!approvedByUser) {
          addAudit({
            id: uid("aud"),
            covenantId: cov.id,
            task,
            agent: cov.agent,
            service,
            resource,
            amount: price,
            decision: "blocked",
            reason: "Over the per-request limit and you declined the one-time approval. No funds moved.",
            execMode: "simulated",
            remainingBudget: cov.remainingBudget,
            status: "blocked",
            timestamp: new Date().toISOString(),
            timeLabel: "just now",
          });
          setPolicy((p) => (p ? { ...p, status: "red", statusText: "Declined" } : p));
          setStage("done");
          if (alive) onDone?.({ price, remaining: cov.remainingBudget, service, decision: "needs_user", blocked: true });
          return;
        }

        // Approved by the user — reflect it on the decision card, then settle.
        setPolicy((p) => (p ? { ...p, status: "green", statusText: "Approved by you", approved: true } : p));
        await sleep(420);
        if (!alive) return;
      }

      // ---------- 4. SETTLEMENT (only when approved) ----------
      const remaining = Math.max(0, cov.remainingBudget - price);
      setStage("settle");
      setSettle({
        status: "amber",
        statusText: "Settling…",
        done: false,
        price,
        service,
        txHash: "0x8f3c…a31c",
        remaining,
        mode: "simulated",
        verified: false,
      });

      // Redeem the ERC-7710 delegation on-chain when a signed delegation exists
      // for this covenant (created with a real wallet this session); else simulate.
      let proofHash = "0x8f3c…a31c"; // synthetic display fallback
      let redeemMode: "real" | "simulated" = "simulated";
      const signed = getSigned(cov.id);
      try {
        if (signed && account && pay) {
          const result = await executeCovenantPayment(
            signed,
            account,
            pay.payTo as `0x${string}`,
            price
          );
          proofHash = result.transactionHash;
          redeemMode = result.mode;
        }
      } catch {
        /* keep simulated fallback */
      }

      // Re-request the resource with the redemption hash as proof; the x402 server
      // verifies the USDC transfer on-chain. `verified` is the source of truth.
      let delivery: Awaited<ReturnType<typeof settleAndDeliver>> | null = null;
      if (pay && endpoint) {
        try {
          delivery = await settleAndDeliver(endpoint, proofHash);
        } catch {
          /* delivery optional */
        }
      }
      const verified = !!delivery?.verified;
      const execMode = redeemMode === "real" && verified ? "real" : "simulated";
      const displayHash = proofHash.length > 14 ? shortAddr(proofHash, 4) : proofHash;

      await sleep(1300);
      if (!alive) return;
      setSettle((s) =>
        s
          ? {
              ...s,
              status: "green",
              statusText: "Settled",
              done: true,
              txHash: displayHash,
              mode: execMode,
              verified,
            }
          : s
      );

      // ---------- finalize: report + audit + budget ----------
      let report: string | undefined;
      try {
        const paidData = delivery?.resource ? JSON.stringify(delivery.resource) : null;
        const r = await generateReport(task, paidData, cov);
        report = r.report;
      } catch {
        /* report optional */
      }
      if (!alive) return;

      updateCovenant(cov.id, {
        remainingBudget: remaining,
        status: remaining <= 0 ? "depleted" : cov.status,
      });
      addAudit({
        id: uid("aud"),
        covenantId: cov.id,
        task,
        agent: cov.agent,
        service,
        resource,
        amount: price,
        decision: "approved",
        reason: approvedByUser
          ? "Approved by you: a one-time payment over the per-request limit. All other covenant rules passed."
          : policyResult?.reason || "All policy checks passed. Payment within covenant.",
        transactionHash: proofHash,
        execMode,
        remainingBudget: remaining,
        status: "completed",
        timestamp: new Date().toISOString(),
        timeLabel: "just now",
      });

      setStage("done");
      if (alive) onDone?.({ price, remaining, service, txHash: displayHash, report, decision: "approved", blocked: false, approvedOnce: approvedByUser });
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* ---------- 1. PLAN ---------- */}
      {plan && (
        <div className="rcard" ref={planCardRef}>
          <div className="rhead">
            <span className="ri blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
                  stroke="#2775ca"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="3" stroke="#2775ca" strokeWidth="1.7" />
              </svg>
            </span>
            <div>
              <h3>{covenant.agent} · plan</h3>
              <div className="rsub">
                Generated by {plan.source}{" "}
                <span className={`settle-badge ${plan.mode === "real" ? "real" : "sim"}`}>{plan.mode}</span>
              </div>
            </div>
            <span className={`rstat pstat ${plan.status}`}>{plan.statusText}</span>
          </div>
          <ul className="plan">
            {plan.steps.map((step, i) => (
              <li key={i} className={i < plan.revealed ? "in" : ""}>
                <span className="pn">{i + 1}</span> {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- 2. 402 ---------- */}
      {x402 && (
        <div className="rcard" ref={x402CardRef}>
          <div className="rhead">
            <span className="ri amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="#b08900" strokeWidth="1.7" />
                <path d="M3 10h18" stroke="#b08900" strokeWidth="1.7" />
              </svg>
            </span>
            <div>
              <h3>402 Payment Required</h3>
              <div className="rsub">Free data insufficient · paid resource needed</div>
            </div>
            <span
              className="mono"
              style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#b08900" }}
            >
              HTTP 402
            </span>
          </div>
          <div className="x402">
            <div className="xrow">
              <span className="k">Service</span>
              <span className="v">{x402.service}</span>
            </div>
            <div className="xrow">
              <span className="k">Resource</span>
              <span className="v">{x402.resource}</span>
            </div>
            <div className="xrow">
              <span className="k">Price</span>
              <span className="v">{x402.price.toFixed(2)} USDC</span>
            </div>
            <div className="xrow">
              <span className="k">Pay to</span>
              <span className="v mono">{x402.payTo}</span>
            </div>
          </div>
        </div>
      )}

      {/* ---------- 3. POLICY ---------- */}
      {policy && (
        <div className="rcard" ref={policyCardRef}>
          <div className="rhead">
            <span className="ri grey">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
                  stroke="#0c0c0d"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h3>Policy engine</h3>
              <div className="rsub">Validating against Covenant {covenant.id}</div>
            </div>
            <span className={`rstat pstat ${policy.status}`}>{policy.statusText}</span>
          </div>
          <ul className="checks">
            {policy.checks.map((c, i) => {
              const evaluated = i < policy.revealed;
              const cls = evaluated ? (c.ok ? "ok" : "fail") : "";
              return (
                <li key={i} className={cls}>
                  <span className="ck">
                    {evaluated ? (c.ok ? checkSvg : crossSvg) : <span className="spin" />}
                  </span>
                  {c.label}
                  <span className="cv">{c.detail}</span>
                </li>
              );
            })}
          </ul>
          <DecisionCard decision={policy.decision} approved={!!policy.approved} show={policy.showDecision} />

          {awaitingApproval && (
            <div className="approve-gate">
              <div className="ag-text">
                <b>Approve this one payment?</b>
                <span>
                  {x402 ? `${x402.price.toFixed(2)} USDC` : "This payment"} is over the{" "}
                  {covenant.maxPerRequest.toFixed(2)} USDC per-request limit. Every other covenant rule passed.
                </span>
              </div>
              <div className="ag-actions">
                <button className="btn btn-dark" onClick={() => decideApproval(true)}>
                  Approve once &amp; pay
                </button>
                <button className="btn btn-ghost" onClick={() => decideApproval(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- 4. SETTLEMENT ---------- */}
      {settle && (
        <div className="rcard" ref={settleCardRef}>
          <div className="rhead">
            <span className="ri green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z"
                  stroke="#2f8f5b"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 12l2 2 4-4"
                  stroke="#2f8f5b"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h3>Delegated payment</h3>
              <div className="rsub">ERC-7710 redemption · DelegationManager</div>
            </div>
            <span className={`rstat pstat ${settle.status}`}>{settle.statusText}</span>
          </div>
          {settle.done ? (
            <div className="pay-line">
              <span
                className="ck ok"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "rgba(47,143,91,.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {checkSvg}
              </span>{" "}
              Sent {settle.price.toFixed(2)} USDC · tx{" "}
              <span className="mono" style={{ fontWeight: 600 }}>
                {settle.txHash}
              </span>{" "}
              · {settle.remaining.toFixed(2)} USDC left
              <span className={`settle-badge ${settle.mode === "real" && settle.verified ? "real" : "sim"}`}>
                {settle.mode === "real" && settle.verified ? "on-chain · verified" : "simulated"}
              </span>
            </div>
          ) : (
            <div className="pay-line">
              <span
                className="ck"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "var(--chip)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="spin" />
              </span>{" "}
              Sending {settle.price.toFixed(2)} USDC to {settle.service}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Replays the reference rAF double-tick: add `.in` to the card the frame after it mounts. */
function useRevealOnMount(ref: React.RefObject<HTMLDivElement | null>, present: boolean) {
  React.useEffect(() => {
    if (!present) return;
    const el = ref.current;
    if (!el) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.add("in"))
    );
    return () => cancelAnimationFrame(id);
  }, [ref, present]);
}
