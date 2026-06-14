import {
  useRef, useState, useEffect, useCallback, useMemo,
  forwardRef, useImperativeHandle,
} from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Minus } from "lucide-react";
import { prefixForCategory, type EditorState } from "@/lib/editor/design-store";
import { useWorkspace } from "@/lib/editor/workspace-store";
import {
  componentPinsQueryOptions,
  componentPreviewQueryOptions,
  componentsQueryOptions,
  componentMetadataQueryOptions,
} from "@/lib/bridge/queries";
import { defaultParamsFromMetadata } from "@/lib/bridge/adapters";
import { bridgeClient } from "@/lib/bridge/client";
import type { ComponentSummary, PinSpec, Placement, RenderResult, ComponentMetadata } from "@/lib/bridge/types";
import { cn } from "@/lib/utils";
import { QISKIT_CATALOG } from "./qiskit-metal-catalog";

const MM_TO_PX  = 80;
const UM_TO_MM  = 0.001;
const RULER_L   = 28;
const RULER_B   = 28;
const SCALE_MIN = 0.25;
const SCALE_MAX = 5.0;
const SCALE_STEP = 0.1;
const UI_SCALE_KEY = "_uiScale";

export interface EditorCanvasHandle {
  fitToContent: () => void;
  getSvgElement: () => SVGSVGElement | null;
}

type DragState =
  | { mode: "move"; id: string; offsetX: number; offsetY: number }
  | null;

