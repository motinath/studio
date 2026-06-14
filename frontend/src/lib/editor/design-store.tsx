import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type {
  Connection,
  DesignDocument,
  Placement,
} from "@/lib/bridge/types";
import { loadDesign, saveDesign, clearDesign } from "./persistence";

export { clearDesign };


// ---------- State ----------

export type Tool = "select" | "pan" | "route";

export type Selection =
  | { kind: "placement"; id: string }
  | { kind: "connection"; id: string }
  | null;

export interface PendingPin {
  placementId: string;
  pinName: string;
}

export interface EditorState {
  placements: Placement[];
  connections: Connection[];
  selection: Selection;
  pendingPin: PendingPin | null;
  zoom: number;
  pan: { x: number; y: number };
  tool: Tool;
  past: Snapshot[];
  future: Snapshot[];
  rev: number;
}

interface Snapshot {
  placements: Placement[];
  connections: Connection[];
}

const MAX_HISTORY = 50;

export type EditorAction =
  | { type: "ADD_PLACEMENT"; placement: Placement }
  | { type: "MOVE_PLACEMENT"; id: string; x: number; y: number }
  | { type: "UPDATE_PLACEMENT"; id: string; patch: Partial<Placement> }
  | { type: "DELETE_PLACEMENT"; id: string }
  | { type: "PIN_CLICK"; placementId: string; pinName: string; defaultRouteComponentId?: string }
  | { type: "CANCEL_PIN" }
  | { type: "DELETE_CONNECTION"; id: string }
  | { type: "UPDATE_CONNECTION"; id: string; patch: Partial<Connection> }
  | { type: "SELECT"; selection: Selection }
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "ZOOM"; zoom: number }
  | { type: "PAN"; x: number; y: number }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD"; doc: DesignDocument };

function snapshot(s: EditorState): Snapshot {
  return {
    placements: s.placements.map((p) => ({ ...p, params: { ...p.params } })),
    connections: s.connections.map((c) => ({
      ...c,
      routeOverrides: c.routeOverrides ? { ...c.routeOverrides } : undefined,
    })),
  };
}

function bump(s: EditorState): Pick<EditorState, "past" | "future" | "rev"> {
  return {
    past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
    future: [],
    rev: s.rev + 1,
  };
}

