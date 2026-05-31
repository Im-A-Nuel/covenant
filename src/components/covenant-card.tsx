import * as React from "react";
import type { Covenant } from "@/lib/types";
import { CovenantMark } from "@/components/covenant-mark";

const STATUS_LABEL: Record<Covenant["status"], string> = {
  active: "Active",
  depleted: "Budget depleted",
  expired: "Expired",
  revoked: "Revoked",
};

/** "24 hours" / "7 days" / "1 hour" — reference-style window label from durationHours. */
function windowLabel(hours: number): string {
  if (hours % 24 === 0) {
    const d = hours / 24;
    return `${d} ${d === 1 ? "day" : "days"}`;
  }
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** Soft, on-theme header gradient that differs per covenant (by its color identity, else a stable hash). */
const GRADS = ["cg-blue", "cg-mint", "cg-peach", "cg-lilac", "cg-sky"] as const;
const COLOR_GRAD: Record<string, string> = {
  "#2775ca": "cg-blue",
  "#2f8f5b": "cg-mint",
  "#b08900": "cg-peach",
  "#7e57c2": "cg-lilac",
};
function gradClass(c: Covenant): string {
  const col = c.color?.toLowerCase();
  if (col && COLOR_GRAD[col]) return COLOR_GRAD[col];
  const key = `${c.id ?? ""}${c.agent ?? ""}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return GRADS[h % GRADS.length];
}

export function CovenantCard({
  covenant,
  footer,
  dim,
}: {
  covenant: Covenant;
  footer?: React.ReactNode;
  dim?: boolean;
}) {
  const c = covenant;
  const isActive = c.status === "active";
  const isDim = dim ?? !isActive;
  const pct = c.totalBudget ? Math.round((c.remainingBudget / c.totalBudget) * 100) : 0;
  const barClass = c.status === "depleted" ? "warn" : isActive ? "" : "flat";

  return (
    <div className={`cov-card${isDim ? " dim" : ""}`}>
      <div className={`cov-top ${gradClass(c)}`}>
        <div className="cov-top-row">
          <div className="cov-id">
            <CovenantMark size={15} /> Covenant&nbsp;{c.id}
          </div>
          <span className={`pill ${c.status} ${isActive ? "dot" : ""}`}>
            {STATUS_LABEL[c.status]}
          </span>
        </div>
        <p className="cov-agent">
          {c.agent}
          <small>{c.purpose}</small>
        </p>
      </div>
      <div className="cov-body">
        <div className="budget">
          <div className="budget-top">
            <span className="muted">Budget</span>
            <b>
              {c.remainingBudget.toFixed(2)} / {c.totalBudget.toFixed(2)} USDC
            </b>
          </div>
          <div className="bar">
            <i className={barClass} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="crow">
          <span className="k">Max / request</span>
          <span className="v">{c.maxPerRequest.toFixed(2)} USDC</span>
        </div>
        <div className="crow">
          <span className="k">Window</span>
          <span className="v">{windowLabel(c.durationHours)}</span>
        </div>
        {c.payments != null && (
          <div className="crow">
            <span className="k">Payments made</span>
            <span className="v">{c.payments}</span>
          </div>
        )}
        <div className="crow">
          <span className="k">Allowed</span>
          <span className="chips">
            {c.allowedServices.map((s) => (
              <span className="chip" key={s}>
                {s}
              </span>
            ))}
          </span>
        </div>
      </div>
      {footer != null && <div className="cov-foot">{footer}</div>}
    </div>
  );
}
