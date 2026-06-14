import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  RefreshCw,
  Download,
  Bookmark,
  Info,
  Maximize,
  Minimize,
  Sparkles,
  Layers,
  ChevronDown,
  FileCode,
  X,
  CheckCircle2,
  Check,
  Copy,
  ChevronRight,
  ArrowRight,
  Network
} from "lucide-react";
import { useDesign, type Conversation } from "@/lib/design-context";
import { type GenerateResponse } from "@/lib/api/backend";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/architecture-explorer")({
  head: () => ({ meta: [{ title: "Architecture Explorer — Silicofeller" }] }),
  component: ArchitectureExplorerPage,
});

// --- PHYSICS ENGINE DATA ---
const TECH_METADATA: Record<string, any> = {
  "transmon": { coherenceTime: 120, baseFidelity: 99.2, qubitArea: 0.08, coolingPerQubit: 0.010, controlLinesPerQubit: 2, readoutLinesPerQubit: 1, gateTime: "200 ns", symbol: "□", color: "#8b5cf6" },
  "fluxonium": { coherenceTime: 350, baseFidelity: 99.7, qubitArea: 0.12, coolingPerQubit: 0.018, controlLinesPerQubit: 3, readoutLinesPerQubit: 1, gateTime: "300 ns", symbol: "◯", color: "#ec4899" },
  "xmon": { coherenceTime: 110, baseFidelity: 99.1, qubitArea: 0.09, coolingPerQubit: 0.011, controlLinesPerQubit: 2, readoutLinesPerQubit: 1, gateTime: "250 ns", symbol: "✚", color: "#3b82f6" },
  "flux-qubit": { coherenceTime: 40, baseFidelity: 99.1, qubitArea: 0.05, coolingPerQubit: 0.020, controlLinesPerQubit: 2, readoutLinesPerQubit: 1, gateTime: "400 ns", symbol: "⊙", color: "#f59e0b" },
  "charge-qubit": { coherenceTime: 5, baseFidelity: 95.0, qubitArea: 0.01, coolingPerQubit: 0.005, controlLinesPerQubit: 1, readoutLinesPerQubit: 1, gateTime: "500 ns", symbol: "◇", color: "#ef4444" },
  "phase-qubit": { coherenceTime: 10, baseFidelity: 98.0, qubitArea: 0.02, coolingPerQubit: 0.010, controlLinesPerQubit: 1, readoutLinesPerQubit: 1, gateTime: "450 ns", symbol: "△", color: "#10b981" },
  "gatemon": { coherenceTime: 20, baseFidelity: 98.5, qubitArea: 0.04, coolingPerQubit: 0.008, controlLinesPerQubit: 1, readoutLinesPerQubit: 1, gateTime: "200 ns", symbol: "⬢", color: "#14b8a6" }
};

// --- CUSTOM REACT FLOW NODES ---
const CustomQubitNode = ({ data }: any) => {
  const meta = TECH_METADATA[data.technology] || TECH_METADATA['transmon'];
  const isPhysical = data.viewMode === 'physical';
  const isSelected = data.isSelected;

  if (isPhysical) {
    return (
      <div 
        className={cn(
          "relative flex items-center justify-center rounded-lg border-2 bg-[#1e293b]/90 transition-all duration-300",
          isSelected 
            ? "border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-110" 
            : "border-slate-700 hover:border-amber-500/60 shadow-inner"
        )}
        style={{ width: '42px', height: '42px' }}
      >
        <Handle type="target" position={Position.Top} className="opacity-0" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <Handle type="source" position={Position.Bottom} className="opacity-0" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        
        {/* Gold Pocket structures inside GDS layer */}
        <div className="absolute inset-2 border border-amber-500/35 rounded-sm flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-amber-400 rotate-45"></div>
        </div>

        {/* Junction cross representation inside the pocket */}
        <div className="absolute w-2 h-px bg-amber-500"></div>
        <div className="absolute h-2 w-px bg-amber-500"></div>
        
        {/* Node ID label */}
        <div className="absolute -top-5 text-[8.5px] text-slate-400 font-mono font-bold tracking-tight">{data.label}</div>
      </div>
    );
  }
  
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center rounded-xl border-2 bg-white transition-all duration-300 shadow-sm cursor-pointer",
        isSelected 
          ? "border-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.35)] scale-110" 
          : "border-slate-200 hover:border-violet-400"
      )}
      style={{ width: '44px', height: '44px' }}
    >
      <Handle type="target" position={Position.Top} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }} />
      <span style={{ color: meta.color, fontWeight: 'bold', fontSize: '18px', zIndex: 10 }}>{meta.symbol}</span>
      <div style={{ position: 'absolute', top: -20, fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{data.label}</div>
    </div>
  );
};

const CustomReadoutNode = () => (
  <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'white', border: '2px solid #3b82f6', boxShadow: '0 0 4px rgba(59, 130, 246, 0.5)' }}>
    <Handle type="target" position={Position.Top} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }} />
    <Handle type="source" position={Position.Bottom} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 }} />
  </div>
);