export const initialEditorState: EditorState = {
  placements: [],
  connections: [],
  selection: null,
  pendingPin: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  tool: "select",
  past: [],
  future: [],
  rev: 0,
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "ADD_PLACEMENT":
      return {
        ...state,
        ...bump(state),
        placements: [...state.placements, action.placement],
        selection: { kind: "placement", id: action.placement.id },
      };
    case "MOVE_PLACEMENT":
      return {
        ...state,
        ...bump(state),
        placements: state.placements.map((p) =>
          p.id === action.id ? { ...p, x: action.x, y: action.y } : p,
        ),
      };
    case "UPDATE_PLACEMENT":
      return {
        ...state,
        ...bump(state),
        placements: state.placements.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p,
        ),
      };
    case "DELETE_PLACEMENT":
      return {
        ...state,
        ...bump(state),
        placements: state.placements.filter((p) => p.id !== action.id),
        // Cascade: drop any connection touching this placement.
        connections: state.connections.filter(
          (c) => c.from.placementId !== action.id && c.to.placementId !== action.id,
        ),
        selection:
          state.selection?.kind === "placement" && state.selection.id === action.id
            ? null
            : state.selection,
      };
    case "PIN_CLICK": {
      if (!state.pendingPin) {
        return {
          ...state,
          pendingPin: { placementId: action.placementId, pinName: action.pinName },
        };
      }
      if (
        state.pendingPin.placementId === action.placementId &&
        state.pendingPin.pinName === action.pinName
      ) {
        return { ...state, pendingPin: null };
      }
      const id = `conn_${state.pendingPin.placementId}_${state.pendingPin.pinName}__${action.placementId}_${action.pinName}_${Date.now()}`;
      const conn: Connection = {
        id,
        from: { placementId: state.pendingPin.placementId, pinName: state.pendingPin.pinName },
        to: { placementId: action.placementId, pinName: action.pinName },
        routeComponentId: action.defaultRouteComponentId,
      };
      return {
        ...state,
        ...bump(state),
        pendingPin: null,
        connections: [...state.connections, conn],
        selection: { kind: "connection", id },
      };
    }
    case "CANCEL_PIN":
      return { ...state, pendingPin: null };
    case "DELETE_CONNECTION":
      return {
        ...state,
        ...bump(state),
        connections: state.connections.filter((c) => c.id !== action.id),
        selection:
          state.selection?.kind === "connection" && state.selection.id === action.id
            ? null
            : state.selection,
      };
    case "UPDATE_CONNECTION":
      return {
        ...state,
        ...bump(state),
        connections: state.connections.map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c,
        ),
      };
    case "SELECT":
      return { ...state, selection: action.selection, pendingPin: null };
    case "SET_TOOL":
      return { ...state, tool: action.tool };
    case "ZOOM":
      return { ...state, zoom: Math.max(0.25, Math.min(8, action.zoom)) };
    case "PAN":
      return { ...state, pan: { x: action.x, y: action.y } };
    case "UNDO": {
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      return {
        ...state,
        placements: prev.placements,
        connections: prev.connections,
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future].slice(0, MAX_HISTORY),
        rev: state.rev + 1,
        selection: null,
        pendingPin: null,
      };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        ...state,
        placements: next.placements,
        connections: next.connections,
        past: [...state.past, snapshot(state)],
        future: state.future.slice(1),
        rev: state.rev + 1,
        selection: null,
        pendingPin: null,
      };
    }
    case "LOAD":
      return {
        ...state,
        placements: action.doc.placements,
        connections: action.doc.connections,
        selection: null,
        pendingPin: null,
        rev: state.rev + 1,
      };
    default:
      return state;
  }
}

// ---------- Context ----------

interface DesignStoreValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  doc: DesignDocument;
  canUndo: boolean;
  canRedo: boolean;
  uniqueName: (prefix: string) => string;
}

const DesignStoreContext = createContext<DesignStoreValue | null>(null);

export function DesignStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);

  // Load persisted design once on mount.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const saved = loadDesign();
    if (saved) dispatch({ type: "LOAD", doc: saved });
  }, []);

  // Auto-save whenever placements/connections change.
  useEffect(() => {
    if (!loadedRef.current) return;
    saveDesign({ placements: state.placements, connections: state.connections });
  }, [state.rev, state.placements, state.connections]);

  const uniqueName = useCallback(

    (prefix: string) => {
      let n = 0;
      const taken = new Set(state.placements.map((p) => p.name));
      while (taken.has(`${prefix}${n}`)) n++;
      return `${prefix}${n}`;
    },
    [state.placements],
  );

  const value = useMemo<DesignStoreValue>(
    () => ({
      state,
      dispatch,
      doc: { placements: state.placements, connections: state.connections },
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      uniqueName,
    }),
    [state, uniqueName],
  );

  return <DesignStoreContext.Provider value={value}>{children}</DesignStoreContext.Provider>;
}

export function useDesignStore(): DesignStoreValue {
  const ctx = useContext(DesignStoreContext);
  if (!ctx) throw new Error("useDesignStore must be used inside DesignStoreProvider");
  return ctx;
}

export function prefixForCategory(category: string | undefined): string {
  switch (category) {
    case "qubits":
      return "Q";
    case "resonators":
      return "R";
    case "couplers":
      return "C";
    case "routes":
      return "W";
    case "launchpads":
      return "L";
    case "ground":
      return "G";
    case "terminations":
      return "T";
    default:
      return "X";
  }
}
