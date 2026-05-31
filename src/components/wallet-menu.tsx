"use client";

import * as React from "react";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/utils";

const DEMO_ADDR = "0x7a…3F2c";

/**
 * Wallet chip / pill that opens a popup with the full address, copy, and
 * connect/disconnect. Used in the landing nav (pill), the dashboard sidebar +
 * mobile top bar, and the wizard sidebar (chip), so it works on every page.
 */
export function WalletMenu({ variant = "chip" }: { variant?: "chip" | "pill" }) {
  const { account, connect, disconnect, connecting } = useWallet();
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const connected = !!account;
  const shown = connected ? shortAddr(account) : DEMO_ADDR;

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function copy() {
    try {
      navigator.clipboard?.writeText(account ?? DEMO_ADDR);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  // landing pill, not connected → a plain "Connect Wallet" call to action
  if (variant === "pill" && !connected) {
    return (
      <button type="button" className="btn btn-dark wallet-btn" onClick={() => connect()}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M3 7.5A2.5 2.5 0 015.5 5H18a1 1 0 011 1v1.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
          <rect x="3" y="7" width="18" height="12" rx="2.5" stroke="#fff" strokeWidth="1.7" />
          <circle cx="16.5" cy="13" r="1.5" fill="#fff" />
        </svg>
        <span>{connecting ? "Connecting…" : "Connect Wallet"}</span>
      </button>
    );
  }

  const trigger =
    variant === "pill" ? (
      <button
        type="button"
        className="btn btn-dark wallet-btn connected"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="wdot" />
        <span>{shown}</span>
      </button>
    ) : (
      <button
        type="button"
        className="wallet"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="wdot" />
        <span className="wmeta">
          <b>{shown}</b>
          <small>MetaMask Smart Account</small>
        </span>
        <span className="wnet">Base</span>
      </button>
    );

  return (
    <div className="wallet-menu" ref={ref}>
      {trigger}
      {open && (
        <div className="wallet-pop" role="menu">
          <div className="wallet-pop-top">
            <span className="wdot" />
            <div className="wallet-pop-id">
              <span className="wallet-pop-label">{connected ? "Connected" : "Demo wallet"}</span>
              <span className="wallet-pop-addr mono">{connected ? account : DEMO_ADDR}</span>
            </div>
          </div>
          <div className="wallet-pop-meta">MetaMask Smart Account · Base Sepolia</div>
          <div className="wallet-pop-actions">
            <button type="button" className="wallet-pop-btn" onClick={copy}>
              {copied ? "Copied ✓" : "Copy address"}
            </button>
            {connected ? (
              <button
                type="button"
                className="wallet-pop-btn danger"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                className="wallet-pop-btn primary"
                onClick={() => {
                  connect();
                  setOpen(false);
                }}
              >
                Connect MetaMask
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
