import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Library, Search, Copy, Check, X, Cpu, Zap, Cable, Radio, Plug, Box, Hexagon, Layers, ExternalLink,
} from "lucide-react";
import {
  QISKIT_CATALOG,
  QISKIT_CATEGORY_ORDER,
  QISKIT_CATEGORY_LABEL,
  pythonSnippet,
  type QiskitCategory,
  type QiskitComponent,
} from "@/components/quantum-editor/qiskit-metal-catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/component-library")({
  head: () => ({ meta: [{ title: "Component Library — Silicofeller" }] }),
  component: ComponentLibraryPage,
});

const CAT_ICON: Record<QiskitCategory, React.ComponentType<{ className?: string }>> = {
  qubits: Cpu,
  couplers: Zap,
  tlines: Cable,
  resonators: Radio,
  terminations: Plug,
  lumped: Layers,
  "sample shapes": Hexagon,
};

const CAT_TINT: Record<QiskitCategory, string> = {
  qubits: "text-amber-600 bg-amber-50 border-amber-200",
  couplers: "text-emerald-600 bg-emerald-50 border-emerald-200",
  tlines: "text-blue-600 bg-blue-50 border-blue-200",
  resonators: "text-violet-600 bg-violet-50 border-violet-200",
  terminations: "text-slate-600 bg-slate-100 border-slate-200",
  lumped: "text-rose-600 bg-rose-50 border-rose-200",
  "sample shapes": "text-cyan-600 bg-cyan-50 border-cyan-200",
};

