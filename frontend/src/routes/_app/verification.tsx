import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  Loader2, Info, Zap, BarChart3, Clock, History, Cpu,
} from "lucide-react";
import { runVerification, type VerificationReport } from "@/lib/api/backend";
import { useDesign } from "@/lib/design-context";
import { useProject } from "@/lib/project-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/verification")({
  head: () => ({ meta: [{ title: "Verification — Silicofeller" }] }),
  component: VerificationPage,
});

const BACKEND = (import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");
const token = () => (typeof window !== "undefined" ? localStorage.getItem("qs_token") ?? "" : "");

const SEV_COLORS = {
  error:   "text-rose-700 bg-rose-50 border-rose-200",
  warning: "text-amber-700 bg-amber-50 border-amber-200",
  info:    "text-blue-700 bg-blue-50 border-blue-200",
};

const SEV_ICONS = {
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

type HistoryReport = VerificationReport & { created_at?: string; project_id?: string };

function VerificationPage() {
  const { activeConversation } = useDesign();
  const { activeProject } = useProject();
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<HistoryReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tab, setTab] = useState<"current" | "history">("current");

  // Load history when active project changes
  useEffect(() => {
    if (!activeProject) { setHistory([]); return; }
    setLoadingHistory(true);
    fetch(`${BACKEND}/api/verification/project/${activeProject.id}`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [activeProject]);

  const run = async () => {
    if (!activeConversation?.result) return;
    setRunning(true);
    try {
      let r: VerificationReport;

      if (activeProject) {
        // Use the /run endpoint which saves to DB
        const res = await fetch(`${BACKEND}/api/verification/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({
            project_id: activeProject.id,
            payload: activeConversation.result,
          }),
        });
        if (res.ok) {
          r = await res.json();
          // Refresh history
          setHistory(prev => [r as HistoryReport, ...prev]);
        } else {
          r = await runVerification(activeConversation.result);
        }
      } else {
        // No project — stateless check
        r = await runVerification(activeConversation.result);
      }

      setReport(r);
      setTab("current");
    } catch {
      alert("Verification failed — check backend connection.");
    } finally {
      setRunning(false);
    }
  };

  const hasDesign = !!activeConversation?.result;
  const allIssues = [
    ...(report?.violations ?? []),
    ...(report?.frequency_collisions ?? []),
    ...(report?.crosstalk_warnings ?? []),
  ] as Array<{ severity: string; type?: string; rule?: string; message: string }>;

  const statusIcon = report?.status === "passed"
    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    : report?.status === "failed"
    ? <XCircle className="h-5 w-5 text-rose-500" />
    : <AlertTriangle className="h-5 w-5 text-amber-500" />;

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Verification Center</h1>
                <p className="text-sm text-slate-500">
                  DRC · Frequency Collision · Crosstalk · Yield
                  {activeProject && <> · <strong className="text-accent">{activeProject.name}</strong></>}
                </p>
              </div>
            </div>
            <Button
              onClick={run}
              disabled={!hasDesign || running}
              className="rounded-xl bg-accent text-white text-xs font-bold h-9 shadow-sm shadow-accent/20"
            >
              {running
                ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                : <Zap className="mr-1.5 h-3.5 w-3.5" />}
              Run Verification
            </Button>
          </div>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-4">
          {[
            { id: "current" as const, label: "Current Run" },
            { id: "history" as const, label: `History (${history.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                tab === t.id ? "bg-white text-accent shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Current run tab ── */}
        {tab === "current" && (
          <div className="space-y-4">
            {!hasDesign && (
              <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">No active design</p>
                <p className="text-xs text-slate-400 mt-1">
                  Generate a chip in the <Link to="/designer" className="text-accent hover:underline">Designer</Link> first.
                </p>
              </Card>
            )}

            {hasDesign && !report && !running && (
              <Card className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">Ready to verify</p>
                <div className="flex items-center justify-center gap-2 mt-1 text-xs text-slate-500">
                  <Cpu className="h-3.5 w-3.5" />
                  {activeConversation?.title} · {activeConversation?.result?.num_qubits}Q
                </div>
                <Button onClick={run} className="mt-4 rounded-xl bg-accent text-white text-xs font-bold">
                  <Zap className="mr-1.5 h-3.5 w-3.5" /> Run Verification
                </Button>
              </Card>
            )}

            {running && (
              <Card className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">Running verification checks…</p>
                <p className="text-xs text-slate-400 mt-1">DRC · Frequency collision · Crosstalk · Yield</p>
              </Card>
            )}

            {report && !running && (
              <>
                {/* Summary */}
                <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {statusIcon}
                      <div>
                        <p className="text-sm font-black text-slate-900 capitalize">{report.status}</p>
                        <p className="text-xs text-slate-500">
                          {report.summary.total_issues} issues · {report.summary.critical} critical
                          {activeProject && (
                            <span className="ml-2 text-emerald-600 font-bold">✓ Saved to {activeProject.name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500">Yield Estimate</p>
                        <p className={cn("text-2xl font-black",
                          report.summary.yield_estimate >= 90 ? "text-emerald-600"
                          : report.summary.yield_estimate >= 70 ? "text-amber-600"
                          : "text-rose-600"
                        )}>
                          {report.summary.yield_estimate}%
                        </p>
                      </div>
                      {report.summary.coherence_budget && (
                        <div className="text-right border-l border-slate-100 pl-3">
                          <p className="text-[10px] text-slate-500">T₁ Budget</p>
                          <p className="text-2xl font-black text-accent">
                            {report.summary.coherence_budget.T1_us}µs
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {[
                      { label: "Critical", val: report.summary.critical, color: "text-rose-600" },
                      { label: "Major",    val: report.summary.major,    color: "text-amber-600" },
                      { label: "Minor",    val: report.summary.minor,    color: "text-blue-600" },
                      { label: "DRC", val: report.drc_passed ? "PASS" : "FAIL",
                        color: report.drc_passed ? "text-emerald-600" : "text-rose-600" },
                    ].map(s => (
                      <div key={s.label} className="text-center rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{s.label}</p>
                        <p className={cn("text-2xl font-black mt-0.5", s.color)}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Issues */}
                {allIssues.length > 0 ? (
                  <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-bold text-slate-900 mb-3">Issues ({allIssues.length})</p>
                    <div className="space-y-2">
                      {allIssues.map((issue, i) => {
                        const sev = (issue.severity ?? "info") as keyof typeof SEV_COLORS;
                        const Icon = SEV_ICONS[sev] ?? Info;
                        return (
                          <div key={i} className={cn("flex items-start gap-3 rounded-xl border p-3", SEV_COLORS[sev])}>
                            <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                                {issue.type ?? issue.rule ?? sev}
                              </p>
                              <p className="text-xs font-semibold mt-0.5">{issue.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ) : (
                  <Card className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-emerald-800">All checks passed!</p>
                    <p className="text-xs text-emerald-600 mt-1">No violations, collisions, or significant crosstalk.</p>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ── History tab ── */}
        {tab === "history" && (
          <div className="space-y-3">
            {!activeProject && (
              <Card className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                <p className="text-xs text-amber-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Select an active project on the <Link to="/projects" className="underline">Projects</Link> page to see saved verification reports.
                </p>
              </Card>
            )}

            {loadingHistory && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            )}

            {!loadingHistory && history.length === 0 && activeProject && (
              <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <History className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">No saved reports yet</p>
                <p className="text-xs text-slate-400 mt-1">Run a verification to save a report for {activeProject.name}.</p>
              </Card>
            )}

            {!loadingHistory && history.map((r, i) => (
              <Card key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {r.status === "passed"
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : r.status === "failed"
                      ? <XCircle className="h-4 w-4 text-rose-500" />
                      : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    <div>
                      <p className="text-xs font-bold text-slate-900 capitalize">{r.status}</p>
                      <p className="text-[10px] text-slate-400">
                        {r.summary?.total_issues ?? 0} issues · yield {r.summary?.yield_estimate ?? 0}%
                        {r.created_at && <> · {new Date(r.created_at).toLocaleString()}</>}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    "rounded-full text-[9px] font-bold px-2 py-0.5",
                    r.drc_passed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                  )}>
                    DRC {r.drc_passed ? "PASS" : "FAIL"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
