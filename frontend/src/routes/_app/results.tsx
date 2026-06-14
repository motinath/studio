import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Download, TrendingUp, Activity, Zap, Thermometer,
  ChevronDown, ChevronUp, Copy, Check, Clock, Cpu,
} from "lucide-react";
import { useDesign } from "@/lib/design-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/results")({
  head: () => ({ meta: [{ title: "Results — Silicofeller" }] }),
  component: ResultsPage,
});

type ResultTab = "frequencies" | "parameters" | "coherence" | "placement";

function SparkBar({ values, color = "#7C3AED" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className="rounded-sm flex-1"
          style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.7 + (i / values.length) * 0.3 }}
        />
      ))}
    </div>
  );
}

function FrequencyTable({ fp }: { fp: NonNullable<import("@/lib/api/backend").FrequencyPlan> | undefined }) {
  if (!fp) return null;
  const qEntries = Object.entries(fp.qubit_frequencies_GHz ?? {});
  const rEntries = Object.entries(fp.resonator_frequencies_GHz ?? {});

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Qubit Frequencies ({qEntries.length})
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {qEntries.map(([name, freq]) => (
              <div key={name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 w-8">{name}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5">
                    Group {fp.qubit_groups?.[name] ?? 0}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 font-mono">{(freq as number).toFixed(4)}</span>
                  <span className="text-[10px] text-slate-400 ml-1">GHz</span>
                </div>
              </div>
            ))}
          </div>
          {qEntries.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <SparkBar values={qEntries.map(([, f]) => f as number)} color="#D97706" />
              <p className="text-[9px] text-slate-400 mt-1">Frequency distribution</p>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" />
            Readout Resonators ({rEntries.length})
          </p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {rEntries.map(([name, freq]) => (
              <div key={name} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 w-8">{name}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {fp.resonator_lengths_mm?.[name]?.toFixed(3)} mm
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-accent font-mono">{(freq as number).toFixed(4)}</span>
                  <span className="text-[10px] text-slate-400 ml-1">GHz</span>
                </div>
              </div>
            ))}
          </div>
          {rEntries.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <SparkBar values={rEntries.map(([, f]) => f as number)} color="#7C3AED" />
              <p className="text-[9px] text-slate-400 mt-1">Resonator frequency distribution</p>
            </div>
          )}
        </Card>
      </div>

      {/* Warnings */}
      {(fp.warnings?.length ?? 0) > 0 && (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <p className="text-xs font-bold text-amber-800 mb-2">Frequency Warnings ({(fp.warnings ?? []).length})</p>
          {(fp.warnings ?? []).map((w: string, i: number) => (
            <p key={i} className="text-[11px] text-amber-700 font-medium">• {w}</p>
          ))}
        </Card>
      )}
    </div>
  );
}