function getUiScale(p: Placement): number {
  let v: string | number | undefined = p.params[UI_SCALE_KEY];
  if (v === undefined || v === null) {
    const cat = QISKIT_CATALOG.find((c) => c.className === p.componentId);
    v = cat?.defaultParams?.[UI_SCALE_KEY];
  }
  if (typeof v === "number" && v > 0) return v;
  if (typeof v === "string") {
    const parsed = parseFloat(v);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 1;
}

export const EditorCanvas = forwardRef<EditorCanvasHandle, object>(function EditorCanvas(_p, ref) {
  const { activeTab, dispatchActive } = useWorkspace();
  const state    = activeTab.state;
  const dispatch = dispatchActive;
  const doc      = { placements: state.placements, connections: state.connections };
  const qc       = useQueryClient();
  const uniqueName = useCallback((prefix: string) => {
    let n = 0;
    const taken = new Set(state.placements.map((p) => p.name));
    while (taken.has(`${prefix}${n}`)) n++;
    return `${prefix}${n}`;
  }, [state.placements]);

  const svgRef       = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size,      setSize]      = useState({ w: 800, h: 600 });
  const [drag,      setDrag]      = useState<DragState>(null);
  const [dropPrev,  setDropPrev]  = useState<{ componentId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const compsQ = useQuery(componentsQueryOptions());
  const compsById = useMemo(() => {
    const m = new Map<string, ComponentSummary>();
    QISKIT_CATALOG.forEach((c) => m.set(c.className, {
      id: c.className,
      name: c.label,
      module: c.modulePath,
      category: (c.category === "tlines" ? "routes" :
                  c.category === "lumped" ? "other" :
                  c.category === "sample shapes" ? "other" : c.category) as any,
      description: c.description,
    }));
    (compsQ.data ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [compsQ.data]);

  const renderQ = useQuery({
    queryKey: ["bridge", "render", doc],
    queryFn: ({ signal }) => bridgeClient.renderDesign(doc, signal).then((r) => { if (r.error) throw new Error(r.error); return r.data!; }),
    enabled: doc.placements.length > 0, staleTime: 0,
    placeholderData: (prev) => prev,
  });
  const routeSvg = useMemo(() => { const m = new Map<string, string>(); (renderQ.data?.routes ?? []).forEach((r) => m.set(r.connectionId, r.svg)); return m; }, [renderQ.data?.routes]);
  const pinQueries = useQueries({ queries: state.placements.map((p) => componentPinsQueryOptions(p.componentId)) });

  // Calculate static board coordinates and auto-scale top-aligned in viewport
  const scale = useMemo(() => {
    return Math.max(0.4, Math.min((size.w - 100) / 720, (size.h - 100) / 480));
  }, [size.w, size.h]);

  const bw = 720 * scale;
  const bh = 480 * scale;
  const cx = size.w / 2;
  const left = cx - bw / 2;
  const right = cx + bw / 2;
  const top = 48; // Top-aligned with 48px padding
  const cy = top + bh / 2;
  const bottom = top + bh;

  const w2s = useCallback((x: number, y: number) => ({
    px: cx + x * MM_TO_PX * scale,
    py: cy - y * MM_TO_PX * scale,
  }), [cx, cy, scale]);

  const s2w = useCallback((px: number, py: number) => ({
    x: (px - cx) / (MM_TO_PX * scale),
    y: -(py - cy) / (MM_TO_PX * scale),
  }), [cx, cy, scale]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "CANCEL_PIN" });
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); dispatch({ type: "UNDO" }); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); dispatch({ type: "REDO" }); }
      if ((e.key === "Delete" || e.key === "Backspace") && state.selection && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        if (state.selection.kind === "placement") dispatch({ type: "DELETE_PLACEMENT", id: state.selection.id });
        else dispatch({ type: "DELETE_CONNECTION", id: state.selection.id });
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.selection]);

  const onPDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const t = e.target as Element;
    if (t === e.currentTarget || t.getAttribute("data-canvas-bg") === "true") {
      dispatch({ type: "SELECT", selection: null });
    }
  };

  const onPMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return;
    if (drag.mode === "move") {
      const w = s2w(e.clientX - rect.left - drag.offsetX, e.clientY - rect.top - drag.offsetY), snap = 0.05;
      const snapX = Math.round(w.x / snap) * snap;
      const snapY = Math.round(w.y / snap) * snap;
      const constrainedX = Math.max(-4.5, Math.min(4.5, snapX));
      const constrainedY = Math.max(-3.0, Math.min(3.0, snapY));
      dispatch({ type: "MOVE_PLACEMENT", id: drag.id, x: constrainedX, y: constrainedY });
    }
  };

  const onPUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag && (e.currentTarget as Element).hasPointerCapture(e.pointerId)) (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    setDrag(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDropPrev(null);
    let cid = e.dataTransfer.getData("application/x-silicofeller-component");
    if (!cid) {
      const type = e.dataTransfer.types.find((t) => t.startsWith("application/x-silicofeller-component:"));
      cid = type ? type.split(":")[1] : "";
    }
    if (!cid) return;
    const summary = compsById.get(cid);
    if (!summary) return;
    if (summary.category === "routes") {
      toast.warning("Transmission lines & routes cannot be placed directly on the canvas. Click and connect two component pins to create a route.");
      return;
    }
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return;
    const w = s2w(e.clientX - rect.left, e.clientY - rect.top), snap = 0.05;
    const snapX = Math.round(w.x / snap) * snap;
    const snapY = Math.round(w.y / snap) * snap;
    const constrainedX = Math.max(-4.5, Math.min(4.5, snapX));
    const constrainedY = Math.max(-3.0, Math.min(3.0, snapY));

    const queryKey = ["bridge", "components", cid, "metadata"] as const;
    const cachedMetadata = qc.getQueryData<ComponentMetadata>(queryKey);
    let params: Record<string, string | number> = {};

    if (cachedMetadata) {
      try {
        params = defaultParamsFromMetadata(cachedMetadata);
      } catch (err) {
        console.error("Failed to parse metadata params, falling back to catalog default params:", err);
        const catalogEntry = QISKIT_CATALOG.find((c) => c.className === cid);
        if (catalogEntry) {
          params = Object.fromEntries(
            Object.entries(catalogEntry.defaultParams).map(([k, v]) => [k, String(v)])
          );
        }
      }
    } else {
      const catalogEntry = QISKIT_CATALOG.find((c) => c.className === cid);
      if (catalogEntry) {
        params = Object.fromEntries(
          Object.entries(catalogEntry.defaultParams).map(([k, v]) => [k, String(v)])
        );
      }
    }

    const name = uniqueName(prefixForCategory(summary.category));
    const placementId = `pl_${name}_${Date.now()}`;
    
    dispatch({
      type: "ADD_PLACEMENT",
      placement: {
        id: placementId,
        componentId: cid,
        name,
        x: parseFloat(constrainedX.toFixed(3)),
        y: parseFloat(constrainedY.toFixed(3)),
        rotation: 0,
        params,
      },
    });

    if (!cachedMetadata) {
      bridgeClient.getMetadata(cid).then((metaRes) => {
        if (metaRes.data) {
          const liveParams = defaultParamsFromMetadata(metaRes.data);
          dispatch({
            type: "UPDATE_PLACEMENT",
            id: placementId,
            patch: { params: liveParams },
          });
        }
      }).catch(console.error);
    }
  };

  const onDragOver = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault(); e.dataTransfer.dropEffect = "copy";
    const type = e.dataTransfer.types.find((t) => t.startsWith("application/x-silicofeller-component:"));
    const cid = type ? type.split(":")[1] : "";
    const rect = svgRef.current?.getBoundingClientRect();
    if (!cid || !rect) return;
    const summary = compsById.get(cid);
    if (summary?.category === "routes") return;
    const w = s2w(e.clientX - rect.left, e.clientY - rect.top), snap = 0.05;
    const snapX = Math.round(w.x / snap) * snap;
    const snapY = Math.round(w.y / snap) * snap;
    const constrainedX = Math.max(-4.5, Math.min(4.5, snapX));
    const constrainedY = Math.max(-3.0, Math.min(3.0, snapY));
    setDropPrev({ componentId: cid, x: constrainedX, y: constrainedY });
  };

  const fitToContent = useCallback(() => {
    // Auto-fit is done automatically on render/resize, so this is a no-op
  }, []);

  useImperativeHandle(ref, () => ({ fitToContent, getSvgElement: () => svgRef.current }), [fitToContent]);

  // Compute fixed tick lists for horizontal and vertical rulers attached to the board
  const hTicks = useMemo(() => {
    const ticks = [];
    for (let v = -4.5; v <= 4.5; v = parseFloat((v + 0.1).toFixed(1))) {
      const isMajor = Math.abs(v % 1.0) < 0.01;
      const isHalf = Math.abs(v % 0.5) < 0.01;
      ticks.push({
        value: v,
        px: cx + v * MM_TO_PX * scale,
        type: isMajor ? "major" : isHalf ? "half" : "minor"
      });
    }
    return ticks;
  }, [cx, scale]);

  const vTicks = useMemo(() => {
    const ticks = [];
    for (let v = -3.0; v <= 3.0; v = parseFloat((v + 0.1).toFixed(1))) {
      const isMajor = Math.abs(v % 1.0) < 0.01;
      const isHalf = Math.abs(v % 0.5) < 0.01;
      ticks.push({
        value: v,
        py: cy - v * MM_TO_PX * scale,
        type: isMajor ? "major" : isHalf ? "half" : "minor"
      });
    }
    return ticks;
  }, [cy, scale]);



  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#f8fafc] select-none flex items-center justify-center">
      <svg ref={svgRef} width={size.w} height={size.h} className="block touch-none"
        style={{ cursor: drag?.mode === "move" ? "grabbing" : "default" }}
        onPointerDown={onPDown} onPointerMove={onPMove} onPointerUp={onPUp} onPointerCancel={onPUp}
        onDragEnter={onDragOver} onDragOver={onDragOver}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setDropPrev(null); } }}
        onDrop={onDrop}
      >
        <defs>
          <clipPath id="boardClip">
            <rect x={left} y={top} width={bw} height={bh} rx={8} />
          </clipPath>
          <linearGradient id="siliconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity={0.95} />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#0284c7" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Workbench Background Grid */}
        <rect data-canvas-bg="true" x={0} y={0} width={size.w} height={size.h} fill="transparent"
          style={{ backgroundImage: "radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)", backgroundSize: "24px 24px" }}
        />

        {/* Chip board and content */}
        <g clipPath="url(#boardClip)">
          <rect x={left} y={top} width={bw} height={bh} fill="url(#siliconGrad)" stroke="#0284c7" strokeWidth={2.5} filter="url(#glow)" rx={8} />

          {/* Dot-grid inside board */}
          <rect x={left} y={top} width={bw} height={bh} fill="transparent"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(14, 165, 233, 0.18) 1.2px, transparent 1.2px)",
              backgroundSize: `${16 * scale}px ${16 * scale}px`,
              backgroundPosition: `${cx}px ${cy}px`
            }}
          />

          {state.placements.map((p) => (
            <PlacementPreview key={p.id} placement={p} w2s={w2s} scale={scale} uiScale={getUiScale(p)} />
          ))}
          {dropPrev && <DropGhost componentId={dropPrev.componentId} x={dropPrev.x} y={dropPrev.y} w2s={w2s} scale={scale} />}

          {state.placements.map((p, i) => (
            <PlacementGlyph key={p.id} placement={p} componentId={p.componentId}
              selected={state.selection?.kind === "placement" && state.selection.id === p.id}
              pendingOwner={state.pendingPin?.placementId ?? null} pendingPin={state.pendingPin?.pinName ?? null}
              pins={pinQueries[i]?.data?.pins ?? []} w2s={w2s} scale={scale} uiScale={getUiScale(p)}
              onPointerDown={(e) => {
                e.stopPropagation();
                dispatch({ type: "SELECT", selection: { kind: "placement", id: p.id } });
                const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return;
                const sc = w2s(p.x, p.y);
                setDrag({ mode: "move", id: p.id, offsetX: e.clientX - rect.left - sc.px, offsetY: e.clientY - rect.top - sc.py });
                (e.currentTarget as Element).setPointerCapture(e.pointerId);
              }}
              onPinClick={(pin) => dispatch({ type: "PIN_CLICK", placementId: p.id, pinName: pin, defaultRouteComponentId: "RouteMeander" })}
            />
          ))}

          {state.connections.map((c) => {
            const a = state.placements.find((x) => x.id === c.from.placementId), b = state.placements.find((x) => x.id === c.to.placementId);
            if (!a || !b) return null;
            const isSel = state.selection?.kind === "connection" && state.selection.id === c.id;
            const rsvg  = routeSvg.get(c.id);
            if (rsvg && renderQ.data) {
              const sc = scale * MM_TO_PX * (renderQ.data?.units === "um" ? UM_TO_MM : 1), { px, py } = w2s(0, 0);
              return <g key={c.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); dispatch({ type: "SELECT", selection: { kind: "connection", id: c.id } }); }}>
                {isSel && <g transform={`translate(${px} ${py}) scale(${sc} ${-sc})`} opacity={0.3} dangerouslySetInnerHTML={{ __html: rsvg }} />}
                <g transform={`translate(${px} ${py}) scale(${sc} ${-sc})`} opacity={isSel ? 1 : 0.9} dangerouslySetInnerHTML={{ __html: rsvg }} />
              </g>;
            }
            const pa = w2s(a.x, a.y), pb = w2s(b.x, b.y);
            return <g key={c.id}>
              {isSel && <path d={`M ${pa.px} ${pa.py} L ${pb.px} ${pb.py}`} stroke="var(--primary)" strokeWidth={8} strokeOpacity={0.2} fill="none" />}
              <path d={`M ${pa.px} ${pa.py} L ${pb.px} ${pb.py}`} stroke={isSel ? "var(--primary)" : "#5B9BD5"} strokeWidth={isSel ? 2.5 : 1.8} strokeDasharray={renderQ.isLoading ? "6 4" : "none"} fill="none" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); dispatch({ type: "SELECT", selection: { kind: "connection", id: c.id } }); }} />
              <text x={(pa.px+pb.px)/2} y={(pa.py+pb.py)/2 - 6} textAnchor="middle" fontSize={8} fill={isSel ? "var(--primary)" : "var(--muted-foreground)"} className="pointer-events-none select-none">{renderQ.isLoading ? "rendering…" : (c.routeComponentId ?? "CPW")}</text>
            </g>;
          })}
        </g>

        {/* Horizontal board ruler */}
        <g>
          <rect x={left} y={top - RULER_B} width={bw} height={RULER_B} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1} />
          {hTicks.map(({ value, px, type }) => {
            const y1 = type === "major" ? top - 12 : type === "half" ? top - 8 : top - 4;
            return (
              <g key={`h-${value}`}>
                <line x1={px} y1={y1} x2={px} y2={top} stroke={type === "major" ? "#475569" : type === "half" ? "#94a3b8" : "#e2e8f0"} strokeWidth={type === "major" ? 1.2 : 0.8} />
                {type === "major" && (
                  <text x={px} y={top - 16} fontSize={8.5} fill="#475569" fontWeight={600} textAnchor="middle" className="pointer-events-none select-none font-mono">{value}</text>
                )}
              </g>
            );
          })}
        </g>

        {/* Vertical board ruler */}
        <g>
          <rect x={left - RULER_L} y={top} width={RULER_L} height={bh} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1} />
          {vTicks.map(({ value, py, type }) => {
            const x1 = type === "major" ? left - 12 : type === "half" ? left - 8 : left - 4;
            return (
              <g key={`v-${value}`}>
                <line x1={x1} y1={py} x2={left} y2={py} stroke={type === "major" ? "#475569" : type === "half" ? "#94a3b8" : "#e2e8f0"} strokeWidth={type === "major" ? 1.2 : 0.8} />
                {type === "major" && (
                  <text x={left - 15} y={py + 3} fontSize={8.5} fill="#475569" fontWeight={600} textAnchor="end" className="pointer-events-none select-none font-mono">{value}</text>
                )}
              </g>
            );
          })}
        </g>

        {/* Corner mm unit label */}
        <g>
          <rect x={left - RULER_L} y={top - RULER_B} width={RULER_L} height={RULER_B} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={1} />
          <text x={left - RULER_L / 2} y={top - RULER_B / 2 + 3.5} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#0284c7" className="pointer-events-none select-none font-sans">mm</text>
        </g>
      </svg>




      {/* Global Dimension Indicator */}
      <div className="absolute bottom-3 right-4 flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1 shadow-sm backdrop-blur">
        <span className="text-[11px] font-semibold text-muted-foreground">Chip Dimensions:</span>
        <span className="text-[11px] font-bold text-foreground">9.0 × 6.0 mm</span>
      </div>

      {state.pendingPin && <div className="absolute top-8 left-8 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary shadow-sm">Click another pin to connect · Esc to cancel</div>}
      {state.placements.length === 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="rounded-lg border border-dashed border-border bg-card/70 px-6 py-4 text-center text-xs text-muted-foreground">Drag a component from the Library to begin.</div></div>}
      {renderQ.isError && <div className="absolute bottom-12 left-8 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1 text-[10px] text-destructive">Render failed: {String(renderQ.error)}</div>}
      {renderQ.isFetching && state.connections.length > 0 && <div className="absolute bottom-12 left-8 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" /> Rendering route geometry…</div>}
    </div>
  );
});

