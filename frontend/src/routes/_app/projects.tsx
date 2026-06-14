import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Cpu, Search, Trash2, MoreHorizontal, FolderOpen,
  FlaskConical, Layers, Calendar, ArrowRight, Loader2,
  Sparkles, CircuitBoard, CheckCircle2, Clock, Network,
  Edit3, Check, X, Save, AlertTriangle, Upload, BookOpen, FileCode,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteProject, updateProject, fetchSimulations, createProject, type Project } from "@/lib/api/backend";
import { useProject } from "@/lib/project-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects")({
  head: () => ({ meta: [{ title: "Projects — Silicofeller" }] }),
  component: ProjectsPage,
});

const TOPOLOGY_OPTIONS = ["custom", "heavy-hex", "surface-code", "grid", "ring", "chain", "star", "all-to-all"];

// ── Chip Templates ────────────────────────────────────────────────────────────

interface Template {
  name: string;
  topology: string;
  num_qubits: number;
  target_frequency_ghz: number;
  substrate_material: string;
  metal_layer: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    name: "IBM Falcon 27Q",
    topology: "heavy-hex",
    num_qubits: 27,
    target_frequency_ghz: 5.0,
    substrate_material: "silicon",
    metal_layer: "aluminum",
    description: "Standard IBM Falcon-like superconducting heavy-hex lattice layout.",
  },
  {
    name: "Google Sycamore 53Q",
    topology: "grid",
    num_qubits: 53,
    target_frequency_ghz: 6.0,
    substrate_material: "sapphire",
    metal_layer: "aluminum",
    description: "Two-dimensional rectangular grid superconducting qubit layout.",
  },
  {
    name: "Surface Code 49Q",
    topology: "surface-code",
    num_qubits: 49,
    target_frequency_ghz: 4.8,
    substrate_material: "silicon",
    metal_layer: "tantalum",
    description: "Square planar lattice topology optimized for surface code error correction.",
  },
  {
    name: "Fluxonium Ring 8Q",
    topology: "ring",
    num_qubits: 8,
    target_frequency_ghz: 4.0,
    substrate_material: "sapphire",
    metal_layer: "niobium",
    description: "Loop-coupled transmon/fluxonium chain forming a closed ring topology.",
  },
];

// ── Qubit Layout Thumbnail Preview ────────────────────────────────────────────

