"use client";

import * as React from "react";
import Link from "next/link";
import { CovenantMark } from "@/components/covenant-mark";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/utils";

/* ---- agent categories marquee ---- */
const cats: [string, string][] = [
  ["Research agents", "#dbe7f6"], ["Trading bots", "#e8e0f6"], ["Data pipelines", "#e2efe5"],
  ["DAO operations", "#fbe7dd"], ["Inference apps", "#f6e2ea"], ["Dev tooling", "#e7eaee"],
  ["API marketplaces", "#e3f0ef"], ["Enterprise workflows", "#efeada"], ["Onchain analysts", "#dfe9f4"],
  ["Autonomous shoppers", "#f5e3da"], ["Indexers", "#e6e2f3"], ["Monitoring agents", "#e1efe2"],
];

function CatTile({ label, c }: { label: string; c: string }) {
  return (
    <div className="cat">
      <span className="sq" style={{ background: `linear-gradient(135deg,${c},#fff)` }} />
      <span>{label}</span>
    </div>
  );
}

/* ---- floating icon+text cards on final CTA ---- */
type FlyIcon = React.ReactNode;
const Svg = ({ children, extra }: { children: React.ReactNode; extra?: Record<string, string> }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...extra}>
    {children}
  </svg>
);
const ic = {
  coin: (
    <Svg>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10M14.4 8.6C13.8 7.9 13 7.5 12 7.5c-1.6 0-2.8.9-2.8 2.1 0 2.7 5.8 1.3 5.8 4.3 0 1.2-1.2 2.1-2.8 2.1-1 0-1.9-.4-2.5-1.1" />
    </Svg>
  ),
  clock: (
    <Svg>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  ),
  check: (
    <Svg extra={{ strokeWidth: "2" }}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </Svg>
  ),
  tag: (
    <Svg>
      <path d="M3 12l8.5-8.5H18a1.5 1.5 0 011.5 1.5V11L11 19.5z" />
      <circle cx="14.7" cy="9.3" r="1.2" />
    </Svg>
  ),
  seal: (
    <svg width="25" height="25" viewBox="0 0 30 30" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12.4 6.5C8.6 9 8.6 21 12.4 23.5" />
      <path d="M17.6 6.5C21.4 9 21.4 21 17.6 23.5" />
      <circle cx="15" cy="15" r="2.8" style={{ fill: "currentColor" }} />
    </svg>
  ),
  verified: (
    <Svg>
      <path d="M12 3.2l2 1.5 2.5-.2.9 2.3 2.1 1.3-.7 2.4.7 2.4-2.1 1.3-.9 2.3-2.5-.2L12 20.8 10 19.3l-2.5.2-.9-2.3L4.5 16l.7-2.4-.7-2.4 2.1-1.3.9-2.3 2.5.2z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  ),
};
type Fly = { l?: string; rg?: string; y: string; r: number; bg: string; col: string; ic: FlyIcon; t: string };
const fly: Fly[] = [
  { l: "8%", y: "15%", r: -6, bg: "#dbe7f6", col: "#2775ca", ic: ic.coin, t: "3 USDC budget" },
  { rg: "7%", y: "12%", r: 5, bg: "#e8e0f6", col: "#7e57c2", ic: ic.clock, t: "24h window" },
  { l: "4%", y: "58%", r: 4, bg: "#e2efe5", col: "#2f8f5b", ic: ic.check, t: "Payment approved" },
  { rg: "5%", y: "55%", r: -5, bg: "#fbe7dd", col: "#e07a3f", ic: ic.tag, t: "0.25 / request" },
  { l: "16%", y: "82%", r: 6, bg: "#f6e2ea", col: "#0c0c0d", ic: ic.seal, t: "Covenant #001" },
  { rg: "14%", y: "82%", r: -4, bg: "#e3f0ef", col: "#2f8f8f", ic: ic.verified, t: "Verified service" },
];

const FAQ_ITEMS: [string, string][] = [
  ["Does Covenant hold or custody my funds?", "No. Covenant never takes custody. Your funds stay in your MetaMask Smart Account — the agent only ever holds a scoped, delegated permission under ERC-7710 that you can revoke."],
  ["What exactly can an agent spend on?", "Only what your covenant allows: verified x402 services you list, under the budget and per-request limits you set, and only for the stated purpose. Everything else is blocked."],
  ["What happens when a payment breaks the policy?", "The policy engine blocks it before execution and logs the reason. Borderline cases can be set to require your manual approval instead of failing silently."],
  ["Can I revoke a covenant or change the budget?", "Yes. A covenant can be revoked at any time, and it automatically expires at the end of its duration or once the budget is depleted."],
  ["Which chains and standards does it use?", "Covenant is built on MetaMask Smart Accounts with ERC-7710 delegated permissions, x402 for payments, and an optional 1Shot relayer for gas abstraction on supported EVM chains."],
  ["When will early access open?", "We're onboarding builders in private beta now. Reserve a slot and you'll be notified the moment your covenant workspace is live."],
];

const NAV_SECTIONS = ["why", "who", "features", "reserve"] as const;

export default function Landing() {
  const { account, connect } = useWallet();
  const [view, setView] = React.useState<"user" | "agent">("user");
  const [openFaq, setOpenFaq] = React.useState(0);
  const [useOpt, setUseOpt] = React.useState(0);
  const [reserveLabel, setReserveLabel] = React.useState("Continue to checkout");
  const [activeNav, setActiveNav] = React.useState<string>("why");

  const connected = !!account;

  // nav active state on scroll
  React.useEffect(() => {
    const secs = NAV_SECTIONS
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) setActiveNav((e.target as HTMLElement).id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  function reserveSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReserveLabel("Slot reserved ✓");
    setTimeout(() => setReserveLabel("Continue to checkout"), 2200);
  }

  return (
    <div className="landing">
      {/* ============ NAV ============ */}
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="brand" href="#top">
            <CovenantMark size={30} className="mark" />
            Covenant
          </a>
          <div className="nav-div" />
          <nav className="links">
            <a href="#why" className={activeNav === "why" ? "active" : undefined}>Why Covenant</a>
            <a href="#who" className={activeNav === "who" ? "active" : undefined}>Who it&apos;s for</a>
            <a href="#features" className={activeNav === "features" ? "active" : undefined}>Features</a>
            <a href="#reserve" className={activeNav === "reserve" ? "active" : undefined}>Get early access</a>
          </nav>
          <button
            className={`btn btn-dark wallet-btn${connected ? " connected" : ""}`}
            onClick={() => connect()}
          >
            {connected ? (
              <span className="wdot" />
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M3 7.5A2.5 2.5 0 015.5 5H18a1 1 0 011 1v1.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
                <rect x="3" y="7" width="18" height="12" rx="2.5" stroke="#fff" strokeWidth="1.7" />
                <circle cx="16.5" cy="13" r="1.5" fill="#fff" />
              </svg>
            )}
            <span>{connected ? shortAddr(account) : "Connect Wallet"}</span>
          </button>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="hero" id="top">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="badge"><span className="dot" /> Best x402 + ERC-7710 · Private beta</div>
            <h1 className="display hero-h">Let <i>a</i>gents p<i>a</i>y. But only und<i>e</i>r cov<i>e</i>nant.</h1>
            <p className="hero-sub">Grant limited spending permissions to autonomous AI agents — budget, duration, allowed services, purpose — all enforced before a single payment ever executes.</p>
            <div className="hero-cta">
              <Link className="btn btn-dark btn-lg" href="/new">
                Get Started{" "}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <a className="btn btn-ghost btn-lg" href="#features">See how it works</a>
            </div>
            <div className="proof">
              <div className="avatars">
                <span style={{ background: "linear-gradient(135deg,#2775ca,#4f97e0)" }}>R</span>
                <span style={{ background: "linear-gradient(135deg,#f3b9c8,#f6c9b6)" }}>A</span>
                <span style={{ background: "linear-gradient(135deg,#bcd0ad,#8fb37c)" }}>T</span>
              </div>
              <span><b>Policy-bound</b> x402 payments, built on MetaMask Smart Accounts</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="cov-card">
              <div className="cov-top">
                <div className="cov-top-row">
                  <div className="cov-id">
                    <CovenantMark size={16} />
                    Covenant&nbsp;#001
                  </div>
                  <span className="pill-status">Active</span>
                </div>
                <p className="cov-agent">Research Agent<span className="muted">Delegated via ERC-7710</span></p>
              </div>
              <div className="cov-body">
                <div className="budget">
                  <div className="budget-top"><span className="muted">Budget remaining</span><span className="v">2.75 / 3.00 <span className="muted">USDC</span></span></div>
                  <div className="bar"><i /></div>
                </div>
                <div className="crow"><span className="k">Max per request</span><span className="v">0.50 USDC</span></div>
                <div className="crow"><span className="k">Duration</span><span className="v">24 hours</span></div>
                <div className="crow"><span className="k">Purpose</span><span className="v">research-data-purchase</span></div>
                <div className="crow"><span className="k">Allowed</span><span className="chips"><span className="chip">venice.ai</span><span className="chip">market-api</span></span></div>
              </div>
            </div>
            <div className="float-card">
              <div className="fc-top">
                <div className="fc-ic">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#2f8f5b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div><div className="fc-title">Payment approved</div><div className="fc-sub">verified-market-api.demo</div></div>
              </div>
              <div className="fc-line"><span>ETH sentiment report</span><span className="mono">0.25 USDC</span></div>
            </div>
          </div>
        </div>
        <div className="wrap"><div className="dots"><i className="on" /><i /><i /><i /><i /></div></div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <div className="trust">
        <div className="wrap trust-inner">
          <span className="lbl">Composed for the agent economy</span>
          <b>MetaMask Smart Accounts</b>
          <b>ERC-7710 Delegation</b>
          <b>x402 Payments</b>
          <b>Venice AI</b>
          <b>1Shot Relayer</b>
        </div>
      </div>

      {/* ============ WHY ============ */}
      <section className="sec" id="why">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="display sec-h">B<i>e</i>cause giving an agent your wall<i>e</i>t shouldn&apos;t be <i>a</i>ll or nothing</h2>
            <p>We&apos;ve watched agents overspend, pay the wrong service, and double-charge. So we built the boundary that should have existed first.</p>
          </div>
          <div className="why-cards">
            <div className="why-card">
              <div className="fx fx1" aria-hidden="true">
                <b className="orb o1" /><b className="orb o2" /><b className="orb o3" /><b className="orb o4" />
                <i className="seal-ring" />
                <span className="seal"><svg width="22" height="22" viewBox="0 0 30 30" fill="none"><path d="M12.4 6.5C8.6 9 8.6 21 12.4 23.5" stroke="#0c0c0d" strokeWidth="1.8" strokeLinecap="round" /><path d="M17.6 6.5C21.4 9 21.4 21 17.6 23.5" stroke="#0c0c0d" strokeWidth="1.8" strokeLinecap="round" /><circle cx="15" cy="15" r="2.8" fill="#0c0c0d" /></svg></span>
              </div>
              <h3>One Covenant for Everything</h3>
              <p>Budget, duration, allowed services, max-per-request and purpose — defined once, in a single signed agreement.</p>
            </div>
            <div className="why-card">
              <div className="fx fx2" aria-hidden="true">
                <div className="track2">
                  <span className="gate" />
                  <span className="scan" />
                  <span className="coin">$</span>
                  <span className="tick2"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                </div>
              </div>
              <h3>Spend Within the Rules</h3>
              <p>Every x402 request is checked against your policy — price, service, purpose, duplicates — before it can execute.</p>
            </div>
            <div className="why-card">
              <div className="fx fx3" aria-hidden="true">
                <div className="log">
                  <div className="logrow l1"><span className="lt"><svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span><i className="lb" /></div>
                  <div className="logrow l2"><span className="lt"><svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span><i className="lb" /></div>
                  <div className="logrow l3"><span className="lt"><svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span><i className="lb" /></div>
                </div>
              </div>
              <h3>A Trail You Can Trust</h3>
              <p>Every action logged with reason, cost, permission used, and transaction proof — no payment is ever a mystery.</p>
            </div>
          </div>

          <h3 className="display cats-title" id="who">F<i>o</i>r every kind <i>o</i>f <i>a</i>gent</h3>
        </div>

        <div className="marquee">
          <div className="track a">
            {[...cats, ...cats].map(([label, c], i) => <CatTile key={`a${i}`} label={label} c={c} />)}
          </div>
          <div className="track b">
            {(() => {
              const rev = [...cats].reverse();
              return [...rev, ...rev].map(([label, c], i) => <CatTile key={`b${i}`} label={label} c={c} />);
            })()}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="feat" id="features">
        <div className="wrap sec">
          <h2 className="display">We h<i>a</i>ndle the bound<i>a</i>ries, your <i>a</i>gent does the work</h2>
          <p className="lead">Whether you&apos;re setting the rules or running the task, every step is designed to stay inside the covenant.</p>
          <div className="toggle">
            <button className={view === "user" ? "on" : undefined} onClick={() => setView("user")}>For the user</button>
            <button className={view === "agent" ? "on" : undefined} onClick={() => setView("agent")}>For the agent</button>
          </div>

          {/* USER VIEW */}
          <div className="bento" style={{ display: view === "user" ? "grid" : "none" }}>
            <div className="bcard b-grey">
              <h3>Covenant Builder</h3>
              <p>Set the agent, token, budget, duration, limits and purpose. Sign once.</p>
              <div className="stage">
                <div className="phone">
                  <div className="notch" />
                  <div className="ph-statbar"><span>9:41</span><span>＋ New Covenant</span></div>
                  <div className="ui-row"><span className="uic">🤖</span><span className="uik">Agent</span><span className="uiv">Research Agent</span></div>
                  <div className="ui-row"><span className="uic">$</span><span className="uik">Budget</span><span className="uiv">3.00 USDC</span></div>
                  <div className="ui-row"><span className="uic">⏱</span><span className="uik">Duration</span><span className="uiv">24 hours</span></div>
                  <div className="ui-row"><span className="uic">⛔</span><span className="uik">Max / request</span><span className="uiv">0.50 USDC</span></div>
                </div>
              </div>
            </div>
            <div className="bcard b-lilac">
              <h3>Policy Decision Panel</h3>
              <p>Watch each request approved, blocked, or escalated — in real time.</p>
              <div className="stage">
                <div className="decision">
                  <div className="dec-h"><b>0.25 USDC · ETH sentiment</b><span className="badge-ok">Approved</span></div>
                  <div className="check"><span className="tick">✓</span> Price under 0.50 limit</div>
                  <div className="check"><span className="tick">✓</span> Service verified</div>
                  <div className="check"><span className="tick">✓</span> Purpose matches covenant</div>
                  <div className="check"><span className="tick">✓</span> No duplicate payment</div>
                </div>
              </div>
            </div>
            <div className="bcard b-mint">
              <h3>Revoke &amp; Expiry</h3>
              <p>See at a glance whether a covenant is active, expired, depleted or revoked.</p>
              <div className="stage">
                <div className="decision" style={{ boxShadow: "0 14px 30px -22px rgba(0,0,0,.2)" }}>
                  <div className="arow-wrap">
                    <div className="audit" style={{ margin: 0, boxShadow: "none", padding: "4px 0" }}>
                      <div className="arow"><span className="k">Covenant #001</span><span className="v" style={{ color: "#2f8f5b" }}>Active</span></div>
                      <div className="arow"><span className="k">Covenant #002</span><span className="v" style={{ color: "#b08900" }}>Budget depleted</span></div>
                      <div className="arow"><span className="k">Covenant #003</span><span className="v" style={{ color: "#9a9a9a" }}>Expired</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bcard b-peach">
              <h3>Audit Dashboard</h3>
              <p>Reason, cost, service, permission and tx hash for every move the agent made.</p>
              <div className="stage">
                <div className="audit">
                  <div className="arow"><span className="k">Task</span><span className="v">ETH risk analysis</span></div>
                  <div className="arow"><span className="k">Payment</span><span className="v">0.25 USDC</span></div>
                  <div className="arow"><span className="k">Permission</span><span className="v">Covenant #001</span></div>
                  <div className="arow"><span className="k">Tx hash</span><span className="v mono">0x8f…a31c</span></div>
                  <div className="arow"><span className="k">Remaining</span><span className="v">2.75 USDC</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* AGENT VIEW */}
          <div className="bento" style={{ display: view === "agent" ? "grid" : "none" }}>
            <div className="bcard b-lilac">
              <h3>Task Console</h3>
              <p>Receive a plain-language task and turn it into a plan within policy.</p>
              <div className="stage">
                <div className="phone">
                  <div className="notch" />
                  <div className="ph-statbar"><span>9:41</span><span>Agent · planning</span></div>
                  <div className="ui-row"><span className="uik">“Analyze ETH risk. Use paid data only if needed.”</span></div>
                  <div className="ui-row"><span className="uic">1</span><span className="uik">Check free data first</span></div>
                  <div className="ui-row"><span className="uic">2</span><span className="uik">Request sentiment report</span></div>
                  <div className="ui-row"><span className="uic">3</span><span className="uik">Pay if under 0.50 USDC</span></div>
                </div>
              </div>
            </div>
            <div className="bcard b-grey">
              <h3>x402 Request Handler</h3>
              <p>Parse the 402 Payment Required response and extract payment metadata.</p>
              <div className="stage">
                <div className="decision">
                  <div className="dec-h"><b className="mono" style={{ color: "#b08900" }}>402 Payment Required</b></div>
                  <div className="check"><span className="uik">Resource</span><span style={{ marginLeft: "auto", fontWeight: 600 }}>ETH sentiment report</span></div>
                  <div className="check"><span className="uik">Price</span><span style={{ marginLeft: "auto", fontWeight: 600 }}>0.25 USDC</span></div>
                  <div className="check"><span className="uik">Pay to</span><span className="mono" style={{ marginLeft: "auto", fontWeight: 600 }}>0x4a…e9</span></div>
                </div>
              </div>
            </div>
            <div className="bcard b-peach">
              <h3>Delegated Execution</h3>
              <p>Settle the payment with delegated permission — no full wallet access.</p>
              <div className="stage">
                <div className="decision">
                  <div className="dec-h"><b>Executing payment</b><span className="badge-ok">Settled</span></div>
                  <div className="check"><span className="tick">✓</span> ERC-7710 delegation used</div>
                  <div className="check"><span className="tick">✓</span> Relayed via 1Shot</div>
                  <div className="check"><span className="tick">✓</span> 0.25 USDC sent</div>
                </div>
              </div>
            </div>
            <div className="bcard b-mint">
              <h3>Final Report</h3>
              <p>Use the paid resource to generate the answer — and hand back the receipt.</p>
              <div className="stage">
                <div className="audit">
                  <div className="arow"><span className="k">Output</span><span className="v">ETH: short-term risk ↑</span></div>
                  <div className="arow"><span className="k">Source</span><span className="v">Paid sentiment data</span></div>
                  <div className="arow"><span className="k">Cost</span><span className="v">0.25 USDC</span></div>
                  <div className="arow"><span className="k">Status</span><span className="v" style={{ color: "#2f8f5b" }}>Completed</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ RESERVE ============ */}
      <section className="sec" id="reserve">
        <div className="wrap reserve-grid">
          <div>
            <h2 className="display">Res<i>e</i>rve your cov<i>e</i>nant bef<i>o</i>re the agent economy does</h2>
            <dl className="faq">
              {FAQ_ITEMS.map(([q, a], i) => (
                <React.Fragment key={i}>
                  <dt
                    className={openFaq === i ? "open" : undefined}
                    onClick={() => setOpenFaq((cur) => (cur === i ? -1 : i))}
                  >
                    {q}
                  </dt>
                  <dd className={openFaq === i ? "open" : undefined}>
                    <div className="inner">{a}</div>
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </div>

          <div className="vip">
            <div className="vip-inner">
              <h3>Early <b>builder access</b> to reserve your covenant slot</h3>
              <form onSubmit={reserveSubmit}>
                <div className="frow">
                  <input className="vfield" placeholder="First name" required />
                  <input className="vfield" placeholder="Last name" required />
                </div>
                <input className="vfield" type="email" placeholder="Enter your email" required />
                <div className="vhint">Your future sign-in email — this can&apos;t be changed later.</div>
                <div className="vlabel">What will your first agent be called?</div>
                <input className="vfield" placeholder="e.g. Research Agent" maxLength={24} />
                <div className="vhint">Maximum 24 characters.</div>
                <div className="vlabel">How are you planning to use Covenant?</div>
                <label className={`radio-opt${useOpt === 0 ? " sel" : ""}`} onClick={() => setUseOpt(0)}>
                  <input type="radio" name="use" checked={useOpt === 0} readOnly /><span className="ring" /> Build an agent that pays for services
                </label>
                <label className={`radio-opt${useOpt === 1 ? " sel" : ""}`} onClick={() => setUseOpt(1)}>
                  <input type="radio" name="use" checked={useOpt === 1} readOnly /><span className="ring" /> Set spending policy for my team&apos;s agents
                </label>
                <button
                  className="btn btn-dark"
                  type="submit"
                  style={reserveLabel.includes("✓") ? { background: "#2f8f5b" } : undefined}
                >
                  {reserveLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="cta">
        <div className="scatter">
          {fly.map((f, i) => (
            <div
              key={i}
              className="fly"
              style={{
                ...(f.l ? { left: f.l } : { right: f.rg }),
                top: f.y,
                ["--r" as string]: `${f.r}deg`,
                animationDelay: `${(i * 0.45).toFixed(2)}s`,
                animationDuration: `${(5 + i * 0.4).toFixed(1)}s`,
              } as React.CSSProperties}
            >
              <span className="fi" style={{ background: f.bg, color: f.col }}>{f.ic}</span>
              {f.t}
            </div>
          ))}
        </div>
        <div className="wrap">
          <div className="cta-logo">
            <CovenantMark size={30} />
          </div>
          <h2 className="display">R<i>e</i>ady to let your <i>a</i>gents p<i>a</i>y — saf<i>e</i>ly?</h2>
          <p>Join the early waitlist and get notified the moment Covenant goes live.</p>
          <div className="cta-actions">
            <Link className="btn btn-dark btn-lg" href="/new">
              Get Started{" "}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
          <div className="proof">
            <div className="avatars">
              <span style={{ background: "linear-gradient(135deg,#2775ca,#4f97e0)" }}>R</span>
              <span style={{ background: "linear-gradient(135deg,#f3b9c8,#f6c9b6)" }}>A</span>
            </div>
            <span>The safety layer for self-paying AI agents</span>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <CovenantMark size={34} className="mark" />
              <p className="foot-note">Covenant controls how agents spend — the safety layer for the autonomous agent economy. <a href="#top">Built for the x402 + ERC-7710 track.</a></p>
            </div>
            <div className="foot-col">
              <h4>Sitemap</h4>
              <a href="#why">Why Covenant</a>
              <a href="#who">Who it&apos;s for</a>
              <a href="#features">Features</a>
              <a href="#reserve">Get early access</a>
            </div>
            <div className="foot-col">
              <h4>Contact</h4>
              <a href="#reserve">Join the waitlist</a>
              <Link href="/dashboard">Open the app</Link>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Covenant. Let agents pay, but only under covenant.</span>
            <div className="foot-social">
              <a href="#" aria-label="X"><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M18 3h3l-7 8 8 10h-6l-5-6-5 6H3l8-9L3 3h6l4 5 5-5z" /></svg></a>
              <a href="#" aria-label="GitHub"><svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 00-3 19.5c.5.1.7-.2.7-.5v-2c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6 0-.6 0-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1 2.9.8.1-.6.3-1 .6-1.3-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7 0-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 015 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A10 10 0 0012 2z" /></svg></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
