"use client";

import * as React from "react";
import Link from "next/link";
import { CovenantMark } from "@/components/covenant-mark";
import { CovenantCard } from "@/components/covenant-card";
import { RunFlow, type RunResult } from "@/components/run-flow";
import { IconCoin, IconLimit, IconClock, IconTarget } from "@/components/icons";
import { useWallet } from "@/lib/wallet";
import { useStore } from "@/lib/store";
import { createCovenantDelegation } from "@/lib/delegation";
import type { Covenant } from "@/lib/types";
import { WalletMenu } from "@/components/wallet-menu";
import { useToast } from "@/components/ui/toast";

/* ---------- step metadata ---------- */
const STEPS = [
  { title: "Build covenant", sub: "Define spending rules" },
  { title: "Assign task", sub: "Tell the agent what to do" },
  { title: "Policy check", sub: "Validate each payment" },
  { title: "Audit & proof", sub: "Review the trail" },
];

const SERVICE_OPTS = ["venice.ai", "market-api.demo", "inference.xyz"];

const DURATIONS: { v: string; hours: number }[] = [
  { v: "1 hour", hours: 1 },
  { v: "24 hours", hours: 24 },
  { v: "7 days", hours: 168 },
];

const fmt = (n: number) => Number(n).toFixed(2) + " USDC";

function durationHours(label: string): number {
  return DURATIONS.find((d) => d.v === label)?.hours ?? 24;
}