function ChipSchematicMini({ topology, numQubits }: { topology: string; numQubits: number }) {
  const positions: { id: string; x: number; y: number }[] = [];
  const n = Math.min(Math.max(numQubits, 1), 24); // Cap visualization nodes
  const topo = (topology || "grid").toLowerCase();

  if (topo === "chain" || topo === "linear") {
    for (let i = 0; i < n; i++) {
      positions.push({ id: `Q${i + 1}`, x: 20 + i * (220 / Math.max(n - 1, 1)), y: 60 });
    }
  } else if (topo === "ring") {
    const r = 35;
    const cx = 130, cy = 60;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n;
      positions.push({
        id: `Q${i + 1}`,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
  } else if (topo === "heavy-hex" || topo === "heavy_hex") {
    const cols = 6;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const offset = r % 2 === 0 ? 0 : 15;
      positions.push({ id: `Q${i + 1}`, x: 30 + c * 35 + offset, y: 25 + r * 25 });
    }
  } else {
    // Default grid
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      positions.push({
        id: `Q${i + 1}`,
        x: 30 + c * (200 / Math.max(cols - 1, 1)),
        y: 25 + r * (70 / Math.max(rows - 1, 1)),
      });
    }
  }

  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const maxDist = topo === "chain" ? 240 / n + 10 : topo === "ring" ? (2 * Math.PI * 35) / n + 10 : 45;

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p = positions[i];
      const q = positions[j];
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      if (dist <= maxDist) {
        edges.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
      }
    }
  }

  return (
    <svg viewBox="0 0 260 120" className="w-full h-full bg-slate-50/70">
      <defs>
        <pattern id="gridPattern" width="15" height="15" patternUnits="userSpaceOnUse">
          <path d="M 15 0 L 0 0 0 15" fill="none" stroke="rgba(15,23,42,0.03)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gridPattern)" />
      
      {edges.map((e, idx) => (
        <line
          key={idx}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke="#7C3AED"
          strokeWidth="1.2"
          strokeDasharray="2,2"
          opacity="0.5"
        />
      ))}
      {positions.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r="5.5" fill="#fff" stroke="#7C3AED" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

// ── Create custom project modal ───────────────────────────────────────────────

function CreateModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: Parameters<ReturnType<typeof useProject>["createAndActivate"]>[0]) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [topology, setTopology] = useState("heavy-hex");
  const [qubits, setQubits] = useState("27");
  const [freq, setFreq] = useState("5.0");
  const [substrate, setSubstrate] = useState("silicon");
  const [metal, setMetal] = useState("aluminum");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onCreate({
      name: name.trim(),
      topology,
      num_qubits: parseInt(qubits) || 0,
      target_frequency_ghz: parseFloat(freq) || 5.0,
      substrate_material: substrate,
      metal_layer: metal,
    });
    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-100"
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">New Project</h2>
                <p className="text-xs text-slate-500">Define your quantum chip parameters</p>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Project Name *</p>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. IBM_Style_64Q"
              className="rounded-xl text-sm border-slate-200"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Topology</p>
              <Select value={topology} onValueChange={setTopology}>
                <SelectTrigger className="rounded-xl text-xs h-9 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPOLOGY_OPTIONS.map(t => (
                    <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace("-", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target Qubits</p>
              <Input value={qubits} onChange={e => setQubits(e.target.value)} type="number" min={1} max={512} className="rounded-xl text-xs h-9 border-slate-200" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target Freq (GHz)</p>
              <Input value={freq} onChange={e => setFreq(e.target.value)} type="number" step={0.1} className="rounded-xl text-xs h-9 border-slate-200" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Technology</p>
              <Select value={substrate} onValueChange={setSubstrate}>
                <SelectTrigger className="rounded-xl text-xs h-9 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="silicon" className="text-xs">Silicon</SelectItem>
                  <SelectItem value="sapphire" className="text-xs">Sapphire</SelectItem>
                  <SelectItem value="silicon_nitride" className="text-xs">SiN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Metal Layer</p>
            <Select value={metal} onValueChange={setMetal}>
              <SelectTrigger className="rounded-xl text-xs h-9 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aluminum"  className="text-xs">Aluminum (Al) — Standard</SelectItem>
                <SelectItem value="niobium"   className="text-xs">Niobium (Nb) — High Tc</SelectItem>
                <SelectItem value="tantalum"  className="text-xs">Tantalum (Ta) — Best T₁</SelectItem>
                <SelectItem value="nbtin"     className="text-xs">NbTiN — High KI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl text-sm font-bold h-10">Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="flex-1 rounded-xl bg-accent text-white text-sm font-bold h-10"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Create Project
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Templates Modal ──────────────────────────────────────────────────────────

function TemplatesModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: Parameters<ReturnType<typeof useProject>["createAndActivate"]>[0]) => Promise<unknown>;
}) {
  const [creating, setCreating] = useState<string | null>(null);

  const handleSelect = async (tpl: Template) => {
    setCreating(tpl.name);
    try {
      await onCreate({
        name: tpl.name,
        topology: tpl.topology,
        num_qubits: tpl.num_qubits,
        target_frequency_ghz: tpl.target_frequency_ghz,
        substrate_material: tpl.substrate_material,
        metal_layer: tpl.metal_layer,
      });
      toast.success(`Created project from template: ${tpl.name}`);
      onClose();
    } catch {
      toast.error("Failed to create project from template");
    } finally {
      setCreating(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-100"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Quantum QPU Templates</h2>
              <p className="text-xs text-slate-500 font-semibold">Select a predefined architecture to instantiate instantly</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto bg-slate-50/30">
          {TEMPLATES.map(tpl => (
            <div
              key={tpl.name}
              className="border border-slate-200 rounded-2xl p-4 bg-white hover:border-accent hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
              onClick={() => !creating && handleSelect(tpl)}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-accent transition-colors">{tpl.name}</h3>
                  <Badge className="bg-slate-50 text-slate-600 border border-slate-200 capitalize text-[9px] font-bold">
                    {tpl.topology.replace("-", " ")}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal mb-3">{tpl.description}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-400 font-medium">
                  <div>Qubits: <span className="text-slate-700 font-bold">{tpl.num_qubits}</span></div>
                  <div>Freq: <span className="text-slate-700 font-bold">{tpl.target_frequency_ghz} GHz</span></div>
                  <div>Substrate: <span className="text-slate-700 font-bold capitalize">{tpl.substrate_material}</span></div>
                  <div>Metal: <span className="text-slate-700 font-bold capitalize">{tpl.metal_layer}</span></div>
                </div>
              </div>
              <Button
                disabled={creating !== null}
                className="w-full mt-4 rounded-xl text-xs font-bold h-8 bg-slate-50 text-slate-700 group-hover:bg-accent group-hover:text-white transition-colors"
              >
                {creating === tpl.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Instantiate Template"}
              </Button>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({ project, isActive, onActivate, onDelete, onEdit, onDuplicate, simulationsCount }: {
  project: Project;
  isActive: boolean;
  onActivate: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  simulationsCount: number;
}) {
  const navigate = useNavigate();

  const openRoute = (routePath: string) => {
    onActivate();
    navigate({ to: routePath });
  };

  const isSuperconducting = project.substrate_material === "silicon" || project.substrate_material === "sapphire" || project.substrate_material === "silicon_nitride";
  const techLabel = isSuperconducting ? "Superconducting" : "Semiconductor Spin";

  // Health Status Badge
  let HealthIcon = Clock;
  let healthLabel = "Verification Pending";
  let healthColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
  if (project.status === "completed" || project.status === "released") {
    HealthIcon = CheckCircle2;
    healthLabel = "Verified";
    healthColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  } else if (project.status === "failed") {
    HealthIcon = AlertTriangle;
    healthLabel = "Failed";
    healthColor = "bg-rose-500/10 text-rose-500 border-rose-500/20";
  }

  return (
    <Card className={cn(
      "rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all duration-200 group overflow-hidden flex flex-col justify-between h-full cursor-pointer",
      isActive ? "border-accent ring-1 ring-accent/20" : "border-slate-200"
    )}
    onClick={() => openRoute("/schematic-editor")}>
      <div>
        {/* Layout Preview Thumbnail with overlay badges */}
        <div className="h-[120px] w-full overflow-hidden border-b border-slate-100 relative bg-slate-50/50">
          <ChipSchematicMini topology={project.topology} numQubits={project.num_qubits} />
          
          {/* Active status badge */}
          {isActive && (
            <div className="absolute top-2 left-2 z-10">
              <Badge className="bg-accent text-white border-0 rounded-full text-[9px] font-black px-2 py-0.5 shadow-sm">
                ACTIVE
              </Badge>
            </div>
          )}

          {/* Health Status badge */}
          <div className="absolute top-2 right-2 z-10">
            <Badge className={cn("rounded-full text-[9px] font-bold px-2 py-0.5 border shadow-sm flex items-center gap-1", healthColor)}>
              <HealthIcon className="h-2.5 w-2.5" />
              {healthLabel}
            </Badge>
          </div>
        </div>

        <div className="p-4" onClick={(e) => e.stopPropagation()}>
          {/* QPU Header with Dropdown Action Trigger */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight group-hover:text-accent transition-colors">
                {project.name}
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5 capitalize">
                {project.topology.replace("-", " ")} QPU
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl w-44">
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={onActivate}>
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-slate-400" /> Set as Active
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={onDuplicate}>
                  <Save className="mr-2 h-3.5 w-3.5 text-slate-400" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={onEdit}>
                  <Edit3 className="mr-2 h-3.5 w-3.5 text-slate-400" /> Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs text-rose-600 cursor-pointer" onClick={onDelete}>
                  <Trash2 className="mr-2 h-3.5 w-3.5 text-slate-400" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Specifications list */}
          <div className="space-y-1.5 text-[11px] border-b border-slate-100 pb-3 mb-3">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Technology</span>
              <span className="font-bold text-slate-800">{techLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Topology</span>
              <span className="font-bold text-slate-800 capitalize">{project.topology.replace("-", " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Qubits</span>
              <span className="font-bold text-slate-800">{project.num_qubits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Frequency</span>
              <span className="font-bold text-slate-800">{project.target_frequency_ghz} GHz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Version</span>
              <span className="font-bold text-slate-800">v1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Status</span>
              <span className="font-bold text-slate-800 capitalize">{project.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Updated</span>
              <span className="font-semibold text-slate-600">
                {new Date(project.updated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-1.5 text-[11px] font-semibold text-slate-700">
            <div className="flex justify-between items-center">
              <span>Schematic</span>
              <span className={project.num_qubits > 0 ? "text-emerald-600 font-bold" : "text-slate-300 font-bold"}>
                {project.num_qubits > 0 ? "✓" : "○"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Layout</span>
              <span className={project.has_design ? "text-emerald-600 font-bold" : "text-slate-300 font-bold"}>
                {project.has_design ? "✓" : "○"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Verification</span>
              <span className={project.status === "completed" ? "text-emerald-600 font-bold" : "text-slate-300 font-bold"}>
                {project.status === "completed" ? "✓" : "○"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Simulation</span>
              <span className={simulationsCount > 0 ? "text-emerald-600 font-bold" : "text-slate-300 font-bold"}>
                {simulationsCount > 0 ? "✓" : "○"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Action Buttons: Overview | Schematic | Layout */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-100">
          <button
            onClick={() => openRoute("/designer")}
            className="flex items-center justify-center rounded-lg bg-slate-50 text-[10px] font-bold text-slate-600 hover:bg-accent hover:text-white border border-slate-200/60 py-1.5 transition-colors cursor-pointer"
            title="Open Overview"
          >
            Overview
          </button>
          <button
            onClick={() => openRoute("/schematic-editor")}
            className="flex items-center justify-center rounded-lg bg-slate-50 text-[10px] font-bold text-slate-600 hover:bg-accent hover:text-white border border-slate-200/60 py-1.5 transition-colors cursor-pointer"
            title="Open Schematic Editor"
          >
            Schematic
          </button>
          <button
            onClick={() => openRoute("/layout-viewer")}
            className="flex items-center justify-center rounded-lg bg-slate-50 text-[10px] font-bold text-slate-600 hover:bg-accent hover:text-white border border-slate-200/60 py-1.5 transition-colors cursor-pointer"
            title="Open Layout Editor"
          >
            Layout
          </button>
        </div>
      </div>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ProjectsPage() {
  const { projects, activeProject, setActiveProject, refreshProjects, createAndActivate, backendOnline } = useProject();
  const [search, setSearch] = useState("");
  const [filterTech, setFilterTech] = useState("all");
  const [filterTopology, setFilterTopology] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSimulations()
      .then((data) => setSimulations(data))
      .catch(() => {});
  }, [projects]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await deleteProject(id);
      toast.success("Project deleted successfully");
      await refreshProjects();
    } catch {
      toast.error("Failed to delete project. Backend may be offline.");
    }
  };

  const handleDuplicate = async (p: Project) => {
    try {
      await createProject({
        name: `${p.name} (Copy)`,
        description: p.description,
        topology: p.topology,
        num_qubits: p.num_qubits,
        target_frequency_ghz: p.target_frequency_ghz,
        substrate_material: p.substrate_material,
        metal_layer: p.metal_layer,
      });
      toast.success(`Duplicated ${p.name} successfully`);
      await refreshProjects();
    } catch {
      toast.error("Failed to duplicate project");
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateProject(id, { name: editName.trim() } as never);
      toast.success("Project renamed successfully");
      await refreshProjects();
    } catch {
      toast.error("Failed to rename project");
    }
    setEditingId(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (!parsed.name) {
          toast.error("Import failed: JSON must contain a 'name' field");
          return;
        }

        await createAndActivate({
          name: parsed.name,
          topology: parsed.topology || "grid",
          num_qubits: parsed.num_qubits || 5,
          target_frequency_ghz: parsed.target_frequency_ghz || 5.0,
          substrate_material: parsed.substrate_material || "silicon",
          metal_layer: parsed.metal_layer || "aluminum",
        });

        toast.success(`Successfully imported project "${parsed.name}"`);
        await refreshProjects();
      } catch (err) {
        toast.error("Import failed: Invalid JSON format");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Combining filters
  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.topology.toLowerCase().includes(search.toLowerCase());
    
    let matchesTech = true;
    if (filterTech !== "all") {
      const isSuperconducting = p.substrate_material === "silicon" || p.substrate_material === "sapphire" || p.substrate_material === "silicon_nitride";
      if (filterTech === "superconducting") matchesTech = isSuperconducting;
      else if (filterTech === "semiconductor") matchesTech = !isSuperconducting;
    }

    const matchesTopology = filterTopology === "all" || p.topology.toLowerCase() === filterTopology.toLowerCase();

    let matchesStatus = true;
    if (filterStatus !== "all") {
      const stat = p.status.toLowerCase();
      if (filterStatus === "active") matchesStatus = stat === "active" || stat === "in_progress";
      else if (filterStatus === "draft") matchesStatus = stat === "draft";
      else if (filterStatus === "released") matchesStatus = stat === "released" || stat === "completed";
      else if (filterStatus === "archived") matchesStatus = stat === "archived";
    }

    let matchesOwner = true;
    if (filterOwner !== "all") {
      const isSystem = p.name.toLowerCase().includes("copy") || p.name.toLowerCase().includes("templates") || p.id === "seeded-id";
      if (filterOwner === "admin") matchesOwner = !isSystem;
      else if (filterOwner === "system") matchesOwner = isSystem;
    }

    return matchesSearch && matchesTech && matchesTopology && matchesStatus && matchesOwner;
  });

  // Calculate statistics strip values
  const totalCount = projects.length;
  const activeCount = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length;
  const draftCount = projects.filter(p => p.status === 'draft').length;
  const releasedCount = projects.filter(p => p.status === 'released' || p.status === 'completed').length;
  const archivedCount = projects.filter(p => p.status === 'archived').length;

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreate={createAndActivate}
          />
        )}
        {showTemplates && (
          <TemplatesModal
            onClose={() => setShowTemplates(false)}
            onCreate={createAndActivate}
          />
        )}
      </AnimatePresence>

      {/* Hidden input for import JSON uploader */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Projects</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage quantum processor design programs.
                {!backendOnline && <span className="text-rose-600 ml-2 font-semibold">(offline — backend not running)</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowCreate(true)}
                className="rounded-xl bg-accent hover:bg-accent/90 text-white h-9 text-xs font-bold shadow-sm shadow-accent/20"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Project
              </Button>
              <Button
                onClick={handleImportClick}
                variant="outline"
                className="rounded-xl border-slate-200 hover:bg-slate-50 h-9 text-xs font-bold"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Import Project
              </Button>
              <Button
                onClick={() => setShowTemplates(true)}
                variant="outline"
                className="rounded-xl border-slate-200 hover:bg-slate-50 h-9 text-xs font-bold"
              >
                <BookOpen className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Templates
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Search + filter row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="pl-8 rounded-xl text-xs h-9 border-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tech filter */}
            <Select value={filterTech} onValueChange={setFilterTech}>
              <SelectTrigger className="w-36 rounded-xl text-xs h-9 border-slate-200 bg-white">
                <SelectValue placeholder="Technology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Technologies</SelectItem>
                <SelectItem value="superconducting" className="text-xs">Superconducting</SelectItem>
                <SelectItem value="semiconductor" className="text-xs">Semiconductor Spin</SelectItem>
              </SelectContent>
            </Select>

            {/* Topology filter */}
            <Select value={filterTopology} onValueChange={setFilterTopology}>
              <SelectTrigger className="w-36 rounded-xl text-xs h-9 border-slate-200 bg-white">
                <SelectValue placeholder="Topology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Topologies</SelectItem>
                {TOPOLOGY_OPTIONS.map(t => (
                  <SelectItem key={t} value={t} className="text-xs capitalize">{t.replace("-", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 rounded-xl text-xs h-9 border-slate-200 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                <SelectItem value="released" className="text-xs">Released</SelectItem>
                <SelectItem value="archived" className="text-xs">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Owner filter */}
            <Select value={filterOwner} onValueChange={setFilterOwner}>
              <SelectTrigger className="w-32 rounded-xl text-xs h-9 border-slate-200 bg-white">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Owners</SelectItem>
                <SelectItem value="admin" className="text-xs">Admin User</SelectItem>
                <SelectItem value="system" className="text-xs">System / Seeded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Project Statistics Strip */}
        <div className="flex flex-wrap items-center gap-6 py-4 px-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs text-slate-600 font-bold mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Projects</span>
            <span className="text-base font-black text-slate-900">{totalCount}</span>
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-baseline gap-2">
            <span className="text-emerald-500 uppercase tracking-wider text-[10px]">Active</span>
            <span className="text-base font-black text-emerald-700">{activeCount}</span>
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-baseline gap-2">
            <span className="text-blue-500 uppercase tracking-wider text-[10px]">Draft</span>
            <span className="text-base font-black text-blue-700">{draftCount}</span>
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-baseline gap-2">
            <span className="text-accent uppercase tracking-wider text-[10px]">Released</span>
            <span className="text-base font-black text-accent">{releasedCount}</span>
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-baseline gap-2">
            <span className="text-slate-400 uppercase tracking-wider text-[10px]">Archived</span>
            <span className="text-base font-black text-slate-900">{archivedCount}</span>
          </div>
        </div>

        {/* Projects Grid */}
        {filtered.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <FolderOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">
              {projects.length === 0 ? "No projects yet" : "No matches"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {projects.length === 0
                ? "Create a project or instantiate a template to start designing quantum chips."
                : `No projects match your current filters.`}
            </p>
            {projects.length === 0 && (
              <div className="mt-4 flex justify-center gap-2">
                <Button onClick={() => setShowCreate(true)} className="rounded-xl bg-accent text-white text-xs font-bold">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Project
                </Button>
                <Button onClick={() => setShowTemplates(true)} variant="outline" className="rounded-xl text-xs font-bold">
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Choose Template
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
              >
                {editingId === p.id ? (
                  <Card className="rounded-2xl border border-accent/20 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-700 mb-2">Rename Project</p>
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="rounded-xl text-xs mb-2"
                      autoFocus
                      onKeyDown={e => { if (e.key === "Enter") handleRename(p.id); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRename(p.id)} className="rounded-lg bg-accent text-white text-xs flex-1">
                        <Check className="h-3 w-3 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="rounded-lg text-xs">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <ProjectCard
                    project={p}
                    isActive={activeProject?.id === p.id}
                    onActivate={() => setActiveProject(p)}
                    onDelete={() => handleDelete(p.id)}
                    onEdit={() => { setEditingId(p.id); setEditName(p.name); }}
                    onDuplicate={() => handleDuplicate(p)}
                    simulationsCount={simulations.filter(s => s.project_id === p.id).length}
                  />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