function PlacementPreview({ placement, w2s, scale, uiScale }: { placement: Placement; w2s: (x: number, y: number) => { px: number; py: number }; scale: number; uiScale: number }) {
  const q = useQuery(componentPreviewQueryOptions(placement.componentId, placement.params));
  const p = q.data;
  const { px, py } = w2s(placement.x, placement.y);
  if (!p?.svg) {
    const s = Math.max(36, 0.6 * MM_TO_PX * scale * uiScale), h = s / 2;
    return (
      <g transform={`translate(${px} ${py}) rotate(${-placement.rotation})`}>
        <rect x={-h} y={-h} width={s} height={s} rx={4} fill="color-mix(in oklab, var(--primary) 5%, transparent)" stroke="color-mix(in oklab, var(--foreground) 30%, transparent)" strokeWidth={1.5} strokeDasharray="4 3" />
      </g>
    );
  }
  const sc = scale * MM_TO_PX * (p.units === "um" ? UM_TO_MM : 1) * uiScale;
  const vb = p.viewBox;
  return <g transform={`translate(${px} ${py}) rotate(${-placement.rotation})`}><g transform={`scale(${sc} ${-sc}) translate(${-(vb.x+vb.w/2)} ${-(vb.y+vb.h/2)})`} dangerouslySetInnerHTML={{ __html: p.svg }} style={{ transition: "transform 0.12s ease" }} /></g>;
}

