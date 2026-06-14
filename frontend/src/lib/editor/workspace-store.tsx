/**
 * workspace-store.tsx — Multi-canvas workspace state management.
 */
import {
  createContext, useCallback, useContext, useEffect,
  useMemo, useReducer, useRef, type ReactNode,
} from "react";
import {
  editorReducer, initialEditorState,
  type EditorState, type EditorAction,
} from "./design-store";
import type { DesignDocument } from "@/lib/bridge/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CanvasTab {
  id: string;
  name: string;
  state: EditorState;
  dirty: boolean;
  savedAt: number | null;
}

export interface WorkspaceState {
  tabs: CanvasTab[];
  activeId: string;
  saveStatus: "saved" | "unsaved" | "saving";
}

type WorkspaceAction =
  | { type: "NEW_CANVAS"; name?: string; id?: string }
  | { type: "CLOSE_CANVAS"; id: string }
  | { type: "SWITCH_CANVAS"; id: string }
  | { type: "RENAME_CANVAS"; id: string; name: string }
  | { type: "CANVAS_ACTION"; id: string; action: EditorAction }
  | { type: "LOAD_INTO_CANVAS"; id: string; doc: DesignDocument }
  | { type: "MARK_SAVED"; id: string }
  | { type: "SET_SAVE_STATUS"; status: WorkspaceState["saveStatus"] };

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `canvas_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function uniqueName(existing: string[]): string {
  let n = 1;
  while (existing.includes(`Untitled${n}`)) n++;
  return `Untitled${n}`;
}

function makeTab(name: string, id?: string): CanvasTab {
  return { id: id ?? generateId(), name, state: { ...initialEditorState }, dirty: false, savedAt: null };
}

// ── Initial state ─────────────────────────────────────────────────────────────

function makeInitialState(): WorkspaceState {
  const first = makeTab("Untitled1");
  return { tabs: [first], activeId: first.id, saveStatus: "saved" };
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "NEW_CANVAS": {
      const name = action.name?.trim() || uniqueName(state.tabs.map((t) => t.name));
      const tab  = makeTab(name, action.id);
      return { ...state, tabs: [...state.tabs, tab], activeId: tab.id, saveStatus: "unsaved" };
    }
    case "CLOSE_CANVAS": {
      if (state.tabs.length === 1)
        return { ...state, tabs: [{ ...state.tabs[0], state: { ...initialEditorState }, dirty: false }], saveStatus: "saved" };
      const idx     = state.tabs.findIndex((t) => t.id === action.id);
      const newTabs = state.tabs.filter((t) => t.id !== action.id);
      const newActive = state.activeId === action.id ? (newTabs[Math.max(0, idx - 1)]?.id ?? newTabs[0].id) : state.activeId;
      return { ...state, tabs: newTabs, activeId: newActive, saveStatus: "unsaved" };
    }
    case "SWITCH_CANVAS":
      return { ...state, activeId: action.id };
    case "RENAME_CANVAS":
      return { ...state, tabs: state.tabs.map((t) => t.id === action.id ? { ...t, name: action.name, dirty: true } : t), saveStatus: "unsaved" };
    case "CANVAS_ACTION": {
      const newTabs = state.tabs.map((t) =>
        t.id !== action.id ? t : { ...t, state: editorReducer(t.state, action.action), dirty: true },
      );
      return { ...state, tabs: newTabs, saveStatus: "unsaved" };
    }
    case "LOAD_INTO_CANVAS": {
      const newTabs = state.tabs.map((t) =>
        t.id !== action.id ? t : { ...t, state: editorReducer(t.state, { type: "LOAD", doc: action.doc }), dirty: true },
      );
      return { ...state, tabs: newTabs, activeId: action.id, saveStatus: "unsaved" };
    }
    case "MARK_SAVED": {
      const now = Date.now();
      const newTabs = state.tabs.map((t) => t.id === action.id ? { ...t, dirty: false, savedAt: now } : t);
      const allSaved = newTabs.every((t) => !t.dirty);
      return { ...state, tabs: newTabs, saveStatus: allSaved ? "saved" : "unsaved" };
    }
    case "SET_SAVE_STATUS":
      return { ...state, saveStatus: action.status };
    default:
      return state;
  }
}

// ── Persistence ───────────────────────────────────────────────────────────────

const WORKSPACE_KEY = "silicofeller:workspace:v2";

function persistWorkspace(ws: WorkspaceState): void {
  try {
    const slim = { ...ws, tabs: ws.tabs.map((t) => ({ ...t, state: { ...t.state, past: [], future: [] } })), saveStatus: "saved" as const };
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(slim));
  } catch { /* quota */ }
}

function loadWorkspace(): WorkspaceState | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkspaceState;
    if (!Array.isArray(parsed.tabs) || parsed.tabs.length === 0) return null;
    return {
      ...parsed, saveStatus: "saved",
      tabs: parsed.tabs.map((t) => ({ ...t, state: { ...initialEditorState, ...t.state, past: [], future: [] } })),
    };
  } catch { return null; }
}

// ── Context ───────────────────────────────────────────────────────────────────

export interface WorkspaceContextValue {
  workspace: WorkspaceState;
  activeTab: CanvasTab;
  dispatch: (action: WorkspaceAction) => void;
  dispatchActive: (action: EditorAction) => void;
  newCanvas: (name?: string, doc?: DesignDocument, customId?: string) => string;
  loadIntoCanvas: (canvasId: string, doc: DesignDocument) => void;
  saveAll: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, dispatch] = useReducer(workspaceReducer, null, () => loadWorkspace() ?? makeInitialState());

  const activeTab = useMemo(
    () => workspace.tabs.find((t) => t.id === workspace.activeId) ?? workspace.tabs[0],
    [workspace],
  );

  const dispatchActive = useCallback(
    (action: EditorAction) => dispatch({ type: "CANVAS_ACTION", id: workspace.activeId, action }),
    [workspace.activeId],
  );

  const newCanvas = useCallback((name?: string, doc?: DesignDocument, customId?: string): string => {
    const existingNames = workspace.tabs.map((t) => t.name);
    const resolvedName  = name?.trim() || uniqueName(existingNames);
    const newId = customId ?? generateId();
    dispatch({ type: "NEW_CANVAS", name: resolvedName, id: newId });
    if (doc) dispatch({ type: "LOAD_INTO_CANVAS", id: newId, doc });
    return newId;
  }, [workspace.tabs]);

  const loadIntoCanvas = useCallback((canvasId: string, doc: DesignDocument) => {
    dispatch({ type: "LOAD_INTO_CANVAS", id: canvasId, doc });
    dispatch({ type: "SWITCH_CANVAS", id: canvasId });
  }, []);

  const saveAll = useCallback(() => {
    dispatch({ type: "SET_SAVE_STATUS", status: "saving" });
    persistWorkspace(workspace);
    workspace.tabs.forEach((t) => dispatch({ type: "MARK_SAVED", id: t.id }));
    dispatch({ type: "SET_SAVE_STATUS", status: "saved" });
  }, [workspace]);

  // Debounced auto-persist on every change
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;

  useEffect(() => {
    if (workspace.saveStatus !== "unsaved") return;
    const t = setTimeout(() => {
      persistWorkspace(workspaceRef.current);
      workspaceRef.current.tabs.forEach((tab) => dispatch({ type: "MARK_SAVED", id: tab.id }));
    }, 1_000);
    return () => clearTimeout(t);
  }, [workspace]);

  // Auto-save every 25 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const ws = workspaceRef.current;
      if (ws.saveStatus === "unsaved") {
        dispatch({ type: "SET_SAVE_STATUS", status: "saving" });
        persistWorkspace(ws);
        ws.tabs.forEach((t) => dispatch({ type: "MARK_SAVED", id: t.id }));
        dispatch({ type: "SET_SAVE_STATUS", status: "saved" });
      }
    }, 25_000);
    return () => clearInterval(interval);
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ workspace, activeTab, dispatch, dispatchActive, newCanvas, loadIntoCanvas, saveAll }),
    [workspace, activeTab, dispatchActive, newCanvas, loadIntoCanvas, saveAll],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
