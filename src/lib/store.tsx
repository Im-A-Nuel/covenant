"use client";

import * as React from "react";
import type { Covenant, AuditEntry } from "./types";
import type { SignedDelegation } from "./delegation";
import { COVENANTS, AUDIT } from "./seed";

interface StoreState {
  covenants: Covenant[];
  audit: AuditEntry[];
  ready: boolean;
  addCovenant: (c: Covenant, signed?: SignedDelegation) => void;
  updateCovenant: (id: string, patch: Partial<Covenant>) => void;
  getSigned: (id: string) => SignedDelegation | undefined;
  addAudit: (a: AuditEntry) => void;
  reset: () => void;
}

const Ctx = React.createContext<StoreState | null>(null);
const KEY = "covenant_state_v2";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [covenants, setCovenants] = React.useState<Covenant[]>([]);
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);
  const [ready, setReady] = React.useState(false);
  const signedRef = React.useRef<Map<string, SignedDelegation>>(new Map());

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCovenants(parsed.covenants ?? []);
        setAudit(parsed.audit ?? []);
      } else {
        // First load: seed from reference data so dashboards look populated.
        setCovenants(COVENANTS);
        setAudit(AUDIT);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify({ covenants, audit }));
  }, [covenants, audit, ready]);

  const addCovenant = React.useCallback((c: Covenant, signed?: SignedDelegation) => {
    if (signed) signedRef.current.set(c.id, signed);
    setCovenants((prev) => [c, ...prev]);
  }, []);

  const updateCovenant = React.useCallback((id: string, patch: Partial<Covenant>) => {
    setCovenants((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const getSigned = React.useCallback((id: string) => signedRef.current.get(id), []);

  const addAudit = React.useCallback((a: AuditEntry) => {
    setAudit((prev) => [a, ...prev]);
  }, []);

  const reset = React.useCallback(() => {
    setCovenants([]);
    setAudit([]);
    signedRef.current.clear();
    localStorage.removeItem(KEY);
  }, []);

  return (
    <Ctx.Provider value={{ covenants, audit, ready, addCovenant, updateCovenant, getSigned, addAudit, reset }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
