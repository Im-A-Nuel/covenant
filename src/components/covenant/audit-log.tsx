"use client";

import { ScrollText, CheckCircle2, XCircle, Link2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { timeAgo, formatUSDC } from "@/lib/utils";
import { explorerTx } from "@/lib/chain";

export function AuditLog({ covenantId }: { covenantId?: string }) {
  const { audit } = useStore();
  const rows = covenantId ? audit.filter((a) => a.covenantId === covenantId) : audit;

  function exportJson() {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "covenant-audit.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ScrollText className="h-4 w-4 text-brand" /> Audit Trail</CardTitle>
            <CardDescription>Every decision and payment, explained.</CardDescription>
          </div>
          {rows.length > 0 && (
            <Button size="sm" variant="ghost" onClick={exportJson}><Download className="h-3.5 w-3.5" /> Export</Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-faint">No activity yet. Run the agent to populate the trail.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-surface-2/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {a.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-good" /> : <XCircle className="h-4 w-4 text-bad" />}
                    <span className="text-ink">{a.resource}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={a.decision === "approved" ? "good" : a.decision === "blocked" ? "bad" : "warn"}>{a.decision.replace("_", " ")}</Badge>
                    <span className="text-xs text-faint">{timeAgo(a.timestamp)}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">{a.reason}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-faint">
                  <span>Service: <span className="text-muted">{a.service}</span></span>
                  <span>Amount: <span className="text-muted">{formatUSDC(a.amount)} USDC</span></span>
                  <span>Remaining: <span className="text-muted">{formatUSDC(a.remainingBudget)} USDC</span></span>
                  {a.transactionHash && a.status === "completed" && (
                    <a href={explorerTx(a.transactionHash)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline">
                      tx <Link2 className="h-3 w-3" />
                    </a>
                  )}
                  <Badge tone={a.execMode === "real" ? "good" : "neutral"}>{a.execMode}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
