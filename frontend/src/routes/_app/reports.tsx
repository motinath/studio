import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Download, CheckCircle2, AlertTriangle,
  XCircle, Cpu, Zap, Activity, BarChart3,
  ShieldCheck, Package, Loader2, Clock,
} from "lucide-react";
import { useDesign } from "@/lib/design-context";
import { useProject } from "@/lib/project-context";
import { cn } from "@/lib/utils";

const BACKEND = (import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");
const token = () => (typeof window !== "undefined" ? localStorage.getItem("qs_token") ?? "" : "");

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Silicofeller" }] }),
  component: ReportsPage,
});

type ReportType = "design" | "verification" | "simulation" | "tapeout";

const REPORT_TYPES: { id: ReportType; label: string; description: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: "design",       label: "Design Summary",      description: "Full chip parameters, frequency plan, placement, and Qiskit Metal code",   icon: Cpu,          color: "text-accent bg-accent-soft border-accent/20" },
  { id: "verification", label: "Verification Report",  description: "DRC violations, frequency collisions, crosstalk warnings, yield estimate",  icon: ShieldCheck,  color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { id: "simulation",   label: "Simulation Report",    description: "Physics analysis: T₁/T₂, anharmonicity, coupling strengths, gate fidelity", icon: Activity,     color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "tapeout",      label: "Tapeout Package",      description: "GDS layout, fabrication spec, layer map, and process compatibility notes",  icon: Package,      color: "text-amber-600 bg-amber-50 border-amber-200" },
];

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

