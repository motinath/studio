import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles,
  Cpu,
  Send,
  Copy,
  Download,
  CircuitBoard,
  Code2,
  Plus,
  Minus,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Zap,
  Maximize2,
  Minimize2,
  ArrowRight,
  HelpCircle,
  Layers,
  Activity,
  Sliders,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Clock,
  Cpu as CpuIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Wand2,
  Grid3x3,
  Atom,
  Braces,
  BarChart3,
  LayoutGrid,
  RefreshCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { generateChip, askClaude, type GenerateResponse } from "@/lib/api/backend";
import { useSidebar } from "@/components/ui/sidebar";
import { useDesign } from "@/lib/design-context";
import { useProject } from "@/lib/project-context";
import { cn } from "@/lib/utils";
import { MaterialSelector } from "@/components/quantum-editor/material-selector";
import { toast } from "sonner";

import { z } from "zod";

const designerSearchSchema = z.object({
  topology: z.string().optional(),
  qubits: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_app/designer")({
  head: () => ({ meta: [{ title: "Design Copilot — Silicofeller" }] }),
  validateSearch: (s) => designerSearchSchema.parse(s),
  component: DesignerPage,
});

type ChatMsg = { role: "you" | "ai"; text: string; loading?: boolean };
type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMsg[];
  result: GenerateResponse | null;
  resultsHistory?: GenerateResponse[];
};

const WELCOME: ChatMsg = {
  role: "ai",
  text: "Welcome to Silicofeller AI Quantum Designer. Describe the architecture, qubit counts, topological interfaces, or cryogenic constraints of the processor you wish to synthesize.",
};

const SUGGESTIONS = [
  {
    icon: "⛓",
    title: "5-Qubit Linear",
    description: "Nearest-neighbor meander chain",
    prompt: "Design a 5-qubit transmon quantum processor with nearest-neighbor coupling.",
    color: "from-accent/10 to-accent/5 border-accent/20",
    iconBg: "bg-accent/10 text-accent",
  },
  {
    icon: "⬡",
    title: "16-Qubit Heavy-Hex",
    description: "Error-correction topology",
    prompt: "Design a 16-qubit heavy-hex architecture with 99.9% target fidelity.",
    color: "from-indigo-500/10 to-indigo-500/5 border-indigo-200/60",
    iconBg: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: "⬛",
    title: "64-Qubit Surface Code",
    description: "8×8 cryo grid at 7 nm spacing",
    prompt: "Generate a 64-qubit surface-code quantum chip with 7nm Cryo spacing.",
    color: "from-emerald-500/10 to-emerald-500/5 border-emerald-200/60",
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: "◯",
    title: "9-Qubit Ring",
    description: "Closed-loop coherence pockets",
    prompt: "Create a 9-qubit transmon processor in a ring/loop topology.",
    color: "from-amber-500/10 to-amber-500/5 border-amber-200/60",
    iconBg: "bg-amber-50 text-amber-600",
  },
];
function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString();
}

const TOPOLOGY_OPTIONS = ["custom", "heavy-hex", "surface-code", "grid", "ring", "chain", "star", "all-to-all"];

// Helper to estimate couplers
function calculateConnections(topology: string, numQubits: number): number {
  const n = numQubits;
  const topo = (topology || "grid").toLowerCase();
  if (n <= 1) return 0;
  if (topo === "chain" || topo === "linear") return n - 1;
  if (topo === "ring") return n;
  if (topo === "star") return n - 1;
  if (topo === "all-to-all") return (n * (n - 1)) / 2;
  if (topo === "heavy-hex" || topo === "heavy_hex") {
    return Math.floor(n * 1.2);
  }
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  let edges = 0;
  edges += rows * (cols - 1);
  edges += cols * (rows - 1);
  const missing = (cols * rows) - n;
  if (missing > 0) edges -= missing;
  return Math.max(0, edges);
}

// Onboarding Workflow Guide
function OnboardingWorkflow() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white border border-slate-200 rounded-3xl m-4 shadow-sm select-none max-w-md mx-auto my-auto">
      <div className="text-slate-400 text-xs font-semibold">
        No design synthesized yet. Describe specs on the left to begin.
      </div>
    </div>
  );
}

