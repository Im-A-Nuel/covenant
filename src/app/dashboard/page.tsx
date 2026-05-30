"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Inbox } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { CovenantBuilder } from "@/components/covenant/covenant-builder";
import { CovenantCard } from "@/components/covenant/covenant-card";
import { TaskConsole } from "@/components/covenant/task-console";
import { AuditLog } from "@/components/covenant/audit-log";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/utils";

export default function Dashboard() {
  const { covenants, ready } = useStore();
  const { account } = useWallet();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [showBuilder, setShowBuilder] = React.useState(false);

  const active = covenants.find((c) => c.id === selected) ?? covenants[0];

  React.useEffect(() => {
    if (ready && covenants.length === 0) setShowBuilder(true);
  }, [ready, covenants.length]);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
            <p className="text-sm text-muted">Create a covenant, then run an agent under it.</p>
          </div>
          <div className="flex items-center gap-2">
            {account && <Badge tone="neutral">User {shortAddr(account)}</Badge>}
            <Button size="sm" variant={showBuilder ? "secondary" : "primary"} onClick={() => setShowBuilder((s) => !s)}>
              <Plus className="h-4 w-4" /> New covenant
            </Button>
          </div>
        </div>

        {/* builder */}
        {showBuilder && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <CovenantBuilder
              onCreated={(id) => {
                setSelected(id);
                setShowBuilder(false);
              }}
            />
          </motion.div>
        )}

        {/* covenant chips */}
        {covenants.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {covenants.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  active?.id === c.id
                    ? "border-brand/50 bg-brand/10 text-ink"
                    : "border-border bg-surface-2 text-muted hover:text-ink"
                }`}
              >
                {c.agent} · {c.remainingBudget.toFixed(2)} USDC
              </button>
            ))}
          </div>
        )}

        {!active ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center">
            <Inbox className="h-8 w-8 text-faint" />
            <p className="mt-2 text-sm text-muted">No covenant yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <CovenantCard covenant={active} />
              <AuditLog covenantId={active.id} />
            </div>
            <div className="space-y-6">
              <TaskConsole covenant={active} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