function ParametersTable({ fp }: { fp: any }) {
  if (!fp) return null;
  const entries = Object.entries(fp.qubit_frequencies_GHz ?? {});

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
      <div className="p-4 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-900">Hamiltonian Parameters</p>
        <p className="text-[10px] text-slate-500 mt-0.5">EJ (Josephson energy) · EC (charging energy) · EJ/EC ratio</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
            <th className="px-4 py-2">Qubit</th>
            <th className="px-4 py-2">f₀₁ (GHz)</th>
            <th className="px-4 py-2">EJ (GHz)</th>
            <th className="px-4 py-2">EC (GHz)</th>
            <th className="px-4 py-2">EJ/EC</th>
            <th className="px-4 py-2">Detuning</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, freq]) => {
            const ej = fp.EJ_GHz?.[name] ?? 0;
            const ec = fp.EC_GHz?.[name] ?? 0;
            const resName = `R${name.slice(1)}`;
            const det = fp.detunings_GHz?.[resName] ?? 0;
            return (
              <tr key={name} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-bold text-slate-900">{name}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700">{(freq as number).toFixed(4)}</td>
                <td className="px-4 py-2.5 font-mono text-amber-700">{ej.toFixed(3)}</td>
                <td className="px-4 py-2.5 font-mono text-blue-700">{ec.toFixed(5)}</td>
                <td className="px-4 py-2.5 font-mono text-emerald-700">{ec > 0 ? (ej / ec).toFixed(1) : "—"}</td>
                <td className="px-4 py-2.5 font-mono text-slate-500">{det.toFixed(3)} GHz</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function PlacementTable({ placement }: { placement: any }) {
  if (!placement) return null;
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-900">Physical Placement</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Solver: {placement.solver} · Coordinates in mm</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-4">
        {placement.qubits?.map((q: any) => (
          <div key={q.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center hover:bg-white transition-colors">
            <p className="text-xs font-bold text-slate-800">{q.name}</p>
            <p className="text-[10px] font-mono text-slate-500 mt-1">
              ({q.x.toFixed(3)}, {q.y.toFixed(3)})
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ResultsPage() {
  const { conversations, activeConversation } = useDesign();
  const [activeTab, setActiveTab] = useState<ResultTab>("frequencies");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const displayConv = selectedConvId
    ? conversations.find(c => c.id === selectedConvId)
    : activeConversation;

  const result = displayConv?.result;
  const fp     = result?.frequency_plan;

  const withResults = conversations.filter(c => c.result);

  const exportJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${displayConv?.title ?? "results"}.json`;
    a.click();
  };

  const copyJSON = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TABS: { id: ResultTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "frequencies", label: "Frequencies", icon: Activity },
    { id: "parameters",  label: "Hamiltonian",  icon: Zap },
    { id: "coherence",   label: "Coherence",    icon: Thermometer },
    { id: "placement",   label: "Placement",    icon: BarChart3 },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Results</h1>
                <p className="text-sm text-slate-500">Simulation outputs · Extracted parameters · Frequency plans</p>
              </div>
            </div>
            {result && (
              <div className="flex gap-2">
                <Button onClick={copyJSON} variant="outline" className="rounded-xl text-xs font-bold h-9">
                  {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                  Copy JSON
                </Button>
                <Button onClick={exportJSON} className="rounded-xl bg-accent text-white text-xs font-bold h-9">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {withResults.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No results yet</p>
            <p className="text-xs text-slate-400 mt-1">Generate a chip in the Designer to see results here.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Session list */}
            <div className="lg:col-span-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
                Design Sessions ({withResults.length})
              </p>
              {withResults.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConvId(c.id)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                    (selectedConvId === c.id || (!selectedConvId && c.id === activeConversation?.id))
                      ? "border-accent bg-accent-soft shadow-sm"
                      : "border-slate-200 bg-white hover:border-accent/40 hover:bg-slate-50"
                  )}
                >
                  <Cpu className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {c.result?.num_qubits}Q · {c.result?.topology}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-2.5 w-2.5 text-slate-300" />
                      <span className="text-[9px] text-slate-400">
                        {new Date(c.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Results panel */}
            <div className="lg:col-span-9">
              {result ? (
                <div className="space-y-4">
                  {/* Header */}
                  <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Result Set</p>
                        <h3 className="text-base font-black text-slate-900 mt-0.5">{result.label}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{result.interpretation}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Badge variant="outline" className="rounded-full text-[9px] font-bold px-2 py-0.5 bg-slate-50">
                          {result.num_qubits} qubits
                        </Badge>
                        <Badge variant="outline" className="rounded-full text-[9px] font-bold px-2 py-0.5 bg-slate-50">
                          {result.topology}
                        </Badge>
                        <Badge variant="outline" className={cn("rounded-full text-[9px] font-bold px-2 py-0.5", result.drc?.passed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
                          DRC {result.drc?.passed ? "PASS" : "FAIL"}
                        </Badge>
                      </div>
                    </div>
                  </Card>

                  {/* Tabs */}
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                    {TABS.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                          activeTab === t.id
                            ? "bg-white text-accent shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <t.icon className="h-3 w-3" />
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab content */}
                  {activeTab === "frequencies"  && <FrequencyTable fp={fp} />}
                  {activeTab === "parameters"   && <ParametersTable fp={fp} />}
                  {activeTab === "placement"    && <PlacementTable placement={result.placement} />}
                  {activeTab === "coherence" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: "T₁ Estimate", value: fp?.substrate === "sapphire" ? "~250 µs" : "~80 µs", sub: fp?.substrate ?? "silicon", color: "text-emerald-600" },
                        { label: "T₂ Estimate", value: fp?.substrate === "sapphire" ? "~350 µs" : "~120 µs", sub: fp?.metal ?? "aluminum", color: "text-blue-600" },
                        { label: "1Q Gate Fidelity", value: "99.92%", sub: "Estimated", color: "text-accent" },
                        { label: "2Q Gate Fidelity", value: "99.4%", sub: "Estimated", color: "text-amber-600" },
                        { label: "Anharmonicity", value: `~${Math.round((fp?.EC_GHz ? Object.values(fp.EC_GHz)[0] as number : 0.28) * 1000)} MHz`, sub: "-EC", color: "text-slate-700" },
                        { label: "ε_eff", value: fp?.epsilon_eff?.toFixed(3) ?? "6.270", sub: "Effective dielectric", color: "text-slate-700" },
                      ].map(s => (
                        <Card key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                          <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <p className="text-sm font-bold text-slate-700">Select a session from the left</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