function KVRow({ label, value, mono = false }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn("text-xs font-bold text-slate-900", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function DesignReport({ result }: { result: NonNullable<ReturnType<typeof useDesign>["activeConversation"]>["result"] }) {
  const fp = result?.frequency_plan;
  const qEntries = Object.entries(fp?.qubit_frequencies_GHz ?? {}).slice(0, 8);

  return (
    <div className="space-y-6" id="report-content">
      {/* Header */}
      <div className="rounded-2xl border border-accent/20 bg-accent-soft p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1">SILICOFELLER QUANTUM STUDIO</p>
        <h2 className="text-xl font-black text-slate-900">{result?.label}</h2>
        <p className="text-xs text-slate-600 mt-1">{result?.interpretation}</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Badge variant="outline" className="rounded-full text-[9px] font-bold bg-white border-slate-200">{result?.topology}</Badge>
          <Badge variant="outline" className="rounded-full text-[9px] font-bold bg-white border-slate-200">{result?.num_qubits} qubits</Badge>
          <Badge variant="outline" className={cn("rounded-full text-[9px] font-bold", result?.drc?.passed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
            DRC {result?.drc?.passed ? "PASS" : "FAIL"}
          </Badge>
          <Badge variant="outline" className="rounded-full text-[9px] font-bold bg-white border-slate-200">{result?.engine}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionBlock title="Physical Parameters">
          <Card className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <KVRow label="Qubit count"          value={result?.num_qubits ?? 0} />
            <KVRow label="Topology"             value={result?.topology ?? "—"} />
            <KVRow label="ε_eff"                value={fp?.epsilon_eff?.toFixed(4) ?? "—"} mono />
            <KVRow label="Substrate"            value={fp?.substrate ?? "silicon"} />
            <KVRow label="Metal"                value={fp?.metal ?? "aluminum"} />
            <KVRow label="DRC violations"       value={result?.drc?.violations?.length ?? 0} />
          </Card>
        </SectionBlock>

        <SectionBlock title="Frequency Plan">
          <Card className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {qEntries.map(([name, freq]) => (
              <KVRow key={name} label={name} value={`${(freq as number).toFixed(4)} GHz`} mono />
            ))}
            {Object.keys(fp?.qubit_frequencies_GHz ?? {}).length > 8 && (
              <p className="text-[10px] text-slate-400 pt-1">+{Object.keys(fp?.qubit_frequencies_GHz ?? {}).length - 8} more qubits…</p>
            )}
          </Card>
        </SectionBlock>
      </div>

      {/* DRC violations */}
      {(result?.drc?.violations?.length ?? 0) > 0 && (
        <SectionBlock title="DRC Violations">
          <div className="space-y-2">
            {result!.drc!.violations.map((v, i) => (
              <div key={i} className={cn("flex items-start gap-2 rounded-xl border p-3", v.severity === "error" ? "border-rose-200 bg-rose-50/50" : "border-amber-200 bg-amber-50/50")}>
                {v.severity === "error" ? <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />}
                <div>
                  <p className="text-[10px] font-bold text-slate-700">{v.rule}</p>
                  <p className="text-[10px] text-slate-600">{v.message}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Qiskit code preview */}
      {result?.code && (
        <SectionBlock title="Qiskit Metal Code">
          <pre className="rounded-xl bg-slate-900 text-slate-200 text-[10px] p-4 overflow-x-auto font-mono leading-relaxed max-h-48 overflow-y-auto">
            {result.code.slice(0, 800)}{result.code.length > 800 ? "\n# ... (truncated)" : ""}
          </pre>
        </SectionBlock>
      )}
    </div>
  );
}

function ReportsPage() {
  const { conversations, activeConversation } = useDesign();
  const { activeProject } = useProject();
  const [selectedType, setSelectedType]     = useState<ReportType>("design");
  const [generating,   setGenerating]       = useState(false);
  const [generated,    setGenerated]        = useState(false);
  const [tapeoutPkg,   setTapeoutPkg]       = useState<Record<string, unknown> | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const withResults = conversations.filter(c => c.result);
  const displayConv = selectedConvId
    ? conversations.find(c => c.id === selectedConvId)
    : activeConversation;
  const result = displayConv?.result;

  const handleGenerate = async () => {
    if (!result) return;
    setGenerating(true);
    setTapeoutPkg(null);

    // For tapeout: call real backend if project is active
    if (selectedType === "tapeout" && activeProject) {
      try {
        const res = await fetch(`${BACKEND}/api/tapeout/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ project_id: activeProject.id, version_tag: "v1.0", fab_notes: "" }),
        });
        if (res.ok) {
          const pkg = await res.json();
          setTapeoutPkg(pkg);
        }
      } catch {
        // Fallback to local render
      }
    }

    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1200);
  };

  const handleDownload = () => {
    if (!result) return;
    const content = buildReportText(result, selectedType);
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${displayConv?.title ?? "report"}_${selectedType}.txt`;
    a.click();
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Reports</h1>
                <p className="text-sm text-slate-500">Generate design, verification, simulation, and tapeout reports</p>
              </div>
            </div>
            {generated && result && (
              <div className="flex gap-2">
                <Button onClick={handleDownload} className="rounded-xl bg-accent text-white text-xs font-bold h-9">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download Report
                </Button>
                {tapeoutPkg && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement("a");
                      const id = (tapeoutPkg as { id?: string }).id ?? "";
                      a.href = `${BACKEND}/api/tapeout/${id}/gds`;
                      a.download = "layout.gds";
                      a.click();
                    }}
                    className="rounded-xl text-xs font-bold h-9 border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    <Package className="mr-1.5 h-3.5 w-3.5" /> Download GDS
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {withResults.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No designs to report on</p>
            <p className="text-xs text-slate-400 mt-1">Generate a chip in the Designer first.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Config panel */}
            <div className="lg:col-span-4 space-y-4">
              {/* Design selection */}
              <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-700 mb-3">Select Design</p>
                <div className="space-y-2">
                  {withResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedConvId(c.id); setGenerated(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                        (selectedConvId === c.id || (!selectedConvId && c.id === activeConversation?.id))
                          ? "border-accent bg-accent-soft"
                          : "border-slate-200 hover:border-accent/40 bg-white"
                      )}
                    >
                      <Cpu className="h-3.5 w-3.5 text-accent shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{c.title}</p>
                        <p className="text-[10px] text-slate-400">{c.result!.num_qubits}Q · {c.result!.topology}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Report type */}
              <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold text-slate-700 mb-3">Report Type</p>
                <div className="space-y-2">
                  {REPORT_TYPES.map(rt => (
                    <button
                      key={rt.id}
                      onClick={() => { setSelectedType(rt.id); setGenerated(false); }}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                        selectedType === rt.id
                          ? "border-accent bg-accent-soft shadow-sm"
                          : "border-slate-200 bg-white hover:border-accent/40 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn("h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5", rt.color)}>
                        <rt.icon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className={cn("text-xs font-bold", selectedType === rt.id ? "text-accent" : "text-slate-800")}>
                          {rt.label}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{rt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              <Button
                onClick={handleGenerate}
                disabled={generating || !result}
                className="w-full rounded-xl bg-accent text-white text-xs font-bold h-9"
              >
                {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
                Generate Report
              </Button>
            </div>

            {/* Report preview */}
            <div className="lg:col-span-8">
              {!generated ? (
                <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm h-full flex flex-col items-center justify-center">
                  <FileText className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-700">
                    {generating ? "Generating report…" : "Select a design and report type, then click Generate"}
                  </p>
                  {generating && <Loader2 className="h-5 w-5 animate-spin text-accent mt-3" />}
                </Card>
              ) : (
                <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Report header bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 bg-slate-50/60">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-rose-400" />
                        <span className="w-3 h-3 rounded-full bg-amber-400" />
                        <span className="w-3 h-3 rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 font-mono">
                        {displayConv?.title ?? "report"}_{selectedType}.pdf
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date().toLocaleString()}
                    </div>
                  </div>
                  <div className="p-5 overflow-y-auto max-h-[calc(100vh-260px)]">
                    {result && selectedType === "design" && <DesignReport result={result} />}
                    {result && selectedType === "verification" && <VerificationReport result={result} />}
                    {result && selectedType === "simulation"  && <SimulationReport result={result} />}
                    {result && selectedType === "tapeout"     && <TapeoutReport result={result} backendPkg={tapeoutPkg} />}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline sub-reports ────────────────────────────────────────────────────────

function VerificationReport({ result }: { result: any }) {
  const drc = result.drc;
  const fp  = result.frequency_plan;
  const freqs = Object.values(fp?.qubit_frequencies_GHz ?? {}) as number[];
  freqs.sort((a, b) => a - b);
  let collisions = 0;
  for (let i = 0; i < freqs.length - 1; i++) if (freqs[i + 1] - freqs[i] < 0.05) collisions++;
  const yield_est = Math.max(70, 98 - (drc?.violations?.length ?? 0) * 5 - collisions * 5);

  return (
    <div className="space-y-5" id="report-content">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">VERIFICATION REPORT</p>
        <h2 className="text-lg font-black text-slate-900">{result.label}</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "DRC Status", v: drc?.passed ? "PASS" : "FAIL", c: drc?.passed ? "text-emerald-600" : "text-rose-600" },
          { l: "Violations", v: drc?.violations?.length ?? 0, c: "text-slate-900" },
          { l: "Yield Estimate", v: `${yield_est}%`, c: yield_est >= 90 ? "text-emerald-600" : "text-amber-600" },
        ].map(s => (
          <Card key={s.l} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-[9px] font-bold uppercase text-slate-400">{s.l}</p>
            <p className={`text-xl font-black mt-1 ${s.c}`}>{s.v}</p>
          </Card>
        ))}
      </div>
      {(drc?.violations?.length ?? 0) === 0 && collisions === 0
        ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-center"><CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" /><p className="text-sm font-bold text-emerald-800">All checks passed</p></div>
        : <div className="space-y-2">{(drc?.violations ?? []).map((v: any, i: number) => (<div key={i} className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3"><AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" /><div><p className="text-[10px] font-bold text-slate-700">{v.rule}</p><p className="text-[10px] text-slate-600">{v.message}</p></div></div>))}</div>
      }
    </div>
  );
}

function SimulationReport({ result }: { result: any }) {
  const fp = result.frequency_plan;
  const sub = fp?.substrate ?? "silicon";
  const metal = fp?.metal ?? "aluminum";
  const T1 = sub === "sapphire" ? (metal === "tantalum" ? 300 : 250) : (metal === "tantalum" ? 200 : 80);
  return (
    <div className="space-y-5" id="report-content">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 mb-1">SIMULATION REPORT</p>
        <h2 className="text-lg font-black text-slate-900">{result.label}</h2>
        <p className="text-xs text-slate-600 mt-0.5">Analytical transmon physics · {sub}/{metal}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { l: "T₁ Estimate", v: `~${T1} µs`,        c: "text-emerald-600" },
          { l: "T₂ Estimate", v: `~${Math.round(T1*1.5)} µs`, c: "text-blue-600" },
          { l: "Anharmonicity",v: `~${Math.round((fp?.EC_GHz ? Object.values(fp.EC_GHz)[0] as number : 0.28) * 1000)} MHz`, c: "text-amber-600" },
          { l: "1Q Fidelity",  v: `${(100 - 50/T1).toFixed(3)}%`,  c: "text-accent" },
          { l: "2Q Fidelity",  v: `${(100 - 250/T1).toFixed(3)}%`, c: "text-slate-700" },
          { l: "ε_eff",        v: fp?.epsilon_eff?.toFixed(3) ?? "6.270", c: "text-slate-700" },
        ].map(s => (
          <Card key={s.l} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-[9px] font-bold uppercase text-slate-400">{s.l}</p>
            <p className={`text-xl font-black mt-1 ${s.c}`}>{s.v}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TapeoutReport({ result, backendPkg }: { result: any; backendPkg?: Record<string, unknown> | null }) {
  const fp = result.frequency_plan;
  const sub = fp?.substrate ?? "silicon";
  const metal = fp?.metal ?? "aluminum";
  return (
    <div className="space-y-5" id="report-content">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">TAPEOUT PACKAGE</p>
        <h2 className="text-lg font-black text-slate-900">{result.label}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-700 mb-3">Stack Specification</p>
          <div className="space-y-1">
            {[
              ["Substrate", sub],
              ["Metal layer", metal],
              ["JJ process", "Al Manhattan (Dolan bridge)"],
              ["Lithography", "E-beam (JEOL JBX-9300)"],
              ["Min feature", "200 nm"],
              ["Chip size", "7×7 mm"],
            ].map(([k, v]) => <div key={k} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0"><span className="text-slate-500">{k}</span><span className="font-bold text-slate-800">{v}</span></div>)}
          </div>
        </Card>
        <Card className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-700 mb-3">Layer Map</p>
          {[
            [1, "Base metal",       metal,            "100 nm"],
            [2, "JJ",               "Al/Al₂O₃/Al",    "30 nm"],
            [3, "Dielectric",       "SiO₂",           "200 nm"],
            [4, "Via",              metal,            "—"],
            [6, "Ground plane",     metal,            "200 nm"],
            [7, "Probe pads",       metal,            "200 nm"],
            [8, "Dicing line",      "—",              "—"],
          ].map(([n, name, mat, t]) => (
            <div key={n} className="flex justify-between text-[10px] py-0.5 border-b border-slate-50 last:border-0 font-mono">
              <span className="text-accent font-bold mr-2">{n}</span>
              <span className="text-slate-700 flex-1">{name}</span>
              <span className="text-slate-400">{t}</span>
            </div>
          ))}
        </Card>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">GDS Preview (ASCII)</p>
        <pre className="text-[9px] font-mono text-slate-600 overflow-x-auto leading-relaxed">
          {`HEADER 600\nBGNLIB\nLIBNAME ${result.label.replace(/[^A-Za-z0-9_]/g, "_")}.DB\nUNITS 0.001 1e-09\n# ${result.num_qubits} qubit pockets generated\n# Run tapeout engine for full GDS-II binary\nENDLIB`}
        </pre>
      </div>
    </div>
  );
}

function buildReportText(result: any, type: ReportType): string {
  const fp = result.frequency_plan;
  const lines = [
    "SILICOFELLER QUANTUM STUDIO — REPORT",
    "=====================================",
    `Type: ${type.toUpperCase()}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    `Design: ${result.label}`,
    `Qubits: ${result.num_qubits}`,
    `Topology: ${result.topology}`,
    `Engine: ${result.engine}`,
    `DRC: ${result.drc?.passed ? "PASS" : "FAIL"}`,
    "",
    "FREQUENCY PLAN",
    "--------------",
    ...Object.entries(fp?.qubit_frequencies_GHz ?? {}).map(([n, f]) => `${n}: ${(f as number).toFixed(4)} GHz`),
    "",
    type === "design" ? `QISKIT CODE\n-----------\n${result.code ?? "N/A"}` : "",
  ];
  return lines.join("\n");
}
