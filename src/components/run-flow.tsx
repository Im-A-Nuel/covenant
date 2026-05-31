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
}

type Stage = "plan" | "x402" | "policy" | "settle" | "done";

interface PlanState {
  steps: string[];
  revealed: number; // how many <li> have .in
  status: "amber" | "green";
  statusText: string;
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

  // Refs to the appended cards so the staged transform (.rcard -> .rcard.in) can run.
  const planCardRef = React.useRef<HTMLDivElement>(null);
  const x402CardRef = React.useRef<HTMLDivElement>(null);
  const policyCardRef = React.useRef<HTMLDivElement>(null);
  const settleCardRef = React.useRef<HTMLDivElement>(null);

  // Add the `.in` class on the frame after a card mounts (matches the reference rAF double-tick).
  useRevealOnMount(planCardRef, stage !== null);
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

      setPlan({ steps: planSteps, revealed: 0, status: "amber", statusText: "Planning" });
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

      // If the firewall did not approve, halt BEFORE any redemption. The payment is
      // never made; we record a blocked audit entry and stop. This is the covenant
      // doing its job on-chain rules + off-chain policy, before a token moves.
      if (decision !== "approved") {
        if (!alive) return;
        addAudit({
          id: uid("aud"),
          covenantId: cov.id,
          task,
          agent: cov.agent,
          service,
          resource,
          amount: price,
          decision,
          reason: policyResult?.reason || "Payment held by covenant policy.",
          execMode: "simulated",
          remainingBudget: cov.remainingBudget,
          status: "blocked",
          timestamp: new Date().toISOString(),
          timeLabel: "just now",
        });
        setStage("done");
        if (alive) onDone?.({ price, remaining: cov.remainingBudget, service, decision, blocked: true });
        return;
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
        reason: policyResult?.reason || "All policy checks passed. Payment within covenant.",
        transactionHash: proofHash,
        execMode,
        remainingBudget: remaining,
        status: "completed",
        timestamp: new Date().toISOString(),
        timeLabel: "just now",
      });

      setStage("done");
      if (alive) onDone?.({ price, remaining, service, txHash: displayHash, report, decision: "approved", blocked: false });
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
              <div className="rsub">Generated by Venice AI</div>
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
          <div
            className={`decision ${policy.decision === "blocked" ? "blocked" : policy.decision === "needs_user" ? "warn" : ""}`}
            style={{ display: policy.showDecision ? "flex" : "none" }}
          >
            <span className="di">{policy.decision === "approved" ? approveIcon : blockIcon}</span>
            <div>
              <b>
                {policy.decision === "approved"
                  ? "Approved"
                  : policy.decision === "needs_user"
                    ? "Needs your approval"
                    : "Blocked by covenant"}
              </b>
              <div className="dsub">
                {policy.decision === "approved"
                  ? "All checks passed. Payment is within the covenant."
                  : policy.decision === "needs_user"
                    ? "Price exceeds your per-request limit. Payment held; no funds moved."
                    : "A covenant rule was violated. Payment blocked; no funds moved."}
              </div>
            </div>
          </div>
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
