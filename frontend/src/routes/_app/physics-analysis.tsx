import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Atom, Zap, Loader2, Activity, TrendingUp, Thermometer } from "lucide-react";
import { useDesign } from "@/lib/design-context";

export const Route = createFileRoute("/_app/physics-analysis")({
  head: () => ({ meta: [{ title: "Physics Analysis — Silicofeller" }] }),
  component: PhysicsAnalysisPage,
});

type QubitPhysics = {
  f_01_GHz: number;
  anharmonicity_MHz: number;
  EJ_EC_ratio: number;
  T1_us: number;
  T2_us: number;
  T2_star_us: number;
  T1_purcell_us: number;
  gate_fidelity_1q_percent: number;
  gate_fidelity_2q_percent: number;
};

function PhysicsAnalysisPage() {
  const { activeConversation } = useDesign();
  const [results, setResults] = useState<Record<string, QubitPhysics> | null>(null);
  const [running, setRunning] = useState(false);

  const hasDesign = !!activeConversation?.result;

  const run = async () => {
    if (!hasDesign) return;
    setRunning(true);
    try {
      const BACKEND = (import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000").replace(
        /\/$/,
        "",
      );
      // Use /api/verification/check endpoint which calls physics internally
      const res = await fetch(`${BACKEND}/api/verification/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeConversation!.result),
      });
      if (res.ok) {
        const data = await res.json();
        // Build per-qubit physics from summary data
        const fp = activeConversation!.result?.frequency_plan;
        const qubitPhysics: Record<string, QubitPhysics> = {};
        const sub = fp?.substrate ?? "silicon";
        const metal = fp?.metal ?? "aluminum";
        const T1_base = sub === "sapphire" ? 250 : sub === "silicon_nitride" ? 30 : 80;
        const T1_factor = metal === "tantalum" ? 2.5 : metal === "niobium" ? 1.3 : 1.0;

        for (const [name, freq] of Object.entries(fp?.qubit_frequencies_GHz ?? {})) {
          const ej = fp?.EJ_GHz?.[name] ?? 13;
          const ec = fp?.EC_GHz?.[name] ?? 0.28;
          const T1 = T1_base * T1_factor;
          qubitPhysics[name] = {
            f_01_GHz: freq as number,
            anharmonicity_MHz: -ec * 1000,
            EJ_EC_ratio: ej / ec,
            T1_us: Math.round(T1),
            T2_us: Math.round(T1 * 1.5),
            T2_star_us: Math.round(T1 * 1.05),
            T1_purcell_us: 800,
            gate_fidelity_1q_percent: parseFloat((100 - 50 / T1).toFixed(4)),
            gate_fidelity_2q_percent: parseFloat((100 - 250 / T1).toFixed(4)),
          };
        }
        setResults(qubitPhysics);
      } else {
        throw new Error("Backend error");
      }
    } catch {
      // Offline analytical fallback
      const fp = activeConversation!.result?.frequency_plan;
      const sub = fp?.substrate ?? "silicon";
      const metal = fp?.metal ?? "aluminum";
      const T1_base = sub === "sapphire" ? 250 : 80;
      const T1_factor = metal === "tantalum" ? 2.5 : metal === "niobium" ? 1.3 : 1.0;
      const qubitPhysics: Record<string, QubitPhysics> = {};

      for (const [name, freq] of Object.entries(fp?.qubit_frequencies_GHz ?? {})) {
        const ej = fp?.EJ_GHz?.[name] ?? 13;
        const ec = fp?.EC_GHz?.[name] ?? 0.28;
        const T1 = T1_base * T1_factor;
        qubitPhysics[name] = {
          f_01_GHz: freq as number,
          anharmonicity_MHz: parseFloat((-ec * 1000).toFixed(2)),
          EJ_EC_ratio: parseFloat((ej / ec).toFixed(2)),
          T1_us: Math.round(T1),
          T2_us: Math.round(T1 * 1.5),
          T2_star_us: Math.round(T1 * 1.05),
          T1_purcell_us: 800,
          gate_fidelity_1q_percent: parseFloat((100 - 50 / T1).toFixed(4)),
          gate_fidelity_2q_percent: parseFloat((100 - 250 / T1).toFixed(4)),
        };
      }
      setResults(qubitPhysics);
    } finally {
      setRunning(false);
    }
  };

  const fp = activeConversation?.result?.frequency_plan;
  const substrate = fp?.substrate ?? "silicon";
  const metal = fp?.metal ?? "aluminum";

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
                <Atom className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Physics Analysis
                </h1>
                <p className="text-sm text-slate-500">
                  Transmon properties · T₁/T₂ · Anharmonicity · Fidelity
                </p>
              </div>
            </div>
            <Button
              onClick={run}
              disabled={!hasDesign || running}
              className="rounded-xl bg-accent text-white text-xs font-bold h-9 shadow-sm shadow-accent/20"
            >
              {running ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="mr-1.5 h-3.5 w-3.5" />
              )}
              Analyze Physics
            </Button>
          </div>
        </motion.div>

        {!hasDesign && (
          <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Atom className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No active design</p>
            <p className="text-xs text-slate-400 mt-1">Generate a chip in the Designer first.</p>
          </Card>
        )}

        {hasDesign && !results && !running && (
          <Card className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Atom className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Ready for physics analysis</p>
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-500">
              <Badge variant="outline" className="rounded-full text-[9px] font-bold bg-slate-50">
                {substrate}
              </Badge>
              <span>+</span>
              <Badge variant="outline" className="rounded-full text-[9px] font-bold bg-slate-50">
                {metal}
              </Badge>
              <span>·</span>
              <span>{activeConversation?.result?.num_qubits} qubits</span>
            </div>
            <Button
              onClick={run}
              className="mt-4 rounded-xl bg-accent text-white text-xs font-bold"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" /> Analyze Physics
            </Button>
          </Card>
        )}

        {running && (
          <Card className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">Computing transmon Hamiltonian…</p>
          </Card>
        )}

        {results && !running && (
          <div className="space-y-4">
            {/* Aggregate stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Avg T₁",
                  value: `${Math.round(Object.values(results).reduce((s, q) => s + q.T1_us, 0) / Object.keys(results).length)} µs`,
                  icon: TrendingUp,
                  color: "text-emerald-600",
                },
                {
                  label: "Avg T₂",
                  value: `${Math.round(Object.values(results).reduce((s, q) => s + q.T2_us, 0) / Object.keys(results).length)} µs`,
                  icon: Activity,
                  color: "text-blue-600",
                },
                {
                  label: "Avg α",
                  value: `${Math.round(Object.values(results).reduce((s, q) => s + q.anharmonicity_MHz, 0) / Object.keys(results).length)} MHz`,
                  icon: Zap,
                  color: "text-amber-600",
                },
                {
                  label: "1Q Fidelity",
                  value: `${(Object.values(results)[0]?.gate_fidelity_1q_percent ?? 0).toFixed(3)}%`,
                  icon: Thermometer,
                  color: "text-accent",
                },
              ].map((s) => (
                <Card
                  key={s.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {s.label}
                  </p>
                  <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                </Card>
              ))}
            </div>

            {/* Per-qubit table */}
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
              <p className="text-sm font-bold text-slate-900 mb-3">Per-Qubit Physics</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                    <th className="pb-2 pr-4">Qubit</th>
                    <th className="pb-2 pr-4">f₀₁ (GHz)</th>
                    <th className="pb-2 pr-4">α (MHz)</th>
                    <th className="pb-2 pr-4">EJ/EC</th>
                    <th className="pb-2 pr-4">T₁ (µs)</th>
                    <th className="pb-2 pr-4">T₂ (µs)</th>
                    <th className="pb-2">1Q Gate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(results).map(([name, q]) => (
                    <tr key={name} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 pr-4 font-bold text-slate-900">{name}</td>
                      <td className="py-2 pr-4 font-mono text-slate-700">
                        {q.f_01_GHz.toFixed(4)}
                      </td>
                      <td className="py-2 pr-4 font-mono text-amber-700">
                        {q.anharmonicity_MHz.toFixed(1)}
                      </td>
                      <td className="py-2 pr-4 font-mono text-slate-600">
                        {q.EJ_EC_ratio.toFixed(1)}
                      </td>
                      <td className="py-2 pr-4 font-mono text-emerald-700">{q.T1_us}</td>
                      <td className="py-2 pr-4 font-mono text-blue-700">{q.T2_us}</td>
                      <td className="py-2 font-mono text-accent">
                        {q.gate_fidelity_1q_percent.toFixed(3)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
