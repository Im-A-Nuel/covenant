"use client";

import * as React from "react";
import Link from "next/link";
import { CovenantCard } from "@/components/covenant-card";
import { useStore } from "@/lib/store";

/* ---------- stat card icons (verbatim from Dashboard.html) ---------- */
const STAT_ICONS: Record<string, React.ReactNode> = {
  // budget remaining: covenant bounds ( ) embracing a coin
  blue: (
    <>
      <path d="M8.4 5.2C5.2 8 5.2 16 8.4 18.8" />
      <path d="M15.6 5.2C18.8 8 18.8 16 15.6 18.8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 9.7v4.6" />
      <path d="M13.2 10.6c-.4-.4-.8-.6-1.4-.6-.8 0-1.3.4-1.3 1 0 1.3 2.7.6 2.7 1.9 0 .6-.6 1-1.3 1-.6 0-1-.2-1.4-.6" />
    </>
  ),
  // active covenants: a signed seal, card + ( • ) + signature line
  green: (
    <>
      <rect x="4" y="3.6" width="16" height="16.8" rx="3.2" />
      <path d="M10 7.4C8.6 9 8.6 12.4 10 14" />
      <path d="M14 7.4C15.4 9 15.4 12.4 14 14" />
      <circle cx="12" cy="10.7" r="1.15" style={{ fill: "currentColor", stroke: "none" }} />
      <path d="M8.6 17h6.8" />
    </>
  ),
  // spent last 24h: a spend gauge / meter
  amber: (
    <>
      <path d="M4.6 16.2a7.4 7.4 0 0 1 14.8 0" />
      <path d="M12 16.2l3.6-3.9" />
      <circle cx="12" cy="16.2" r="1.15" style={{ fill: "currentColor", stroke: "none" }} />
      <path d="M4.7 16.2h1.4M17.9 16.2h1.4M12 8.6v1.4" />
    </>
  ),
  // payments approved: covenant gate ( ✓ )
  lilac: (
    <>
      <path d="M7.2 4.6C3.8 8 3.8 16 7.2 19.4" />
      <path d="M16.8 4.6C20.2 8 20.2 16 16.8 19.4" />
      <path d="M9.2 12.1l2 2 3.6-4.2" />
    </>
  ),
};

/* ---------- spending chart geometry (ported from Dashboard.html) ---------- */
// [day, approved USDC, had a blocked attempt]
const CHART_DATA: [string, number, boolean][] = [
  ["Mon", 0.5, false],
  ["Tue", 0.75, false],
  ["Wed", 0.25, false],
  ["Thu", 1.0, true],
  ["Fri", 0.5, false],
  ["Sat", 0.3, false],
  ["Sun", 0.5, true],
];
const CEILING = 1.25;
const Y_MAX = 1.5;
const W = 920;
const H = 270;
const PL = 46;
const PR = 18;
const PT = 20;
const PB = 34;
const IW = W - PL - PR;
const IH = H - PT - PB;
const cx = (i: number) => PL + IW * (i / (CHART_DATA.length - 1));
const cy = (v: number) => PT + IH * (1 - v / Y_MAX);

function smooth(p: number[][]): string {
  let d = "M" + p[0][0].toFixed(1) + "," + p[0][1].toFixed(1);
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d +=
      " C" +
      c1x.toFixed(1) +
      "," +
      c1y.toFixed(1) +
      " " +
      c2x.toFixed(1) +
      "," +
      c2y.toFixed(1) +
      " " +
      p2[0].toFixed(1) +
      "," +
      p2[1].toFixed(1);
  }
  return d;
}

const PTS = CHART_DATA.map((d, i) => [cx(i), cy(d[1])]);
const LINE = smooth(PTS);
const AREA = LINE + ` L${cx(CHART_DATA.length - 1).toFixed(1)},${(PT + IH).toFixed(1)} L${PL},${(PT + IH).toFixed(1)} Z`;
const GY = [0, 0.5, 1.0, 1.5];

