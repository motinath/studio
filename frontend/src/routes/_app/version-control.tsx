import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  GitBranch, GitCommit, Tag, Clock, Cpu, Check,
  Loader2, ArrowRight, RotateCcw, Download, Diff,
  AlertTriangle, Plus,
} from "lucide-react";
import { useDesign } from "@/lib/design-context";
import { useProject } from "@/lib/project-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/version-control")({
  head: () => ({ meta: [{ title: "Version Control — Silicofeller" }] }),
  component: VersionControlPage,
});

const BACKEND = (import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");
const token = () => (typeof window !== "undefined" ? localStorage.getItem("qs_token") ?? "" : "");

type BackendVersion = { id: string; tag: string; message: string; created_at: string };

type TimelineItem = {
  id: string;
  tag: string;
  message: string;
  timestamp: number;
  num_qubits: number;
  topology: string;
  drc_passed: boolean;
  source: "session" | "snapshot";
  snapshotData?: unknown;
};

const COLORS = ["#7C3AED","#2563EB","#059669","#D97706","#DC2626","#0891B2","#7C3AED"];

function VersionControlPage() {
  const { conversations, activeConversation, setActiveId, updateConversationResult } = useDesign();
  const { activeProject } = useProject();

  const [backendVersions, setBackendVersions] = useState<BackendVersion[]>([]);
  const [tagInput, setTagInput]   = useState("v1.0");
  const [msgInput, setMsgInput]   = useState("");
  const [saving,   setSaving]     = useState(false);
  const [savedId,  setSavedId]    = useState<string | null>(null);
  const [restored, setRestored]   = useState<string | null>(null);
  const [diffA,    setDiffA]      = useState<string | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Load backend versions when active project changes
  useEffect(() => {
    if (!activeProject) { setBackendVersions([]); return; }
    setLoadingVersions(true);
    fetch(`${BACKEND}/api/projects/${activeProject.id}/versions`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setBackendVersions(Array.isArray(data) ? data : []))
      .catch(() => setBackendVersions([]))
      .finally(() => setLoadingVersions(false));
  }, [activeProject]);

  // Save snapshot to DB (if project active) or local
  const saveSnapshot = async () => {
    if (!activeConversation?.result) return;
    setSaving(true);
    try {
      if (activeProject) {
        const res = await fetch(`${BACKEND}/api/projects/${activeProject.id}/versions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({ tag: tagInput.trim() || "v0.1", message: msgInput.trim() || "Manual snapshot" }),
        });
        if (res.ok) {
          const v = await res.json();
          setBackendVersions(prev => [v, ...prev]);
          setSavedId(v.id);
          setTimeout(() => setSavedId(null), 2500);
        }
      } else {
        // No project — just show success feedback (local-only)
        await new Promise(r => setTimeout(r, 500));
        setSavedId("local_" + Date.now());
        setTimeout(() => setSavedId(null), 2500);
      }
    } catch {}
    setSaving(false);
  };

  // Download a snapshot as JSON
  const downloadSnapshot = (item: TimelineItem) => {
    const data = item.snapshotData ?? activeConversation?.result;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${item.tag}_${item.id.slice(-6)}.json`;
    a.click();
  };

  // Restore a session to active
  const restoreSession = (item: TimelineItem) => {
    if (item.source === "session") {
      setActiveId(item.id);
    }
    setRestored(item.id);
    setTimeout(() => setRestored(null), 2500);
  };

  // Build unified timeline: AI sessions + backend versions
  const sessionItems: TimelineItem[] = conversations
    .filter(c => c.result)
    .map((c, i) => ({
      id:         c.id,
      tag:        c.title.slice(0, 24),
      message:    `AI-generated: ${c.result!.topology} · ${c.result!.num_qubits}Q`,
      timestamp:  c.updatedAt,
      num_qubits: c.result!.num_qubits,
      topology:   c.result!.topology,
      drc_passed: c.result!.drc?.passed ?? false,
      source:     "session" as const,
    }));

  const backendItems: TimelineItem[] = backendVersions.map((v, i) => ({
    id:         v.id,
    tag:        v.tag,
    message:    v.message || "Snapshot",
    timestamp:  new Date(v.created_at).getTime(),
    num_qubits: activeConversation?.result?.num_qubits ?? 0,
    topology:   activeConversation?.result?.topology ?? "—",
    drc_passed: activeConversation?.result?.drc?.passed ?? false,
    source:     "snapshot" as const,
  }));

  const timeline = [...sessionItems, ...backendItems].sort((a, b) => b.timestamp - a.timestamp);

  const diffItem = diffA ? timeline.find(t => t.id === diffA) : null;
  const activeItem = activeConversation ? timeline.find(t => t.id === activeConversation.id) : null;

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
              <GitBranch className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Version Control</h1>
              <p className="text-sm text-slate-500">
                Snapshot · Tag · Diff · Restore
                {activeProject && (
                  <> · Project: <strong className="text-accent">{activeProject.name}</strong></>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: create + diff */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4 text-accent" /> Save Snapshot
              </p>

              {!activeConversation?.result ? (
                <p className="text-xs text-slate-400 font-semibold">
                  Generate a chip in the Designer first.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Active design pill */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <Cpu className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{activeConversation.title}</p>
                      <p className="text-[10px] text-slate-400">
                        {activeConversation.result.num_qubits}Q · {activeConversation.result.topology}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "rounded-full text-[9px] font-bold px-1.5 py-0.5 shrink-0",
                      activeConversation.result.drc?.passed
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      DRC {activeConversation.result.drc?.passed ? "✓" : "!"}
                    </Badge>
                  </div>

                  {!activeProject && (
                    <p className="text-[10px] text-amber-600 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="h-3 w-3" />
                      No active project — snapshot won't persist to DB
                    </p>
                  )}

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 mb-1">Version Tag</p>
                    <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="v1.0" className="rounded-xl text-xs h-8 border-slate-200" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 mb-1">Message</p>
                    <Input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="e.g. Adjusted qubit frequencies" className="rounded-xl text-xs h-8 border-slate-200" />
                  </div>

                  <Button onClick={saveSnapshot} disabled={saving} className="w-full rounded-xl bg-accent text-white text-xs font-bold h-9">
                    {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      : savedId ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-300" />
                      : <GitCommit className="mr-1.5 h-3.5 w-3.5" />}
                    {savedId ? "Saved!" : "Save Snapshot"}
                  </Button>
                </div>
              )}
            </Card>

            {/* Diff panel */}
            {diffItem && activeItem && diffItem.id !== activeItem.id && (
              <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Diff className="h-4 w-4 text-accent" /> Diff vs Current
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Qubits",   a: activeItem.num_qubits, b: diffItem.num_qubits },
                    { label: "Topology", a: activeItem.topology,   b: diffItem.topology },
                    { label: "DRC",
                      a: activeItem.drc_passed ? "PASS" : "FAIL",
                      b: diffItem.drc_passed   ? "PASS" : "FAIL" },
                  ].map(row => {
                    const changed = String(row.a) !== String(row.b);
                    return (
                      <div key={row.label} className="flex items-center justify-between py-1 border-b border-slate-50">
                        <span className="text-[10px] text-slate-500 font-semibold w-16">{row.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-accent">{row.a}</span>
                          <ArrowRight className="h-3 w-3 text-slate-300" />
                          <span className={cn("text-[10px] font-bold", changed ? "text-amber-600" : "text-slate-400")}>
                            {row.b}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setDiffA(null)} className="mt-3 text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer">
                  Clear diff
                </button>
              </Card>
            )}
          </div>

          {/* Right: timeline */}
          <div className="lg:col-span-8">
            {loadingVersions && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            )}

            {!loadingVersions && timeline.length === 0 && (
              <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">No versions yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  AI-generated sessions and manual snapshots will appear here.
                </p>
              </Card>
            )}

            {!loadingVersions && timeline.length > 0 && (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[18px] top-4 bottom-4 w-px bg-slate-200" />

                <div className="space-y-3 pl-12">
                  {timeline.map((item, i) => {
                    const isActive = item.source === "session" && item.id === activeConversation?.id;
                    const isDiffTarget = diffA === item.id;
                    const color = COLORS[i % COLORS.length];

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="relative"
                      >
                        {/* Timeline dot */}
                        <div
                          className="absolute -left-[34px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10"
                          style={{ background: color }}
                        />

                        <Card className={cn(
                          "rounded-2xl border bg-white p-4 shadow-sm transition-all",
                          isActive ? "border-accent ring-1 ring-accent/20" : "border-slate-200",
                          isDiffTarget ? "ring-2 ring-amber-300" : ""
                        )}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900">{item.tag}</span>
                                {isActive && (
                                  <Badge variant="outline" className="rounded-full text-[9px] font-bold px-2 py-0.5 bg-accent-soft text-accent border-accent/20">
                                    CURRENT
                                  </Badge>
                                )}
                                <Badge variant="outline" className={cn(
                                  "rounded-full text-[9px] font-bold px-2 py-0.5",
                                  item.source === "snapshot"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                )}>
                                  {item.source === "snapshot" ? "💾 DB Snapshot" : "🤖 AI Session"}
                                </Badge>
                                <Badge variant="outline" className={cn(
                                  "rounded-full text-[9px] font-bold px-2 py-0.5",
                                  item.drc_passed
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                )}>
                                  DRC {item.drc_passed ? "✓" : "✗"}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-600 mt-1 font-semibold">{item.message}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><Cpu className="h-2.5 w-2.5" />{item.num_qubits}Q</span>
                                <span className="flex items-center gap-1"><GitBranch className="h-2.5 w-2.5" />{item.topology}</span>
                                <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{new Date(item.timestamp).toLocaleString()}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setDiffA(isDiffTarget ? null : item.id)}
                                title="Diff with current"
                                className={cn(
                                  "h-7 w-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer",
                                  isDiffTarget
                                    ? "border-amber-300 bg-amber-50 text-amber-600"
                                    : "border-slate-200 text-slate-400 hover:border-accent/40 hover:text-accent"
                                )}
                              >
                                <Diff className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => downloadSnapshot(item)}
                                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-accent/40 hover:text-accent transition-all cursor-pointer"
                                title="Download JSON"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              {item.source === "session" && (
                                <button
                                  onClick={() => restoreSession(item)}
                                  className="h-7 px-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-accent/40 hover:text-accent transition-all cursor-pointer"
                                  title="Set as active session"
                                >
                                  {restored === item.id
                                    ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                                    : "Load"}
                                </button>
                              )}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
