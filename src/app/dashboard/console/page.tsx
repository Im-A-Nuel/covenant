"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { RunFlow } from "@/components/run-flow";
import { IconCoin, IconLimit, IconClock, IconTarget, IconCheck } from "@/components/icons";
import type { Covenant } from "@/lib/types";

const DEFAULT_TASK =
  "Analyze whether ETH has short-term risk. Use paid data only if free data is insufficient. Do not spend more than 1 USDC.";

const EXAMPLES = [
  "Summarize today's ETH sentiment",
  "Compare BTC vs ETH volatility",
  "Check gas trends this week",
];

/** "24 hours" / "7 days" / "1 hour" — reference-style window label from durationHours. */
function windowLabel(hours: number): string {
  if (hours % 24 === 0) {
    const d = hours / 24;
    return `${d} ${d === 1 ? "day" : "days"}`;
  }
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ConsolePage() {
  const searchParams = useSearchParams();
  const { covenants } = useStore();

  const active = React.useMemo(
    () => covenants.filter((c) => c.status === "active"),
    [covenants]
  );

  // Preselect via ?cov=001 (id is stored as "#001").
  const pre = searchParams.get("cov");
  const [selId, setSelId] = React.useState<string | null>(null);

  const sel: Covenant | undefined = React.useMemo(() => {
    if (selId) return active.find((c) => c.id === selId) ?? active[0];
    if (pre) {
      const match = active.find((c) => c.id.slice(1) === pre);
      if (match) return match;
    }
    return active[0];
  }, [active, selId, pre]);

  const [task, setTask] = React.useState(DEFAULT_TASK);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  // `.in` is added the frame after the actions mount, to replay the reference opacity fade.
  const [actionsIn, setActionsIn] = React.useState(false);

  const run = () => {
    if (!sel) return;
    setRunning(true);
    setDone(false);
    setActionsIn(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setRunning(false);
    setDone(false);
    setActionsIn(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDone = () => {
    setDone(true);
  };

  React.useEffect(() => {
    if (!done) return;
    const id = requestAnimationFrame(() => setActionsIn(true));
    return () => cancelAnimationFrame(id);
  }, [done]);

  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Run</div>
          <h1 className="display ph">Task Console</h1>
          <p>
            Pick an active covenant, describe the job in plain language, and watch the agent work
            strictly inside its policy.
          </p>
        </div>
      </div>

      {/* setup */}
      {!running && (
        <div className="console">
          <div className="task-card">
            <label className="label">Covenant</label>
            <div className="cov-select">
              {active.map((c) => (
                <button
                  key={c.id}
                  className={`cov-opt ${c === sel ? "sel" : ""}`}
                  onClick={() => setSelId(c.id)}
                >
                  <span className="av" style={{ background: c.color }}>
                    {initials(c.agent)}
                  </span>
                  <span className="co-meta">
                    <b>{c.agent}</b>
                    <small>
                      Covenant {c.id} · {c.purpose}
                    </small>
                  </span>
                  <span className="co-bal">
                    {c.remainingBudget.toFixed(2)} USDC
                    <small>of {c.totalBudget.toFixed(2)}</small>
                  </span>
                </button>
              ))}
            </div>

            <label className="label">Task</label>
            <textarea
              className="ta"
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
            <div className="examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} className="ex" onClick={() => setTask(ex)}>
                  {ex}
                </button>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn btn-dark" onClick={run} disabled={!sel}>
                Run agent
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4l13 8-13 8V4z" fill="#fff" />
                </svg>
              </button>
              <span className="muted" style={{ fontSize: "12.5px" }}>
                Payments auto-execute only when policy passes.
              </span>
            </div>
          </div>

          <aside className="guard">
            {sel && (
              <>
                <h4>Active covenant · {sel.id}</h4>
                <div className="grow">
                  <span className="gi"><IconCoin /></span> Budget left
                  <span className="gv">{sel.remainingBudget.toFixed(2)} USDC</span>
                </div>
                <div className="grow">
                  <span className="gi"><IconLimit /></span> Max / request
                  <span className="gv">{sel.maxPerRequest.toFixed(2)} USDC</span>
                </div>
                <div className="grow">
                  <span className="gi"><IconClock /></span> Window
                  <span className="gv">{windowLabel(sel.durationHours)}</span>
                </div>
                <div className="grow">
                  <span className="gi"><IconTarget /></span> Purpose
                  <span className="gv" style={{ fontSize: "12px" }}>
                    {sel.purpose}
                  </span>
                </div>
                <div className="grow">
                  <span className="gi"><IconCheck /></span> Allowed
                  <span className="gv" style={{ fontSize: "12px" }}>
                    {sel.allowedServices.join(", ")}
                  </span>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* run output */}
      {running && sel && (
        <div className="run">
          <RunFlow covenant={sel} task={task} onDone={handleDone} />
          {done && (
            <div className={`run-actions ${actionsIn ? "in" : ""}`}>
              <Link className="btn btn-dark" href="/dashboard/audit">
                View in audit log
              </Link>
              <button className="btn btn-ghost" onClick={reset}>
                Run another task
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConsolePage />
    </Suspense>
  );
}