// --- CUSTOM REACT FLOW EDGES ---
const CustomCouplerEdge = ({ id, sourceX, sourceY, targetX, targetY, style = {}, markerEnd, data }: any) => {
  const isPhysical = data?.viewMode === 'physical';

  if (isPhysical) {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.hypot(dx, dy);
    
    let path = "";
    if (len > 35) {
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy;
      const py = ux;
      
      const amp = 8; // Amplitude of meanders
      const step = len / 6;
      
      const p1x = sourceX + ux * step * 1.5 + px * amp;
      const p1y = sourceY + uy * step * 1.5 + py * amp;
      
      const p2x = sourceX + ux * step * 2.5 - px * amp;
      const p2y = sourceY + uy * step * 2.5 - py * amp;
      
      const p3x = sourceX + ux * step * 3.5 + px * amp;
      const p3y = sourceY + uy * step * 3.5 + py * amp;
      
      const p4x = sourceX + ux * step * 4.5 - px * amp;
      const p4y = sourceY + uy * step * 4.5 - py * amp;
      
      path = `M ${sourceX} ${sourceY} ` +
             `L ${sourceX + ux * step} ${sourceY + uy * step} ` +
             `L ${p1x} ${p1y} ` +
             `L ${p2x} ${p2y} ` +
             `L ${p3x} ${p3y} ` +
             `L ${p4x} ${p4y} ` +
             `L ${sourceX + ux * step * 5} ${sourceY + uy * step * 5} ` +
             `L ${targetX} ${targetY}`;
    } else {
      path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }

    return (
      <path
        d={path}
        fill="none"
        stroke="#F59E0B" // Golden meanders
        strokeWidth={1.8}
        opacity={0.75}
      />
    );
  }

  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  let path = edgePath;
  let strokeDasharray = "none";
  let color = data?.topology === 'heavy-hex' ? "#8B5CF6" : "#cbd5e1";

  if (data?.coupler === 'readout') color = "#60A5FA";
  else if (data?.coupler === 'tunable') color = "#3b82f6";
  else if (data?.coupler === 'flux-tunable') color = "#8b5cf6";
  else if (data?.coupler === 'inductive') { color = "#10b981"; strokeDasharray = "5,5"; }
  else if (data?.coupler === 'resonator-bus') color = "#f59e0b";
  else if (data?.coupler === 'cross-resonance') { color = "#ef4444"; strokeDasharray = "10,5"; }

  const strokeWidth = data?.coupler === 'readout' ? 1.5 : (data?.topology === 'heavy-hex' ? 2 : 2.5);

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={{ ...style, stroke: color, strokeWidth, strokeDasharray }} />
      {data?.coupler === 'resonator-bus' && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, background: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: 10, border: `1px solid ${color}`, color, fontWeight: 'bold', pointerEvents: 'none' }}>
            R
          </div>
        </EdgeLabelRenderer>
      )}
      {data?.coupler === 'tunable' && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, color, fontSize: 14, pointerEvents: 'none' }}>◉</div>
        </EdgeLabelRenderer>
      )}
      {data?.coupler === 'flux-tunable' && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, color, fontSize: 14, pointerEvents: 'none' }}>⊗</div>
        </EdgeLabelRenderer>
      )}
      {data?.coupler === 'cross-resonance' && (
        <EdgeLabelRenderer>
          <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`, color, fontSize: 14, pointerEvents: 'none' }}>~&gt;</div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// --- TOPOLOGY GENERATION ALGORITHMS ---
function generateArchitecture(technology: string, topology: string, coupler: string, numQubits: number) {
  const nodes: any[] = [];
  const edges: any[] = [];
  
  if (numQubits < 1) return { nodes, edges };

  const spacing = 160;
  
  if (topology === 'linear') {
    for (let i = 0; i < numQubits; i++) {
      nodes.push({ id: `Q${i+1}`, position: { x: i * spacing, y: 0 }, data: { topology, label: `Q${i+1}`, technology }, type: 'qubit' });
    }
    for (let i = 0; i < numQubits - 1; i++) {
      edges.push({ id: `e-Q${i+1}-Q${i+2}`, source: `Q${i+1}`, target: `Q${i+2}`, type: 'coupler', data: { topology, coupler } });
    }
  } else if (topology === 'ring') {
    const r = Math.max(100, (numQubits * spacing) / (2 * Math.PI));
    for (let i = 0; i < numQubits; i++) {
      const angle = (i * 2 * Math.PI) / numQubits - Math.PI / 2;
      nodes.push({ id: `Q${i+1}`, position: { x: r * Math.cos(angle), y: r * Math.sin(angle) }, data: { topology, label: `Q${i+1}`, technology }, type: 'qubit' });
    }
    for (let i = 0; i < numQubits; i++) {
      edges.push({ id: `e-${i}`, source: `Q${i+1}`, target: `Q${((i + 1) % numQubits) + 1}`, type: 'coupler', data: { topology, coupler } });
    }
  } else if (topology === '2d-grid') {
    const cols = Math.ceil(Math.sqrt(numQubits));
    for (let i = 0; i < numQubits; i++) {
      nodes.push({ id: `Q${i+1}`, position: { x: (i % cols) * spacing, y: Math.floor(i / cols) * spacing }, data: { topology, label: `Q${i+1}`, technology }, type: 'qubit' });
    }
    for (let i = 0; i < numQubits; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      if (c + 1 < cols && i + 1 < numQubits) {
        edges.push({ id: `eh-${i}`, source: `Q${i+1}`, target: `Q${i+2}`, type: 'coupler', data: { topology, coupler } });
      }
      if (r + 1 < Math.ceil(numQubits / cols) && i + cols < numQubits) {
        edges.push({ id: `ev-${i}`, source: `Q${i+1}`, target: `Q${i+cols+1}`, type: 'coupler', data: { topology, coupler } });
      }
    }
  } else if (topology === 'heavy-hex') {
    const R = spacing * 0.6;
    const W = Math.sqrt(3) * R;
    const H = 1.5 * R;
    const tempNodes = [];
    for (let row = -10; row <= 10; row++) {
      for (let col = -10; col <= 10; col++) {
        const cx = col * W + (Math.abs(row) % 2 === 1 ? W / 2 : 0);
        const cy = row * H;
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 6 + (Math.PI / 3) * i;
          tempNodes.push({ x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle), dist: Math.hypot(cx, cy) });
        }
      }
    }
    tempNodes.sort((a, b) => a.dist - b.dist);
    const finalNodes: any[] = [];
    for (const tn of tempNodes) {
      let isDup = false;
      for (const fn of finalNodes) {
        if (Math.hypot(tn.x - fn.x, tn.y - fn.y) < 2) {
          isDup = true; break;
        }
      }
      if (!isDup && finalNodes.length < numQubits) {
        finalNodes.push({ x: tn.x, y: tn.y });
      }
    }
    finalNodes.forEach((n1, i) => {
      nodes.push({ id: `Q${i+1}`, position: { x: n1.x, y: n1.y }, data: { topology, label: `Q${i+1}`, technology }, type: 'qubit' });
    });
    for (let i = 0; i < finalNodes.length; i++) {
      for (let j = i + 1; j < finalNodes.length; j++) {
        const dist = Math.hypot(finalNodes[i].x - finalNodes[j].x, finalNodes[j].y - finalNodes[j].y);
        if (dist > R * 0.9 && dist < R * 1.1) {
          edges.push({ id: `e-${i}-${j}`, source: `Q${i+1}`, target: `Q${j+1}`, type: 'coupler', data: { topology, coupler } });
        }
      }
    }
  } else if (topology === 'all-to-all') {
    const r = Math.max(100, (numQubits * spacing) / (2 * Math.PI));
    for (let i = 0; i < numQubits; i++) {
      const angle = (i * 2 * Math.PI) / numQubits - Math.PI / 2;
      nodes.push({ id: `Q${i+1}`, position: { x: r * Math.cos(angle), y: r * Math.sin(angle) }, data: { topology, label: `Q${i+1}`, technology }, type: 'qubit' });
    }
    for (let i = 0; i < numQubits; i++) {
      for (let j = i + 1; j < numQubits; j++) {
        edges.push({ id: `e-${i}-${j}`, source: `Q${i+1}`, target: `Q${j+1}`, type: 'coupler', data: { topology, coupler } });
      }
    }
  } else {
    for (let i = 0; i < numQubits; i++) {
      nodes.push({ id: `Q${i+1}`, position: { x: Math.random() * 500 - 250, y: Math.random() * 500 - 250 }, data: { topology, label: `Q${i+1}`, technology }, type: 'qubit' });
    }
    for (let i = 0; i < numQubits; i++) {
       const dists = nodes.map((n, j) => ({ j, d: Math.hypot(nodes[i].position.x - n.position.x, nodes[i].position.y - n.position.y) })).sort((a,b) => a.d - b.d);
       if (dists[1]) edges.push({ id: `e-${i}-1`, source: `Q${i+1}`, target: `Q${dists[1].j + 1}`, type: 'coupler', data: { topology, coupler } });
       if (dists[2] && Math.random() > 0.5) edges.push({ id: `e-${i}-2`, source: `Q${i+1}`, target: `Q${dists[2].j + 1}`, type: 'coupler', data: { topology, coupler } });
    }
  }

  return { nodes, edges };
}

// --- METRICS ENGINE ---
function computeMetrics(nodes: any[], edges: any[], tech: string, topology: string, coupler: string, freq: number, numQubits: number) {
  const meta = TECH_METADATA[tech] || TECH_METADATA['transmon'];
  const N = numQubits;
  const numEdges = edges.length;
  
  const avgConn = N > 0 ? ((2 * numEdges) / N) : 0;
  const chipArea = (N * meta.qubitArea + numEdges * 0.05 + N * 0.02 + N * 0.01).toFixed(2);
  
  const sqFidelity = Math.min(99.99, meta.baseFidelity + (freq < 5 ? 0.05 : 0));
  const tqFidelity = Math.min(99.99, meta.baseFidelity + (coupler === 'tunable' ? 0.2 : coupler === 'flux-tunable' ? 0.4 : 0) - (topology === 'all-to-all' ? 1.0 : 0) - (N > 50 ? 0.5 : 0));
  const roFidelity = Math.max(90.0, meta.baseFidelity - 0.5);
  
  const qv = Math.floor(Math.min(1048576, Math.pow(2, Math.min(N, 15)) * (tqFidelity / 100)));
  const t1 = meta.coherenceTime;
  const t2 = Math.floor(meta.coherenceTime * 0.7);
  const errRate = (100 - tqFidelity).toFixed(2);
  
  let crosstalk = 'Medium';
  if (topology === 'all-to-all' || (topology === 'heavy-hex' && coupler === 'fixed') || freq > 6) crosstalk = 'High';
  else if (coupler === 'tunable' || coupler === 'flux-tunable' || topology === 'linear') crosstalk = 'Low';
  
  const dcFlux = (coupler === 'tunable' || coupler === 'flux-tunable') ? N : 0;
  const totalPower = (N * 1.5 + numEdges * 0.5 + dcFlux * 0.2).toFixed(1);
  const coolingLoad = (N * meta.coolingPerQubit * 1000).toFixed(1);
  
  let routing = 'Medium';
  if (topology === 'all-to-all') routing = 'Very High';
  else if (topology === 'heavy-hex') routing = 'Low';
  else if (topology === '2d-grid') routing = 'Medium';
  else if (topology === 'linear') routing = 'High';
  
  let scaleScore = 50;
  if (topology === 'heavy-hex') scaleScore = 95;
  else if (topology === '2d-grid') scaleScore = 80;
  else if (topology === 'all-to-all') scaleScore = 10;
  else if (topology === 'ring') scaleScore = 30;
  
  if (tech === 'transmon' || tech === 'gatemon') scaleScore += 5;
  if (coupler === 'tunable') scaleScore += 5;
  scaleScore = Math.min(100, Math.max(0, scaleScore));
  
  let ft = 'Moderate';
  if (tqFidelity > 99.5 && (topology === '2d-grid' || topology === 'heavy-hex')) ft = 'Excellent';
  else if (tqFidelity > 99.0) ft = 'Good';
  else if (tqFidelity < 98.0) ft = 'Poor';
  
  let surfaceCode = 'Poor';
  if (topology === '2d-grid' || topology === 'heavy-hex') surfaceCode = 'Excellent';
  else if (topology === 'ring') surfaceCode = 'Moderate';
  
  const effScore = Math.floor(0.3 * tqFidelity + 0.2 * Math.min(100, avgConn * 20) + 0.15 * Math.min(100, t1) + 0.15 * scaleScore + 0.1 * 80 + 0.1 * (routing === 'Low' ? 100 : 50));
  
  const maxEdges = (N * (N - 1)) / 2;
  const utilScore = maxEdges > 0 ? ((numEdges / maxEdges) * 100).toFixed(1) : "0.0";
  
  let ent = 'Medium';
  if (avgConn > 3.5) ent = 'Very High';
  else if (avgConn > 2.5) ent = 'High';
  else if (avgConn < 1.5) ent = 'Low';
  
  let rank = "Research Prototype";
  if (N > 100 && effScore > 85 && ft === 'Excellent') rank = "Fault-Tolerant Candidate";
  else if (N > 40 && effScore > 75) rank = "Near-Term Quantum Processor";
  else if (N > 10) rank = "Industrial Prototype";
  
  const warnings = [];
  if (tqFidelity < 98) warnings.push("Fidelity critically low (< 98%).");
  if (crosstalk === 'High') warnings.push("High crosstalk risk detected.");
  if (parseFloat(coolingLoad) > 5000) warnings.push("Cooling load exceeds typical dilution refrigerator capacity.");
  if (N * meta.controlLinesPerQubit > 1000) warnings.push("Control line count requires massive cabling overhead.");
  if (topology === 'all-to-all' && N > 10) warnings.push("All-to-all topology is unroutable for large Qubit counts.");
  if (tech === 'charge-qubit' && topology === 'heavy-hex') warnings.push("Charge qubits suffer high noise in hex configurations.");

  return {
    architectureSummary: { qubits: N, couplers: numEdges, averageConnectivity: avgConn.toFixed(1), chipArea, longestPath: Math.ceil(Math.sqrt(N) * 1.5) },
    performanceMetrics: { singleQubitFidelity: sqFidelity.toFixed(2), twoQubitFidelity: tqFidelity.toFixed(2), readoutFidelity: roFidelity.toFixed(2), gateTime: meta.gateTime, quantumVolume: qv },
    reliabilityMetrics: { T1: t1, T2: t2, errorRate: errRate, crosstalkRisk: crosstalk },
    resourceMetrics: { controlLines: N * meta.controlLinesPerQubit, readoutLines: N, dcFluxLines: dcFlux, totalPower, coolingLoad },
    scalabilityMetrics: { routingComplexity: routing, scalabilityScore: scaleScore, faultToleranceReadiness: ft, surfaceCodeCompatibility: surfaceCode },
    validationMetrics: { architectureEfficiencyScore: effScore, hardwareUtilizationScore: utilScore, entanglementCapability: ent, architectureRanking: rank },
    warnings,
    overallArchitectureScore: effScore
  };
}

// --- TOPOLOGY PRESETS FOR METADATA COMPARISON ---
type TopologyPreset = {
  id: string;
  name: string;
  qubits: number;
};
const TOPOLOGY_PRESETS: TopologyPreset[] = [
  { id: "heavy-hex", name: "Heavy Hex", qubits: 27 },
  { id: "2d-grid", name: "Surface Code", qubits: 49 },
  { id: "linear", name: "Linear Chain", qubits: 7 },
  { id: "ring", name: "Ring", qubits: 9 },
  { id: "star", name: "Star Hub", qubits: 7 },
  { id: "all-to-all", name: "All-to-All", qubits: 6 },
];

const SUITABILITY_DATA: Record<string, { recommended: string[], notIdeal: string[] }> = {
  "heavy-hex": {
    recommended: ["Surface Code Research", "IBM Style Architectures", "Medium Scale Chips"],
    notIdeal: ["Fully Connected Gates", "Small Educational Designs"]
  },
  "2d-grid": {
    recommended: ["Fault-Tolerant QEC Research", "Planar Grid Lithography", "Large Scale 2D Lattices"],
    notIdeal: ["Low Crosstalk Waveguide Routing", "Small Educational Designs"]
  },
  "linear": {
    recommended: ["NISQ Variational Algorithms", "1D Periodic Boundary Mapping", "Cryogenic Crosstalk Analysis"],
    notIdeal: ["Fault-Tolerant QEC Lattices", "Fully Connected Gates"]
  },
  "ring": {
    recommended: ["Noise Benchmarking & Validation", "Closed-Loop Periodic Boundary Tests", "Educational Demonstrations"],
    notIdeal: ["Large Scale Commercial Processing", "High Connectivity Multi-Qubit Gates"]
  },
  "star": {
    recommended: ["Centralized Bus Coupling Tests", "Hub-and-Spoke Cryogenic Routing", "Fast Multi-Qubit CZ Gate Sets"],
    notIdeal: ["Multi-Dimensional Scaling", "High Density Planar Layouts"]
  },
  "all-to-all": {
    recommended: ["Ion-Trap Style Emulation", "Dense Mathematical Graph Mapping", "Low Depth High Connectivity Algorithms"],
    notIdeal: ["Planar Superconducting Lithography", "Crosstalk Isolation on Silicon"]
  },
  "custom": {
    recommended: ["Arbitrary Graph Matching", "Non-planar Coupler Exploration", "Research Prototype Designs"],
    notIdeal: ["Standard Commercial Foundry Taping", "Automated Routing Compilers"]
  }
};

function getDynamicQCLangCode(topology: string, numQubits: number): string {
  let code = `// QCLang topology description for ${topology} (${numQubits}Q)\n`;
  code += `register q[${numQubits}];\n\n`;
  
  if (topology === 'linear') {
    code += `// Linear chain couplers\n`;
    for (let i = 0; i < numQubits - 1; i++) {
      code += `connect q[${i}], q[${i+1}];\n`;
    }
  } else if (topology === 'ring') {
    code += `// Ring couplers\n`;
    for (let i = 0; i < numQubits; i++) {
      code += `connect q[${i}], q[${(i+1) % numQubits}];\n`;
    }
  } else if (topology === '2d-grid' || topology === 'grid') {
    code += `// 2D Grid couplers\n`;
    const cols = Math.ceil(Math.sqrt(numQubits));
    for (let i = 0; i < numQubits; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      if (c + 1 < cols && i + 1 < numQubits) {
        code += `connect q[${i}], q[${i+1}]; // Horizontal\n`;
      }
      if (r + 1 < Math.ceil(numQubits / cols) && i + cols < numQubits) {
        code += `connect q[${i}], q[${i+cols}]; // Vertical\n`;
      }
    }
  } else if (topology === 'heavy-hex') {
    code += `// Heavy hex ring and cross-couplings\n`;
    for (let i = 0; i < numQubits - 1; i++) {
      if (i % 3 !== 2) {
        code += `connect q[${i}], q[${i+1}];\n`;
      }
    }
    for (let i = 0; i < numQubits - 6; i += 6) {
      code += `connect q[${i}], q[${i+5}]; // cross ring\n`;
    }
  } else if (topology === 'all-to-all') {
    code += `// All-to-all fully connected mesh\n`;
    for (let i = 0; i < Math.min(10, numQubits); i++) {
      for (let j = i + 1; j < Math.min(10, numQubits); j++) {
        code += `connect q[${i}], q[${j}];\n`;
      }
    }
    if (numQubits > 10) {
      code += `// ... truncated connection list for brevity (total ${numQubits}Q fully connected)\n`;
    }
  } else {
    code += `// Custom layout couplings\n`;
    for (let i = 0; i < Math.min(5, numQubits - 1); i++) {
      code += `connect q[${i}], q[${i+1}];\n`;
    }
  }
  return code;
}

// Helper to seed direct schematic creation payload
function generatePresetDesignPayload(nodes: any[], edges: any[], topologyName: string, numQubits: number): GenerateResponse {
  const xs = nodes.map(n => n.position.x);
  const ys = nodes.map(n => n.position.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const scale = 8.0;
  const placementQubits = nodes.map(n => {
    const normX = (n.position.x - minX) / rangeX;
    const normY = (n.position.y - minY) / rangeY;
    return {
      name: n.id,
      x: parseFloat(((normX - 0.5) * scale).toFixed(3)),
      y: parseFloat((-(normY - 0.5) * scale).toFixed(3)),
    };
  });

  const placementEdges = edges.map((e, idx) => ({
    qubit_a: e.source,
    pin_a: "a",
    qubit_b: e.target,
    pin_b: "b",
    label: `bus_${idx + 1}`,
  }));

  const qubitFreqs: Record<string, number> = {};
  const resFreqs: Record<string, number> = {};
  const resLengths: Record<string, number> = {};
  const EJ: Record<string, number> = {};
  const EC: Record<string, number> = {};

  nodes.forEach((n, i) => {
    const qName = n.id;
    const roName = `RO_${qName}`;
    const group = i % 2 === 0;
    qubitFreqs[qName] = parseFloat((5.0 + (group ? -0.08 : 0.08) + ((i * 0.011) % 0.05)).toFixed(4));
    EJ[qName] = parseFloat((12.5 + ((i * 0.1) % 0.4)).toFixed(3));
    EC[qName] = parseFloat((0.275 + ((i * 0.002) % 0.01)).toFixed(5));
    resFreqs[roName] = parseFloat((qubitFreqs[qName] + 1.5 + ((i * 0.02) % 0.1)).toFixed(4));
    resLengths[roName] = parseFloat((7.5 - ((i * 0.05) % 0.3)).toFixed(4));
  });

  return {
    label: `${topologyName} ${numQubits}Q Design`,
    num_qubits: numQubits,
    topology: topologyName,
    engine: "preset-generator",
    interpretation: `Directly initialized ${topologyName} ${numQubits}Q design preset. Ready for schematic capture and custom layout routing.`,
    drc: { passed: true, violations: [] },
    frequency_plan: {
      epsilon_eff: 6.27,
      qubit_frequencies_GHz: qubitFreqs,
      qubit_groups: Object.fromEntries(Object.keys(qubitFreqs).map((k, i) => [k, i % 2])),
      EJ_GHz: EJ,
      EC_GHz: EC,
      resonator_frequencies_GHz: resFreqs,
      resonator_lengths_mm: resLengths,
      detunings_GHz: Object.fromEntries(Object.keys(resFreqs).map((k) => [k, 1.5])),
      warnings: [],
      substrate: "silicon",
      metal: "aluminum",
    },
    placement: {
      solver: "preset",
      topology: topologyName.toLowerCase().replace(" ", "-"),
      qubits: placementQubits,
      edges: placementEdges,
    },
    material: { substrate: "silicon", metal: "aluminum" },
    code: `# Preset layout — ${topologyName} ${numQubits}Q\nimport qiskit_metal as metal\nfrom qiskit_metal import designs\nfrom qiskit_metal.qlibrary.qubits.transmon_pocket import TransmonPocket\n\ndesign = designs.DesignPlanar()\ndesign.overwrite_enabled = True\n${placementQubits.map((q) => `${q.name.toLowerCase()} = TransmonPocket(design, '${q.name}', options=dict(pos_x='${q.x}mm', pos_y='${q.y}mm'))`).join("\n")}\ndesign.rebuild()`,
  };
}

// --- MAIN PAGE ---
function ArchitectureExplorerPage() {
  const [technology, setTechnology] = useState(() => sessionStorage.getItem('arch-technology') || "transmon");
  const [topology, setTopology] = useState(() => sessionStorage.getItem('arch-topology') || "heavy-hex");
  const [coupler, setCoupler] = useState(() => sessionStorage.getItem('arch-coupler') || "fixed");
  const [numQubits, setNumQubits] = useState(() => parseInt(sessionStorage.getItem('arch-numQubits') || "27"));
  const [frequency, setFrequency] = useState(() => parseFloat(sessionStorage.getItem('arch-frequency') || "5.00"));
  const [lod, setLod] = useState(() => sessionStorage.getItem('arch-lod') || "balanced");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Custom states added for platform compliance
  const [viewMode, setViewMode] = useState<"connectivity" | "physical">("connectivity");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareWithTopology, setCompareWithTopology] = useState("2d-grid");
  const [qclangModalOpen, setQclangModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();
  const { setConversations, setActiveId } = useDesign();

  useEffect(() => {
    sessionStorage.setItem('arch-technology', technology);
    sessionStorage.setItem('arch-topology', topology);
    sessionStorage.setItem('arch-coupler', coupler);
    sessionStorage.setItem('arch-numQubits', numQubits.toString());
    sessionStorage.setItem('arch-frequency', frequency.toString());
    sessionStorage.setItem('arch-lod', lod);
  }, [technology, topology, coupler, numQubits, frequency, lod]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => 
    generateArchitecture(technology, topology, coupler, numQubits), 
    [technology, topology, coupler, numQubits]
  );
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync ReactFlow nodes with data structure updates and custom selection/viewMode states
  const nodesWithSelectedState = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        isSelected: n.id === selectedNode,
        viewMode,
      }
    }));
  }, [nodes, selectedNode, viewMode]);

  const edgesWithSelectedState = useMemo(() => {
    return edges.map(e => ({
      ...e,
      data: {
        ...e.data,
        viewMode,
      }
    }));
  }, [edges, viewMode]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback((params: any) => 
    setEdges((eds) => addEdge({ ...params, type: 'coupler', data: { coupler } }, eds)), 
    [coupler, setEdges]
  );

  const metrics = useMemo(() => 
    computeMetrics(nodes, edges, technology, topology, coupler, frequency, numQubits), 
    [nodes, edges, technology, topology, coupler, frequency, numQubits]
  );

  // Compute side-by-side comparison metrics
  const targetComparisonPreset = TOPOLOGY_PRESETS.find(t => t.id === compareWithTopology) || TOPOLOGY_PRESETS[0];
  const targetMetrics = useMemo(() => {
    const targetNodesAndEdges = generateArchitecture(technology, targetComparisonPreset.id, coupler, targetComparisonPreset.qubits);
    return computeMetrics(targetNodesAndEdges.nodes, targetNodesAndEdges.edges, technology, targetComparisonPreset.id, coupler, frequency, targetPresetQubits(targetComparisonPreset.id));
  }, [technology, compareWithTopology, coupler, frequency]);

  function targetPresetQubits(id: string): number {
    return TOPOLOGY_PRESETS.find(t => t.id === id)?.qubits || 10;
  }

  // Node selection handler
  const onNodeClick = (_e: any, node: any) => {
    setSelectedNode(prev => prev === node.id ? null : node.id);
  };

  const neighbors = useMemo(() => {
    if (!selectedNode) return [];
    const coupled = new Set<string>();
    edges.forEach(e => {
      if (e.source === selectedNode) coupled.add(e.target);
      if (e.target === selectedNode) coupled.add(e.source);
    });
    return Array.from(coupled);
  }, [selectedNode, edges]);

  const nodeTypes = useMemo(() => ({ qubit: CustomQubitNode, readout: CustomReadoutNode }), []);
  const edgeTypes = useMemo(() => ({ coupler: CustomCouplerEdge }), []);

  const dynamicQClangCode = useMemo(() => 
    getDynamicQCLangCode(topology, numQubits), 
    [topology, numQubits]
  );

  const copyQclangCode = () => {
    navigator.clipboard.writeText(dynamicQClangCode);
    setCopied(true);
    toast.success("QCLang layout description copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQclangFile = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([dynamicQClangCode], { type: "text/plain" }));
    a.download = `${topology.toLowerCase().replace(" ", "_")}_topology.qcl`;
    a.click();
    toast.success("QCLang file downloaded successfully!");
  };

  const currentSuitability = SUITABILITY_DATA[topology] || SUITABILITY_DATA["custom"];

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB] select-none text-left">
      <div className="mx-auto max-w-[1500px] px-8 py-8 flex flex-col gap-6">
        
        {/* Header Block */}
        <div className="flex items-center justify-between border-b border-slate-200/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-100/60 flex items-center justify-center">
              <Network className="h-5 w-5 text-violet-600 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Architecture Explorer</h1>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Explore dynamically generated chip architectures, resource requirements, and wafer routing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={compareMode ? "default" : "outline"} 
              onClick={() => {
                setCompareMode(v => !v);
                setSelectedNode(null);
              }}
              className={cn("rounded-xl text-xs font-bold h-9 shadow-sm active:scale-95 transition-all", compareMode && "bg-violet-600 hover:bg-violet-700 text-white border-violet-600")}
            >
              Compare Mode
            </Button>
            <Button variant="outline" className="rounded-xl text-xs font-bold h-9 shadow-sm active:scale-95 transition-all gap-1.5" onClick={() => {
              localStorage.setItem('saved-quantum-architecture', JSON.stringify({ technology, topology, coupler, numQubits, frequency }));
              toast.success('Architecture configuration successfully saved!');
            }}>
              <Bookmark className="h-4 w-4 text-slate-500" /> Save
            </Button>
            <Button variant="outline" className="rounded-xl text-xs font-bold h-9 shadow-sm active:scale-95 transition-all gap-1.5" onClick={() => {
              const report = `# Quantum Architecture Report\n\n## Configuration\n- Technology: ${technology}\n- Topology: ${topology}\n- Coupler: ${coupler}\n- Qubit Count: ${numQubits}\n- Target Frequency: ${frequency} GHz\n\n## Dynamic Metrics\n- Total Qubits: ${metrics.architectureSummary?.qubits}\n- Couplers: ${metrics.architectureSummary?.couplers}\n- Avg Degree: ${metrics.architectureSummary?.averageConnectivity}\n- Scalability Score: ${metrics.scalabilityMetrics?.scalabilityScore}/100\n`;
              const blob = new Blob([report], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `quantum-architecture-report.md`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Engineering report exported successfully!');
            }}>
              <Download className="h-4 w-4 text-slate-500" /> Export Report
            </Button>
          </div>
        </div>

        {/* Top Controls Bar */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-6">
          <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Technology</label>
              <Select value={technology} onValueChange={(val) => { setTechnology(val); setSelectedNode(null); }}>
                <SelectTrigger className="h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-900 bg-slate-50/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transmon">Transmon</SelectItem>
                  <SelectItem value="flux-qubit">Flux Qubit</SelectItem>
                  <SelectItem value="charge-qubit">Charge Qubit</SelectItem>
                  <SelectItem value="phase-qubit">Phase Qubit</SelectItem>
                  <SelectItem value="xmon">Xmon</SelectItem>
                  <SelectItem value="fluxonium">Fluxonium</SelectItem>
                  <SelectItem value="gatemon">Gatemon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target Qubits</label>
              <Input type="number" min={1} max={100} value={numQubits} onChange={(e) => { setNumQubits(Math.max(1, Number(e.target.value) || 1)); setSelectedNode(null); }} className="h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-900 bg-slate-50/50" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">Topology</label>
              <Select value={topology} onValueChange={(val) => { setTopology(val); setSelectedNode(null); }}>
                <SelectTrigger className="h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-900 bg-slate-50/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear Chain</SelectItem>
                  <SelectItem value="ring">Ring</SelectItem>
                  <SelectItem value="2d-grid">2D Grid (Surface Code)</SelectItem>
                  <SelectItem value="heavy-hex">Heavy-Hex</SelectItem>
                  <SelectItem value="all-to-all">All-to-All</SelectItem>
                  <SelectItem value="custom">Custom Graph</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">Frequency</label>
              <div className="relative">
                <Input type="number" step="0.1" value={frequency} onChange={(e) => setFrequency(Number(e.target.value) || 5.0)} className="h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-900 bg-slate-50/50 pr-12" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">GHz</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">Coupler</label>
              <Select value={coupler} onValueChange={setCoupler}>
                <SelectTrigger className="h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-900 bg-slate-50/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="tunable">Tunable</SelectItem>
                  <SelectItem value="flux-tunable">Flux-Tunable</SelectItem>
                  <SelectItem value="resonator-bus">Resonator Bus</SelectItem>
                  <SelectItem value="inductive">Inductive</SelectItem>
                  <SelectItem value="cross-resonance">Cross-Resonance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">Detail level</label>
              <Select value={lod} onValueChange={setLod}>
                <SelectTrigger className="h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-900 bg-slate-50/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col justify-end pt-5 pl-6 border-l border-slate-100 shrink-0">
            <Button className="w-40 h-10 bg-[#5E43F3] hover:bg-[#4F36E3] text-white rounded-xl text-xs font-black shadow-md shadow-indigo-500/20 flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" style={{ animationDuration: '4s' }} /> Live Reloading
            </Button>
            <span className="text-[9px] text-slate-400 font-bold mt-1.5 text-center">Instantly synced</span>
          </div>
        </Card>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-12 gap-6 items-start">
          
          {/* Main Visualizer (React Flow) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            <Card className={cn(
              "p-2 shadow-sm overflow-hidden relative transition-all duration-300 flex flex-col rounded-2xl border bg-slate-100",
              isFullscreen ? 'fixed inset-0 z-[100] rounded-none bg-slate-100 h-screen' : 'h-[550px]'
            )}>
              <div className="absolute inset-x-4 top-4 z-10 flex justify-between items-start pointer-events-none">
                <div className="flex gap-2 items-center pointer-events-auto">
                  {/* View Mode controls inside the canvas */}
                  <div className="flex h-9 rounded-xl bg-white/90 backdrop-blur-md p-0.5 select-none shadow-sm border border-slate-200/50">
                    <button
                      onClick={() => setViewMode("connectivity")}
                      className={cn(
                        "rounded-lg px-3 py-1 text-[10px] font-black tracking-wide transition-all cursor-pointer flex items-center gap-1.5",
                        viewMode === "connectivity" ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Connectivity Map
                    </button>
                    <button
                      onClick={() => setViewMode("physical")}
                      className={cn(
                        "rounded-lg px-3 py-1 text-[10px] font-black tracking-wide transition-all cursor-pointer flex items-center gap-1.5",
                        viewMode === "physical" ? "bg-slate-950 text-amber-400" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Physical Wafer
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="h-9 w-9 bg-white/90 backdrop-blur-md border border-slate-200/50 shadow-sm text-slate-700 rounded-xl">
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex flex-col gap-2 items-end pointer-events-auto">
                  <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200/50 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-black text-slate-700 capitalize">{technology}</span>
                  </div>
                </div>
              </div>

              {/* Node Inspector Side Overlay */}
              {selectedNode && (
                <div className="absolute top-16 left-4 z-10 w-64 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <span className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                        Node {selectedNode}
                      </span>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="text-slate-400 hover:text-slate-600 rounded p-0.5"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3 text-[11px] font-semibold text-slate-600">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">Role</span>
                        <span className="text-slate-800 capitalize font-bold">Data Qubit</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">Neighbors ({neighbors.length})</span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {neighbors.map(n => (
                            <button
                              key={n}
                              onClick={() => setSelectedNode(n)}
                              className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">Coherence Targets</span>
                        <span className="text-slate-800 font-bold block mt-0.5">T1 ~ {metrics.reliabilityMetrics?.T1} μs</span>
                        <span className="text-slate-800 font-bold block">T2 ~ {metrics.reliabilityMetrics?.T2} μs</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black block">Readout Target</span>
                        <span className="text-slate-800 font-mono font-bold block mt-0.5">RO_{selectedNode}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between text-[10px] text-slate-400 font-black">
                    <span>Target Fidelity: ~{metrics.performanceMetrics?.singleQubitFidelity}%</span>
                  </div>
                </div>
              )}

              <div className={cn(
                "w-full h-full rounded-xl border relative transition-all duration-300 overflow-hidden",
                viewMode === "physical" ? "bg-[#0b0f19] border-slate-800" : "bg-white border-slate-200"
              )}>
                <ReactFlow 
                   nodes={nodesWithSelectedState} 
                   edges={edgesWithSelectedState} 
                   onNodesChange={onNodesChange}
                   onEdgesChange={onEdgesChange}
                   onConnect={onConnect}
                   nodeTypes={nodeTypes}
                   edgeTypes={edgeTypes}
                   onNodeClick={onNodeClick}
                   fitView 
                   nodesDraggable={false}
                   nodesConnectable={false}
                   attributionPosition="bottom-right"
                >
                   <Background color={viewMode === "physical" ? "rgba(245, 158, 11, 0.04)" : "#cbd5e1"} gap={16} />
                   <Controls />
                   {lod !== 'basic' && <MiniMap nodeColor="#5E43F3" maskColor="rgba(248, 250, 252, 0.7)" />}
                </ReactFlow>
              </div>
            </Card>

            {/* Topology Suitability Analysis (Dynamic cards based on Selected Topology) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Design Suitability */}
              <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Design Suitability</h4>
                  <h3 className="text-sm font-black text-slate-800">Target Applications</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 text-xs font-bold leading-normal">
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Recommended For</p>
                    {currentSuitability.recommended.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 fill-emerald-50 mt-0.5" />
                        <span className="font-semibold text-[11px] text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Not Ideal For</p>
                    {currentSuitability.notIdeal.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-slate-600">
                        <X className="h-4 w-4 shrink-0 text-rose-500 bg-rose-50 border border-rose-100 rounded-full p-0.5 mt-0.5" />
                        <span className="font-semibold text-[11px] text-slate-600">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Topology Summary */}
              <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Topology Summary</h4>
                  <h3 className="text-sm font-black text-slate-800">Engineering Metrics</h3>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600 font-semibold">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Qubits</span>
                    <span className="text-slate-900 font-bold">{metrics.architectureSummary?.qubits}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Couplers</span>
                    <span className="text-slate-900 font-bold">{metrics.architectureSummary?.couplers}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Average Degree</span>
                    <span className="text-slate-900 font-bold">{metrics.architectureSummary?.averageConnectivity}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Longest Path</span>
                    <span className="text-slate-900 font-bold">{metrics.architectureSummary?.longestPath} hops</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>Connectivity Score</span>
                    <span className="text-slate-900 font-bold font-mono">{metrics.scalabilityMetrics?.surfaceCodeCompatibility === 'Excellent' ? '87/100' : '45/100'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scalability</span>
                    <span className="text-violet-600 font-bold">{metrics.scalabilityMetrics?.routingComplexity === 'Low' ? 'High' : 'Medium'}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Compare Mode Table Panel */}
            {compareMode && (
              <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Side-by-Side Analysis</h4>
                    <h3 className="text-sm font-black text-slate-800 font-mono">Lattice Parameter Comparison</h3>
                  </div>
                  <div>
                    <select
                      value={compareWithTopology}
                      onChange={e => setCompareWithTopology(e.target.value)}
                      className="text-xs font-bold text-slate-900 border border-slate-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      {TOPOLOGY_PRESETS.filter(t => t.id !== topology).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-semibold text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black tracking-wider">
                        <th className="text-left py-2 font-black">Metric / Parameter</th>
                        <th className="text-left py-2 font-black">{topology.toUpperCase()} (Current)</th>
                        <th className="text-left py-2 font-black">{targetComparisonPreset.name} (Compare)</th>
                        <th className="text-left py-2 font-black">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { label: "Total Qubits", current: numQubits, target: targetPresetQubits(targetComparisonPreset.id), diff: targetPresetQubits(targetComparisonPreset.id) - numQubits, format: (v: number) => `${v} Q` },
                        { label: "Couplers Count", current: edges.length, target: targetMetrics.architectureSummary?.couplers, diff: (targetMetrics.architectureSummary?.couplers || 0) - edges.length, format: (v: number) => `${v}` },
                        { label: "Connectivity Degree", current: parseFloat(metrics.architectureSummary?.averageConnectivity || "0"), target: parseFloat(targetMetrics.architectureSummary?.averageConnectivity || "0"), diff: parseFloat(targetMetrics.architectureSummary?.averageConnectivity || "0") - parseFloat(metrics.architectureSummary?.averageConnectivity || "0"), format: (v: number) => v.toFixed(1) },
                        { label: "Estimated Area", current: parseFloat(metrics.architectureSummary?.chipArea || "0"), target: parseFloat(targetMetrics.architectureSummary?.chipArea || "0"), diff: parseFloat(targetMetrics.architectureSummary?.chipArea || "0") - parseFloat(metrics.architectureSummary?.chipArea || "0"), format: (v: number) => `${v.toFixed(2)} mm²` },
                        { label: "2Q Gate Fidelity", current: parseFloat(metrics.performanceMetrics?.twoQubitFidelity || "0"), target: parseFloat(targetMetrics.performanceMetrics?.twoQubitFidelity || "0"), diff: parseFloat(targetMetrics.performanceMetrics?.twoQubitFidelity || "0") - parseFloat(metrics.performanceMetrics?.twoQubitFidelity || "0"), format: (v: number) => `${v.toFixed(2)}%` },
                        { label: "Scalability Score", current: metrics.scalabilityMetrics?.scalabilityScore || 0, target: targetMetrics.scalabilityMetrics?.scalabilityScore || 0, diff: (targetMetrics.scalabilityMetrics?.scalabilityScore || 0) - (metrics.scalabilityMetrics?.scalabilityScore || 0), format: (v: number) => `${v}/100` },
                        { label: "Entanglement Rating", current: metrics.validationMetrics?.entanglementCapability, target: targetMetrics.validationMetrics?.entanglementCapability, diff: metrics.validationMetrics?.entanglementCapability === targetMetrics.validationMetrics?.entanglementCapability ? "Equal" : `${metrics.validationMetrics?.entanglementCapability} vs ${targetMetrics.validationMetrics?.entanglementCapability}`, format: (v: string) => v }
                      ].map(row => {
                        const isNumeric = typeof row.diff === "number";
                        const deltaStr = isNumeric 
                          ? ((row.diff as number) > 0 ? `+${(row.diff as number).toFixed(2).replace(/\.00$/, "")}` : (row.diff as number).toFixed(2).replace(/\.00$/, ""))
                          : row.diff;

                        return (
                          <tr key={row.label}>
                            <td className="py-2.5 font-bold text-slate-700">{row.label}</td>
                            <td className="py-2.5">{row.format(row.current as never)}</td>
                            <td className="py-2.5">{row.format(row.target as never)}</td>
                            <td className={cn(
                              "py-2.5 font-bold",
                              isNumeric && (row.diff as number) > 0 
                                ? "text-emerald-600" 
                                : isNumeric && (row.diff as number) < 0 
                                  ? "text-rose-600" 
                                  : "text-slate-400"
                            )}>
                              {deltaStr}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Use Selected Architecture Exporter Banner (The main actionable routing CTAs) */}
            <Card className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/20 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black uppercase text-violet-500 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" /> Use Selected Architecture
                </h4>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">Export this {numQubits}Q {topology} topology directly to Design Copilot or seed the Schematic Editor.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setQclangModalOpen(true)}
                  variant="outline"
                  className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black h-10 px-4 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <FileCode className="h-4 w-4 text-slate-500" />
                  QCLang Source
                </Button>

                {/* Main CTA dropdown splits direct schematic from AI synthesis */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-black h-10 px-5 active:scale-95 transition-all shadow-md shadow-violet-200/50 border-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                      Use Architecture
                      <ChevronDown className="h-4 w-4 text-white" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 rounded-xl p-1 bg-white border border-slate-200 shadow-lg" align="end">
                    <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-2 py-1.5">Send to Workspace</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-100" />
                    <DropdownMenuItem
                      onClick={() => {
                        navigate({
                          to: "/designer",
                          search: {
                            topology: topology,
                            qubits: numQubits
                          } as any
                        });
                        toast.success(`Redirecting to Design Copilot with ${topology} topology...`);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                      Open In Design Copilot
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const payload = generatePresetDesignPayload(nodes, edges, topology, numQubits);
                        const now = Date.now();
                        const newSession: Conversation = {
                          id: `c_${now}_${Math.random().toString(36).slice(2, 7)}`,
                          title: `${topology} ${numQubits}Q Schematic`,
                          createdAt: now,
                          updatedAt: now,
                          messages: [
                            {
                              role: "ai",
                              text: `Initialized design workspace with ${topology} topology layout directly. You can now edit components, add couplings, or run simulation checks in the schematic workspace.`
                            }
                          ],
                          result: payload,
                        };
                        setConversations(prev => [newSession, ...prev]);
                        setActiveId(newSession.id);
                        navigate({
                          to: "/schematic-editor",
                          search: {
                            conversationId: newSession.id
                          } as any
                        });
                        toast.success(`Initialized schematic editor with ${topology} topology!`);
                      }}
                      className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer rounded-lg"
                    >
                      <Layers className="h-3.5 w-3.5 text-indigo-500" />
                      Open In Schematic Editor
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          </div>

          {/* Right Sidebar - Metrics & Resources */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-black text-indigo-600 flex items-center gap-2 uppercase tracking-widest">
                    Live Performance
                  </h2>
                  <div className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                    <span className="text-[9px] font-black text-emerald-600 uppercase">Score</span>
                    <span className="text-xs font-black text-emerald-600">{metrics.overallArchitectureScore}/100</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 hover:bg-slate-100 transition-all cursor-default shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Qubits</div>
                    <div className="text-xl font-black text-slate-800 leading-tight">{metrics.architectureSummary?.qubits} Q</div>
                  </div>
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 hover:bg-slate-100 transition-all cursor-default shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Couplers</div>
                    <div className="text-xl font-black text-slate-800 leading-tight">{metrics.architectureSummary?.couplers}</div>
                  </div>
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 hover:bg-slate-100 transition-all cursor-default shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Connectivity</div>
                    <div className="text-xl font-black text-slate-800 leading-tight">{metrics.architectureSummary?.averageConnectivity}</div>
                  </div>
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 hover:bg-slate-100 transition-all cursor-default shadow-sm">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Chip Area</div>
                    <div className="text-xl font-black text-slate-800 leading-tight">{metrics.architectureSummary?.chipArea} mm²</div>
                  </div>
                </div>

                {metrics.warnings && metrics.warnings.length > 0 && (
                  <div className="mb-6 space-y-2">
                    {metrics.warnings.map((w: string, i: number) => (
                      <div key={i} className="bg-rose-50/60 border border-rose-100 text-rose-700 px-3 py-2 rounded-lg text-xs flex items-start gap-2 shadow-sm font-semibold">
                        <span className="text-rose-500 font-bold mt-0.5">⚠️</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(lod === 'balanced' || lod === 'detailed') && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                        Performance & Coherence
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-600 font-semibold">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">1Q Fidelity Target</span>
                          <span className="text-emerald-600 font-bold">{metrics.performanceMetrics?.singleQubitFidelity}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">2Q Gate Fidelity</span>
                          <span className="text-emerald-600 font-bold">{metrics.performanceMetrics?.twoQubitFidelity}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Readout Fidelity</span>
                          <span className="text-emerald-600 font-bold">{metrics.performanceMetrics?.readoutFidelity}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Quantum Volume</span>
                          <span className="text-indigo-600 font-mono font-bold">{metrics.performanceMetrics?.quantumVolume}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">T1 Relaxation Time</span>
                          <span className="text-slate-800 font-bold">{metrics.reliabilityMetrics?.T1} µs</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">T2 Dephasing Time</span>
                          <span className="text-slate-800 font-bold">{metrics.reliabilityMetrics?.T2} µs</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Target Error Rate</span>
                          <span className="text-rose-500 font-bold">{metrics.reliabilityMetrics?.errorRate}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-black text-cyan-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                        Cryo-Resource Loading
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5 text-xs text-slate-600 font-semibold">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Control Cables</span>
                          <span className="text-slate-800 font-bold bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">{metrics.resourceMetrics?.controlLines} lines</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">DC Flux Channels</span>
                          <span className="text-slate-800 font-bold bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">{metrics.resourceMetrics?.dcFluxLines} lines</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Readout Lines</span>
                          <span className="text-slate-800 font-bold bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">{metrics.resourceMetrics?.readoutLines} lines</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Cooling Budget (mK)</span>
                          <span className="text-cyan-600 font-bold">{metrics.resourceMetrics?.coolingLoad} µW</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-amber-600">Total Thermal Load</span>
                          <span className="text-amber-600 font-bold">{metrics.resourceMetrics?.totalPower} mW</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {lod === 'detailed' && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
                      Scalability Classification
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6 text-xs font-semibold">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Routing Complexity</span>
                        <span className="text-slate-800">{metrics.scalabilityMetrics?.routingComplexity}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Crosstalk Risk</span>
                        <span className={cn(
                          "font-bold",
                          metrics.reliabilityMetrics?.crosstalkRisk === 'High' ? 'text-rose-500' : 'text-emerald-500'
                        )}>{metrics.reliabilityMetrics?.crosstalkRisk}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">QEC Efficiency</span>
                        <span className="text-slate-800">{metrics.scalabilityMetrics?.surfaceCodeCompatibility}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase">EDA Grade</span>
                        <span className="text-indigo-600 font-bold">{metrics.validationMetrics?.architectureRanking}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 mb-6 text-xs">
                      <span className="text-[10px] font-black text-slate-400 uppercase flex justify-between">
                        <span>Scalability Score</span>
                        <span className="text-slate-900 font-bold">{metrics.scalabilityMetrics?.scalabilityScore}/100</span>
                      </span>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500" style={{ width: `${metrics.scalabilityMetrics?.scalabilityScore}%` }}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 shadow-sm">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2">Connectivity Matrix</h4>
                        <div className="grid grid-cols-5 gap-0.5 opacity-80">
                          {Array.from({ length: 25 }).map((_, i) => (
                             <div key={i} className={cn(
                               "w-full aspect-square rounded-[1px] transition-all duration-1000",
                               (i * 7 + numQubits) % 5 === 0 ? "bg-violet-500 shadow-[0_0_4px_rgba(99,102,241,0.6)]" : "bg-slate-200"
                             )}></div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 shadow-sm">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase mb-2">Adjacency Map</h4>
                        <div className="grid grid-cols-5 gap-0.5 opacity-80">
                          {Array.from({ length: 25 }).map((_, i) => (
                             <div key={i} className={cn(
                               "w-full aspect-square rounded-[1px] transition-all duration-1000",
                               (i * 3 + edges.length) % 7 === 1 ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]" : "bg-slate-200"
                             )}></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* QCLang Exporter Dialog Modal */}
      {qclangModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-slate-800">
                <FileCode className="h-5 w-5 text-violet-500" />
                <h3 className="font-black text-sm">QCLang Layout Export ({topology})</h3>
              </div>
              <button
                onClick={() => setQclangModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded p-1"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mb-4">
              This QCLang source registers node topologies, coupling pathways, and readout structures matching the physical layout grid.
            </p>

            <pre className="flex-1 overflow-auto bg-slate-950 p-4 rounded-xl text-[10px] text-slate-300 font-mono text-left whitespace-pre mb-4 shadow-inner">
              {dynamicQClangCode}
            </pre>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 shrink-0">
              <Button
                onClick={downloadQclangFile}
                variant="outline"
                className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold h-9 px-3.5"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download .qcl
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={copyQclangCode}
                  className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold h-9 px-4 shadow-md shadow-violet-200/50 border-0 flex items-center gap-1"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy to Clipboard"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