// QCLang View
function QCLangView({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("QCLang source copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/70 p-0 shadow-sm bg-white">
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-slate-50/80 px-4 py-2">
        <span className="text-[10px] font-bold text-slate-500 font-mono">
          qpu_layout_description.qcl
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={copy}
          className="rounded-full border-slate-200 hover:bg-slate-100 text-slate-600 h-6 px-2.5 text-[10px] font-bold"
        >
          {copied ? <Check className="h-3 w-3 mr-1 text-emerald-600" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="p-3 bg-slate-950 font-mono text-[10px] text-slate-300 overflow-auto max-h-[180px] text-left whitespace-pre dark-scrollbar">
        {code}
      </pre>
    </Card>
  );
}

function isDesignRequest(p: string): boolean {
  const text = p.toLowerCase().trim();
  
  // Strong design/action commands
  const hasActionVerb = /\b(generate|design|create|make|build|synthesize|compile|route|layout|draw|add|remove|delete|connect|shift|move|adjust|scale|modify|update)\b/.test(text);
  
  // Qubit count patterns, e.g. "5 qubits", "7q"
  const hasQubitPattern = /\b\d+\s*(qubit|q)\b/.test(text);
  
  // Specific instruction patterns
  const hasInstruction = /\b(change|set|increase|decrease|shift Q\d+|move Q\d+|connect Q\d+)\b/i.test(text);

  // If it's a question but does not ask to generate/modify
  const isQuestion = /^(what|why|how|explain|describe|tell me|who|where|define|compare|can you)\b/.test(text) || text.endsWith("?");
  
  // If it is a question, it is only a design request if it explicitly contains action words like "generate" or "create" or "design"
  if (isQuestion) {
    return /\b(generate|design|create|make|build|synthesize|route|layout)\b/.test(text) || hasQubitPattern;
  }
  
  // Otherwise, if it has design actions or qubit patterns, it's a design request
  return hasActionVerb || hasQubitPattern || hasInstruction;
}

function ChipSchematicDetailed({ result }: { result: import("@/lib/api/backend").GenerateResponse }) {
  const qubits = result.placement?.qubits ?? [];
  const placementEdges = result.placement?.edges ?? [];

  const coords = useMemo(() => {
    if (qubits.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1, rangeX: 1, rangeY: 1 };
    const minX = Math.min(...qubits.map((q) => q.x));
    const maxX = Math.max(...qubits.map((q) => q.x));
    const minY = Math.min(...qubits.map((q) => q.y));
    const maxY = Math.max(...qubits.map((q) => q.y));
    return { minX, maxX, minY, maxY, rangeX: maxX - minX || 1, rangeY: maxY - minY || 1 };
  }, [qubits]);

  const width = 540;
  const height = 340;
  const paddingX = 60;
  const paddingY = 60;

  const getScreen = (qx: number, qy: number) => {
    return {
      px: paddingX + ((qx - coords.minX) / coords.rangeX) * (width - paddingX * 2),
      py: height - paddingY - ((qy - coords.minY) / coords.rangeY) * (height - paddingY * 2),
    };
  };

  const qubitByName = new Map(qubits.map((q) => [q.name, q]));

  return (
    <Card className="rounded-2xl border-slate-200/80 p-4 shadow-sm bg-white h-full flex flex-col justify-between overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Wafer Schematic View</span>
          <h3 className="text-xs font-black text-slate-800 leading-none mt-0.5">{result.label}</h3>
        </div>
        <Badge variant="outline" className="text-[9px] font-bold border-slate-200 text-slate-500">
          Hamiltonian Nodes
        </Badge>
      </div>

      <div className="flex-1 rounded-xl border border-slate-100 bg-[#FAFBFD] overflow-hidden relative min-h-[280px]">
        {qubits.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-400 italic">
            No placement schematic generated.
          </div>
        ) : (
          <svg className="w-full h-full animate-fade-in" viewBox={`0 0 ${width} ${height}`}>
            {/* Draw couplers / coupling edges first (behind qubits) */}
            {placementEdges.map((edge, idx) => {
              const q1 = qubitByName.get(edge.qubit_a);
              const q2 = qubitByName.get(edge.qubit_b);
              if (!q1 || !q2) return null;
              
              const p1 = getScreen(q1.x, q1.y);
              const p2 = getScreen(q2.x, q2.y);
              
              const mx = (p1.px + p2.px) / 2;
              const my = (p1.py + p2.py) / 2;

              return (
                <g key={`edge-${idx}`}>
                  <line
                    x1={p1.px}
                    y1={p1.py}
                    x2={p2.px}
                    y2={p2.py}
                    stroke="#8B5CF6"
                    strokeWidth="1.8"
                    strokeDasharray="3,3"
                    opacity="0.55"
                  />
                  <rect
                    x={mx - 9}
                    y={my - 6}
                    width="18"
                    height="12"
                    rx="3"
                    fill="#F5F3FF"
                    stroke="#D8B4FE"
                    strokeWidth="1"
                  />
                  <text
                    x={mx}
                    y={my + 2.5}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="black"
                    fill="#7C3AED"
                  >
                    C
                  </text>
                </g>
              );
            })}

            {/* Draw readout couplers */}
            {qubits.map((q) => {
              const p = getScreen(q.x, q.y);
              
              // Angle out for readout box (radial direction from center)
              const cx = width / 2;
              const cy = height / 2;
              const vx = p.px - cx || 1;
              const vy = p.py - cy || 1;
              const len = Math.hypot(vx, vy) || 1;
              const ux = vx / len;
              const uy = vy / len;
              
              // Readout box position (42px away from qubit node center)
              const rx = p.px + ux * 42;
              const ry = p.py + uy * 42;

              return (
                <g key={`ro-${q.name}`}>
                  <line
                    x1={p.px + ux * 16}
                    y1={p.py + uy * 16}
                    x2={rx - ux * 12}
                    y2={ry - uy * 8}
                    stroke="#94A3B8"
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                  />
                  <rect
                    x={rx - 13}
                    y={ry - 8}
                    width="26"
                    height="16"
                    rx="4"
                    fill="#F8FAFC"
                    stroke="#94A3B8"
                    strokeWidth="1"
                  />
                  <text
                    x={rx}
                    y={ry + 3}
                    textAnchor="middle"
                    fontSize="6.5"
                    fontWeight="black"
                    fill="#475569"
                    fontFamily="monospace"
                  >
                    RO
                  </text>
                  <text
                    x={rx}
                    y={ry + 17}
                    textAnchor="middle"
                    fontSize="6"
                    fontWeight="bold"
                    fill="#94A3B8"
                    fontFamily="monospace"
                  >
                    {`RO_${q.name}`}
                  </text>
                </g>
              );
            })}

            {/* Draw qubits */}
            {qubits.map((q) => {
              const p = getScreen(q.x, q.y);
              const freq = result.frequency_plan?.qubit_frequencies_GHz?.[q.name] ?? 5.0;

              return (
                <g key={`qubit-${q.name}`}>
                  {/* Outer glow ring */}
                  <circle
                    cx={p.px}
                    cy={p.py}
                    r="19"
                    fill="none"
                    stroke="#C084FC"
                    strokeWidth="1"
                    opacity="0.25"
                  />
                  <circle
                    cx={p.px}
                    cy={p.py}
                    r="16"
                    fill="#FFFFFF"
                    stroke="#8B5CF6"
                    strokeWidth="2.2"
                  />
                  <text
                    x={p.px}
                    y={p.py - 1.5}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="black"
                    fill="#1E293B"
                    fontFamily="monospace"
                  >
                    {q.name}
                  </text>
                  <text
                    x={p.px}
                    y={p.py + 9}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="bold"
                    fill="#64748B"
                  >
                    {`${freq.toFixed(2)}G`}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </Card>
  );
}

function DesignerPage() {
  const { user } = useAuth();
  const { setOpen: setWorkspaceSidebarOpen } = useSidebar();
  const { saveDesign, activeProject } = useProject();
  const navigate = useNavigate();
  
  const { topology: queryTopology, qubits: queryQubits } = Route.useSearch();
  const hasTriggeredQuery = useRef(false);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [substrate, setSubstrate] = useState("silicon");
  const [metal, setMetal] = useState("aluminum");
  const [historyOpen, setHistoryOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Specification Form States
  const [formTopology, setFormTopology] = useState("heavy-hex");
  const [formQubits, setFormQubits] = useState(27);
  const [formFreq, setFormFreq] = useState(5.0);
  const [formSubstrate, setFormSubstrate] = useState("silicon");
  const [formMetal, setFormMetal] = useState("aluminum");
  const [formCoupling, setFormCoupling] = useState("capacitive");
  const [formExpanded, setFormExpanded] = useState(false);
  const [designStage, setDesignStage] = useState<"prompt" | "generated" | "reviewed" | "sent_to_schematic" | "layout" | "simulation">("prompt");

  // Version evolution state
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<"layout" | "schematic" | "qiskit" | "qclang" | "metrics" | "evolution">("layout");

  const [layers, setLayers] = useState({
    pockets: true,
    meanders: true,
    grid: true,
    labels: true,
  });

  const {
    conversations,
    activeId,
    activeConversation: active,
    updateActive,
    setConversations,
    handleNew,
    handleDelete,
    setActiveId,
    renameConversation,
  } = useDesign();

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeId]);

  // Sync version and form states when switching conversations
  useEffect(() => {
    if (active) {
      const historyList = active.resultsHistory || (active.result ? [active.result] : []);
      setSelectedVersionIdx(historyList.length - 1);
      setActiveTab("layout");
      
      const currentRes = active.result;
      if (currentRes) {
        setFormTopology(currentRes.topology || "heavy-hex");
        setFormQubits(currentRes.num_qubits || 27);
        setFormSubstrate(currentRes.material?.substrate || "silicon");
        setFormMetal(currentRes.material?.metal || "aluminum");
        setDesignStage("generated");
      } else {
        setDesignStage("prompt");
      }
    }
  }, [activeId]);

  // Handle auto-trigger of design synthesis from query parameters
  useEffect(() => {
    if (queryTopology && queryQubits && active && !hasTriggeredQuery.current) {
      hasTriggeredQuery.current = true;
      setFormTopology(queryTopology);
      setFormQubits(queryQubits);
      
      const pText = `Design a ${queryQubits}-qubit ${queryTopology} quantum processor. ` +
        `Technology: Superconducting Transmon. Substrate: silicon. Metallization: aluminum. ` +
        `Target qubit frequency: 5.0 GHz. Coupling: capacitive.`;
      
      setTimeout(() => {
        send(pText);
      }, 400);
    }
  }, [queryTopology, queryQubits, active]);

  const send = async (textToSend?: string) => {
    const text = (textToSend || prompt).trim();
    if (!text || !active || loading) return;
    setPrompt("");
    setLoading(true);
    
    const isDesign = isDesignRequest(text);
    const loadingText = isDesign ? "Synthesizing quantum chip blueprint..." : "Thinking...";
    
    const isFirst = active.messages.length <= 1;
    updateActive({
      messages: [
        ...active.messages,
        { role: "you", text },
        { role: "ai", text: loadingText, loading: true },
      ],
      title: isFirst ? text.slice(0, 40) : active.title,
    });

    if (isDesign) {
      try {
        const result = await generateChip(text, substrate, metal);
        setWorkspaceSidebarOpen(false);
        const aiText =
          result.interpretation ??
          `Generated a ${result.num_qubits}-qubit ${result.topology} chip with DRC ${result.drc?.passed ? "PASS" : "WARNING"}.`;
        
        let nextIdx = 0;
        setConversations((cs) =>
          cs.map((c) => {
            if (c.id !== activeId) return c;
            const msgs = c.messages.filter((m) => !m.loading);
            const historyList = c.resultsHistory || (c.result ? [c.result] : []);
            const newHistory = [...historyList, result];
            nextIdx = newHistory.length - 1;
            return {
              ...c,
              messages: [...msgs, { role: "ai" as const, text: aiText }],
              result,
              resultsHistory: newHistory,
              updatedAt: Date.now(),
            };
          }),
        );
        setSelectedVersionIdx(nextIdx);
        setDesignStage("generated");
        setActiveTab("layout");
        // Auto-save to active project if one is selected
        saveDesign(result);
        toast.success("QPU design synthesized successfully");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Internal engine error";
        setConversations((cs) =>
          cs.map((c) => {
            if (c.id !== activeId) return c;
            const msgs = c.messages.filter((m) => !m.loading);
            return {
              ...c,
              messages: [...msgs, { role: "ai" as const, text: `❌ Synthesis failed: ${msg}` }],
              updatedAt: Date.now(),
            };
          }),
        );
        toast.error("Design synthesis failed");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const mappedHistory = active.messages
          .filter((m) => !m.loading)
          .map((m) => ({
            role: m.role === "you" ? ("user" as const) : ("assistant" as const),
            content: m.text,
          }));

        const contextData = currentResult ? {
          num_qubits: currentResult.num_qubits,
          topology: currentResult.topology,
          frequency_plan: currentResult.frequency_plan,
          placement: currentResult.placement,
          material: currentResult.material,
        } : null;

        const response = await askClaude(text, "designer", contextData, mappedHistory);
        
        setConversations((cs) =>
          cs.map((c) => {
            if (c.id !== activeId) return c;
            const msgs = c.messages.filter((m) => !m.loading);
            return {
              ...c,
              messages: [...msgs, { role: "ai" as const, text: response.content }],
              updatedAt: Date.now(),
            };
          }),
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error connecting to AI assistant";
        setConversations((cs) =>
          cs.map((c) => {
            if (c.id !== activeId) return c;
            const msgs = c.messages.filter((m) => !m.loading);
            return {
              ...c,
              messages: [...msgs, { role: "ai" as const, text: `❌ Chatbot error: ${msg}` }],
              updatedAt: Date.now(),
            };
          }),
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFormGenerate = () => {
    const pText = `Design a ${formQubits}-qubit ${formTopology} quantum processor. ` +
      `Technology: Superconducting Transmon. Substrate: ${formSubstrate}. Metallization: ${formMetal}. ` +
      `Target qubit frequency: ${formFreq} GHz. Coupling: ${formCoupling}.`;
    send(pText);
  };

  const restoreVersion = (res: GenerateResponse, idx: number) => {
    setConversations((cs) =>
      cs.map((c) => {
        if (c.id !== activeId) return c;
        return {
          ...c,
          result: res,
          updatedAt: Date.now(),
        };
      })
    );
    saveDesign(res);
    toast.success(`Restored active layout to Version ${idx + 1}`);
  };

  // Evolution history list
  const historyList: GenerateResponse[] = active ? (active.resultsHistory || (active.result ? [active.result] : [])) : [];
  const currentResult = active
    ? (selectedVersionIdx >= 0 && selectedVersionIdx < historyList.length
      ? historyList[selectedVersionIdx]
      : active.result)
    : null;

  const hasOutput = !!currentResult;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex h-full w-full overflow-hidden bg-[#F7F8FA]"
    >
      {/* ─── Pane 1: Session History Sidebar ───────────────────────────── */}
      <AnimatePresence initial={false}>
        {historyOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="flex-shrink-0 h-full overflow-hidden border-r border-slate-200/60"
          >
            <div className="w-60 h-full flex flex-col bg-white overflow-hidden">
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-black text-slate-800">Design Sessions</span>
                </div>
                <button
                  onClick={handleNew}
                  className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent hover:bg-accent-soft transition-all cursor-pointer"
                  title="New session"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Sessions list */}
              <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
                {conversations.map((c) => {
                  // Dynamic display title — only override when design has actual qubits
                  const displayTitle = c.result && c.result.num_qubits > 0
                    ? `${c.result.num_qubits}Q ${c.result.topology.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`
                    : c.title;

                  return (
                    <div
                      key={c.id}
                      className={cn(
                        "group relative flex items-start gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-150",
                        c.id === activeId
                          ? "bg-accent-soft border border-accent/15 shadow-sm"
                          : "hover:bg-slate-50 border border-transparent",
                      )}
                      onClick={() => setActiveId(c.id)}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] mt-0.5",
                          c.result ? "bg-emerald-50 text-emerald-600" : "bg-sidebar-primary/10 text-slate-400",
                        )}
                      >
                        {c.result ? (
                          <Cpu className="h-3 w-3" />
                        ) : (
                          <MessageSquare className="h-3 w-3" />
                        )}
                      </span>

                      <div className="flex-1 min-w-0">
                        {renamingId === c.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => {
                              renameConversation(c.id, renameValue);
                              setRenamingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                renameConversation(c.id, renameValue);
                                setRenamingId(null);
                              }
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-[11px] font-bold text-slate-800 bg-white border border-accent/30 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-accent/30"
                          />
                        ) : (
                          <p
                            className={cn(
                              "text-[11px] font-bold truncate leading-tight",
                              c.id === activeId ? "text-accent" : "text-slate-700",
                            )}
                          >
                            {displayTitle}
                          </p>
                        )}
                        <p className="text-[9px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTime(c.updatedAt)}
                          {c.result && (
                            <span className="ml-1 text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-black">
                              {c.result.num_qubits}Q
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5">
                        <button
                          className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(c.id);
                            setRenameValue(c.title);
                          }}
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                        <button
                          className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(c.id);
                          }}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom add session button */}
              <div className="p-2 border-t border-slate-100 shrink-0">
                <button
                  onClick={handleNew}
                  className="w-full flex items-center gap-2 justify-center py-2 rounded-xl border border-dashed border-slate-200 text-[11px] font-bold text-slate-400 hover:border-accent/40 hover:text-accent hover:bg-accent-soft/40 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Design Session
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle history sidebar button */}
      <button
        onClick={() => setHistoryOpen((v) => !v)}
        className="absolute left-0 top-1/2 z-20 -translate-y-1/2 flex h-8 w-4 items-center justify-center rounded-r-lg bg-white border border-l-0 border-slate-200/70 text-slate-400 hover:text-accent hover:bg-accent-soft shadow-sm transition-all cursor-pointer"
        style={{ left: historyOpen ? "240px" : "0px", transition: "left 0.3s" }}
        title={historyOpen ? "Collapse history" : "Expand history"}
      >
        {historyOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {/* ─── Pane 2: Design Input & Specification Form ─────────────────── */}
      <div className="flex flex-col h-full overflow-hidden bg-white border-r border-slate-200/60 w-[38%] shrink-0">
        {/* Panel header */}
        <div className="flex h-12 w-full items-center justify-between border-b border-slate-100 px-4 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-md shadow-accent/10">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[11px] font-black text-slate-900 leading-tight">
                Design Copilot
              </p>
              <p className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Synthesizer Online
              </p>
            </div>
          </div>
        </div>



        {/* Chat log refinement thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/20">
          {active ? (
            <>
              {active.messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[88%] text-xs leading-relaxed",
                    m.role === "you" ? "ml-auto" : "mr-auto",
                  )}
                >
                  {m.role === "you" ? (
                    <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-accent to-accent-2 px-3.5 py-2 text-white font-semibold shadow-sm">
                      {m.text}
                    </div>
                  ) : (
                    <div className="rounded-2xl rounded-tl-sm border border-slate-200/60 bg-white px-3.5 py-2.5 text-slate-700 shadow-sm">
                      {m.loading ? (
                        <span className="flex items-center gap-2 font-bold text-accent">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Synthesizing silicon layers…</span>
                        </span>
                      ) : (
                        <span className="font-medium whitespace-pre-wrap">{m.text}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Generated Design Card */}
              {currentResult && (
                <div className="max-w-[95%] mr-auto mt-2">
                  <div className="rounded-2xl rounded-tl-sm border border-accent/10 bg-gradient-to-b from-white to-accent/5 p-4 shadow-sm select-none border-l-4 border-l-violet-600 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                        <Cpu className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">Generated Design</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentResult.label}</p>
                      </div>
                    </div>

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2 text-center">
                        <span className="text-[8px] text-slate-400 uppercase font-bold block">Topology</span>
                        <span className="text-[10px] font-black text-slate-700 capitalize">{currentResult.topology.replace("-", " ")}</span>
                      </div>
                      <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2 text-center">
                        <span className="text-[8px] text-slate-400 uppercase font-bold block">Qubits</span>
                        <span className="text-[10px] font-black text-slate-700">{currentResult.num_qubits} Q</span>
                      </div>
                      <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2 text-center">
                        <span className="text-[8px] text-slate-400 uppercase font-bold block">Frequency</span>
                        <span className="text-[10px] font-black text-slate-700">
                          {currentResult.frequency_plan?.qubit_frequencies_GHz 
                            ? (Object.values(currentResult.frequency_plan.qubit_frequencies_GHz)[0] as number | undefined)?.toFixed(2) ?? "5.0" 
                            : "5.0"} GHz
                        </span>
                      </div>
                    </div>

                    {/* Status Checklist */}
                    <div className="space-y-2 mb-4 bg-white/60 border border-slate-100 rounded-xl p-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 font-semibold text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-50" />
                          <span>Layout Synthesis</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/60">Ready</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 font-semibold text-slate-600">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-50" />
                          <span>Qiskit Metal Code</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/60">Generated</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 font-semibold text-slate-600">
                          {currentResult.drc?.passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 fill-emerald-50" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 fill-amber-50" />
                          )}
                          <span>DRC Verification</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          currentResult.drc?.passed 
                            ? "text-emerald-600 bg-emerald-50 border-emerald-100/60" 
                            : "text-amber-600 bg-amber-50 border-amber-100/60"
                        )}>
                          {currentResult.drc?.passed ? "Passed" : "Warning"}
                        </span>
                      </div>
                    </div>

                    {/* Primary CTA button */}
                    <Button
                      onClick={() => {
                        setDesignStage("sent_to_schematic");
                        setTimeout(() => {
                          navigate({ 
                            to: "/schematic-editor", 
                            search: { conversationId: active.id } 
                          });
                        }, 250);
                      }}
                      className="w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 hover:from-accent/90 hover:to-accent-2/90 text-white text-xs font-black h-10 shadow-md shadow-accent/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all border-0 cursor-pointer"
                    >
                      <CircuitBoard className="h-4 w-4 animate-pulse" />
                      <span>Open In Schematic Editor</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center select-none my-auto">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/10 to-accent-2/5 blur-lg scale-150" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/10">
                  <MessageSquare className="h-5 w-5" />
                </div>
              </div>
              <h4 className="text-xs font-black text-slate-800">No Session Selected</h4>
              <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 leading-relaxed">
                Select an existing design session from the sidebar, or click the plus button to start a new workspace.
              </p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Refinement Prompt textbox */}
        <div className="border-t border-slate-100 bg-white p-3 shrink-0">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Refine design (e.g. 'shift Q3 right 40um')"
              className="min-h-[50px] max-h-[100px] resize-none rounded-xl border-slate-200 focus-visible:ring-accent/50 focus:border-accent bg-slate-50/50 text-slate-800 text-xs font-medium pr-14 placeholder:text-slate-300"
              disabled={loading}
            />
            <Button
              onClick={() => send()}
              size="sm"
              className="absolute bottom-2 right-2 rounded-lg px-2.5 bg-gradient-to-br from-accent to-accent-2 text-white hover:from-accent/90 hover:to-violet-800 shadow-md shadow-accent/10 h-7 text-xs font-bold active:scale-95 transition-all cursor-pointer border-0"
              disabled={loading || !prompt.trim()}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Pane 3: Design Output Workspace ───────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
        {!hasOutput || !currentResult ? (
          <OnboardingWorkflow />
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Full height tab container */}
            <div className="flex-1 p-4 min-h-0">
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  const nextTab = v as typeof activeTab;
                  setActiveTab(nextTab);
                  if (designStage === "generated") {
                    setDesignStage("reviewed");
                  }
                }}
                className="flex flex-col h-full bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm"
              >
                {/* Tabs bar */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 bg-slate-50/50 shrink-0 h-12">
                  <TabsList className="h-8 rounded-xl bg-slate-200/50 p-0.5 gap-0.5">
                    <TabsTrigger
                      value="layout"
                      className="rounded-lg px-3 h-7 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-accent cursor-pointer flex items-center gap-1"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Layout
                    </TabsTrigger>
                    <TabsTrigger
                      value="schematic"
                      className="rounded-lg px-3 h-7 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-accent cursor-pointer flex items-center gap-1"
                    >
                      <Cpu className="h-3.5 w-3.5" />
                      Schematic
                    </TabsTrigger>
                    <TabsTrigger
                      value="qiskit"
                      className="rounded-lg px-3 h-7 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-accent cursor-pointer flex items-center gap-1"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      Qiskit
                    </TabsTrigger>
                    <TabsTrigger
                      value="qclang"
                      className="rounded-lg px-3 h-7 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-accent cursor-pointer flex items-center gap-1"
                    >
                      <Braces className="h-3.5 w-3.5" />
                      QCLang
                    </TabsTrigger>
                    <TabsTrigger
                      value="metrics"
                      className="rounded-lg px-3 h-7 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-accent cursor-pointer flex items-center gap-1"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      Metrics
                    </TabsTrigger>
                    <TabsTrigger
                      value="evolution"
                      className="rounded-lg px-3 h-7 text-[10px] font-bold data-[state=active]:bg-white data-[state=active]:text-accent cursor-pointer flex items-center gap-1"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Evolution
                    </TabsTrigger>
                  </TabsList>

                  {/* DRC status indicator */}
                  <div>
                    {currentResult.drc?.passed ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black rounded-full px-2.5 py-0.5">
                        ✓ DRC PASS
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black rounded-full px-2.5 py-0.5">
                        ⚠ DRC WARNING
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tabs Content */}
                <div className="flex-1 overflow-y-auto min-h-0 relative bg-white">
                  {/* Layout Preview content */}
                  <TabsContent value="layout" className="h-full mt-0 focus-visible:outline-none flex flex-col p-4">
                    <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden relative min-h-[350px]">
                      <InteractiveCADCanvas result={currentResult} layers={layers} />
                    </div>
                    {/* Layer checklist checkboxes */}
                    <div className="mt-4 flex flex-wrap items-center gap-5 text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-3">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest mr-1">Layers:</span>
                      {[
                        { key: "pockets" as const, label: "Qubits (M1)", color: "bg-amber-400" },
                        { key: "meanders" as const, label: "Resonators (M2)", color: "bg-slate-400" },
                        { key: "grid" as const, label: "Grid Lines", color: "bg-slate-200" },
                        { key: "labels" as const, label: "Labels", color: "bg-accent/100" },
                      ].map((l) => (
                        <label key={l.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={layers[l.key]}
                            onChange={(e) => setLayers({ ...layers, [l.key]: e.target.checked })}
                            className="rounded accent-accent w-3.5 h-3.5"
                          />
                          <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                          <span>{l.label}</span>
                        </label>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Wafer Schematic content */}
                  <TabsContent value="schematic" className="h-full mt-0 focus-visible:outline-none p-4">
                    <ChipSchematicDetailed result={currentResult} />
                  </TabsContent>

                  {/* Qiskit Metal content */}
                  <TabsContent value="qiskit" className="mt-0 focus-visible:outline-none p-4">
                    <CodeView result={currentResult} />
                  </TabsContent>
                  
                  {/* QCLang content */}
                  <TabsContent value="qclang" className="mt-0 focus-visible:outline-none p-4">
                    <QCLangView code={currentResult.qclang_source ?? "// No QCLang source generated"} />
                  </TabsContent>

                  {/* Metrics & DRC content */}
                  <TabsContent value="metrics" className="mt-0 focus-visible:outline-none p-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-semibold text-slate-600">
                      <Card className="p-3 border-slate-100 shadow-none bg-slate-50/50">
                        <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-1">Qubits</span>
                        <span className="text-sm font-black text-slate-800">{currentResult.num_qubits}</span>
                      </Card>
                      <Card className="p-3 border-slate-100 shadow-none bg-slate-50/50">
                        <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-1">Topology</span>
                        <span className="text-sm font-black text-slate-800 capitalize">{currentResult.topology.replace("-", " ")}</span>
                      </Card>
                      <Card className="p-3 border-slate-100 shadow-none bg-slate-50/50">
                        <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-1">Target Frequency</span>
                        <span className="text-sm font-black text-slate-800">
                          {currentResult.frequency_plan?.qubit_frequencies_GHz 
                            ? (Object.values(currentResult.frequency_plan.qubit_frequencies_GHz)[0] as number | undefined)?.toFixed(2) ?? "5.00" 
                            : "5.00"} GHz
                        </span>
                      </Card>
                      <Card className="p-3 border-slate-100 shadow-none bg-slate-50/50">
                        <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-1">Couplers Count</span>
                        <span className="text-sm font-black text-slate-800">
                          {calculateConnections(currentResult.topology, currentResult.num_qubits)}
                        </span>
                      </Card>
                      <Card className="p-3 border-slate-100 shadow-none bg-slate-50/50">
                        <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-1">Readout Resonators</span>
                        <span className="text-sm font-black text-slate-800">{currentResult.num_qubits}</span>
                      </Card>
                      <Card className="p-3 border-slate-100 shadow-none bg-slate-50/50">
                        <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-1">Est. Fidelity</span>
                        <span className="text-sm font-black text-emerald-600">
                          {currentResult.material?.metal === "tantalum" ? "99.95%" : currentResult.material?.metal === "niobium" ? "99.92%" : "99.90%"}
                        </span>
                      </Card>
                      <Card className="p-3 border-slate-100 shadow-none bg-slate-50/50">
                        <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-1">Materials Spec</span>
                        <span className="text-sm font-black text-slate-800 capitalize">
                          {currentResult.material?.substrate || "silicon"} / {currentResult.material?.metal || "aluminum"}
                        </span>
                      </Card>
                      <Card className="p-3 border-slate-100 shadow-none bg-slate-50/50">
                        <span className="text-slate-400 block uppercase text-[8px] tracking-wider mb-1">Cryo Coherence (T2)</span>
                        <span className="text-sm font-black text-slate-800">~180 μs</span>
                      </Card>
                    </div>

                    {/* DRC Violations or Pass info */}
                    <div className="mt-4">
                      {currentResult.drc && !currentResult.drc.passed && (currentResult.drc.violations?.length ?? 0) > 0 ? (
                        <Card className="rounded-2xl border-amber-200/80 bg-amber-50/40 p-4 shadow-sm">
                          <p className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            Physical Lithography Warnings
                          </p>
                          <ul className="space-y-1.5">
                            {(currentResult.drc.violations ?? []).map((v, i) => (
                              <li key={i} className="text-[11px] text-amber-700 list-disc list-inside font-medium">
                                <span className="font-black">{(v.severity ?? "warn").toUpperCase()}</span> ·{" "}
                                {v.rule}: {v.message}
                              </li>
                            ))}
                          </ul>
                        </Card>
                      ) : (
                        <Card className="rounded-2xl border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          <div>
                            <p className="text-xs font-black text-emerald-800">DRC Verification Passed</p>
                            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">No physical lithography or layout trace spacing violations detected on wafer.</p>
                          </div>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Evolution history content */}
                  <TabsContent value="evolution" className="mt-0 focus-visible:outline-none p-4">
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                      {historyList.map((res, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border text-[11px] font-bold",
                            idx === selectedVersionIdx
                              ? "bg-accent/10 border-accent/20 text-accent shadow-sm"
                              : "bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100/70"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400 uppercase text-[9px] font-black bg-white/80 border border-slate-150 px-1.5 py-0.5 rounded-md">v{idx + 1}</span>
                            <span>{res.num_qubits}Q {res.topology.replace("-", " ")}</span>
                            <span className="text-slate-400 font-normal">({res.material?.substrate} / {res.material?.metal})</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedVersionIdx(idx)}
                              disabled={idx === selectedVersionIdx}
                              className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-[10px] font-bold hover:bg-slate-50 disabled:opacity-50 cursor-pointer shadow-sm"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => restoreVersion(res, idx)}
                              className="px-3 py-1 rounded-xl bg-accent text-white text-[10px] font-bold hover:bg-accent/90 cursor-pointer shadow-md shadow-accent/20"
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ChipView
// ─────────────────────────────────────────────────────────────────────────────

function ChipView({ result }: { result: GenerateResponse }) {
  const [layers, setLayers] = useState({
    pockets: true,
    meanders: true,
    grid: true,
    labels: true,
  });

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header card */}
      <Card className="rounded-2xl border-slate-200/70 p-5 shadow-sm bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Silicon Physical CAD
            </p>
            <h3 className="text-base font-black text-slate-900 leading-tight">{result.label}</h3>
            {result.interpretation && (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-sm">
                {result.interpretation}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[10px] font-black text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1">
              {result.topology} · {result.num_qubits} Qubits
            </span>
            <span className="text-[9px] font-bold text-slate-400">{result.engine}</span>
          </div>
        </div>

        {/* CAD Canvas */}
        <div className="rounded-2xl border border-slate-200/60 bg-slate-50 overflow-hidden h-[300px] flex items-center justify-center relative shadow-inner">
          <InteractiveCADCanvas result={result} layers={layers} />
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "Temperature", value: "10 mK" },
            { label: "Topology", value: result.topology },
            { label: "Gate Fidelity", value: "99.92%" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-center"
            >
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                {s.label}
              </p>
              <p className="mt-1 text-[12px] font-black text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Two-column controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Layer toggles */}
        <Card className="rounded-2xl border-slate-200/70 p-4 shadow-sm bg-white">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
            <Layers className="h-3.5 w-3.5 text-accent" />
            CAD Layers
          </p>
          <div className="space-y-2.5">
            {[
              { key: "pockets" as const, label: "M1 Qubits (Gold)", color: "bg-amber-400" },
              { key: "meanders" as const, label: "M2 Resonators (Silver)", color: "bg-slate-400" },
              {
                key: "grid" as const,
                label: "Litho Grid",
                color: "bg-slate-200 border border-slate-300",
              },
              { key: "labels" as const, label: "Text Labels", color: "bg-accent/100" },
            ].map((l) => (
              <label
                key={l.key}
                className="flex items-center gap-2.5 cursor-pointer group select-none"
              >
                <input
                  type="checkbox"
                  checked={layers[l.key]}
                  onChange={(e) => setLayers({ ...layers, [l.key]: e.target.checked })}
                  className="rounded border-slate-300 accent-accent w-4 h-4"
                />
                <span className={`w-2.5 h-2.5 rounded-sm inline-block shrink-0 ${l.color}`} />
                <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">
                  {l.label}
                </span>
              </label>
            ))}
          </div>
        </Card>

        {/* Diagnostics */}
        <Card className="rounded-2xl border-slate-200/70 p-4 shadow-sm bg-white">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            Diagnostics
          </p>
          <div className="space-y-2.5">
            {[
              {
                label: "DRC Warnings",
                value: result.drc?.passed
                  ? "0 Detected"
                  : `${result.drc?.violations?.length ?? 0} Warning`,
                color: result.drc?.passed ? "text-emerald-600" : "text-amber-600",
              },
              { label: "Solver Scale", value: "1.00 mm", color: "text-slate-700" },
              { label: "Gate Fidelity", value: "99.92%", color: "text-accent" },
              { label: "Coherence (T2)", value: "~180 μs", color: "text-emerald-600" },
            ].map((d) => (
              <div key={d.label} className="flex justify-between items-center text-[11px]">
                <span className="font-semibold text-slate-500">{d.label}</span>
                <span className={`font-black ${d.color}`}>{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* DRC violations */}
      {result.drc && !result.drc.passed && (result.drc.violations?.length ?? 0) > 0 && (
        <Card className="rounded-2xl border-amber-200/80 bg-amber-50/60 p-4 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Physical Lithography Warnings
          </p>
          <ul className="space-y-1.5">
            {(result.drc.violations ?? []).map((v, i) => (
              <li key={i} className="text-[11px] text-amber-700 list-disc list-inside font-medium">
                <span className="font-black">{(v.severity ?? "warn").toUpperCase()}</span> ·{" "}
                {v.rule}: {v.message}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InteractiveCADCanvas  (unchanged logic, polished wrapper)
// ─────────────────────────────────────────────────────────────────────────────

function InteractiveCADCanvas({
  result,
  layers,
}: {
  result: GenerateResponse;
  layers: { pockets: boolean; meanders: boolean; grid: boolean; labels: boolean };
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedQubit, setSelectedQubit] = useState<
    import("@/lib/api/backend").PlacementQubit | null
  >(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasParentRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<import("@/lib/api/backend").PlacementQubit | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const qubits = result.placement?.qubits ?? [];
  const placementEdges = result.placement?.edges ?? [];
  const resonatorEntries = Object.entries(
    result.frequency_plan?.resonator_frequencies_GHz ?? {},
  );

  const coords = useMemo(() => {
    if (qubits.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1, rangeX: 1, rangeY: 1 };
    const minX = Math.min(...qubits.map((q) => q.x));
    const maxX = Math.max(...qubits.map((q) => q.x));
    const minY = Math.min(...qubits.map((q) => q.y));
    const maxY = Math.max(...qubits.map((q) => q.y));
    return { minX, maxX, minY, maxY, rangeX: maxX - minX || 1, rangeY: maxY - minY || 1 };
  }, [qubits]);

  useEffect(() => {
    const updateDimensions = () => {
      const parent = canvasParentRef.current;
      if (parent) {
        setDimensions({
          width: parent.clientWidth || (isFullscreen ? window.innerWidth : 500),
          height: parent.clientHeight || (isFullscreen ? window.innerHeight : 300),
        });
      } else {
        setDimensions({
          width: isFullscreen ? window.innerWidth : 500,
          height: isFullscreen ? window.innerHeight : 300,
        });
      }
    };
    updateDimensions();
    const timer = setTimeout(updateDimensions, 50);
    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
      clearTimeout(timer);
    };
  }, [isFullscreen, selectedQubit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedQubit) {
          e.preventDefault();
          setSelectedQubit(null);
        } else if (isFullscreen) {
          e.preventDefault();
          setIsFullscreen(false);
        }
      }
    };
    if (isFullscreen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, selectedQubit]);

  useEffect(() => {
    if (selectedQubit && isFullscreen) {
      const w = dimensions.width,
        h = dimensions.height;
      const paddingX = Math.min(160, w * 0.15),
        paddingY = Math.min(120, h * 0.15);
      const px = paddingX + ((selectedQubit.x - coords.minX) / coords.rangeX) * (w - paddingX * 2);
      const py =
        h - paddingY - ((selectedQubit.y - coords.minY) / coords.rangeY) * (h - paddingY * 2);
      const targetZoom = 2.2;
      setZoomScale(targetZoom);
      setPanOffset({ x: w / 2 - px * targetZoom, y: h / 2 - py * targetZoom });
    } else if (!selectedQubit && isFullscreen) {
      setZoomScale(1.0);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [selectedQubit, isFullscreen, dimensions, coords]);

  const zoomScaleRef = useRef(zoomScale);
  const panOffsetRef = useRef(panOffset);
  useEffect(() => {
    zoomScaleRef.current = zoomScale;
    panOffsetRef.current = panOffset;
  }, [zoomScale, panOffset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isFullscreen) return;
    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentZoom = zoomScaleRef.current;
      const currentPan = panOffsetRef.current;
      const zoomFactor = 1.15;
      const nextZoom =
        e.deltaY < 0 ? Math.min(5, currentZoom * zoomFactor) : Math.max(0.5, currentZoom / zoomFactor);
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left,
        mouseY = e.clientY - rect.top;
      const worldX = (mouseX - currentPan.x) / currentZoom,
        worldY = (mouseY - currentPan.y) / currentZoom;
      setZoomScale(nextZoom);
      setPanOffset({ x: mouseX - worldX * nextZoom, y: mouseY - worldY * nextZoom });
    };
    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleNativeWheel);
  }, [isFullscreen]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = dimensions;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomScale, zoomScale);

    if (layers.grid) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.07)";
      ctx.lineWidth = 1 / zoomScale;
      const step = 25;
      const ext = isFullscreen ? 2000 : 0;
      for (let x = -ext; x < width + ext; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, -ext);
        ctx.lineTo(x, height + ext);
        ctx.stroke();
      }
      for (let y = -ext; y < height + ext; y += step) {
        ctx.beginPath();
        ctx.moveTo(-ext, y);
        ctx.lineTo(width + ext, y);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 3 / zoomScale;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    if (qubits.length === 0) {
      ctx.restore();
      return;
    }

    const getScreen = (qx: number, qy: number) => {
      const paddingX = isFullscreen ? Math.min(160, width * 0.15) : 70;
      const paddingY = isFullscreen ? Math.min(120, height * 0.15) : 50;
      return {
        px: paddingX + ((qx - coords.minX) / coords.rangeX) * (width - paddingX * 2),
        py: height - paddingY - ((qy - coords.minY) / coords.rangeY) * (height - paddingY * 2),
      };
    };

    const qubitByName = new Map(qubits.map((q) => [q.name, q]));
    const isConnectedToSelected = (name: string) =>
      !selectedQubit ||
      name === selectedQubit.name ||
      placementEdges.some(
        (edge) =>
          (edge.qubit_a === selectedQubit.name && edge.qubit_b === name) ||
          (edge.qubit_b === selectedQubit.name && edge.qubit_a === name),
      );

    const drawMeanderPath = (
      p1: { px: number; py: number },
      p2: { px: number; py: number },
    ) => {
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      const midX = (p1.px + p2.px) / 2;
      const midY = (p1.py + p2.py) / 2;
      const dx = p2.px - p1.px;
      const dy = p2.py - p1.py;
      if (Math.abs(dx) > Math.abs(dy)) {
        ctx.lineTo(midX - 10, p1.py);
        ctx.lineTo(midX - 10, p1.py - 6);
        ctx.lineTo(midX - 3, p1.py - 6);
        ctx.lineTo(midX - 3, p1.py + 6);
        ctx.lineTo(midX + 3, p1.py + 6);
        ctx.lineTo(midX + 3, p1.py - 6);
        ctx.lineTo(midX + 10, p1.py - 6);
        ctx.lineTo(midX + 10, p2.py);
      } else {
        ctx.lineTo(p1.px, midY - 10);
        ctx.lineTo(p1.px - 6, midY - 10);
        ctx.lineTo(p1.px - 6, midY - 3);
        ctx.lineTo(p1.px + 6, midY - 3);
        ctx.lineTo(p1.px + 6, midY + 3);
        ctx.lineTo(p1.px - 6, midY + 3);
        ctx.lineTo(p1.px - 6, midY + 10);
        ctx.lineTo(p2.px, midY + 10);
      }
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
    };

    // Coupling meanders from backend topology edges
    if (layers.meanders) {
      placementEdges.forEach((edge) => {
        const q1 = qubitByName.get(edge.qubit_a);
        const q2 = qubitByName.get(edge.qubit_b);
        if (!q1 || !q2) return;
        const p1 = getScreen(q1.x, q1.y);
        const p2 = getScreen(q2.x, q2.y);
        const isConn = selectedQubit
          ? q1.name === selectedQubit.name || q2.name === selectedQubit.name
          : true;
        ctx.globalAlpha = selectedQubit && !isConn ? 0.12 : 1.0;
        ctx.strokeStyle = selectedQubit && isConn ? "#7C3AED" : "rgba(100,116,139,0.65)";
        ctx.lineWidth = selectedQubit && isConn ? 2.5 / zoomScale : 1.5 / zoomScale;
        drawMeanderPath(p1, p2);
      });
      ctx.globalAlpha = 1.0;
    }

    // Readout resonators from the backend frequency plan
    if (layers.meanders && resonatorEntries.length > 0) {
      const center = { px: width / 2, py: height / 2 };
      resonatorEntries.forEach(([name], idx) => {
        const targetName = name.replace(/^RO_/, "");
        const q = qubitByName.get(targetName);
        if (!q) return;
        const p = getScreen(q.x, q.y);
        const angleFallback = (idx / Math.max(1, resonatorEntries.length)) * Math.PI * 2;
        const vx = p.px - center.px || Math.cos(angleFallback);
        const vy = p.py - center.py || Math.sin(angleFallback);
        const len = Math.hypot(vx, vy) || 1;
        const ux = vx / len;
        const uy = vy / len;
        const rx = p.px + ux * 42;
        const ry = p.py + uy * 42;
        const isConn = isConnectedToSelected(q.name);

        ctx.globalAlpha = selectedQubit && !isConn ? 0.12 : 1.0;
        ctx.strokeStyle = selectedQubit && q.name === selectedQubit.name ? "#7C3AED" : "#64748B";
        ctx.lineWidth = 1.4 / zoomScale;
        ctx.beginPath();
        ctx.moveTo(p.px + ux * 13, p.py + uy * 13);
        ctx.lineTo(rx - ux * 13, ry - uy * 13);
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = selectedQubit && q.name === selectedQubit.name ? "#7C3AED" : "#64748B";
        ctx.lineWidth = 1.2 / zoomScale;
        ctx.beginPath();
        ctx.roundRect(rx - 13, ry - 10, 26, 20, 3);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rx - 8, ry + 1);
        ctx.lineTo(rx - 3, ry + 1);
        ctx.lineTo(rx - 3, ry - 5);
        ctx.lineTo(rx + 3, ry - 5);
        ctx.lineTo(rx + 3, ry + 5);
        ctx.lineTo(rx + 8, ry + 5);
        ctx.stroke();

        if (layers.labels) {
          ctx.fillStyle = "#475569";
          ctx.font = "bold 8px monospace";
          ctx.fillText(name, rx - 13, ry + 20);
        }
      });
      ctx.globalAlpha = 1.0;
    }

    // Qubits
    if (layers.pockets) {
      qubits.forEach((q) => {
        const { px, py } = getScreen(q.x, q.y);
        const isHovered = hovered?.name === q.name;
        const isSelected = selectedQubit?.name === q.name;
        const isConn = isConnectedToSelected(q.name);
        ctx.globalAlpha = selectedQubit && !isConn ? 0.12 : 1.0;

        if (isSelected) {
          const g = ctx.createRadialGradient(px, py, 2, px, py, 36);
          g.addColorStop(0, "rgba(124,58,237,0.45)");
          g.addColorStop(1, "rgba(124,58,237,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, 36, 0, 2 * Math.PI);
          ctx.fill();
        } else if (isHovered && !selectedQubit) {
          const g = ctx.createRadialGradient(px, py, 2, px, py, 26);
          g.addColorStop(0, "rgba(124,58,237,0.28)");
          g.addColorStop(1, "rgba(124,58,237,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, 26, 0, 2 * Math.PI);
          ctx.fill();
        }

        const size = 26;
        ctx.fillStyle = "#FFFFFF";
        ctx.strokeStyle = isSelected || isHovered ? "#7C3AED" : "#64748B";
        ctx.lineWidth = isSelected
          ? 3.5 / zoomScale
          : isHovered
            ? 2.5 / zoomScale
            : 1.2 / zoomScale;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
        ctx.strokeRect(px - size / 2, py - size / 2, size, size);

        ctx.fillStyle = isSelected || isHovered ? "#7C3AED" : "#D97706";
        ctx.fillRect(px - 10, py - 9, 20, 5);
        ctx.fillRect(px - 10, py + 4, 20, 5);
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1 / zoomScale;
        ctx.strokeRect(px - 10, py - 9, 20, 5);
        ctx.strokeRect(px - 10, py + 4, 20, 5);

        ctx.strokeStyle = isSelected ? "#8B5CF6" : "#DC2626";
        ctx.lineWidth = 2 / zoomScale;
        ctx.beginPath();
        ctx.moveTo(px, py - 4);
        ctx.lineTo(px, py + 4);
        ctx.stroke();

        if (layers.labels) {
          ctx.fillStyle = isSelected || isHovered ? "#7C3AED" : "#1E293B";
          ctx.font = "bold 9px monospace";
          ctx.fillText(q.name, px - 6, py + 19);
        }
      });
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
  }, [result, layers, hovered, isFullscreen, dimensions, zoomScale, panOffset, selectedQubit]);

  const getScreenCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const findQubitAtPos = (x: number, y: number) => {
    const w = dimensions.width,
      h = dimensions.height;
    const worldX = (x - panOffset.x) / zoomScale,
      worldY = (y - panOffset.y) / zoomScale;
    const getScreen = (qx: number, qy: number) => {
      const pX = isFullscreen ? Math.min(160, w * 0.15) : 70;
      const pY = isFullscreen ? Math.min(120, h * 0.15) : 50;
      return {
        px: pX + ((qx - coords.minX) / coords.rangeX) * (w - pX * 2),
        py: h - pY - ((qy - coords.minY) / coords.rangeY) * (h - pY * 2),
      };
    };
    for (const q of qubits) {
      const { px, py } = getScreen(q.x, q.y);
      if (Math.hypot(worldX - px, worldY - py) < 20 / zoomScale) return q;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isFullscreen) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) setIsDragging(false);
    const pos = getScreenCoords(e);
    if (!pos) return;
    const q = findQubitAtPos(pos.x, pos.y);
    if (q && isFullscreen) setSelectedQubit(q);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && isFullscreen) {
      setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }
    const pos = getScreenCoords(e);
    if (!pos) return;
    const q = findQubitAtPos(pos.x, pos.y);
    if (q) {
      setHovered(q);
      setTooltipPos({ x: pos.x + 15, y: pos.y - 100 });
    } else setHovered(null);
  };

  const activeQubitSpec = useMemo(() => {
    if (!hovered) return null;
    const fp = result.frequency_plan;
    const name = hovered.name;
    return {
      name,
      freq: fp?.qubit_frequencies_GHz?.[name] ?? 5.0,
      EJ: fp?.EJ_GHz?.[name] ?? 13.0,
      EC: fp?.EC_GHz?.[name] ?? 0.28,
      resonatorFreq: fp?.resonator_frequencies_GHz?.[`RO_${name}`] ?? 6.5,
    };
  }, [hovered, result]);

  const coupledQubitsList = useMemo(() => {
    if (!selectedQubit) return [];
    const coupledNames = new Set(
      placementEdges.flatMap((edge) => {
        if (edge.qubit_a === selectedQubit.name) return [edge.qubit_b];
        if (edge.qubit_b === selectedQubit.name) return [edge.qubit_a];
        return [];
      }),
    );
    return qubits.filter((q) => coupledNames.has(q.name));
  }, [selectedQubit, qubits, placementEdges]);

  return (
    <div className="relative w-full h-full flex justify-center items-center">
      {isFullscreen ? (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-200">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <AnimatePresence>
            {selectedQubit && (
              <motion.div
                initial={{ x: -416, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -416, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="relative z-10 w-full md:w-[26rem] h-full bg-white/95 backdrop-blur-md border-r border-slate-200/70 shadow-2xl p-8 flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent border border-accent/20 text-lg font-black font-mono shadow-sm">
                      {selectedQubit.name}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg leading-none">
                        Qubit Analyzer
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                        Interactive focus mode
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedQubit(null)}
                    className="rounded-full h-9 px-4 border-slate-200 text-slate-600 text-xs cursor-pointer active:scale-95 transition-all shadow-sm"
                  >
                    Back
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Physical Properties
                    </h4>
                    <div className="space-y-3">
                      {[
                        {
                          label: "Hamiltonian Frequency",
                          value: `${(result.frequency_plan?.qubit_frequencies_GHz?.[selectedQubit.name] ?? 5.0).toFixed(3)} GHz`,
                          color: "bg-amber-500",
                          textColor: "text-slate-800",
                        },
                        {
                          label: "Readout Resonator",
                          value: `${(result.frequency_plan?.resonator_frequencies_GHz?.[`RO_${selectedQubit.name}`] ?? 6.5).toFixed(3)} GHz`,
                          color: "bg-accent",
                          textColor: "text-accent",
                        },
                        {
                          label: "Coherence Time (T₂)",
                          value: "180 μs",
                          color: "bg-emerald-500",
                          textColor: "text-emerald-600",
                        },
                      ].map((p) => (
                        <div
                          key={p.label}
                          className="rounded-2xl border border-slate-100 bg-slate-50/20 p-4 relative overflow-hidden"
                        >
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${p.color}`} />
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {p.label}
                          </p>
                          <p className={`text-2xl font-black mt-1.5 font-mono ${p.textColor}`}>
                            {p.value}
                          </p>
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-center">
                          <p className="text-[9px] font-extrabold text-slate-400 uppercase">
                            EJ Energy
                          </p>
                          <p className="text-lg font-black text-slate-700 mt-1 font-mono">
                            {(result.frequency_plan?.EJ_GHz?.[selectedQubit.name] ?? 13.0).toFixed(
                              2,
                            )}{" "}
                            <span className="text-[10px] text-slate-400">GHz</span>
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-center">
                          <p className="text-[9px] font-extrabold text-slate-400 uppercase">
                            EC Energy
                          </p>
                          <p className="text-lg font-black text-slate-700 mt-1 font-mono">
                            {(result.frequency_plan?.EC_GHz?.[selectedQubit.name] ?? 0.28).toFixed(
                              4,
                            )}{" "}
                            <span className="text-[10px] text-slate-400">GHz</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Coupled Qubits ({coupledQubitsList.length})
                    </h4>
                    {coupledQubitsList.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No direct coupled neighbors</p>
                    ) : (
                      coupledQubitsList.map((q) => {
                        const dist = Math.hypot(q.x - selectedQubit.x, q.y - selectedQubit.y);
                        return (
                          <button
                            key={q.name}
                            onClick={() => setSelectedQubit(q)}
                            className="w-full text-left flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-accent/20 hover:bg-accent/5 transition-all group cursor-pointer shadow-sm mb-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-accent/100 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-extrabold text-slate-700 group-hover:text-accent">
                                {q.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-full">
                              {dist.toFixed(2)} mm
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-3 text-[10px] font-bold text-slate-400">
                  Click canvas to deselect
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 h-full flex flex-col relative">
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-full px-4 py-2.5 shadow-lg flex items-center gap-3 pointer-events-auto select-none">
                <span className="w-2.5 h-2.5 rounded-full bg-accent/100 animate-pulse shadow-sm shadow-violet-300" />
                <span className="text-xs font-extrabold text-slate-800">
                  {selectedQubit ? `Focus: ${selectedQubit.name}` : "Wafer CAD Space"}
                </span>
                <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  Drag · Scroll
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedQubit) {
                    setSelectedQubit(null);
                  } else {
                    setIsFullscreen(false);
                  }
                }}
                className="bg-white/95 backdrop-blur-sm border-slate-200/60 hover:bg-slate-50 text-slate-700 font-bold rounded-full px-4 shadow-lg flex items-center gap-1.5 pointer-events-auto active:scale-95 transition-all h-10 cursor-pointer"
              >
                <Minimize2 className="h-4 w-4" />
                {selectedQubit ? "Deselect" : "Exit Fullscreen"}
              </Button>
            </div>

            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-2 shadow-xl z-10 flex flex-col gap-1 pointer-events-auto select-none">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomScale((z) => Math.min(5, z * 1.2))}
                className="h-9 w-9 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-[10px] font-black text-slate-500 text-center py-0.5 font-mono">
                {Math.round(zoomScale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomScale((z) => Math.max(0.5, z / 1.2))}
                className="h-9 w-9 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 active:scale-95 cursor-pointer"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="border-t border-slate-100 my-0.5" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                  setSelectedQubit(null);
                }}
                className="h-9 w-9 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-50 active:scale-95 cursor-pointer"
                title="Reset"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div
              className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden"
              ref={canvasParentRef}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => {
                  setHovered(null);
                  setIsDragging(false);
                }}
                className="bg-transparent cursor-crosshair"
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className="relative w-full h-full flex justify-center items-center"
          ref={canvasParentRef}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setHovered(null);
              setIsDragging(false);
            }}
            className="cursor-crosshair rounded-xl"
          />

          {/* Fullscreen entry button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsFullscreen(true);
              setZoomScale(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm border-slate-200/60 hover:bg-white text-slate-600 font-bold rounded-xl px-2.5 py-1.5 shadow-sm flex items-center gap-1 active:scale-95 transition-all text-xs h-8 cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fullscreen
          </Button>

          {/* Hover tooltip */}
          <AnimatePresence>
            {hovered && activeQubitSpec && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                style={{ left: tooltipPos.x, top: tooltipPos.y }}
                className="absolute pointer-events-none bg-slate-900/92 backdrop-blur-md border border-slate-700/60 text-slate-100 rounded-xl p-3 shadow-2xl z-30 w-52"
              >
                <div className="flex justify-between items-center border-b border-slate-700/50 pb-1.5 mb-2">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent/100" />
                    {activeQubitSpec.name} transmon
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                    M1 Pocket
                  </span>
                </div>
                <div className="space-y-1 text-[10px] font-semibold text-slate-300">
                  <div className="flex justify-between">
                    <span>Frequency:</span>
                    <span className="text-white font-extrabold">
                      {activeQubitSpec.freq.toFixed(3)} GHz
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Readout:</span>
                    <span className="text-violet-400 font-extrabold">
                      {activeQubitSpec.resonatorFreq.toFixed(3)} GHz
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>EJ:</span>
                    <span className="text-slate-200">{activeQubitSpec.EJ.toFixed(2)} GHz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>EC:</span>
                    <span className="text-slate-200">{activeQubitSpec.EC.toFixed(4)} GHz</span>
                  </div>
                  <div className="flex justify-between text-[9px] border-t border-slate-800 pt-1 mt-0.5 text-slate-400">
                    <span>Coherence (T2):</span>
                    <span className="text-emerald-400 font-extrabold">180 μs</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FreqPlanView
// ─────────────────────────────────────────────────────────────────────────────

function FreqPlanView({ result }: { result: GenerateResponse }) {
  const fp = result.frequency_plan;
  if (!fp) return <p className="text-sm text-slate-400">No frequency data available.</p>;

  const qubitsF = Object.entries(fp.qubit_frequencies_GHz ?? {}).map(([name, freq]) => ({
    name,
    freq,
    type: "qubit" as const,
  }));
  const resonatorsF = Object.entries(fp.resonator_frequencies_GHz ?? {}).map(([name, freq]) => ({
    name,
    freq,
    type: "resonator" as const,
  }));
  const allFreqs = [...qubitsF, ...resonatorsF].sort((a, b) => a.freq - b.freq);
  const minF = 4.0,
    maxF = 8.0,
    spanF = maxF - minF;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <Card className="rounded-2xl border-slate-200/70 p-5 shadow-sm bg-white">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Spectrum Analyzer
            </p>
            <h3 className="text-base font-black text-slate-900">Frequency Distribution</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Qubit and resonator resonance bands.
            </p>
          </div>
          <Badge
            variant="secondary"
            className="rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold px-3 py-1 text-[10px]"
          >
            ε_eff = {fp.epsilon_eff?.toFixed(3) ?? "—"}
          </Badge>
        </div>

        {/* Spectrum bar */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200/60 px-5 pt-10 pb-5 shadow-inner relative mb-5">
          <div className="h-2 bg-slate-200 rounded-full w-full relative">
            {allFreqs.map((f, i) => (
              <div
                key={i}
                style={{ left: `${((f.freq - minF) / spanF) * 100}%` }}
                className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center group z-10"
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow cursor-help transition-all group-hover:scale-125 ${f.type === "qubit" ? "bg-amber-500" : "bg-accent"}`}
                />
                <span className="h-5 w-px bg-slate-300/70 mt-0.5" />
                <div className="absolute top-9 whitespace-nowrap bg-white border border-slate-200 shadow-md rounded-lg p-2 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 pointer-events-none text-[9px] font-extrabold text-slate-700 z-20">
                  {f.name}: {f.freq.toFixed(3)} GHz
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 select-none">
            <span>4.0</span>
            <span>5.0</span>
            <span>6.0</span>
            <span>7.0</span>
            <span>8.0 GHz</span>
          </div>
          <div className="mt-4 flex justify-center gap-6 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Qubits
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-accent" /> Resonators
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Qubit frequencies */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Qubit Energy States
            </p>
            <div className="space-y-2">
              {Object.entries(fp.qubit_frequencies_GHz ?? {}).map(([name, freq]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/30 px-3.5 py-2.5 hover:bg-white transition-colors shadow-inner"
                >
                  <div>
                    <span className="text-[12px] font-bold text-slate-800">{name}</span>
                    <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">
                      Group {fp.qubit_groups?.[name] ?? "—"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] font-black text-slate-800">
                      {freq.toFixed(3)} GHz
                    </span>
                    <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                      EJ={fp.EJ_GHz?.[name]?.toFixed(1)} · EC={fp.EC_GHz?.[name]?.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resonator frequencies */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" /> Coupling Resonators
            </p>
            <div className="space-y-2">
              {Object.entries(fp.resonator_frequencies_GHz ?? {}).map(([name, freq]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/30 px-3.5 py-2.5 hover:bg-white transition-colors shadow-inner"
                >
                  <div>
                    <span className="text-[12px] font-bold text-slate-800">{name}</span>
                    <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                      L={fp.resonator_lengths_mm?.[name]?.toFixed(3)} mm λ/4
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[12px] font-black text-slate-800">
                      {freq.toFixed(3)} GHz
                    </span>
                    <div className="text-[9px] font-bold text-accent mt-0.5">
                      Δ={fp.detunings_GHz?.[name]?.toFixed(3)} GHz
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(fp.warnings?.length ?? 0) > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-amber-800 mb-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Detuning Overlap Warning
            </p>
            <ul className="space-y-1">
              {(fp.warnings ?? []).map((w, i) => (
                <li
                  key={i}
                  className="text-[11px] text-amber-700 list-disc list-inside font-medium"
                >
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Placement matrix */}
      {(result.placement?.qubits?.length ?? 0) > 0 && (
        <Card className="rounded-2xl border-slate-200/70 p-5 shadow-sm bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                Physical Coordinates
              </p>
              <h3 className="text-base font-black text-slate-900">Placement Matrix (mm)</h3>
            </div>
            <Badge
              variant="secondary"
              className="rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center gap-1.5"
            >
              <Zap className="h-3 w-3 text-accent" />
              {result.placement?.solver ?? "kamada-kawai"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {(result.placement?.qubits ?? []).map((q) => (
              <div
                key={q.name}
                className="rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 py-2.5 text-center hover:bg-white transition-colors shadow-inner"
              >
                <p className="text-[11px] font-bold text-slate-700">{q.name}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5 font-mono">
                  ({q.x.toFixed(3)}, {q.y.toFixed(3)})
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CodeView
// ─────────────────────────────────────────────────────────────────────────────

function CodeView({ result }: { result: GenerateResponse }) {
  const code = result.code ?? "# No Qiskit Metal code generated";
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
    a.download = "qbeta_chip_blueprint.py";
    a.click();
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200/70 p-0 shadow-sm bg-white max-w-3xl mx-auto">
      {/* macOS title bar */}
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-slate-50/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-400" />
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 font-mono">
            qbeta_chip_blueprint.py
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copy}
            className="rounded-full border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm text-xs font-bold h-7 px-3 active:scale-95 transition-all"
          >
            {copied ? (
              <>
                <Check className="mr-1.5 h-3 w-3 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3 w-3" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={download}
            className="rounded-full border-slate-200 hover:bg-slate-100 text-slate-600 shadow-sm text-xs font-bold h-7 px-3 active:scale-95 transition-all"
          >
            <Download className="mr-1.5 h-3 w-3" />
            .py
          </Button>
        </div>
      </div>
      <pre className="overflow-auto dark-scrollbar bg-[#0F172A] p-6 text-[12px] leading-relaxed text-slate-300 max-h-[520px] font-mono shadow-inner">
        <code className="language-python">{code}</code>
      </pre>
    </Card>
  );
}