export default function Dashboard() {
  const { covenants, audit } = useStore();

  const active = covenants.filter((c) => c.status === "active");
  const remaining = active.reduce((s, c) => s + c.remainingBudget, 0);
  const spent24 = 0.5;
  const payments = audit.filter((a) => a.decision === "approved").length;
  const blocked = audit.filter((a) => a.decision === "blocked").length;

  const stats: {
    c: keyof typeof STAT_ICONS;
    v: React.ReactNode;
    u: string;
    l: string;
    sub: React.ReactNode;
  }[] = [
    {
      c: "blue",
      v: remaining.toFixed(2),
      u: "USDC",
      l: "budget remaining",
      sub: `across ${active.length} active covenants`,
    },
    {
      c: "green",
      v: active.length,
      u: "",
      l: "active covenants",
      sub: (
        <>
          <b>{covenants.length}</b> total
        </>
      ),
    },
    {
      c: "amber",
      v: spent24.toFixed(2),
      u: "USDC",
      l: "spent · last 24h",
      sub: "all within policy",
    },
    {
      c: "lilac",
      v: payments,
      u: "",
      l: "payments approved",
      sub: `${blocked} blocked by firewall`,
    },
  ];

  const approvedWeek = CHART_DATA.reduce((s, d) => s + d[1], 0);
  const blockedWeek = CHART_DATA.filter((d) => d[2]).length;
  const peak = Math.max(...CHART_DATA.map((d) => d[1]));

  const feed = audit.slice(0, 6);

  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Workspace</div>
          <h1 className="display ph">Welcome back</h1>
          <p>
            Two covenants are active. Your agents have spent 0.50 USDC in the last 24 hours, every
            payment inside policy.
          </p>
        </div>
        <Link className="btn btn-dark" href="/new">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New covenant
        </Link>
      </div>

      <div className="stats">
        {stats.map((s, i) => (
          <div className="stat" key={i}>
            <div className={`si ${s.c}`}>
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {STAT_ICONS[s.c]}
              </svg>
            </div>
            <div className="sv">
              {s.v}
              {s.u ? <small> {s.u}</small> : null}
            </div>
            <div className="sl">
              {s.l} · {s.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-head">
          <div>
            <h2>Spending under covenant</h2>
            <p>Approved spend stays below your per-day policy ceiling, every day this week.</p>
          </div>
          <div className="chart-legend">
            <span className="lg">
              <span className="sw"></span> Approved spend
            </span>
            <span className="lg">
              <span className="sw ceil"></span> Policy ceiling
            </span>
            <span className="lg">
              <span className="sw blk"></span> Blocked attempt
            </span>
          </div>
        </div>
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "auto", display: "block" }}
            preserveAspectRatio="none"
            fontFamily="'Hanken Grotesk',sans-serif"
          >
            <defs>
              <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2775ca" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#2775ca" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {GY.map((v) => (
              <React.Fragment key={v}>
                <line
                  x1={PL}
                  y1={cy(v).toFixed(1)}
                  x2={W - PR}
                  y2={cy(v).toFixed(1)}
                  stroke="#f0f0f0"
                  strokeWidth="1"
                />
                <text
                  x={PL - 10}
                  y={(cy(v) + 4).toFixed(1)}
                  textAnchor="end"
                  fontSize="12"
                  fill="#a9a9af"
                  fontFamily="'Hanken Grotesk',sans-serif"
                >
                  {v.toFixed(1)}
                </text>
              </React.Fragment>
            ))}
            <line
              x1={PL}
              y1={cy(CEILING).toFixed(1)}
              x2={W - PR}
              y2={cy(CEILING).toFixed(1)}
              stroke="#b08900"
              strokeWidth="1.6"
              strokeDasharray="6 5"
            />
            <text
              x={PL + 4}
              y={(cy(CEILING) - 9).toFixed(1)}
              textAnchor="start"
              fontSize="12"
              fontWeight="600"
              fill="#b08900"
            >
              Per-day ceiling · 1.25 USDC
            </text>
            <path d={AREA} fill="url(#cgrad)" />
            <path
              d={LINE}
              fill="none"
              stroke="#2775ca"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {CHART_DATA.map((d, i) => (
              <circle
                key={`dot-${i}`}
                cx={cx(i).toFixed(1)}
                cy={cy(d[1]).toFixed(1)}
                r="3.4"
                fill="#fff"
                stroke="#2775ca"
                strokeWidth="2"
              />
            ))}
            {CHART_DATA.map((d, i) =>
              d[2] ? (
                <React.Fragment key={`blk-${i}`}>
                  <circle
                    cx={cx(i).toFixed(1)}
                    cy={(cy(CEILING) - 13).toFixed(1)}
                    r="6"
                    fill="#fff"
                    stroke="#cf4b3e"
                    strokeWidth="2"
                  />
                  <path
                    d={`M${(cx(i) - 2.4).toFixed(1)} ${(cy(CEILING) - 15.4).toFixed(1)}l4.8 4.8M${(cx(i) + 2.4).toFixed(1)} ${(cy(CEILING) - 15.4).toFixed(1)}l-4.8 4.8`}
                    stroke="#cf4b3e"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </React.Fragment>
              ) : null
            )}
            {CHART_DATA.map((d, i) => (
              <text
                key={`xl-${i}`}
                x={cx(i).toFixed(1)}
                y={H - 12}
                textAnchor="middle"
                fontSize="12.5"
                fill="#8d8d93"
                fontFamily="'Hanken Grotesk',sans-serif"
              >
                {d[0]}
              </text>
            ))}
          </svg>
        </div>
        <div className="chart-metrics">
          <div className="cm">
            <span className="cml">Approved this week</span>
            <span className="cmv">{approvedWeek.toFixed(2)} USDC</span>
          </div>
          <div className="cm">
            <span className="cml">Peak day</span>
            <span className="cmv">{peak.toFixed(2)} USDC</span>
          </div>
          <div className="cm">
            <span className="cml">Ceiling breaches</span>
            <span className="cmv">0</span>
          </div>
          <div className="cm">
            <span className="cml">Blocked by firewall</span>
            <span className="cmv block">{blockedWeek}</span>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="section">
          <div className="section-head">
            <h2>Active covenants</h2>
            <Link href="/dashboard/covenants">Manage all →</Link>
          </div>
          <div className="cov-mini-grid">
            {active.map((c) => (
              <CovenantCard
                key={c.id}
                covenant={c}
                footer={
                  <>
                    <Link
                      className="btn btn-ghost btn-sm"
                      href={`/dashboard/console?cov=${c.id.slice(1)}`}
                    >
                      Assign task
                    </Link>
                    <Link className="btn btn-ghost btn-sm" href="/dashboard/covenants">
                      Details
                    </Link>
                  </>
                }
              />
            ))}
          </div>
        </div>
        <div className="section">
          <div className="section-head">
            <h2>Recent activity</h2>
            <Link href="/dashboard/audit">Full log →</Link>
          </div>
          <div className="panel-card" style={{ padding: "4px 20px" }}>
            <div className="feed">
              {feed.map((a) => {
                const ok = a.decision === "approved";
                return (
                  <div className="feed-row" key={a.id}>
                    <div className={`feed-ic ${ok ? "ok" : "block"}`}>
                      {ok ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M5 12.5l4.2 4.2L19 7"
                            stroke="#2f8f5b"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M7 7l10 10M17 7L7 17"
                            stroke="#cf4b3e"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="feed-main">
                      <b>{a.task}</b>
                      <div className="fm-sub">
                        {a.service} · Covenant {a.covenantId} · {a.timeLabel}
                      </div>
                    </div>
                    <div className={`feed-amt ${ok ? "" : "block"}`}>
                      {ok ? a.amount.toFixed(2) + " USDC" : "Blocked"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
