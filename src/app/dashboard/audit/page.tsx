"use client";

import * as React from "react";
import { useStore } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import type { AuditEntry } from "@/lib/types";

type Filter = "all" | "approved" | "blocked";

export default function AuditPage() {
  const { audit } = useStore();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  const counts = {
    all: audit.length,
    approved: audit.filter((a) => a.decision === "approved").length,
    blocked: audit.filter((a) => a.decision === "blocked").length,
  };

  const list = audit.filter((a) => filter === "all" || a.decision === filter);

  function exportLog() {
    try {
      const blob = new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "covenant-audit-log.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Audit log exported as CSV (demo).");
    }
  }

  const tabs: [Filter, string][] = [
    ["all", "All"],
    ["approved", "Approved"],
    ["blocked", "Blocked"],
  ];

  return (
    <>
      <style>{`
        .lrow{grid-template-columns:2.2fr 1.1fr 0.9fr 1fr 1fr;}
        .detail{padding:0 22px;max-height:0;overflow:hidden;transition:max-height .3s ease;background:#fcfcfb;border-bottom:1px solid var(--line-2);}
        .detail.open{max-height:200px;}
        .detail-in{padding:18px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:14px 30px;font-size:13.5px;}
        .detail-in .k{color:var(--muted);display:block;margin-bottom:2px;font-size:12.5px;}
        .detail-in .v{font-weight:600;}
        .reason{display:flex;align-items:center;gap:8px;font-size:13px;}
        .lrow .ex-toggle{display:flex;align-items:center;justify-content:flex-end;gap:8px;color:var(--muted);font-size:12.5px;}
        .lrow .chev{transition:transform .2s;}
        .lrow.open .chev{transform:rotate(180deg);}
        .clickable{cursor:pointer;}
        @media(max-width:720px){
          .lrow.head{display:none;}
          .lrow{grid-template-columns:1fr;gap:6px;padding:14px 16px;}
          .lrow .ex-toggle{justify-content:flex-start;}
          .detail{padding:0 16px;}
          .detail.open{max-height:600px;}
          .detail-in{grid-template-columns:1fr;gap:12px;}
        }
      `}</style>

      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Accountability</div>
          <h1 className="display ph">Audit log</h1>
          <p>
            Every payment your agents attempted, approved or blocked, with the reason, cost,
            permission used and on-chain proof.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={exportLog}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v11M8 11l4 4 4-4M5 19h14"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Export
        </button>
      </div>

      <div className="tabs">
        {tabs.map(([k, l]) => (
          <button key={k} className={k === filter ? "on" : ""} onClick={() => setFilter(k)}>
            {l}
            <span className="tc">{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="panel-card">
        <div className="lrow head">
          <span>Task &amp; service</span>
          <span>Covenant</span>
          <span>Amount</span>
          <span>Decision</span>
          <span style={{ textAlign: "right" }}>Time</span>
        </div>
        <div>
          {list.map((a) => (
            <Row key={a.id} a={a} open={!!open[a.id]} onToggle={() => setOpen((o) => ({ ...o, [a.id]: !o[a.id] }))} />
          ))}
        </div>
      </div>
    </>
  );
}

function Row({ a, open, onToggle }: { a: AuditEntry; open: boolean; onToggle: () => void }) {
  const ok = a.decision === "approved";
  const time = a.timeLabel ?? timeAgo(a.timestamp);
  const tx = a.transactionHash;

  return (
    <>
      <div className={`lrow clickable${open ? " open" : ""}`} onClick={onToggle}>
        <div className="who">
          <span className={`feed-ic ${ok ? "ok" : "block"}`} style={{ width: 34, height: 34 }}>
            {ok ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12.5l4.2 4.2L19 7"
                  stroke="#2f8f5b"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 7l10 10M17 7L7 17" stroke="#cf4b3e" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <span style={{ minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
            <span className="nm">{a.task}</span>
            <span className="sub">
              {a.service} · {a.resource}
            </span>
          </span>
        </div>
        <div>
          <span className="chip">{a.covenantId}</span>
          <div className="sub" style={{ marginTop: 4 }}>
            {a.agent}
          </div>
        </div>
        <div
          style={{
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            ...(ok ? {} : { color: "var(--block)" }),
          }}
        >
          {a.amount.toFixed(2)} USDC
        </div>
        <div>
          <span className={`pill ${a.decision}`}>{ok ? "Approved" : "Blocked"}</span>
        </div>
        <div className="ex-toggle">
          {time}
          <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      <div className={`detail${open ? " open" : ""}`}>
        <div className="detail-in">
          <div>
            <span className="k">Reason</span>
            <span className="reason">
              {ok ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12.5l4.2 4.2L19 7"
                    stroke="#2f8f5b"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v5M12 16v.5" stroke="#cf4b3e" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="9" stroke="#cf4b3e" strokeWidth="1.6" />
                </svg>
              )}
              <span className="v">{a.reason}</span>
            </span>
          </div>
          <div>
            <span className="k">Permission used</span>
            <span className="v">Covenant {a.covenantId} · ERC-7710</span>
          </div>
          <div>
            <span className="k">Service</span>
            <span className="v">{a.service}</span>
          </div>
          <div>
            <span className="k">Resource</span>
            <span className="v">{a.resource}</span>
          </div>
          <div>
            <span className="k">Transaction</span>
            <span className="v mono">{tx ? `${tx} · 1Shot` : "No payment made"}</span>
          </div>
          <div>
            <span className="k">Status</span>
            <span className="v" style={{ color: ok ? "var(--ok)" : "var(--block)" }}>
              {ok ? "Settled" : "Blocked before execution"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
