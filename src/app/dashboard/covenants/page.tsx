"use client";

import * as React from "react";
import Link from "next/link";
import { CovenantCard } from "@/components/covenant-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import type { Covenant, CovenantStatus } from "@/lib/types";

type Filter = "all" | CovenantStatus;

const TABS: [Filter, string][] = [
  ["all", "All"],
  ["active", "Active"],
  ["depleted", "Depleted"],
  ["expired", "Expired"],
  ["revoked", "Revoked"],
];

export default function CovenantsPage() {
  const { covenants, updateCovenant, ready } = useStore();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<Filter>("all");

  const counts = React.useMemo(() => {
    const o: Record<string, number> = { all: covenants.length };
    (["active", "depleted", "expired", "revoked"] as CovenantStatus[]).forEach(
      (s) => (o[s] = covenants.filter((c) => c.status === s).length),
    );
    return o;
  }, [covenants]);

  if (!ready) return <CovenantsSkeleton />;

  const list = covenants.filter((c) => filter === "all" || c.status === filter);

  async function revoke(c: Covenant) {
    const ok = await confirm({
      title: `Revoke ${c.agent}?`,
      body: `Covenant ${c.id}'s delegated permission is cancelled immediately. No further payments can be made, and funds never left your wallet.`,
      confirmLabel: "Revoke covenant",
      danger: true,
    });
    if (!ok) return;
    updateCovenant(c.id, { status: "revoked" });
    toast(`Covenant ${c.id} revoked`);
  }

  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Manage</div>
          <h1 className="display ph">Covenants</h1>
          <p>
            Every spending agreement you&apos;ve signed. Revoke any covenant instantly; funds never
            left your wallet.
          </p>
        </div>
        <Link className="btn btn-dark" href="/new">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New covenant
        </Link>
      </div>

      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            className={k === filter ? "on" : ""}
            onClick={() => setFilter(k)}
          >
            {l}
            <span className="tc">{counts[k] || 0}</span>
          </button>
        ))}
      </div>

      <div className="cov-grid">
        {list.length === 0 ? (
          <div className="panel-card empty" style={{ gridColumn: "1/-1" }}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M4 9h16M9 4v16" />
            </svg>
            <div>No covenants in this state.</div>
          </div>
        ) : (
          list.map((c) => {
            const isActive = c.status === "active";
            return (
              <CovenantCard
                key={c.id}
                covenant={c}
                dim={!isActive}
                footer={
                  isActive ? (
                    <>
                      <Link
                        className="btn btn-ghost btn-sm"
                        href={`/dashboard/console?cov=${c.id.slice(1)}`}
                      >
                        Assign task
                      </Link>
                      <button className="btn btn-danger" onClick={() => revoke(c)}>
                        Revoke
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled>
                      {c.status === "revoked"
                        ? "Revoked"
                        : c.status === "expired"
                          ? "Expired"
                          : "Depleted"}
                    </button>
                  )
                }
              />
            );
          })
        )}
      </div>
    </>
  );
}

function CovenantsSkeleton() {
  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <Skeleton style={{ width: 70, height: 12, marginBottom: 13 }} />
          <Skeleton style={{ width: 200, height: 32, marginBottom: 10, borderRadius: 10 }} />
          <Skeleton style={{ width: "min(60ch, 100%)", height: 16 }} />
        </div>
      </div>
      <Skeleton style={{ width: 320, height: 42, borderRadius: 12, marginBottom: 24 }} />
      <div className="cov-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} style={{ width: "100%", height: 360, borderRadius: 22 }} />
        ))}
      </div>
    </>
  );
}