function ComponentLibraryPage() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<QiskitCategory | "all">("all");
  const [selected, setSelected] = useState<QiskitComponent | null>(null);

  const countsByCat = useMemo(() => {
    const m: Record<string, number> = { all: QISKIT_CATALOG.length };
    QISKIT_CATEGORY_ORDER.forEach((c) => (m[c] = 0));
    QISKIT_CATALOG.forEach((c) => (m[c.category] += 1));
    return m;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return QISKIT_CATALOG.filter((c) => {
      if (activeCat !== "all" && c.category !== activeCat) return false;
      if (!q) return true;
      return (
        c.label.toLowerCase().includes(q) ||
        c.className.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)) ||
        Object.keys(c.defaultParams).some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [search, activeCat]);

  return (
    <div className="h-full w-full bg-[#F8F9FB] flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
            <Library className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black tracking-tight text-slate-900">Component Library</h1>
            <p className="text-xs text-slate-500">
              {QISKIT_CATALOG.length} Qiskit Metal components · sourced from the official QComponent gallery
            </p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search components, parameters, classes…"
              className="pl-8 rounded-xl text-xs h-9 border-slate-200"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar rail */}
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-3 overflow-y-auto scrollbar-hide">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Categories</p>
          <CategoryRailButton
            label="All components"
            count={countsByCat.all}
            active={activeCat === "all"}
            onClick={() => setActiveCat("all")}
            icon={Box}
            tint="text-slate-700 bg-slate-100 border-slate-200"
          />
          {QISKIT_CATEGORY_ORDER.map((cat) => (
            <CategoryRailButton
              key={cat}
              label={QISKIT_CATEGORY_LABEL[cat]}
              count={countsByCat[cat] ?? 0}
              active={activeCat === cat}
              onClick={() => setActiveCat(cat)}
              icon={CAT_ICON[cat]}
              tint={CAT_TINT[cat]}
            />
          ))}
        </aside>

        {/* Grid */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500">
              {filtered.length} component{filtered.length !== 1 ? "s" : ""}
              {activeCat !== "all" ? ` in ${QISKIT_CATEGORY_LABEL[activeCat]}` : ""}
              {search ? ` matching "${search}"` : ""}
            </p>
          </div>
          {filtered.length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm font-bold text-slate-700">No components match your filters.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <ComponentTile
                  key={c.className}
                  c={c}
                  active={selected?.className === c.className}
                  onSelect={() => setSelected(c)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.aside
              key={selected.className}
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="w-[380px] shrink-0 border-l border-slate-200 bg-white overflow-y-auto scrollbar-hide"
            >
              <DetailPanel c={selected} onClose={() => setSelected(null)} />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CategoryRailButton({
  label, count, active, onClick, icon: Icon, tint,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-semibold transition-colors mb-1",
        active ? "bg-accent-soft text-accent" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <span className={cn("h-7 w-7 rounded-lg border flex items-center justify-center shrink-0", tint)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 truncate">{label}</span>
      <Badge variant="outline" className="rounded-full text-[9px] font-bold px-1.5 py-0 bg-white border-slate-200">
        {count}
      </Badge>
    </button>
  );
}

function ComponentTile({
  c, active, onSelect,
}: { c: QiskitComponent; active: boolean; onSelect: () => void }) {
  const Icon = CAT_ICON[c.category];
  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={cn(
        "text-left rounded-2xl border bg-white overflow-hidden transition-all shadow-sm hover:shadow-md",
        active ? "border-accent ring-2 ring-accent/30" : "border-slate-200",
      )}
    >
      <div className="aspect-[4/3] bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4 overflow-hidden">
        <img
          src={c.image}
          alt={c.label}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2">
          <span className={cn("h-6 w-6 shrink-0 rounded-md border flex items-center justify-center", CAT_TINT[c.category])}>
            <Icon className="h-3 w-3" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 truncate">{c.label}</p>
            <p className="text-[10px] font-mono text-slate-500 truncate">{c.className}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-600 mt-2 line-clamp-2">{c.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {c.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[9px] font-mono bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.button>
  );
}

function DetailPanel({ c, onClose }: { c: QiskitComponent; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const Icon = CAT_ICON[c.category];
  const snippet = pythonSnippet(c);
  const copy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-3 flex items-center gap-2">
        <span className={cn("h-7 w-7 rounded-lg border flex items-center justify-center", CAT_TINT[c.category])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{c.label}</p>
          <p className="text-[10px] font-mono text-slate-500 truncate">{QISKIT_CATEGORY_LABEL[c.category]}</p>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-5">
        <div className="aspect-[4/3] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-4 overflow-hidden">
          <img
            src={c.image}
            alt={c.label}
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <section>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</p>
          <p className="text-xs text-slate-700 leading-relaxed">{c.description}</p>
        </section>

        <section>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Qiskit Metal Class</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-mono font-bold text-slate-900">{c.className}</p>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5 break-all">{c.modulePath}</p>
          </div>
        </section>

        {c.pins.length > 0 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Pins · {c.pins.length}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {c.pins.map((p) => (
                <span key={p} className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 rounded px-2 py-0.5 border border-slate-200">
                  {p}
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Default Parameters</p>
          <table className="w-full text-[11px]">
            <tbody>
              {Object.entries(c.defaultParams).map(([k, v]) => (
                <tr key={k} className="border-b border-slate-50">
                  <td className="py-1 pr-3 font-mono text-slate-600">{k}</td>
                  <td className="py-1 font-mono text-accent text-right">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Python snippet</p>
            <button
              onClick={copy}
              className="h-7 px-2 rounded-lg border border-slate-200 flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-accent hover:border-accent/40 transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="text-[10px] bg-slate-900 text-slate-200 rounded-xl p-3 overflow-x-auto font-mono leading-relaxed whitespace-pre">
{snippet}
          </pre>
        </section>

        <section className="flex items-center gap-2">
          <Button asChild size="sm" className="flex-1 rounded-xl">
            <Link to="/schematic-editor">Use in editor</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <a
              href="https://qiskit-community.github.io/qiskit-metal/apidocs/qlibrary.html"
              target="_blank"
              rel="noreferrer"
            >
              Docs <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </section>
      </div>
    </div>
  );
}