const ArrowRight = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12h14M13 6l6 6-6 6"
      stroke="#fff"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckTiny = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12.5l4.2 4.2L19 7"
      stroke="#fff"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function NewCovenantPage() {
  const { account, correctChain, ensureSmartAccount } = useWallet();
  const { addCovenant } = useStore();

  /* ---------- step nav ---------- */
  const [currentStep, setCurrentStep] = React.useState(0);
  const [maxStep, setMaxStep] = React.useState(0);
  const [anim, setAnim] = React.useState(true);

  const goStep = React.useCallback((n: number) => {
    setMaxStep((m) => Math.max(m, n));
    setCurrentStep(n);
    setAnim(false);
    // re-trigger the fade animation on the next frame (matches reference offsetWidth reflow)
    requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ---------- builder form state ---------- */
  const [agent, setAgent] = React.useState("Research Agent");
  const [budget, setBudget] = React.useState("3");
  const [duration, setDuration] = React.useState("24 hours");
  const [maxPer, setMaxPer] = React.useState("0.5");
  const [services, setServices] = React.useState<string[]>(["venice.ai", "market-api.demo"]);
  const [purpose, setPurpose] = React.useState("research-data-purchase");

  const budgetNum = parseFloat(budget) || 0;
  const maxNum = parseFloat(maxPer) || 0;

  /* ---------- created covenant + run state ---------- */
  const [created, setCreated] = React.useState<Covenant | null>(null);
  const [task, setTask] = React.useState(
    "Analyze whether ETH has short-term risk. Use paid data only if free data is insufficient. Do not spend more than 1 USDC."
  );
  const [runResult, setRunResult] = React.useState<RunResult | null>(null);
  const [signing, setSigning] = React.useState(false);

  function toggleService(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  /* ---------- step 1 → 2: create + sign covenant ---------- */
  async function createCovenant() {
    if (!services.length) {
      toast("Select at least one allowed service", "error");
      return;
    }
    setSigning(true);
    try {
      const now = Date.now();
      const hours = durationHours(duration);
      const id = `#${String(Math.floor(now / 1000) % 1000).padStart(3, "0")}`;
      const base: Covenant = {
        id,
        user: account ?? "0x7a3F2c",
        agent: agent || "Agent",
        token: "USDC",
        totalBudget: budgetNum,
        remainingBudget: budgetNum,
        durationHours: hours,
        maxPerRequest: maxNum,
        allowedServices: services,
        purpose,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + hours * 3600_000).toISOString(),
        status: "active",
        color: "#2775ca",
        payments: 0,
      };

      if (account && correctChain) {
        try {
          const sa = await ensureSmartAccount();
          if (sa) {
            const signed = await createCovenantDelegation(sa, account, budgetNum);
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
            setCreated(base);
            toast(`Covenant ${id} created and signed`);
            goStep(1);
            return;
          }
        } catch {
          /* fall through to simulated */
        }
      }

      // Simulated covenant (no wallet / wrong chain / sign failed); app still runs.
      base.delegation = {
        delegation: {
          delegator: "0xSIMULATED_SMART_ACCOUNT",
          delegate: "0xSIMULATED_AGENT",
          authority:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          caveats: [],
          salt: "0",
        },
        signature: "0xsimulated",
        delegationManager: "0xSIMULATED_DM",
        chainId: 84532,
        mode: "simulated",
      };
      addCovenant(base);
      setCreated(base);
      toast(`Covenant ${id} created`);
      goStep(1);
    } finally {
      setSigning(false);
    }
  }

  /* ---------- preview covenant (live, before creation) ---------- */
  const previewCovenant: Covenant = {
    id: "#001",
    user: account ?? "0x7a3F2c",
    agent: agent || "Agent",
    token: "USDC",
    totalBudget: budgetNum,
    remainingBudget: budgetNum,
    durationHours: durationHours(duration),
    maxPerRequest: maxNum,
    allowedServices: services,
    purpose: purpose || "not set",
    createdAt: "",
    expiresAt: "",
    status: created ? "active" : "active",
  };

  const runCovenant = created ?? previewCovenant;
  const remaining = runResult?.remaining ?? Math.max(0, (created?.totalBudget ?? budgetNum) - 0.25);
  const runPrice = runResult?.price ?? 0.25;
  const runService = runResult?.service ?? "market-api.demo";
  const runTx = runResult?.txHash ?? "0x8f3c…a31c";

  const [showPreview, setShowPreview] = React.useState(false);
  const { toast } = useToast();

  const panelClass = (i: number) =>
    `panel${currentStep === i ? " on" : ""}${currentStep === i && anim ? " anim" : ""}`;

  return (
    <div className="app wizard">
      {/* ============ SIDEBAR ============ */}
      <aside className="side">
        <Link className="brand" href="/">
          <CovenantMark size={28} className="mark" />
          Covenant
        </Link>
        <div className="side-label">Set up your agent</div>
        <ul className="steps">
          {STEPS.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            const unlocked = i <= maxStep || i === 0;
            const locked = !unlocked;
            return (
              <li
                key={i}
                className={`step${active ? " active" : ""}${done ? " done" : ""}${
                  locked ? " locked" : ""
                }`}
                style={{ cursor: unlocked ? "pointer" : "default" }}
                onClick={() => {
                  if (unlocked) goStep(i);
                }}
              >
                <span className="num">{done ? CheckNum : i + 1}</span>
                <span className="stitle">
                  {s.title}
                  <small>{s.sub}</small>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="side-foot">
          <WalletMenu variant="chip" />
          <Link className="back-home" href="/">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to home
          </Link>
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <main className="main">
        {/* ---------- STEP 1: BUILDER ---------- */}
        <section className={panelClass(0)}>
          <div className="page-head">
            <div className="ph-l">
              <div className="crumb">Step 1 · Covenant Builder</div>
              <h1 className="display ph">
                Define what your <i>a</i>gent can spend
              </h1>
              <p>
                Set the budget, time window, per-request ceiling and allowed services. Sign once.
                Your agent can never step outside these rules.
              </p>
            </div>
          </div>

          <div className="builder">
            <div className="form-card">
              <div className="fg">
                <label>Agent name</label>
                <input
                  className="input"
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                />
              </div>
              <div className="two">
                <div className="fg">
                  <label>Token</label>
                  <input className="input" value="USDC" readOnly />
                </div>
                <div className="fg">
                  <label>Total budget</label>
                  <div className="amount">
                    <input
                      className="input"
                      type="number"
                      value={budget}
                      min="0"
                      step="0.25"
                      onChange={(e) => setBudget(e.target.value)}
                    />
                    <span className="unit">USDC</span>
                  </div>
                </div>
              </div>
              <div className="fg">
                <label>
                  Duration <span className="hint">how long the covenant stays active</span>
                </label>
                <div className="seg">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.v}
                      className={duration === d.v ? "on" : ""}
                      onClick={() => setDuration(d.v)}
                    >
                      {d.v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fg">
                <label>Max payment per request</label>
                <div className="amount">
                  <input
                    className="input"
                    type="number"
                    value={maxPer}
                    min="0"
                    step="0.05"
                    onChange={(e) => setMaxPer(e.target.value)}
                  />
                  <span className="unit">USDC</span>
                </div>
              </div>
              <div className="fg">
                <label>
                  Allowed services <span className="hint">only verified x402 endpoints</span>
                </label>
                <div className="svc">
                  {SERVICE_OPTS.map((s) => (
                    <button
                      key={s}
                      className={`opt${services.includes(s) ? " on" : ""}`}
                      onClick={() => toggleService(s)}
                    >
                      <span className="box">{CheckTiny}</span>
                      {s} <span className="verified">verified</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="fg">
                <label>
                  Purpose <span className="hint">payments must match this intent</span>
                </label>
                <input
                  className="input"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button className="btn btn-dark" onClick={createCovenant} disabled={signing}>
                  {signing ? "Signing…" : "Sign & create covenant"}
                  {ArrowRight}
                </button>
                <span className="note">
                  Signs an ERC-7710 delegation. No funds leave your wallet.
                </span>
              </div>
            </div>

            <div className="preview">
              <div className="pv-label">Live preview</div>
              <CovenantCard covenant={previewCovenant} dim={false} />
            </div>

            {/* mobile-only: floating button opens the live preview as a popup */}
            <button type="button" className="preview-fab" onClick={() => setShowPreview(true)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.6" stroke="#fff" strokeWidth="1.7" />
              </svg>
              Live preview
            </button>
            {showPreview && (
              <div className="preview-modal" onClick={() => setShowPreview(false)}>
                <div className="preview-sheet" onClick={(e) => e.stopPropagation()}>
                  <div className="preview-sheet-head">
                    <span className="pv-label" style={{ margin: 0 }}>Live preview</span>
                    <button type="button" className="preview-close" aria-label="Close" onClick={() => setShowPreview(false)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <CovenantCard covenant={previewCovenant} dim={false} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------- STEP 2: TASK CONSOLE ---------- */}
        <section className={panelClass(1)}>
          <div className="page-head">
            <div className="ph-l">
              <div className="crumb">Step 2 · Task Console</div>
              <h1 className="display ph">
                Give your <i>a</i>gent a task
              </h1>
              <p>
                Describe the job in plain language. The agent plans the work and only reaches for
                paid data when it&apos;s actually needed, always inside the covenant.
              </p>
            </div>
          </div>

          <div className="console">
            <div className="task-card">
              <label
                style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: 10 }}
              >
                Task for {runCovenant.agent}
              </label>
              <textarea
                className="ta"
                value={task}
                onChange={(e) => setTask(e.target.value)}
              />
              <div className="examples">
                {[
                  "Summarize today's ETH sentiment",
                  "Compare BTC vs ETH volatility",
                  "Check gas trends this week",
                ].map((ex) => (
                  <button key={ex} className="ex" onClick={() => setTask(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <button
                  className="btn btn-dark"
                  onClick={() => {
                    setRunResult(null);
                    goStep(2);
                  }}
                >
                  Run agent
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M6 4l13 8-13 8V4z" fill="#fff" />
                  </svg>
                </button>
                <button className="btn btn-ghost" onClick={() => goStep(0)}>
                  Edit covenant
                </button>
              </div>
            </div>

            <aside className="guard">
              <h4>Active covenant</h4>
              <div className="grow">
                <span className="gi"><IconCoin /></span> Budget
                <span className="gv">{fmt(runCovenant.totalBudget)}</span>
              </div>
              <div className="grow">
                <span className="gi"><IconLimit /></span> Max / request
                <span className="gv">{fmt(runCovenant.maxPerRequest)}</span>
              </div>
              <div className="grow">
                <span className="gi"><IconClock /></span> Window
                <span className="gv">{duration}</span>
              </div>
              <div className="grow">
                <span className="gi"><IconTarget /></span> Purpose
                <span className="gv" style={{ fontSize: "12.5px" }}>
                  {runCovenant.purpose}
                </span>
              </div>
            </aside>
          </div>
        </section>

        {/* ---------- STEP 3: RUN / POLICY ---------- */}
        <section className={panelClass(2)}>
          <div className="page-head">
            <div className="ph-l">
              <div className="crumb">Step 3 · Agent at work</div>
              <h1 className="display ph">
                Working <i>w</i>ithin the covenant
              </h1>
              <p>
                The agent plans, hits a paid x402 endpoint, and Covenant validates the payment
                against your policy before a single token moves.
              </p>
            </div>
          </div>
          <div className="run">
            {currentStep === 2 && (
              <RunFlow
                key={runResult ? "done" : "active"}
                covenant={runCovenant}
                task={task}
                onDone={(r) => setRunResult(r)}
              />
            )}
            {runResult && (
              <div className="run-actions in">
                <button className="btn btn-dark" onClick={() => goStep(3)}>
                  View audit &amp; proof
                  {ArrowRight}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ---------- STEP 4: AUDIT ---------- */}
        <section className={panelClass(3)}>
          <div className="page-head">
            <div className="ph-l">
              <div className="crumb">Step 4 · Audit &amp; proof</div>
              <h1 className="display ph">
                Every move, <i>a</i>ccounted for
              </h1>
              <p>
                One signed payment, fully explained: reason, cost, permission used and on-chain
                proof. Nothing your agent did is a mystery.
              </p>
            </div>
          </div>

          <div className="audit-wrap">
            <div>
              <div className="report">
                <div className="rep-h">
                  <span
                    className="ri green"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 12.5l4.2 4.2L19 7"
                        stroke="#2f8f5b"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <h3>Task complete</h3>
                  <span className="pill active" style={{ marginLeft: "auto" }}>
                    Completed
                  </span>
                </div>
                <p className="verdict display">
                  {runResult?.report ? (
                    runResult.report
                  ) : (
                    <>
                      ETH shows <b>elevated short-term risk</b>. Paid sentiment data confirmed
                      rising downside pressure over the next 24–48h.
                    </>
                  )}
                </p>
                <div className="kv">
                  <span className="k">Task</span>
                  <span className="v">ETH short-term risk analysis</span>
                  <span className="k">Data source</span>
                  <span className="v">Paid sentiment report</span>
                  <span className="k">Payment</span>
                  <span className="v">{fmt(runPrice)}</span>
                  <span className="k">Permission used</span>
                  <span className="v">Covenant {runCovenant.id}</span>
                  <span className="k">Service</span>
                  <span className="v">{runService}</span>
                  <span className="k">Tx hash</span>
                  <span className="v mono">{runTx}</span>
                  <span className="k">Remaining budget</span>
                  <span className="v">{fmt(remaining)}</span>
                </div>
              </div>
              <div className="audit-actions">
                <Link className="btn btn-dark" href="/dashboard">
                  Go to dashboard
                  {ArrowRight}
                </Link>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setRunResult(null);
                    goStep(1);
                  }}
                >
                  Run another task
                </button>
              </div>
            </div>

            <aside className="timeline">
              <h4>Audit trail</h4>
              <ul className="tl">
                <li>
                  <b>Task received</b>
                  <small>“Analyze ETH short-term risk”</small>
                </li>
                <li>
                  <b>Plan generated</b>
                  <small>Venice AI · 4 steps</small>
                </li>
                <li>
                  <b>Free data checked</b>
                  <small>Insufficient · paid data needed</small>
                </li>
                <li>
                  <b>402 Payment Required</b>
                  <small>{runService} · {fmt(runPrice)}</small>
                </li>
                <li>
                  <b>Policy approved</b>
                  <small>All 6 checks passed</small>
                </li>
                <li>
                  <b>Payment settled</b>
                  <small>ERC-7710 · relayed via 1Shot</small>
                </li>
                <li>
                  <b>Report delivered</b>
                  <small>Remaining budget {fmt(remaining)}</small>
                </li>
              </ul>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

const CheckNum = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12.5l4.2 4.2L19 7"
      stroke="#fff"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
