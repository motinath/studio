import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace, type CanvasTab } from "@/lib/editor/workspace-store";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CanvasTabs() {
  const { workspace, dispatch, saveAll } = useWorkspace();
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editValue,    setEditValue]    = useState("");
  const [closeConfirm, setCloseConfirm] = useState<{ id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editingId) inputRef.current?.select(); }, [editingId]);

  const startRename = useCallback((tab: CanvasTab) => { setEditingId(tab.id); setEditValue(tab.name); }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) dispatch({ type: "RENAME_CANVAS", id: editingId, name: editValue.trim() });
    setEditingId(null);
  }, [editingId, editValue, dispatch]);

  const handleClose = useCallback((e: React.MouseEvent, tab: CanvasTab) => {
    e.stopPropagation();
    const hasContent = tab.state.placements.length > 0 || tab.state.connections.length > 0;
    if (tab.dirty && hasContent) setCloseConfirm({ id: tab.id, name: tab.name });
    else dispatch({ type: "CLOSE_CANVAS", id: tab.id });
  }, [dispatch]);

  return (
    <>
      <div className="flex h-8 shrink-0 items-end overflow-x-auto border-b border-border bg-muted/30 px-2 gap-0.5" style={{ scrollbarWidth: "none" }}>
        {workspace.tabs.map((tab) => {
          const isActive = tab.id === workspace.activeId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => dispatch({ type: "SWITCH_CANVAS", id: tab.id })}
              onDoubleClick={() => startRename(tab)}
              className={cn(
                "group relative flex h-7 max-w-[160px] min-w-[80px] shrink-0 cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 px-2.5 text-[11px] font-medium transition-colors select-none",
                isActive ? "border-border bg-background text-foreground shadow-sm" : "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.dirty && <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />}
              {editingId === tab.id ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingId(null); }}
                  className="w-full min-w-0 bg-transparent outline-none"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: 110 }}
                />
              ) : (
                <span className="truncate" style={{ maxWidth: 110 }}>{tab.name}</span>
              )}
              <button
                type="button"
                onClick={(e) => handleClose(e, tab)}
                className={cn("ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100", isActive && "opacity-60")}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => dispatch({ type: "NEW_CANVAS" })}
          className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          title="New canvas"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <AlertDialog open={!!closeConfirm} onOpenChange={(open) => { if (!open) setCloseConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              Canvas <strong>"{closeConfirm?.name}"</strong> has unsaved changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (closeConfirm) dispatch({ type: "CLOSE_CANVAS", id: closeConfirm.id }); setCloseConfirm(null); }}
            >
              Close without saving
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => { saveAll(); if (closeConfirm) dispatch({ type: "CLOSE_CANVAS", id: closeConfirm.id }); setCloseConfirm(null); }}
            >
              Save &amp; Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
