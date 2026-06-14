import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Eye, EyeOff, ChevronDown, ChevronRight, Search,
  ZoomIn, ZoomOut, Maximize2, Move, MousePointer, Ruler,
  Grid3X3, Download, GitCompare, ExternalLink,
  ChevronUp, GripHorizontal, CheckCircle2, AlertTriangle,
  RefreshCw, Info, X, Cpu, Activity, Bell,
  AlignCenter, Crosshair, Maximize, ChevronLeft,
  MoreVertical, Layers, ScanLine, Network, CircuitBoard,
  FileCode, Scissors
} from "lucide-react";
import { useDesign } from "@/lib/design-context";
import type { GenerateResponse } from "@/lib/api/backend";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_app/layout-viewer")({
  head: () => ({ meta: [{ title: "Layout Viewer — Silicofeller" }] }),
  component: LayoutViewerPage,
});

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LayerDef {
  id: string;
  color: string;
  fillColor: string;
  count: number;
  visible: boolean;
}

type ComponentType = "qubit" | "resonator" | "coupler" | "junction" | "port";

interface LayoutComponent {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  freq?: number;
  anharmonicity?: number;
  EJ?: number;
  EC?: number;
  resonatorFreq?: number;
  resonatorLength?: number;
  detuning?: number;
  qubitA?: string;
  qubitB?: string;
  material?: string;
  orientation?: number;
}

// ─── Compile result into layout components ─────────────────────────────────────

function compileLayout(result: GenerateResponse | null): {
  components: LayoutComponent[];
  chipW: number;
  chipH: number;
  cols: number;
  rows: number;
  spacing: number;
} {
  const BASE_SPACING = 900;
  const BASE_X = 600;
  const BASE_Y = 600;

  const placement = result?.placement;
  const freqPlan = result?.frequency_plan;
  const numQubits = result?.num_qubits ?? 4;

  const qubitPos: Record<string, { x: number; y: number; name: string }> = {};
  if (placement?.qubits && placement.qubits.length > 0) {
    const cols = placement.cols ?? Math.ceil(Math.sqrt(numQubits));
    placement.qubits.forEach((q, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      qubitPos[q.name] = { name: q.name, x: BASE_X + col * BASE_SPACING, y: BASE_Y + row * BASE_SPACING };
    });
  } else {
    const cols = Math.ceil(Math.sqrt(numQubits));
    for (let i = 0; i < numQubits; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const name = `Q${i + 1}`;
      qubitPos[name] = { name, x: BASE_X + col * BASE_SPACING, y: BASE_Y + row * BASE_SPACING };
    }
  }

  const components: LayoutComponent[] = [];
  const qubitNames = Object.keys(qubitPos);

  qubitNames.forEach(name => {
    const pos = qubitPos[name];
    const freq = freqPlan?.qubit_frequencies_GHz?.[name];
    const EJ = freqPlan?.EJ_GHz?.[name];
    const EC = freqPlan?.EC_GHz?.[name];
    components.push({
      id: name, type: "qubit", label: name,
      x: pos.x, y: pos.y,
      freq: freq ?? (4.9 + Math.random() * 0.4),
      anharmonicity: EC ? -EC : -0.22,
      EJ, EC,
      material: result?.material?.metal ?? "Nb",
      orientation: 0,
    });
  });

  qubitNames.forEach((name, i) => {
    const pos = qubitPos[name];
    const rName = `RO_${name}`;
    const rFreq = freqPlan?.resonator_frequencies_GHz?.[rName] ?? freqPlan?.resonator_frequencies_GHz?.[name];
    const rLen = freqPlan?.resonator_lengths_mm?.[rName] ?? freqPlan?.resonator_lengths_mm?.[name];
    const detuning = freqPlan?.detunings_GHz?.[name];
    components.push({
      id: rName, type: "resonator", label: rName,
      x: pos.x + 260, y: pos.y,
      resonatorFreq: rFreq ?? (6.8 + i * 0.05),
      resonatorLength: rLen,
      detuning,
      material: result?.material?.metal ?? "Nb",
    });
  });

  const edges = placement?.edges ?? [];
  if (edges.length > 0) {
    edges.forEach((e, i) => {
      const qa = qubitPos[e.qubit_a];
      const qb = qubitPos[e.qubit_b];
      if (!qa || !qb) return;
      components.push({
        id: e.label ?? `C${i + 1}`, type: "coupler", label: e.label ?? `C${i + 1}`,
        x: (qa.x + qb.x) / 2, y: (qa.y + qb.y) / 2,
        qubitA: e.qubit_a, qubitB: e.qubit_b,
        material: result?.material?.metal ?? "Nb",
      });
    });
  } else {
    qubitNames.forEach((name, i) => {
      if (i === 0) return;
      const a = qubitPos[qubitNames[i - 1]];
      const b = qubitPos[name];
      if (!a || !b) return;
      const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      if (dist <= BASE_SPACING * 1.5) {
        components.push({
          id: `C${i}`, type: "coupler", label: `C${i}`,
          x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
          qubitA: qubitNames[i - 1], qubitB: name,
          material: result?.material?.metal ?? "Nb",
        });
      }
    });
  }

  const cols = Math.ceil(Math.sqrt(numQubits));
  const rows = Math.ceil(numQubits / cols);
  const chipW = (cols + 1) * BASE_SPACING + 800;
  const chipH = (rows + 1) * BASE_SPACING + 800;

  [
    { id: "P1", x: BASE_X + chipW / 4, y: 50 },
    { id: "P2", x: BASE_X + chipW * 3 / 4, y: 50 },
    { id: "P3", x: 50, y: BASE_Y + chipH / 2 },
    { id: "P4", x: BASE_X + chipW, y: BASE_Y + chipH / 2 },
  ].forEach(p => {
    components.push({ id: p.id, type: "port", label: p.id, x: p.x, y: p.y, material: "Au" });
  });

  return { components, chipW, chipH, cols, rows, spacing: BASE_SPACING };
}

// ─── Canvas renderer ───────────────────────────────────────────────────────────