function DropGhost({ componentId, x, y, w2s, scale }: { componentId: string; x: number; y: number; w2s: (x: number, y: number) => { px: number; py: number }; scale: number }) {
  const q = useQuery(componentPreviewQueryOptions(componentId));
  const p = q.data;
  const { px, py } = w2s(x, y);
  if (!p?.svg) { const s = Math.max(36, 0.6*MM_TO_PX*scale), h = s/2; return <g className="pointer-events-none" transform={`translate(${px} ${py})`}><rect x={-h} y={-h} width={s} height={s} rx={4} fill="color-mix(in oklab, var(--primary) 10%, transparent)" stroke="var(--primary)" strokeDasharray="5 4" strokeOpacity={0.65} /></g>; }
  const sc = scale * MM_TO_PX * (p.units === "um" ? UM_TO_MM : 1), vb = p.viewBox;
  return <g className="pointer-events-none" opacity={0.72}><g transform={`translate(${px} ${py})`}><g transform={`scale(${sc} ${-sc}) translate(${-(vb.x+vb.w/2)} ${-(vb.y+vb.h/2)})`} dangerouslySetInnerHTML={{ __html: p.svg }} /></g><circle cx={px} cy={py} r={4} fill="var(--primary)" stroke="var(--background)" strokeWidth={1.5} /></g>;
}

