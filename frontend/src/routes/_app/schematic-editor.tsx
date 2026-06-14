import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { motion } from "motion/react";
import { toast } from "sonner";
import { WorkspaceProvider, useWorkspace } from "@/lib/editor/workspace-store";
import { ComponentLibrary } from "@/components/quantum-editor/component-library";
import { PropertyInspector } from "@/components/quantum-editor/property-inspector";
import { EditorCanvas, type EditorCanvasHandle } from "@/components/quantum-editor/editor-canvas";
import { EditorToolbar } from "@/components/quantum-editor/editor-toolbar";
import { CodeIdePanel, type CodePanelMode } from "@/components/quantum-editor/code-ide-panel";
import { useDesign } from "@/lib/design-context";
import type { GenerateResponse } from "@/lib/api/backend";
import type { DesignDocument, Placement, Connection } from "@/lib/bridge/types";

// ---------- Search Parameters Schema ----------
const searchSchema = z.object({
  conversationId: z.string().optional(),
  highlight: z.string().optional(),
});

export const Route = createFileRoute("/_app/schematic-editor")({
  head: () => ({
    meta: [
      { title: "Schematic Editor — Quantum Studio" },
      { name: "description", content: "Visual schematic editor for superconducting quantum chip design." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: SchematicEditorRoute,
  errorComponent: ErrorBoundary,
});

function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-card text-card-foreground">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 shadow-md">
        <h2 className="mb-2 text-lg font-bold text-destructive">Editor failed to load</h2>
        <p className="mb-4 text-sm font-mono text-muted-foreground bg-muted p-3 rounded overflow-auto max-h-40">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          Retry
        </button>
      </div>
    </div>
  );
}


// ---------- Data Model Adaption ----------

export function fromGenerateResponse(result: GenerateResponse | null): DesignDocument {
  const doc: DesignDocument = { placements: [], connections: [] };
  if (!result) return doc;

  const qubits = result.placement?.qubits ?? [];
  const placements: Placement[] = qubits.map((q) => ({
    id: `comp_${q.name}`,
    componentId: "TransmonPocket",
    name: q.name,
    x: q.x,
    y: q.y,
    rotation: q.orientation_deg ?? 0,
    params: {
      pad_width: "455um",
      pad_height: "90um",
    },
  }));

  const connections: Connection[] = [];
  const placementEdges = result.placement?.edges ?? [];
  if (placementEdges.length > 0) {
    placementEdges.forEach((edge, idx) => {
      connections.push({
        id: `conn_${edge.qubit_a}_${edge.qubit_b}_${idx}`,
        from: { placementId: `comp_${edge.qubit_a}`, pinName: edge.pin_a ?? "a" },
        to: { placementId: `comp_${edge.qubit_b}`, pinName: edge.pin_b ?? "b" },
      });
    });
  }

  // Resonators from frequency plan
  const resonatorEntries = Object.entries(result.frequency_plan?.resonator_frequencies_GHz ?? {});
  resonatorEntries.forEach(([name], idx) => {
    const targetName = name.replace(/^RO_/, "");
    const target = qubits.find((q) => q.name === targetName);
    const angle = (idx / Math.max(1, resonatorEntries.length)) * Math.PI * 2;
    const x = target ? target.x + Math.cos(angle) * 0.65 : idx * 0.8;
    const y = target ? target.y + Math.sin(angle) * 0.65 : 1.0;
    placements.push({
      id: `comp_${name}`,
      componentId: "ResonatorCoilRect",
      name,
      x,
      y,
      rotation: 0,
      params: {},
    });
    if (target) {
      connections.push({
        id: `conn_${target.name}_${name}`,
        from: { placementId: `comp_${target.name}`, pinName: "readout" },
        to: { placementId: `comp_${name}`, pinName: "in" },
      });
    }
  });

  return { placements, connections };
}

export function toGenerateResponse(
  doc: DesignDocument,
  prev: GenerateResponse | null,
): GenerateResponse {
  const qubitComps = doc.placements.filter(
    (p) => p.componentId === "TransmonPocket" || p.componentId === "TransmonCross",
  );
  const placementQubits = qubitComps.map((p) => ({
    name: p.name,
    x: parseFloat(p.x.toFixed(3)),
    y: parseFloat(p.y.toFixed(3)),
    orientation_deg: p.rotation,
  }));

  const resonatorComps = doc.placements.filter((p) => p.componentId === "ResonatorCoilRect");
  const resonator_frequencies_GHz: Record<string, number> = {};
  const resonator_lengths_mm: Record<string, number> = {};
  resonatorComps.forEach((p, i) => {
    resonator_frequencies_GHz[p.name] =
      prev?.frequency_plan?.resonator_frequencies_GHz?.[p.name] ?? 6 + i * 0.05;
    resonator_lengths_mm[p.name] = prev?.frequency_plan?.resonator_lengths_mm?.[p.name] ?? 7.5;
  });

  const qubitIds = new Set(qubitComps.map((c) => c.id));
  const qubitNameById = new Map(qubitComps.map((c) => [c.id, c.name]));
  const edgesByKey = new Map<string, any>();
  doc.connections.forEach((conn, i) => {
    if (!qubitIds.has(conn.from.placementId) || !qubitIds.has(conn.to.placementId)) return;
    const qubitA = qubitNameById.get(conn.from.placementId);
    const qubitB = qubitNameById.get(conn.to.placementId);
    if (!qubitA || !qubitB || qubitA === qubitB) return;
    const key = [qubitA, qubitB].sort().join("__");
    if (edgesByKey.has(key)) return;
    edgesByKey.set(key, {
      qubit_a: qubitA,
      pin_a: conn.from.pinName,
      qubit_b: qubitB,
      pin_b: conn.to.pinName,
      label: `editor_bus_${i + 1}`,
    });
  });
  const placementEdges = Array.from(edgesByKey.values());

  const base: GenerateResponse = {
    label: prev?.label ?? `${placementQubits.length}-Qubit Custom`,
    num_qubits: placementQubits.length,
    topology: prev?.topology ?? "custom",
    engine: prev?.engine ?? "editor",
    interpretation:
      prev?.interpretation ??
      `Edited in Schematic Editor — ${placementQubits.length} qubits, ${doc.connections.length} connections.`,
    chip_image: prev?.chip_image,
    fabricated_image: prev?.fabricated_image,
    drc: prev?.drc ?? { passed: true, violations: [] },
    frequency_plan: prev?.frequency_plan
      ? {
          ...prev.frequency_plan,
          resonator_frequencies_GHz,
          resonator_lengths_mm,
        }
      : {
          epsilon_eff: 6.45,
          qubit_frequencies_GHz: Object.fromEntries(
            placementQubits.map((q, i) => [q.name, 5.0 + i * 0.05]),
          ),
          qubit_groups: {},
          EJ_GHz: {},
          EC_GHz: {},
          resonator_frequencies_GHz,
          resonator_lengths_mm,
          detunings_GHz: {},
          warnings: [],
        },
    placement: {
      ...(prev?.placement ?? {}),
      solver: prev?.placement?.solver ?? "editor",
      qubits: placementQubits,
      edges: placementEdges,
    },
    code: prev?.code ?? "",
    material: prev?.material,
    ml_prediction: prev?.ml_prediction,
    error_hint: prev?.error_hint,
  };
  return base;
}

// ---------- Shell Component ----------

function SchematicEditorRoute() {
  return (
    <WorkspaceProvider>
      <SchematicEditorShell />
    </WorkspaceProvider>
  );
}

function SchematicEditorShell() {
  const { conversationId, highlight } = Route.useSearch();
  const navigate = useNavigate();
  const { conversations, activeId, setActiveId, updateConversationResult } = useDesign();

  const targetId = conversationId ?? activeId;
  const conversation = useMemo(
    () => conversations.find((c) => c.id === targetId) ?? null,
    [conversations, targetId],
  );

  const [libOpen, setLibOpen] = useState(false);
  const [codeMode, setCodeMode] = useState<CodePanelMode | null>(null);
  const canvasRef = useRef<EditorCanvasHandle>(null);
  const { workspace, activeTab, newCanvas, loadIntoCanvas, saveAll, dispatch } = useWorkspace();

  const handleFitView = useCallback(() => {
    canvasRef.current?.fitToContent();
  }, []);

  // Keep design context's active conversation in sync with the URL search query
  useEffect(() => {
    if (conversationId && conversationId !== activeId) {
      setActiveId(conversationId);
    }
  }, [conversationId, activeId, setActiveId]);

  // Synchronize tabs list with the conversation and external modifications
  const lastSyncedResultRef = useRef<{ id: string; result: GenerateResponse | null } | null>(null);
  const prevResultRef = useRef<GenerateResponse | null>(null);

  useEffect(() => {
    if (!conversation) return;
    const tabId = `conv_${conversation.id}`;

    const isNewConversation =
      lastSyncedResultRef.current === null || lastSyncedResultRef.current.id !== conversation.id;
    const isExternalUpdate =
      !isNewConversation &&
      lastSyncedResultRef.current !== null &&
      conversation.result !== lastSyncedResultRef.current.result;

    if (isNewConversation || isExternalUpdate) {
      const doc = fromGenerateResponse(conversation.result);
      const hasTab = workspace.tabs.some((t) => t.id === tabId);

      if (!hasTab) {
        newCanvas(conversation.title || "Schematic", doc, tabId);
      } else {
        loadIntoCanvas(tabId, doc);
      }

      if (highlight) {
        const found = doc.placements.find(
          (p) =>
            p.name.toLowerCase() === highlight.toLowerCase() ||
            p.id.toLowerCase() === highlight.toLowerCase(),
        );
        if (found) {
          dispatch({
            type: "CANVAS_ACTION",
            id: tabId,
            action: { type: "SELECT", selection: { kind: "placement", id: found.id } },
          });
        }
      }

      lastSyncedResultRef.current = { id: conversation.id, result: conversation.result };
      prevResultRef.current = conversation.result;
    }
  }, [conversation?.id, conversation?.result, workspace.tabs, newCanvas, loadIntoCanvas, highlight, dispatch]);

  // Handle activeId state switching when the user manually switches tabs inside the editor
  useEffect(() => {
    if (activeTab.id.startsWith("conv_")) {
      const parsedId = activeTab.id.replace("conv_", "");
      if (parsedId !== activeId) {
        setActiveId(parsedId);
      }
    }
  }, [activeTab.id, activeId, setActiveId]);

  // Push changes back to parent conversation context
  useEffect(() => {
    if (!conversation || activeTab.id !== `conv_${conversation.id}`) return;
    if (activeTab.state.rev === 0) return;

    const t = setTimeout(() => {
      const doc: DesignDocument = {
        placements: activeTab.state.placements,
        connections: activeTab.state.connections,
      };
      const next = toGenerateResponse(doc, prevResultRef.current);
      updateConversationResult(conversation.id, next);
      prevResultRef.current = next;
      lastSyncedResultRef.current = { id: conversation.id, result: next };
    }, 200);

    return () => clearTimeout(t);
  }, [activeTab.state.rev, activeTab.id, conversation?.id, updateConversationResult]);

  // Keyboard Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA";
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveAll();
      }
      
      if (!inInput && e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        canvasRef.current?.fitToContent();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({
          type: "CANVAS_ACTION",
          id: activeTab.id,
          action: { type: e.shiftKey ? "REDO" : "UNDO" },
        });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (
          activeTab.state.selection &&
          (e.target as HTMLElement)?.tagName !== "INPUT" &&
          (e.target as HTMLElement)?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          const sel = activeTab.state.selection;
          if (sel.kind === "placement") {
            dispatch({
              type: "CANVAS_ACTION",
              id: activeTab.id,
              action: { type: "DELETE_PLACEMENT", id: sel.id },
            });
          } else {
            dispatch({
              type: "CANVAS_ACTION",
              id: activeTab.id,
              action: { type: "DELETE_CONNECTION", id: sel.id },
            });
          }
        }
      } else if (e.key === "Escape") {
        dispatch({
          type: "CANVAS_ACTION",
          id: activeTab.id,
          action: { type: "SELECT", selection: null },
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveAll, activeTab.id, activeTab.state.selection, dispatch]);

  if (!conversation) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <div className="rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-700">No design session selected.</p>
          <button
            onClick={() => navigate({ to: "/designer" })}
            className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
          >
            Open Designer →
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 flex flex-col bg-background text-foreground overflow-hidden"
    >
      {/* Toolbar */}
      <EditorToolbar
        libOpen={libOpen}
        onToggleLib={() => setLibOpen((v) => !v)}
        onFitView={handleFitView}
        onShowCode={(mode) => setCodeMode(mode)}
        canvasRef={canvasRef}
      />

      {/* Main Flex Workspace */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Component Library (collapsible) */}
        {libOpen && (
          <div className="w-64 shrink-0 border-r border-border bg-card overflow-hidden flex flex-col">
            <div className="h-full flex flex-col p-2 overflow-hidden">
              <ComponentLibrary />
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 min-w-0 overflow-hidden relative h-full bg-background">
          <EditorCanvas key={activeTab.id} ref={canvasRef} />
        </div>

        {/* Property Inspector */}
        {activeTab.state.selection && (
          <div className="w-80 shrink-0 border-l border-border bg-card overflow-y-auto p-3 flex flex-col">
            <PropertyInspector />
          </div>
        )}

        {/* Code IDE (conditional) */}
        {codeMode && (
          <div className="w-[480px] shrink-0 border-l border-border bg-card overflow-hidden flex flex-col">
            <CodeIdePanel mode={codeMode} onClose={() => setCodeMode(null)} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