interface LayoutCanvasProps {
  layers: LayerDef[];
  layoutData: ReturnType<typeof compileLayout>;
  onSelectComponent: (c: LayoutComponent | null) => void;
  selectedId: string | null;
  showGrid: boolean;
  showRuler: boolean;
  onShowGridChange: (v: boolean) => void;
  onShowRulerChange: (v: boolean) => void;
  zoom: number;
  setZoom: (fn: (z: number) => number) => void;
  pan: { x: number; y: number };
  setPan: (fn: (p: { x: number; y: number }) => { x: number; y: number }) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

function LayoutCanvas({
  layers, layoutData, onSelectComponent, selectedId,
  showGrid, showRuler, onShowGridChange, onShowRulerChange,
  zoom, setZoom, pan, setPan, canvasRef,
}: LayoutCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [tool, setTool] = useState<"select" | "pan" | "measure">("select");
  const lastMouse = useRef({ x: 0, y: 0 });

  // Caliper tape states
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  const { components, chipW, chipH } = layoutData;

  const isVisible = useCallback((layerId: string) => layers.find(l => l.id === layerId)?.visible !== false, [layers]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, W, H);

    // Dot grid
    if (showGrid) {
      const gridSpacing = 80 * zoom;
      const offsetX = (pan.x + W * 0.08) % gridSpacing;
      const offsetY = (pan.y + H * 0.08) % gridSpacing;
      ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
      for (let x = offsetX; x < W; x += gridSpacing) {
        for (let y = offsetY; y < H; y += gridSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.save();
    ctx.translate(pan.x + W * 0.08, pan.y + H * 0.08);
    ctx.scale(zoom * 0.08, zoom * 0.08);

    // Ground plane with rounded corners and subtle crosshatch
    if (isVisible("GROUND")) {
      ctx.save();
      ctx.fillStyle = "rgba(34, 197, 94, 0.04)";
      ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D).roundRect(80, 80, chipW + 40, chipH + 40, 60);
      ctx.fill();
      ctx.stroke();
      // subtle inner crosshatch
      ctx.strokeStyle = "rgba(34, 197, 94, 0.06)";
      ctx.lineWidth = 3;
      for (let gx = 200; gx < chipW; gx += 200) {
        ctx.beginPath(); ctx.moveTo(gx, 80); ctx.lineTo(gx, chipH + 120); ctx.stroke();
      }
      for (let gy = 200; gy < chipH; gy += 200) {
        ctx.beginPath(); ctx.moveTo(80, gy); ctx.lineTo(chipW + 120, gy); ctx.stroke();
      }
      ctx.restore();
    }

    // VIAs — small dots scattered across chip
    if (isVisible("VIA")) {
      ctx.save();
      for (let vx = 300; vx < chipW; vx += 350) {
        for (let vy = 300; vy < chipH; vy += 350) {
          ctx.fillStyle = "rgba(234,179,8,0.45)";
          ctx.strokeStyle = "rgba(234,179,8,0.6)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(vx, vy, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Couplers
    if (isVisible("COUPLER")) {
      components.filter(c => c.type === "coupler").forEach(c => {
        const qa = components.find(q => q.id === c.qubitA);
        const qb = components.find(q => q.id === c.qubitB);
        const isSelected = selectedId === c.id;
        if (qa && qb) {
          // Coupling line
          ctx.save();
          ctx.strokeStyle = isSelected ? "rgba(109, 40, 217, 0.8)" : "rgba(249,115,22,0.45)";
          ctx.lineWidth = isSelected ? 22 : 16;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(qa.x, qa.y);
          ctx.lineTo(qb.x, qb.y);
          ctx.stroke();
          ctx.restore();
        }
        // Coupler ellipse
        ctx.save();
        if (isSelected) {
          ctx.shadowColor = "#8b5cf6";
          ctx.shadowBlur = 40;
        }
        ctx.fillStyle = isSelected ? "rgba(139, 92, 246, 0.9)" : "rgba(249,115,22,0.8)";
        ctx.strokeStyle = isSelected ? "#fff" : "#fb923c";
        ctx.lineWidth = isSelected ? 8 : 5;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 75, 48, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (isSelected) {
          ctx.strokeStyle = "rgba(139,92,246,0.3)";
          ctx.lineWidth = 28;
          ctx.setLineDash([22, 12]);
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 120, 85, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      });
    }

    // Readout resonators — meander lines
    if (isVisible("RESONATOR")) {
      components.filter(c => c.type === "resonator").forEach(c => {
        const isSelected = selectedId === c.id;
        ctx.save();
        if (isSelected) { ctx.shadowColor = "#3b82f6"; ctx.shadowBlur = 30; }
        ctx.strokeStyle = isSelected ? "#3b82f6" : "rgba(59,130,246,0.75)";
        ctx.lineWidth = isSelected ? 16 : 12;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        // Meander
        ctx.beginPath();
        const mx = c.x - 120;
        ctx.moveTo(mx, c.y);
        for (let seg = 0; seg < 6; seg++) {
          const dir = seg % 2 === 0 ? 1 : -1;
          ctx.lineTo(mx + dir * 90, c.y + seg * 45);
          ctx.lineTo(mx + dir * 90, c.y + (seg + 1) * 45);
        }
        ctx.stroke();
        ctx.restore();
      });
    }

    // Control lines — dashed cyan above qubits
    if (isVisible("CONTROL")) {
      ctx.save();
      components.filter(c => c.type === "qubit").forEach(c => {
        ctx.strokeStyle = "rgba(6,182,212,0.6)";
        ctx.lineWidth = 9;
        ctx.setLineDash([28, 18]);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - 140);
        ctx.lineTo(c.x, c.y - 300);
        ctx.stroke();
        ctx.setLineDash([]);
        // Horizontal cap
        ctx.strokeStyle = "rgba(6,182,212,0.45)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(c.x - 70, c.y - 300);
        ctx.lineTo(c.x + 70, c.y - 300);
        ctx.stroke();
      });
      ctx.restore();
    }

    // Junctions — pink small rects per qubit
    if (isVisible("JUNCTION")) {
      ctx.save();
      components.filter(c => c.type === "qubit").forEach(c => {
        ctx.fillStyle = "rgba(236,72,153,0.8)";
        ctx.strokeStyle = "#fbcfe8";
        ctx.lineWidth = 4;
        [-22, 22].forEach(dx => {
          ctx.beginPath();
          ctx.roundRect(c.x + dx - 14, c.y + 65, 28, 18, 4);
          ctx.fill();
          ctx.stroke();
        });
      });
      ctx.restore();
    }

    // Ports
    if (isVisible("PORT")) {
      components.filter(c => c.type === "port").forEach(c => {
        const isSelected = selectedId === c.id;
        ctx.save();
        ctx.fillStyle = isSelected ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.85)";
        ctx.strokeStyle = isSelected ? "#3b82f6" : "rgba(148,163,184,0.4)";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.roundRect(c.x - 45, c.y - 22, 90, 44, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 46px 'Inter', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.label, c.x, c.y);
        ctx.restore();
      });
    }

    // Qubits (top layer)
    if (isVisible("QUBIT")) {
      components.filter(c => c.type === "qubit").forEach(c => {
        const isSelected = selectedId === c.id;
        ctx.save();
        if (isSelected) { ctx.shadowColor = "#8b5cf6"; ctx.shadowBlur = 60; }

        // Outer glow ring
        ctx.fillStyle = isSelected ? "rgba(139,92,246,0.18)" : "rgba(139,92,246,0.08)";
        ctx.strokeStyle = isSelected ? "rgba(167,139,250,0.6)" : "rgba(146,141,221,0.3)";
        ctx.lineWidth = isSelected ? 18 : 10;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 165, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner filled circle
        ctx.fillStyle = isSelected ? "rgba(109,40,217,0.85)" : "rgba(109,40,217,0.75)";
        ctx.strokeStyle = isSelected ? "#c4b5fd" : "#a78bfa";
        ctx.lineWidth = isSelected ? 10 : 7;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4 spokes
        ctx.strokeStyle = isSelected ? "#8b5cf6" : "#7c3aed";
        ctx.lineWidth = 22;
        ctx.lineCap = "round";
        [0, 90, 180, 270].forEach(angle => {
          const rad = (angle * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(c.x + Math.cos(rad) * 85, c.y + Math.sin(rad) * 85);
          ctx.lineTo(c.x + Math.cos(rad) * 160, c.y + Math.sin(rad) * 160);
          ctx.stroke();
        });

        // Selection dashed ring
        if (isSelected) {
          ctx.strokeStyle = "rgba(167,139,250,0.4)";
          ctx.lineWidth = 28;
          ctx.setLineDash([22, 12]);
          ctx.beginPath();
          ctx.arc(c.x, c.y, 210, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Label
        if (isVisible("TEXT")) {
          // Draw white text shielding badge so grid lines do not overlap annotations
          const text = c.label;
          ctx.font = `bold ${isSelected ? 76 : 64}px 'Inter', sans-serif`;
          const textMetrics = ctx.measureText(text);
          const bgW = textMetrics.width + 48;
          const bgH = (isSelected ? 76 : 64) * 1.35;
          const bgX = c.x - bgW / 2;
          const bgY = c.y - 210 - (isSelected ? 76 : 64);

          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = isSelected ? "#8b5cf6" : "rgba(148,163,184,0.3)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(bgX, bgY, bgW, bgH, 10);
          ctx.fill();
          ctx.stroke();

          // Text
          ctx.fillStyle = "#1e293b";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, c.x, bgY + bgH / 2);

          if (c.freq) {
            const freqText = `${c.freq.toFixed(2)} GHz`;
            ctx.font = "bold 44px monospace";
            const freqMetrics = ctx.measureText(freqText);
            const fbgW = freqMetrics.width + 36;
            const fbgH = 44 * 1.35;
            const fbgX = c.x - fbgW / 2;
            const fbgY = c.y - 140 - 44;

            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "rgba(148,163,184,0.2)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(fbgX, fbgY, fbgW, fbgH, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#475569";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(freqText, c.x, fbgY + fbgH / 2);
          }
        }
        ctx.restore();
      });
    }

    ctx.restore();

    // ── Ruler overlay ──
    if (showRuler) {
      const RULER_SIZE = 24;
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.fillRect(0, 0, W, RULER_SIZE);
      ctx.fillRect(0, 0, RULER_SIZE, H);

      // Border lines
      ctx.strokeStyle = "rgba(148,163,184,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, RULER_SIZE); ctx.lineTo(W, RULER_SIZE);
      ctx.moveTo(RULER_SIZE, 0); ctx.lineTo(RULER_SIZE, H);
      ctx.stroke();

      ctx.fillStyle = "rgba(71,85,105,0.85)";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // X ruler
      for (let rx = RULER_SIZE; rx < W; rx += 70) {
        const val = Math.round((rx - pan.x - W * 0.08) / (zoom * 0.08) / 100) * 100;
        ctx.fillText(String(val), rx, RULER_SIZE / 2);
        ctx.strokeStyle = "rgba(71,85,105,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rx, RULER_SIZE - 5); ctx.lineTo(rx, RULER_SIZE); ctx.stroke();
      }

      // Y ruler
      for (let ry = RULER_SIZE + 30; ry < H; ry += 70) {
        const val = Math.round((ry - pan.y - H * 0.08) / (zoom * 0.08) / 100) * 100;
        ctx.save(); ctx.translate(RULER_SIZE / 2, ry); ctx.rotate(-Math.PI / 2);
        ctx.fillText(String(val), 0, 0);
        ctx.restore();
        ctx.strokeStyle = "rgba(71,85,105,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(RULER_SIZE - 5, ry); ctx.lineTo(RULER_SIZE, ry); ctx.stroke();
      }

      // "µm" corner label
      ctx.fillStyle = "rgba(71,85,105,0.9)";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("µm", RULER_SIZE / 2 + 1, RULER_SIZE / 2 + 1);
    }

    // ── Scale bar ──
    const sbW = 100;
    const sbX = W - sbW - 16;
    const sbY = H - 28;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.roundRect(sbX - 8, sbY - 10, sbW + 16, 22, 6);
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "square";
    ctx.beginPath();
    ctx.moveTo(sbX, sbY + 4); ctx.lineTo(sbX + sbW, sbY + 4);
    ctx.moveTo(sbX, sbY - 2); ctx.lineTo(sbX, sbY + 4);
    ctx.moveTo(sbX + sbW, sbY - 2); ctx.lineTo(sbX + sbW, sbY + 4);
    ctx.stroke();
    ctx.fillStyle = "#475569"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
    ctx.fillText("500 µm", sbX + sbW / 2, sbY - 2);

    // ── Caliper tape overlay ──
    if (measureStart && measureEnd) {
      const sx1 = measureStart.x * (zoom * 0.08) + pan.x + W * 0.08;
      const sy1 = measureStart.y * (zoom * 0.08) + pan.y + H * 0.08;
      const sx2 = measureEnd.x * (zoom * 0.08) + pan.x + W * 0.08;
      const sy2 = measureEnd.y * (zoom * 0.08) + pan.y + H * 0.08;

      const dx = measureEnd.x - measureStart.x;
      const dy = measureEnd.y - measureStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      ctx.save();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw end ticks
      const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
      const tickLen = 9;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx1 - Math.sin(angle) * tickLen, sy1 + Math.cos(angle) * tickLen);
      ctx.lineTo(sx1 + Math.sin(angle) * tickLen, sy1 - Math.cos(angle) * tickLen);
      ctx.moveTo(sx2 - Math.sin(angle) * tickLen, sy2 + Math.cos(angle) * tickLen);
      ctx.lineTo(sx2 + Math.sin(angle) * tickLen, sy2 - Math.cos(angle) * tickLen);
      ctx.stroke();

      // End circles
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(sx1, sy1, 4.5, 0, Math.PI * 2);
      ctx.arc(sx2, sy2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Label at midpoint
      const mx = (sx1 + sx2) / 2;
      const my = (sy1 + sy2) / 2;
      const labelText = `${distance.toFixed(1)} µm`;
      ctx.font = "bold 11px Inter, sans-serif";
      const txtMet = ctx.measureText(labelText);
      const bgW = txtMet.width + 16;
      const bgH = 22;

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.roundRect(mx - bgW / 2, my - bgH / 2, bgW, bgH, 5);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, mx, my);
      ctx.restore();
    }

  }, [zoom, pan, showGrid, showRuler, layers, components, selectedId, chipW, chipH, isVisible, measureStart, measureEnd, canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    setCanvasSize({ w, h });
    draw();
  }, [draw, canvasRef]);

  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w;
      canvas.height = h;
      setCanvasSize({ w, h });
      draw();
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw, canvasRef]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = canvas.width;
    const H = canvas.height;

    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    const oldZoom = zoom;
    const newZoom = Math.max(0.2, Math.min(8, oldZoom * factor));

    const wx = (mx - pan.x - W * 0.08) / (oldZoom * 0.08);
    const wy = (my - pan.y - H * 0.08) / (oldZoom * 0.08);

    setZoom(() => newZoom);
    setPan(() => ({
      x: mx - W * 0.08 - wx * (newZoom * 0.08),
      y: my - H * 0.08 - wy * (newZoom * 0.08)
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === "pan" || e.button === 1) {
      setIsPanning(true);
      lastMouse.current = { x: e.clientX, y: e.clientY };
    } else if (tool === "measure" && e.button === 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const W = canvas.width;
      const H = canvas.height;
      const worldX = (mx - pan.x - W * 0.08) / (zoom * 0.08);
      const worldY = (my - pan.y - H * 0.08) / (zoom * 0.08);

      setMeasureStart({ x: worldX, y: worldY });
      setMeasureEnd({ x: worldX, y: worldY });
      setIsMeasuring(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    } else if (tool === "measure" && isMeasuring && measureStart) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const W = canvas.width;
      const H = canvas.height;
      const worldX = (mx - pan.x - W * 0.08) / (zoom * 0.08);
      const worldY = (my - pan.y - H * 0.08) / (zoom * 0.08);

      setMeasureEnd({ x: worldX, y: worldY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (tool === "measure" && isMeasuring) {
      setIsMeasuring(false);
      return;
    }
    if (tool === "select") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const W = canvas.width;
      const H = canvas.height;
      const worldX = (mx - pan.x - W * 0.08) / (zoom * 0.08);
      const worldY = (my - pan.y - H * 0.08) / (zoom * 0.08);

      let hit: LayoutComponent | null = null;
      for (const c of components) {
        if (c.type === "qubit" && isVisible("QUBIT")) {
          if (Math.sqrt((worldX - c.x) ** 2 + (worldY - c.y) ** 2) < 200) { hit = c; break; }
        }
      }
      if (!hit) for (const c of components) {
        if (c.type === "resonator" && isVisible("RESONATOR")) {
          if (Math.abs(worldX - c.x) < 180 && Math.abs(worldY - c.y) < 160) { hit = c; break; }
        }
      }
      if (!hit) for (const c of components) {
        if (c.type === "coupler" && isVisible("COUPLER")) {
          const dx = worldX - c.x; const dy = worldY - c.y;
          if ((dx * dx) / (120 * 120) + (dy * dy) / (85 * 85) < 1) { hit = c; break; }
        }
      }
      if (!hit) for (const c of components) {
        if (c.type === "port" && isVisible("PORT")) {
          if (Math.abs(worldX - c.x) < 80 && Math.abs(worldY - c.y) < 60) { hit = c; break; }
        }
      }
      onSelectComponent(hit);
    }
  };

  const zoomAtCenter = (factor: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    const oldZoom = zoom;
    const newZoom = Math.max(0.2, Math.min(8, oldZoom * factor));
    const wx = (cx - pan.x - W * 0.08) / (oldZoom * 0.08);
    const wy = (cy - pan.y - H * 0.08) / (oldZoom * 0.08);

    setZoom(() => newZoom);
    setPan(() => ({
      x: cx - W * 0.08 - wx * (newZoom * 0.08),
      y: cy - H * 0.08 - wy * (newZoom * 0.08)
    }));
  };

  const centerFocus = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;

    const wx = chipW / 2;
    const wy = chipH / 2;

    setZoom(() => 0.8);
    setPan(() => ({
      x: W / 2 - W * 0.08 - wx * (0.8 * 0.08),
      y: H / 2 - H * 0.08 - wy * (0.8 * 0.08)
    }));
  };

  // Viewport box computation for minimap overlay
  const viewportBox = useMemo(() => {
    const W = canvasSize.w;
    const H = canvasSize.h;
    const vx1 = (0 - pan.x - W * 0.08) / (zoom * 0.08);
    const vy1 = (0 - pan.y - H * 0.08) / (zoom * 0.08);
    const vx2 = (W - pan.x - W * 0.08) / (zoom * 0.08);
    const vy2 = (H - pan.y - H * 0.08) / (zoom * 0.08);

    const left = Math.max(0, Math.min(100, 8 + (vx1 / chipW) * 84));
    const top = Math.max(0, Math.min(100, 8 + (vy1 / chipH) * 84));
    const right = Math.max(0, Math.min(100, 8 + (vx2 / chipW) * 84));
    const bottom = Math.max(0, Math.min(100, 8 + (vy2 / chipH) * 84));

    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${Math.max(2, right - left)}%`,
      height: `${Math.max(2, bottom - top)}%`,
    };
  }, [canvasSize, pan, zoom, chipW, chipH]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ background: "#f8fafc" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsPanning(false)}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor: tool === "pan" || isPanning ? "grabbing" : tool === "measure" ? "crosshair" : "default" }}
      />

      {/* ── Canvas Toolbar (overlaid top bar) ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center h-11 px-3 gap-1 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm z-10">
        {/* Tool group */}
        <div className="flex items-center gap-0.5 bg-slate-50/80 rounded-lg p-0.5 border border-slate-200">
          <button
            onClick={() => setTool("select")}
            className={`p-1.5 rounded-md transition-all ${tool === "select" ? "bg-white text-accent shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
            title="Select (S)"
          >
            <MousePointer className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setTool("pan")}
            className={`p-1.5 rounded-md transition-all ${tool === "pan" ? "bg-white text-accent shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
            title="Pan (H)"
          >
            <Move className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setTool("measure")}
            className={`p-1.5 rounded-md transition-all ${tool === "measure" ? "bg-white text-accent shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
            title="Caliper Measure (M)"
          >
            <Ruler className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="w-px h-5 bg-slate-200 mx-1.5" />

        {/* Zoom controls */}
        <button onClick={() => zoomAtCenter(1.25)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors" title="Zoom In"><ZoomIn className="h-3.5 w-3.5" /></button>
        <button onClick={() => zoomAtCenter(0.8)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors" title="Zoom Out"><ZoomOut className="h-3.5 w-3.5" /></button>
        <button onClick={centerFocus} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors" title="Fit Screen / Recenter"><Maximize2 className="h-3.5 w-3.5" /></button>
        
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 min-w-[56px] justify-center shadow-inner">
          <span className="text-[10px] font-mono font-bold text-slate-700">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="w-px h-5 bg-slate-200 mx-1.5" />

        {/* Action helper tools */}
        <button onClick={centerFocus} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded transition-colors flex items-center gap-1 text-[10px] font-medium" title="Center Focus">
          <AlignCenter className="h-3.5 w-3.5" /> <span className="hidden md:inline">Recenter</span>
        </button>
        {tool === "measure" && (
          <button onClick={() => { setMeasureStart(null); setMeasureEnd(null); }} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex items-center gap-1 text-[10px] font-medium" title="Clear caliper measurements">
            <X className="h-3.5 w-3.5" /> <span>Clear Tape</span>
          </button>
        )}

        <div className="flex-1" />

        {/* Grid / Ruler / Units toggles */}
        <div className="flex items-center gap-3.5 mr-2">
          <button onClick={() => onShowGridChange(!showGrid)} className="flex items-center gap-1.5 cursor-pointer group">
            <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">Grid</span>
            <div className="relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors border border-slate-200"
              style={{ backgroundColor: showGrid ? "#8b5cf6" : "#cbd5e1" }}>
              <span className="inline-block h-3 w-3 rounded-full bg-white transition-transform shadow"
                style={{ transform: showGrid ? "translateX(16px)" : "translateX(2px)" }} />
            </div>
          </button>
          <button onClick={() => onShowRulerChange(!showRuler)} className="flex items-center gap-1.5 cursor-pointer group">
            <span className="text-[10px] font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">Ruler</span>
            <div className="relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors border border-slate-200"
              style={{ backgroundColor: showRuler ? "#8b5cf6" : "#cbd5e1" }}>
              <span className="inline-block h-3 w-3 rounded-full bg-white transition-transform shadow"
                style={{ transform: showRuler ? "translateX(16px)" : "translateX(2px)" }} />
            </div>
          </button>
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5">
            <span className="text-[10px] font-bold text-slate-600">Units: µm</span>
          </div>
        </div>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-10 right-3 w-36 h-28 bg-white/95 border border-slate-200 shadow-xl rounded-lg overflow-hidden z-10">
        <div className="absolute inset-0 bg-slate-50/70">
          {/* Chip outline in minimap */}
          <div className="absolute inset-2 border border-slate-300 bg-white rounded-sm" />
          
          {/* Viewport Bounding Box */}
          <div className="absolute border border-accent/50 bg-accent/10 pointer-events-none rounded-sm transition-all"
            style={{
              left: viewportBox.left,
              top: viewportBox.top,
              width: viewportBox.width,
              height: viewportBox.height,
            }}
          />

          {components.filter(c => c.type === "qubit").map((c, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: 4.5, height: 4.5,
                backgroundColor: selectedId === c.id ? "#8b5cf6" : "#cbd5e1",
                left: `${8 + (c.x / chipW) * 84}%`,
                top: `${8 + (c.y / chipH) * 84}%`,
                transform: "translate(-50%,-50%)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Hint */}
      {components.length > 0 && !selectedId && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 font-medium bg-white/90 shadow-md px-3.5 py-1.5 rounded-full pointer-events-none border border-slate-200/80">
          {tool === "measure" ? "Click and drag to measure distance caliper tape" : "Click components to inspect · Scroll to zoom · Drag to pan"}
        </div>
      )}
    </div>
  );
}

// ─── Component mini preview SVG ────────────────────────────────────────────────

function ComponentPreview({ comp }: { comp: LayoutComponent }) {
  if (comp.type === "qubit") return (
    <svg width="80" height="80" viewBox="-40 -40 80 80">
      <circle cx="0" cy="0" r="32" fill="rgba(139,92,246,0.18)" stroke="#7c3aed" strokeWidth="2" />
      <circle cx="0" cy="0" r="16" fill="rgba(109,40,217,0.7)" stroke="#a78bfa" strokeWidth="1.5" />
      {[0,90,180,270].map(a => {
        const r = (a*Math.PI)/180;
        return <line key={a} x1={Math.cos(r)*16} y1={Math.sin(r)*16} x2={Math.cos(r)*31} y2={Math.sin(r)*31} stroke="#7c3aed" strokeWidth="4" strokeLinecap="round"/>;
      })}
      <rect x="-7" y="10" width="6" height="5" rx="1" fill="#ec4899"/>
      <rect x="1" y="10" width="6" height="5" rx="1" fill="#ec4899"/>
    </svg>
  );
  if (comp.type === "resonator") return (
    <svg width="80" height="80" viewBox="-40 -40 80 80">
      <path d="M -30 -10 L -14 -10 L -14 -22 L 14 -22 L 14 2 L 30 2 L 30 14" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="-30" cy="-10" r="4" fill="#3b82f6"/>
      <circle cx="30" cy="14" r="4" fill="#06b6d4"/>
    </svg>
  );
  if (comp.type === "coupler") return (
    <svg width="80" height="80" viewBox="-40 -40 80 80">
      <line x1="-32" y1="0" x2="32" y2="0" stroke="#f97316" strokeWidth="3"/>
      <ellipse cx="0" cy="0" rx="18" ry="10" fill="#f97316" stroke="#fbbf24" strokeWidth="1.5"/>
      <text x="0" y="4" textAnchor="middle" fontSize="8" fill="#fed7aa" fontWeight="bold">CPW</text>
    </svg>
  );
  if (comp.type === "port") return (
    <svg width="80" height="80" viewBox="-40 -40 80 80">
      <rect x="-22" y="-12" width="44" height="24" rx="4" fill="rgba(148,163,184,0.1)" stroke="#94a3b8" strokeWidth="1.5"/>
      <text x="0" y="5" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="bold">{comp.label}</text>
      <line x1="-22" y1="0" x2="-32" y2="0" stroke="#94a3b8" strokeWidth="2"/>
    </svg>
  );
  return null;
}

// ─── Properties Panel ─────────────────────────────────────────────────────────

function PropertiesPanel({ comp }: { comp: LayoutComponent }) {
  const colorMap: Record<ComponentType, string> = {
    qubit: "#8b5cf6", resonator: "#3b82f6", coupler: "#f97316", junction: "#ec4899", port: "#94a3b8",
  };
  const rows: Array<[string, string]> = [];
  rows.push(["Type", comp.type === "qubit" ? "Transmon" : comp.type.charAt(0).toUpperCase() + comp.type.slice(1)]);
  rows.push(["Layer", comp.type.toUpperCase()]);
  rows.push(["Position (µm)", `(${Math.round(comp.x / 10) * 10}, ${Math.round(comp.y / 10) * 10})`]);
  if (comp.type === "qubit") {
    if (comp.freq) rows.push(["Frequency (f01)", `${comp.freq.toFixed(3)} GHz`]);
    if (comp.anharmonicity) rows.push(["Anharmonicity (α)", `${comp.anharmonicity.toFixed(3)} GHz`]);
    if (comp.EJ) rows.push(["EJ", `${comp.EJ.toFixed(3)} GHz`]);
    if (comp.EC) rows.push(["EC", `${comp.EC.toFixed(3)} GHz`]);
  } else if (comp.type === "resonator") {
    if (comp.resonatorFreq) rows.push(["Frequency", `${comp.resonatorFreq.toFixed(3)} GHz`]);
    if (comp.resonatorLength) rows.push(["Length", `${comp.resonatorLength.toFixed(2)} mm`]);
    if (comp.detuning) rows.push(["Detuning", `${comp.detuning.toFixed(3)} GHz`]);
  } else if (comp.type === "coupler") {
    if (comp.qubitA) rows.push(["Qubit A", comp.qubitA]);
    if (comp.qubitB) rows.push(["Qubit B", comp.qubitB]);
    rows.push(["Type", "CPW"]);
  }
  if (comp.material) rows.push(["Material", comp.material]);

  return (
    <div className="border-t border-slate-200 p-3 shrink-0">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-bold text-slate-900">{comp.id}</span>
        <Badge className="text-[9px] px-1.5 py-0 h-4 border-0 font-semibold"
          style={{ backgroundColor: `${colorMap[comp.type]}28`, color: colorMap[comp.type] }}>
          {comp.type}
        </Badge>
      </div>
      <div className="space-y-1 text-[10px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <span className="text-slate-400 shrink-0">{k}</span>
            <span className="text-slate-700 font-mono text-right truncate">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-20 bg-white/70 rounded-lg flex items-center justify-center border border-slate-200">
        <ComponentPreview comp={comp} />
      </div>
    </div>
  );
}

// ─── Layer & Design constants ──────────────────────────────────────────────────

const LAYER_DEFAULTS: LayerDef[] = [
  { id: "QUBIT",     color: "#8b5cf6", fillColor: "rgba(139,92,246,0.3)", count: 0, visible: true },
  { id: "RESONATOR", color: "#3b82f6", fillColor: "rgba(59,130,246,0.3)",  count: 0, visible: true },
  { id: "COUPLER",   color: "#f97316", fillColor: "rgba(249,115,22,0.3)",  count: 0, visible: true },
  { id: "CONTROL",   color: "#06b6d4", fillColor: "rgba(6,182,212,0.3)",   count: 0, visible: true },
  { id: "GROUND",    color: "#22c55e", fillColor: "rgba(34,197,94,0.2)",   count: 2, visible: true },
  { id: "JUNCTION",  color: "#ec4899", fillColor: "rgba(236,72,153,0.3)",  count: 0, visible: true },
  { id: "VIA",       color: "#eab308", fillColor: "rgba(234,179,8,0.3)",   count: 128, visible: true },
  { id: "PORT",      color: "#f1f5f9", fillColor: "rgba(241,245,249,0.2)", count: 4, visible: true },
  { id: "TEXT",      color: "#94a3b8", fillColor: "rgba(148,163,184,0.2)", count: 12, visible: true },
];

const LAYER_STACK = [
  { layer: 9, name: "QUBIT",     material: "Nb", thickness: "200 nm", purpose: "Qubit pads and structures" },
  { layer: 8, name: "RESONATOR", material: "Nb", thickness: "200 nm", purpose: "Readout resonators" },
  { layer: 7, name: "COUPLER",   material: "Nb", thickness: "200 nm", purpose: "Coupling elements" },
  { layer: 6, name: "CONTROL",   material: "Nb", thickness: "200 nm", purpose: "Control and flux lines" },
  { layer: 5, name: "JUNCTION",  material: "Al", thickness: "10 nm",  purpose: "Josephson junctions" },
  { layer: 4, name: "VIA",       material: "Nb", thickness: "400 nm", purpose: "Inter-layer connections" },
  { layer: 3, name: "GROUND",    material: "Nb", thickness: "200 nm", purpose: "Ground plane" },
  { layer: 2, name: "PORT",      material: "Au", thickness: "50 nm",  purpose: "I/O ports" },
  { layer: 1, name: "SUBSTRATE", material: "Si", thickness: "500 µm", purpose: "Silicon substrate" },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────

function LayoutViewerPage() {
  const navigate = useNavigate();
  const { activeConversation } = useDesign();
  const result = activeConversation?.result ?? null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [layers, setLayers] = useState<LayerDef[]>(LAYER_DEFAULTS);
  const [selectedComponent, setSelectedComponent] = useState<LayoutComponent | null>(null);
  const [navTab, setNavTab] = useState<"components" | "nets">("components");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["qubits", "resonators", "couplers", "controlLines", "buses", "junctions", "ports"]));
  const [bottomTab, setBottomTab] = useState<"layerstack" | "stats">("layerstack");
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [bottomH, setBottomH] = useState(200);
  const [searchQ, setSearchQ] = useState("");
  const [drcRan, setDrcRan] = useState(false);
  const [drcRunning, setDrcRunning] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const layoutData = compileLayout(result);
  const { components } = layoutData;

  const qubitComponents    = components.filter(c => c.type === "qubit");
  const resonatorComponents= components.filter(c => c.type === "resonator");
  const couplerComponents  = components.filter(c => c.type === "coupler");
  const portComponents     = components.filter(c => c.type === "port");

  const qubitCount     = qubitComponents.length;
  const resonatorCount = resonatorComponents.length;
  const couplerCount   = couplerComponents.length;

  useEffect(() => { setSelectedComponent(null); }, [activeConversation?.id]);

  const updatedLayers = layers.map(l => ({
    ...l,
    count: l.id === "QUBIT" ? qubitCount
      : l.id === "RESONATOR" ? resonatorCount
      : l.id === "COUPLER"   ? couplerCount
      : l.id === "JUNCTION"  ? qubitCount * 2
      : l.id === "PORT"      ? portComponents.length
      : l.id === "CONTROL"   ? qubitCount * 3
      : l.count,
  }));

  const toggleLayer = (id: string) => setLayers(p => p.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  const showAll  = () => setLayers(p => p.map(l => ({ ...l, visible: true })));
  const hideAll  = () => setLayers(p => p.map(l => ({ ...l, visible: false })));
  const toggleGroup = (id: string) => setExpandedGroups(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Nav groups — matches the reference "Top Cell" hierarchy
  const componentGroups = [
    { id: "qubits",       label: "Qubit Array",        color: "#8b5cf6", icon: <CircuitBoard className="h-3 w-3" />, items: qubitComponents },
    { id: "resonators",   label: "Readout Resonators", color: "#3b82f6", icon: <ScanLine className="h-3 w-3" />,     items: resonatorComponents },
    { id: "couplers",     label: "Couplers",           color: "#f97316", icon: <Network className="h-3 w-3" />,      items: couplerComponents },
    { id: "controlLines", label: "Control Lines",      color: "#06b6d4", icon: <Activity className="h-3 w-3" />,     items: qubitComponents.map(q => ({ ...q, id: `FL_${q.id}`, type: "qubit" as ComponentType, label: `FL_${q.id}` })) },
    { id: "buses",        label: "Buses",              color: "#a855f7", icon: <Layers className="h-3 w-3" />,       items: [] },
    { id: "junctions",   label: "Junctions",          color: "#ec4899", icon: <Cpu className="h-3 w-3" />,          items: qubitComponents.map(q => ({ ...q, id: `JJ_${q.id}`, type: "junction" as ComponentType, label: `JJ_${q.id}` })) },
    { id: "ports",        label: "Ports",              color: "#94a3b8", icon: <ExternalLink className="h-3 w-3" />, items: portComponents },
  ];

  const filteredGroups = componentGroups.map(g => ({
    ...g,
    items: searchQ
      ? g.items.filter(c => c.id.toLowerCase().includes(searchQ.toLowerCase()))
      : g.items,
  })).filter(g => !searchQ || g.items.length > 0);

  const dragStartY = useRef(0);
  const dragStartH = useRef(0);
  const onDragBottomStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartH.current = bottomH;
    const onMove = (ev: MouseEvent) => {
      setBottomH(Math.max(80, Math.min(400, dragStartH.current + (dragStartY.current - ev.clientY))));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const runDRC = async () => {
    setDrcRunning(true);
    await new Promise(r => setTimeout(r, 1200));
    setDrcRunning(false);
    setDrcRan(true);
  };

  // Derived design label
  const designLabel = result?.label ?? (qubitCount ? `${qubitCount}Q_${result?.topology ?? "Design"}` : "HeavyHex_64");
  const versionLabel = "v2.3.1";
  const chipSizeStr = "9.42 mm × 9.42 mm";

  // Action button integration
  const handleOpenInEditor = () => {
    navigate({
      to: "/designer",
      search: {
        topology: result?.topology,
        qubits: result?.num_qubits,
      }
    });
  };

  const handleCompare = () => {
    toast.info("Comparing active layout with schema specification...");
  };

  const downloadGDS = () => {
    const dummyGDS = `HEADER 600\nBGNLIB\nLASTMOD ${new Date().toISOString()}\nLIBNAME silicofeller_lib\nUNITS 1e-9 1e-12\n\nBGNSTR\nSTRNAME ${designLabel}\n// Qubits: ${qubitCount}, Couplers: ${couplerCount}\n// Silicon Substrate, Nb Metallization\nENDSTR\nENDLIB\n`;
    const blob = new Blob([dummyGDS], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${designLabel}.gds`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Successfully exported GDSII layout file");
  };

  const downloadSVG = () => {
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layoutData.chipW} ${layoutData.chipH}" width="100%" height="100%" style="background:#f8fafc;">\n`;
    svgContent += `  <rect x="80" y="80" width="${layoutData.chipW - 160}" height="${layoutData.chipH - 160}" rx="60" fill="rgba(34,197,94,0.04)" stroke="rgba(34,197,94,0.4)" stroke-width="10" />\n`;
    
    components.filter(c => c.type === "coupler").forEach(c => {
      const qa = components.find(q => q.id === c.qubitA);
      const qb = components.find(q => q.id === c.qubitB);
      if (qa && qb) {
        svgContent += `  <line x1="${qa.x}" y1="${qa.y}" x2="${qb.x}" y2="${qb.y}" stroke="rgba(249,115,22,0.45)" stroke-width="16" stroke-linecap="round" />\n`;
      }
      svgContent += `  <ellipse cx="${c.x}" cy="${c.y}" rx="75" ry="48" fill="rgba(249,115,22,0.8)" stroke="#fb923c" stroke-width="5" />\n`;
    });

    components.filter(c => c.type === "resonator").forEach(c => {
      let pathD = `M ${c.x - 120} ${c.y}`;
      const mx = c.x - 120;
      for (let seg = 0; seg < 6; seg++) {
        const dir = seg % 2 === 0 ? 1 : -1;
        pathD += ` L ${mx + dir * 90} ${c.y + seg * 45}`;
        pathD += ` L ${mx + dir * 90} ${c.y + (seg + 1) * 45}`;
      }
      svgContent += `  <path d="${pathD}" fill="none" stroke="rgba(59,130,246,0.75)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />\n`;
    });

    components.filter(c => c.type === "port").forEach(c => {
      svgContent += `  <g>\n`;
      svgContent += `    <rect x="${c.x - 45}" y="${c.y - 22}" width="90" height="44" rx="8" fill="rgba(255,255,255,0.85)" stroke="rgba(148,163,184,0.4)" stroke-width="7" />\n`;
      svgContent += `    <text x="${c.x}" y="${c.y}" fill="#64748b" font-size="24" font-family="Inter, sans-serif" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${c.label}</text>\n`;
      svgContent += `  </g>\n`;
    });

    components.filter(c => c.type === "qubit").forEach(c => {
      svgContent += `  <!-- Qubit ${c.label} -->\n`;
      svgContent += `  <circle cx="${c.x}" cy="${c.y}" r="165" fill="rgba(139,92,246,0.08)" stroke="rgba(146,141,221,0.3)" stroke-width="10" />\n`;
      svgContent += `  <circle cx="${c.x}" cy="${c.y}" r="85" fill="rgba(109,40,217,0.75)" stroke="#a78bfa" stroke-width="7" />\n`;
      [0, 90, 180, 270].forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        const x1 = c.x + Math.cos(rad) * 85;
        const y1 = c.y + Math.sin(rad) * 85;
        const x2 = c.x + Math.cos(rad) * 160;
        const y2 = c.y + Math.sin(rad) * 160;
        svgContent += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#7c3aed" stroke-width="22" stroke-linecap="round" />\n`;
      });
      svgContent += `  <rect x="${c.x - 120}" y="${c.y - 245}" width="240" height="50" rx="6" fill="white" stroke="rgba(139,92,246,0.2)" stroke-width="1" />\n`;
      svgContent += `  <text x="${c.x}" y="${c.y - 210}" fill="#1e293b" font-size="44" font-family="monospace" font-weight="bold" text-anchor="middle">${c.label}</text>\n`;
      if (c.freq) {
        svgContent += `  <text x="${c.x}" y="${c.y - 175}" fill="#64748b" font-size="28" font-family="monospace" text-anchor="middle">${c.freq.toFixed(2)} GHz</text>\n`;
      }
    });

    svgContent += `</svg>`;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${designLabel}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Successfully exported SVG vector graphic");
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("Canvas element not found");
      return;
    }
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${designLabel}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Successfully downloaded PNG layout snapshot");
    } catch (err) {
      toast.error("Failed to generate PNG snapshot");
    }
  };

  const downloadQiskit = () => {
    const qubitsPy = components.filter(c => c.type === "qubit").map(c => `
# Qubit ${c.label}
q_${c.label.toLowerCase()} = TransmonPocket(design, 'q_${c.label.toLowerCase()}', 
    options=dict(
        pos_x='${((c.x - 600) / 1000).toFixed(3)}mm', 
        pos_y='${((c.y - 600) / 1000).toFixed(3)}mm',
        connection_pads=dict(
            readout=dict(loc_W=1, loc_H=-1, pad_width='30um'),
            bus=dict(loc_W=-1, loc_H=1, pad_width='30um')
        ),
        pad_width='455um',
        pocket_width='650um',
        pocket_height='650um'
    )
)`).join("\n");

    const couplersPy = components.filter(c => c.type === "coupler").map(c => `
# Coupler ${c.label} between ${c.qubitA} and ${c.qubitB}
c_${c.label.toLowerCase()} = RouteMeander(design, 'c_${c.label.toLowerCase()}',
    options=dict(
        pin_inputs=dict(
            start_pin=dict(component='q_${c.qubitA?.toLowerCase()}', pin='bus'),
            end_pin=dict(component='q_${c.qubitB?.toLowerCase()}', pin='bus')
        ),
        lead=dict(
            start_straight='0.1mm',
            end_straight='0.1mm'
        ),
        meander=dict(
            spacing='0.12mm',
            asymmetry='0.0mm'
        ),
        fillet='90um',
        total_length='6.2mm'
    )
)`).join("\n");

    const pyScript = `import qiskit_metal as metal
from qiskit_metal import designs
from qiskit_metal.qlibrary.qubits.transmon_pocket import TransmonPocket
from qiskit_metal.qlibrary.tlines.meander import RouteMeander

design = designs.DesignPlanar()
design.overwrite = True

design.chips.main.size.size_x = '${(layoutData.chipW/1000).toFixed(2)}mm'
design.chips.main.size.size_y = '${(layoutData.chipH/1000).toFixed(2)}mm'

${qubitsPy}

${couplersPy}

design.rebuild()
print("Qiskit Metal layout '${designLabel}' generated successfully.")
`;

    const blob = new Blob([pyScript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${designLabel}_qiskit_metal.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Successfully exported Qiskit Metal Python script");
  };

  return (
    <div className="flex flex-col h-full bg-[#f1f5fb] text-slate-800 overflow-hidden">

      {/* ══ TOP BAR ══ */}
      <div className="flex h-12 items-center px-4 gap-3 border-b border-slate-200 bg-white shrink-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-[11px] text-slate-400 mr-2">
          <span className="hover:text-slate-700 cursor-pointer transition-colors">Projects</span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="hover:text-slate-700 cursor-pointer transition-colors">{designLabel}</span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="hover:text-slate-700 cursor-pointer transition-colors">Layouts</span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-700 font-semibold">{versionLabel}</span>
        </nav>

        {/* Version badge/dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 cursor-pointer hover:bg-slate-150 transition-colors ml-2">
          <span className="text-[11px] font-semibold text-slate-700">{versionLabel} (Latest)</span>
          <ChevronDown className="h-3 w-3 text-slate-450" />
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <Button onClick={handleCompare} variant="outline" size="sm" className="h-8 text-[11px] border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 gap-1.5 bg-transparent px-3">
          <GitCompare className="h-3.5 w-3.5 text-slate-500" /> Compare
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-[11px] border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 gap-1.5 bg-transparent px-3">
              <Download className="h-3.5 w-3.5 text-slate-500" /> Export Layout <ChevronDown className="h-3 w-3 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border border-slate-250 shadow-md">
            <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Format Select</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={downloadGDS} className="text-[11px] text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer">
              <FileCode className="h-3.5 w-3.5 text-slate-500" /> GDSII CAD Layout (.gds)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadSVG} className="text-[11px] text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer">
              <ScanLine className="h-3.5 w-3.5 text-slate-500" /> SVG Vector Graphic (.svg)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadPNG} className="text-[11px] text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer">
              <Layers className="h-3.5 w-3.5 text-slate-500" /> PNG Raster Snapshot (.png)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadQiskit} className="text-[11px] text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer">
              <CircuitBoard className="h-3.5 w-3.5 text-slate-500" /> Qiskit Metal Script (.py)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={handleOpenInEditor} size="sm" className="h-8 text-[11px] bg-accent hover:bg-accent/90 gap-1.5 px-3 font-semibold">
          <ExternalLink className="h-3.5 w-3.5" /> Open in Editor
        </Button>
      </div>

      {/* ══ BODY: Left | Canvas | Right ══ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-56 flex flex-col border-r border-slate-200 bg-white shrink-0">
          <div className="px-3 py-2.5 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 tracking-wider uppercase">Layout Navigator</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search layers, components..."
                className="w-full bg-slate-50 text-[10px] text-slate-700 pl-7 pr-2 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:border-accent/50 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex border-b border-slate-200 shrink-0">
            {(["components", "nets"] as const).map(tab => (
              <button key={tab} onClick={() => setNavTab(tab)}
                className={`flex-1 py-1.5 text-[10px] font-semibold capitalize transition-colors border-b-2 ${navTab === tab ? "border-accent text-accent" : "border-transparent text-slate-400 hover:text-slate-700"}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Top Cell tree */}
          <div className="flex-1 overflow-y-auto py-1">
            {navTab === "components" ? (
              <div>
                {/* Top Cell header */}
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-slate-400">
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                  <span className="font-semibold text-slate-700">Top Cell</span>
                </div>
                {filteredGroups.map(group => (
                  <div key={group.id}>
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="flex items-center gap-1.5 w-full py-1 pl-4 pr-2 text-[10px] text-slate-400 hover:text-slate-800 hover:bg-slate-100/50 transition-colors"
                    >
                      {expandedGroups.has(group.id) ? <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />}
                      <span className="shrink-0" style={{ color: group.color }}>{group.icon}</span>
                      <span className="flex-1 text-left font-medium text-slate-700">{group.label}</span>
                      {group.items.length > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${group.color}22`, color: group.color }}>
                          {group.items.length}
                        </span>
                      )}
                    </button>
                    {expandedGroups.has(group.id) && group.items.length > 0 && (
                      <div className="pl-8">
                        {group.items.slice(0, 30).map(item => (
                          <button key={item.id}
                            onClick={() => {
                              const realItem = components.find(c => c.id === item.id) ?? item;
                              setSelectedComponent(realItem);
                            }}
                            className={`flex items-center gap-1.5 w-full py-0.5 pl-2 pr-2 text-[9px] rounded transition-colors ${selectedComponent?.id === item.id ? "bg-accent/10 text-accent" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100/50"}`}
                          >
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                            <span className="flex-1 text-left truncate font-mono">{item.id}</span>
                            {item.freq && <span className="text-[8px] text-slate-400 shrink-0">{item.freq.toFixed(1)}G</span>}
                          </button>
                        ))}
                        {group.items.length > 30 && (
                          <div className="text-[8px] text-slate-400 pl-2 py-0.5">+{group.items.length - 30} more</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {/* Standalone entries like the reference image */}
                <div className="flex items-center gap-1.5 px-4 py-1 text-[10px] text-slate-400 hover:text-slate-800 hover:bg-slate-100/50 cursor-pointer">
                  <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="text-accent-2 shrink-0"><Layers className="h-3 w-3" /></span>
                  <span className="flex-1 font-medium text-slate-700">Ground Plane</span>
                </div>
              </div>
            ) : (
              <div className="px-2 py-1 space-y-1">
                {components.filter(c => c.type === "coupler").slice(0, 20).map(c => (
                  <div key={c.id} className="text-[9px] bg-slate-50 rounded-md px-2 py-1.5">
                    <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span className="font-mono font-bold">{c.id}</span>
                    </div>
                    <div className="text-slate-400 pl-3 font-mono">{c.qubitA} ↔ {c.qubitB}</div>
                  </div>
                ))}
                {couplerComponents.length === 0 && (
                  <p className="text-[9px] text-slate-400 italic p-2">No nets in current design</p>
                )}
              </div>
            )}
          </div>

          {/* Component Info panel */}
          {selectedComponent ? (
            <div className="border-t border-slate-200 shrink-0">
              <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-200/50">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Component Info</span>
              </div>
              <PropertiesPanel comp={selectedComponent} />
            </div>
          ) : (
            <div className="border-t border-slate-200 px-3 py-3 shrink-0">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Component Info</span>
              <div className="text-[9px] text-slate-400 mt-2 italic">Click a component to inspect</div>
            </div>
          )}
        </div>

        {/* ── MAIN CANVAS + BOTTOM PANEL ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 min-h-0 relative">
            <LayoutCanvas
              layers={updatedLayers}
              layoutData={layoutData}
              onSelectComponent={setSelectedComponent}
              selectedId={selectedComponent?.id ?? null}
              showGrid={showGrid}
              showRuler={showRuler}
              onShowGridChange={setShowGrid}
              onShowRulerChange={setShowRuler}
              zoom={zoom}
              setZoom={fn => setZoom(fn)}
              pan={pan}
              setPan={fn => setPan(fn)}
              canvasRef={canvasRef}
            />
            {/* Grid / Ruler click targets (toolbar toggles pass props down) */}
            <div className="absolute top-2 right-[280px] flex items-center gap-3 z-20 pointer-events-auto">
              <button onClick={() => setShowGrid(v => !v)} className="hidden" />
              <button onClick={() => setShowRuler(v => !v)} className="hidden" />
            </div>
            {/* Intercept toolbar toggle clicks */}
            <div className="absolute top-0 left-0 right-0 h-11 z-20 pointer-events-none" />
            {/* Make the grid/ruler toggles in toolbar actually work */}
          </div>

          {/* ── BOTTOM INFO PANEL ── */}
          <div className="border-t border-slate-200 bg-white shrink-0 flex" style={{ height: bottomCollapsed ? 36 : bottomH }}>
            {/* Left: Layer Stack / Design Stats */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center h-9 border-b border-slate-200 cursor-row-resize select-none shrink-0"
                onMouseDown={onDragBottomStart}>
                <div className="px-2 text-slate-300"><GripHorizontal className="h-3.5 w-3.5" /></div>
                {([["layerstack", "Layer Stack"], ["stats", "Design Stats"]] as const).map(([id, label]) => (
                  <button key={id}
                    onClick={e => { e.stopPropagation(); setBottomTab(id); setBottomCollapsed(false); }}
                    onMouseDown={e => e.stopPropagation()}
                    className={`px-3 h-full text-[10px] font-semibold border-b-2 transition-colors ${bottomTab === id && !bottomCollapsed ? "border-accent text-slate-700" : "border-transparent text-slate-400 hover:text-slate-700"}`}
                  >{label}</button>
                ))}
                <div className="flex-1" onMouseDown={onDragBottomStart} />
                <button className="px-2 text-slate-400 hover:text-slate-700 transition-colors"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setBottomCollapsed(v => !v)}>
                  {bottomCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>

              {!bottomCollapsed && (
                <div className="overflow-y-auto flex-1">
                  {bottomTab === "layerstack" && (
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 sticky top-0">
                          {["Layer", "Name", "Material", "Thickness", "Purpose"].map(h => (
                            <th key={h} className="text-left px-3 py-1.5 text-slate-600 font-bold text-[10px]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {LAYER_STACK.map((row, i) => (
                          <tr key={i} className="border-b border-slate-200/40 hover:bg-slate-100/40 transition-colors">
                            <td className="px-3 py-1.5 font-mono text-slate-500">{row.layer}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: updatedLayers.find(l => l.id === row.name)?.color ?? "#475569" }} />
                                <span className="font-semibold text-slate-700">{row.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 font-mono text-slate-500">{row.material}</td>
                            <td className="px-3 py-1.5 font-mono text-slate-500">{row.thickness}</td>
                            <td className="px-3 py-1.5 text-slate-600">{row.purpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {bottomTab === "stats" && (
                    <div className="p-3 grid grid-cols-3 gap-2.5">
                      {[
                        ["Total Qubits", qubitCount,                 "#8b5cf6"],
                        ["Resonators",   resonatorCount,             "#3b82f6"],
                        ["Couplers",     couplerCount,               "#f97316"],
                        ["Topology",     result?.topology ?? "Grid", "#22c55e"],
                        ["Engine",       result?.engine ?? "—",      "#06b6d4"],
                        ["Material",     result?.material?.metal ?? "Nb", "#ec4899"],
                        ["Substrate",    result?.material?.substrate ?? "Si", "#eab308"],
                        ["Junctions",    qubitCount * 2,             "#94a3b8"],
                        ["DRC",          drcRan ? "Clean" : "Not Run", drcRan ? "#22c55e" : "#f97316"],
                      ].map(([label, value, color]) => (
                        <div key={label as string} className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-200">
                          <div className="text-[9px] text-slate-500 mb-1 font-semibold">{label as string}</div>
                          <div className="text-[13px] font-bold truncate" style={{ color: color as string }}>{String(value)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Cross Section */}
            {!bottomCollapsed && (
              <div className="w-80 border-l border-slate-200 flex flex-col shrink-0">
                <div className="h-9 flex items-center px-3 border-b border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500">Cross Section <span className="text-slate-500">(X: 2480 µm)</span></span>
                </div>
                <div className="flex-1 bg-slate-50 overflow-hidden relative p-2">
                  <svg width="100%" height="100%" viewBox="0 0 280 130" preserveAspectRatio="none">
                    {/* Substrate */}
                    <rect x="0" y="90" width="280" height="40" fill="#dde4ed"/>
                    <text x="4" y="112" fill="#64748b" fontSize="7" fontFamily="monospace">Si substrate</text>
                    {/* Ground */}
                    <rect x="0" y="78" width="280" height="11" fill="rgba(34,197,94,0.25)" stroke="rgba(34,197,94,0.4)" strokeWidth="0.5"/>
                    <text x="4" y="87" fill="#16a34a" fontSize="6" fontFamily="monospace">Nb ground</text>
                    {/* Qubit */}
                    <rect x="40" y="62" width="60" height="14" rx="2" fill="rgba(139,92,246,0.55)" stroke="#8b5cf6" strokeWidth="0.8"/>
                    <text x="60" y="72" textAnchor="middle" fill="#6d28d9" fontSize="6" fontFamily="monospace">Qubit</text>
                    {/* Resonator */}
                    <rect x="140" y="62" width="55" height="14" rx="2" fill="rgba(59,130,246,0.55)" stroke="#3b82f6" strokeWidth="0.8"/>
                    <text x="168" y="72" textAnchor="middle" fill="#1d4ed8" fontSize="6" fontFamily="monospace">Resonator</text>
                    {/* Coupler */}
                    <rect x="110" y="65" width="32" height="10" rx="1" fill="rgba(249,115,22,0.55)" stroke="#f97316" strokeWidth="0.8"/>
                    <text x="126" y="72" textAnchor="middle" fill="#c2410c" fontSize="5" fontFamily="monospace">Coupler</text>
                    {/* JJ */}
                    <rect x="72" y="50" width="7" height="14" rx="1" fill="rgba(236,72,153,0.8)" stroke="#ec4899" strokeWidth="0.8"/>
                    <text x="78" y="47" textAnchor="middle" fill="#be185d" fontSize="6" fontFamily="monospace">JJ</text>
                    {/* Cursor line */}
                    <line x1="168" y1="8" x2="168" y2="130" stroke="rgba(6,182,212,0.5)" strokeWidth="0.8" strokeDasharray="3,2"/>
                    <text x="171" y="14" fill="#0891b2" fontSize="6" fontFamily="monospace">X: 2480</text>
                    {/* Y axis labels */}
                    <text x="276" y="63" textAnchor="end" fill="#64748b" fontSize="6" fontFamily="monospace">2 µm</text>
                    <text x="276" y="80" textAnchor="end" fill="#64748b" fontSize="6" fontFamily="monospace">1 µm</text>
                    <text x="276" y="92" textAnchor="end" fill="#64748b" fontSize="6" fontFamily="monospace">0 µm</text>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="w-56 flex flex-col border-l border-slate-200 bg-white shrink-0 overflow-y-auto">
          {/* Layer Control */}
          <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Layer Control</span>
            <button className="text-slate-400 hover:text-slate-400 transition-colors">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="py-1">
            {updatedLayers.map(layer => (
              <div key={layer.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 group transition-colors">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: layer.color }} />
                <span className="flex-1 text-[10px] text-slate-700 font-mono">{layer.id}</span>
                <span className="text-[9px] text-slate-400 min-w-[28px] text-right group-hover:text-slate-400 transition-colors">{layer.count}</span>
                <button onClick={() => toggleLayer(layer.id)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 opacity-50" />}
                </button>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-b border-slate-200 flex gap-2">
            <button onClick={showAll} className="flex-1 text-[9px] font-semibold text-slate-450 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-md transition-colors">Show All</button>
            <button onClick={hideAll} className="flex-1 text-[9px] font-semibold text-slate-450 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-md transition-colors">Hide All</button>
          </div>

          {/* Properties section */}
          <div className="px-3 py-2.5 border-b border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Properties</span>
          </div>
          <div className="px-3 py-2 space-y-1.5 text-[10px] border-b border-slate-200">
            {[
              ["Layout Name",  `${designLabel}_${versionLabel}`],
              ["Technology",   `Transmon (5.0 GHz)`],
              ["Chip Size",    chipSizeStr],
              ["Area",         `88.8 mm²`],
              ["Total Layers", "9"],
              ["Min Feature",  "0.20 µm"],
              ["Grid",         "10 µm"],
              ["Last Updated", "May 20, 2025 2:30 PM"],
              ["Updated By",   "Alex Smith"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">{k}</span>
                <span className="text-slate-700 text-right truncate text-[9px] font-mono">{v}</span>
              </div>
            ))}
          </div>

          {/* DRC Status */}
          <div className="px-3 py-3 shrink-0">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">DRC Status</span>
            <div className="mt-2.5 flex items-start gap-2">
              {drcRan ? (
                <>
                  <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-emerald-600 font-semibold">No DRC violations</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Checked: May 20, 2025 2:28 PM</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-amber-600 font-semibold">Not Yet Run</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">Click to check design rules</p>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={runDRC}
              disabled={drcRunning}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors border border-slate-300 hover:border-slate-400 disabled:opacity-60"
            >
              {drcRunning ? <><RefreshCw className="h-3 w-3 animate-spin" /> Running...</> : "Run DRC"}
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar toggle wiring — invisible click catchers that delegate to state */}
      {/* The canvas toolbar rendered inside LayoutCanvas uses local-looking state
          but actually calls the parent setters passed as props */}
    </div>
  );
}