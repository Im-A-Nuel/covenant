"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { WalletButton } from "./wallet-button";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border glass">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-b from-brand to-brand-2 shadow-[0_4px_16px_-4px_rgba(91,140,255,0.7)]">
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="leading-none">
            <span className="text-sm font-semibold tracking-tight text-ink">Covenant</span>
            <span className="ml-2 hidden text-[11px] text-faint sm:inline">x402 · ERC-7710</span>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/dashboard" className="hidden sm:block text-sm text-muted hover:text-ink px-3 py-1.5 rounded-lg hover:bg-surface-2 transition-colors">
            Dashboard
          </Link>
          <WalletButton />
        </nav>
      </div>
    </header>
  );
}
