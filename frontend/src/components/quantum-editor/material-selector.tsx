/**
 * MaterialSelector — substrate + metal picker for quantum chip design.
 * Shows dielectric properties (ε_r, loss tangent) and superconductor
 * properties (Tc, coherence benefit) to guide material choice.
 */

import { useEffect, useState } from "react";
import { fetchMaterials, type Material } from "@/lib/api/backend";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Atom, Layers, Zap, Thermometer, AlertTriangle } from "lucide-react";

interface MaterialSelectorProps {
  substrate: string;
  metal: string;
  onSubstrateChange: (key: string) => void;
  onMetalChange: (key: string) => void;
  compact?: boolean;
}

const COHERENCE_BADGE: Record<string, { label: string; color: string }> = {
  silicon: { label: "Standard", color: "bg-slate-100 text-slate-600 border-slate-200" },
  sapphire: { label: "Best", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  silicon_nitride: { label: "KID/SNAIL", color: "bg-blue-50 text-blue-700 border-blue-200" },
  aluminum: { label: "T1 ~80 µs", color: "bg-amber-50 text-amber-700 border-amber-200" },
  niobium: { label: "T1 ~120 µs", color: "bg-violet-50 text-violet-700 border-violet-200" },
  tantalum: { label: "T1 ~300 µs ✦", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  nbtin: { label: "High KI", color: "bg-blue-50 text-blue-700 border-blue-200" },
};

const SUBSTRATE_ICONS: Record<string, string> = {
  silicon: "🔷",
  sapphire: "💎",
  silicon_nitride: "🔬",
};

const METAL_ICONS: Record<string, string> = {
  aluminum: "⚙️",
  niobium: "🔵",
  tantalum: "⭐",
  nbtin: "🌀",
};

export function MaterialSelector({
  substrate,
  metal,
  onSubstrateChange,
  onMetalChange,
  compact = false,
}: MaterialSelectorProps) {
  const [substrates, setSubstrates] = useState<Material[]>([]);
  const [metals, setMetals] = useState<Material[]>([]);

  useEffect(() => {
    fetchMaterials().then(({ substrates: subs, metals: mets }) => {
      setSubstrates(Object.values(subs));
      setMetals(Object.values(mets));
    });
  }, []);

  // Warn about known incompatibilities
  const hasWarning = substrate === "silicon_nitride" && metal === "tantalum";

  return (
    <div className="space-y-4">
      {/* Substrate selection */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Substrate
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {substrates.map((s) => (
            <button
              key={s.key}
              onClick={() => onSubstrateChange(s.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer",
                substrate === s.key
                  ? "border-accent bg-accent-soft shadow-sm shadow-accent/10"
                  : "border-slate-200 bg-white hover:border-accent/40 hover:bg-slate-50",
              )}
            >
              <span className="text-lg leading-none mt-0.5">{SUBSTRATE_ICONS[s.key] ?? "🔬"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs font-bold",
                      substrate === s.key ? "text-accent" : "text-slate-800",
                    )}
                  >
                    {s.label}
                  </span>
                  {COHERENCE_BADGE[s.key] && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 shrink-0 rounded-full",
                        COHERENCE_BADGE[s.key].color,
                      )}
                    >
                      {COHERENCE_BADGE[s.key].label}
                    </Badge>
                  )}
                </div>
                {!compact && (
                  <>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {s.description}
                    </p>
                    <div className="flex gap-3 mt-1.5">
                      {s.epsilon_r != null && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                          ε_r = {s.epsilon_r}
                        </span>
                      )}
                      {s.loss_tangent != null && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                          tan δ = {s.loss_tangent?.toExponential(0)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Metal selection */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Atom className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Metal Layer
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {metals.map((m) => (
            <button
              key={m.key}
              onClick={() => onMetalChange(m.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer",
                metal === m.key
                  ? "border-accent bg-accent-soft shadow-sm shadow-accent/10"
                  : "border-slate-200 bg-white hover:border-accent/40 hover:bg-slate-50",
              )}
            >
              <span className="text-lg leading-none mt-0.5">{METAL_ICONS[m.key] ?? "⚙️"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs font-bold",
                      metal === m.key ? "text-accent" : "text-slate-800",
                    )}
                  >
                    {m.label}
                  </span>
                  {COHERENCE_BADGE[m.key] && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 shrink-0 rounded-full",
                        COHERENCE_BADGE[m.key].color,
                      )}
                    >
                      {COHERENCE_BADGE[m.key].label}
                    </Badge>
                  )}
                </div>
                {!compact && (
                  <>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {m.description}
                    </p>
                    <div className="flex gap-3 mt-1.5">
                      {m.Tc_K != null && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-1.5 py-0.5 flex items-center gap-1">
                          <Thermometer className="h-2.5 w-2.5" /> Tc = {m.Tc_K} K
                        </span>
                      )}
                      {m.london_penetration_depth_nm != null && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">
                          λ_L = {m.london_penetration_depth_nm} nm
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Compatibility warning */}
      {hasWarning && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[10px] font-semibold text-amber-800">
            Tantalum on SiN requires an adhesion layer (5 nm Ti or TiN). Check process
            compatibility.
          </p>
        </div>
      )}

      {/* Summary chip */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <Zap className="h-3 w-3" /> Selected Stack
        </p>
        <div className="flex gap-2 flex-wrap">
          <span className="text-[11px] font-black text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm">
            {SUBSTRATE_ICONS[substrate] ?? "🔬"}{" "}
            {substrates.find((s) => s.key === substrate)?.label ?? substrate}
          </span>
          <span className="text-[11px] font-bold text-slate-400">+</span>
          <span className="text-[11px] font-black text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm">
            {METAL_ICONS[metal] ?? "⚙️"} {metals.find((m) => m.key === metal)?.label ?? metal}
          </span>
        </div>
      </div>
    </div>
  );
}