function PlacementGlyph({ placement, componentId, selected, pendingOwner, pendingPin, pins, w2s, scale, uiScale, onPointerDown, onPinClick }: {
  placement: Placement; componentId: string; selected: boolean; pendingOwner: string | null; pendingPin: string | null;
  pins: PinSpec[]; w2s: (x: number, y: number) => { px: number; py: number }; scale: number; uiScale: number;
  onPointerDown: (e: React.PointerEvent) => void; onPinClick: (p: string) => void;
}) {
  const q  = useQuery(componentPreviewQueryOptions(componentId, placement.params));
  const vb = q.data?.viewBox;
  const um = q.data?.units === "um" ? UM_TO_MM : 1;
  const sz = vb ? Math.max(vb.w, vb.h) * um * MM_TO_PX * scale * uiScale : Math.max(28, 0.5*MM_TO_PX*scale);
  const { px, py } = w2s(placement.x, placement.y), half = sz / 2;
  const isPO = pendingOwner === placement.id;
  return (
    <g transform={`translate(${px} ${py}) rotate(${-placement.rotation})`} className={cn("cursor-grab", selected && "cursor-grabbing")} onPointerDown={onPointerDown}>
      <rect x={-half} y={-half} width={sz} height={sz} fill="transparent" stroke="none" />
      {selected && <rect x={-half-6} y={-half-6} width={sz+12} height={sz+12} rx={6} fill="none" stroke="var(--primary)" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="3 2" />}
      <text x={0} y={half+14} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--foreground)" className="select-none">{placement.name}</text>
      {pins.map((pin) => {
        const cx = pin.hint.x * UM_TO_MM * MM_TO_PX * scale, cy = -pin.hint.y * UM_TO_MM * MM_TO_PX * scale;
        const iP = isPO && pendingPin === pin.name;
        return <g key={pin.name}>
          <circle cx={cx} cy={cy} r={iP?5:3.5} fill={iP?"var(--destructive)":selected?"var(--primary)":"var(--muted-foreground)"} stroke="var(--background)" strokeWidth={1} className="cursor-crosshair" onPointerDown={(e) => { e.stopPropagation(); onPinClick(pin.name); }} />
          {selected && <text x={cx+6} y={cy+3} fontSize={8} fill="var(--foreground)" fontWeight={700} className="pointer-events-none select-none">{pin.name}</text>}
        </g>;
      })}
    </g>
  );
}
