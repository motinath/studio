import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { X, Download, Copy, Play, Loader2, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { bridgeClient } from "@/lib/bridge/client";
import { useWorkspace } from "@/lib/editor/workspace-store";
import type { DesignDocument } from "@/lib/bridge/types";

export type CodePanelMode = "generate" | "write";

interface Props { mode: CodePanelMode; onClose: () => void; }

const STARTER = `# 'design' is pre-created. All QComponent classes are available by name.
# Pin names: TransmonPocket → a,b,c,d | TransmonCross → readout,bus_01,bus_02

Q0 = TransmonPocket(design, 'Q0', options=dict(
    pos_x='-3mm', pos_y='0mm',
    connection_pads=dict(
        a=dict(loc_W=+1, loc_H=+1), b=dict(loc_W=-1, loc_H=+1),
        c=dict(loc_W=+1, loc_H=-1), d=dict(loc_W=-1, loc_H=-1),
    ),
))
Q1 = TransmonPocket(design, 'Q1', options=dict(
    pos_x='0mm', pos_y='0mm',
    connection_pads=dict(
        a=dict(loc_W=+1, loc_H=+1), b=dict(loc_W=-1, loc_H=+1),
        c=dict(loc_W=+1, loc_H=-1), d=dict(loc_W=-1, loc_H=-1),
    ),
))
Q2 = TransmonPocket(design, 'Q2', options=dict(
    pos_x='3mm', pos_y='0mm',
    connection_pads=dict(
        a=dict(loc_W=+1, loc_H=+1), b=dict(loc_W=-1, loc_H=+1),
        c=dict(loc_W=+1, loc_H=-1), d=dict(loc_W=-1, loc_H=-1),
    ),
))
Q0_Q1 = RouteMeander(design, 'Q0_Q1', options=dict(
    pin_inputs=dict(start_pin=dict(component='Q0', pin='a'), end_pin=dict(component='Q1', pin='b')),
    total_length='8mm',
))
Q1_Q2 = RouteMeander(design, 'Q1_Q2', options=dict(
    pin_inputs=dict(start_pin=dict(component='Q1', pin='a'), end_pin=dict(component='Q2', pin='b')),
    total_length='8mm',
))
design.rebuild()
`;

export function CodeIdePanel({ mode, onClose }: Props) {
  const { activeTab, workspace, newCanvas, loadIntoCanvas } = useWorkspace();
  const queryClient = useQueryClient();
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const doc   = { placements: activeTab.state.placements, connections: activeTab.state.connections };
  const state = activeTab.state;

  const [genCode,    setGenCode]    = useState("");
  const [genFile,    setGenFile]    = useState("design.py");
  const [writeCode,  setWriteCode]  = useState(STARTER);
  const [runResult,  setRunResult]  = useState<{ ok: boolean; error?: string } | null>(null);
  const [runTarget,  setRunTarget]  = useState<"current" | "new">("current");

  const genMu = useMutation({
    mutationFn: () => bridgeClient.generateCode(doc).then((r) => { if (r.error) throw new Error(r.error); return r.data!; }),
    onSuccess: (data) => { setGenCode(data.code); setGenFile(data.filename); queryClient.setQueryData(["bridge", "generate-code"], data); },
    onError: (e) => toast.error(`Generate failed: ${e instanceof Error ? e.message : String(e)}`),
  });

  useEffect(() => { if (mode === "generate") genMu.mutate(); }, [mode]);
  useEffect(() => {
    if (mode !== "generate") return;
    const t = setTimeout(() => genMu.mutate(), 800);
    return () => clearTimeout(t);
  }, [state.rev, mode]);

  const runMu = useMutation({
    mutationFn: () => bridgeClient.runCode(writeCode).then((r) => { if (r.error) throw new Error(r.error); return r.data!; }),
    onSuccess: (data) => {
      if (data.ok && data.design) {
        const newDoc = data.design as DesignDocument;
        if (runTarget === "new") {
          const names = workspace.tabs.map((t) => t.name);
          let n = 1; while (names.includes(`CodeResult${n}`)) n++;
          newCanvas(`CodeResult${n}`, newDoc);
        } else {
          loadIntoCanvas(activeTab.id, newDoc);
        }
        queryClient.invalidateQueries({ queryKey: ["bridge", "render"] });
        setRunResult({ ok: true });
        toast.success(runTarget === "new" ? "Design opened in new canvas" : "Canvas updated");
      } else {
        setRunResult({ ok: false, error: data.error ?? "Unknown error" });
        toast.error("Code execution failed");
      }
    },
    onError: (e) => { const msg = e instanceof Error ? e.message : String(e); setRunResult({ ok: false, error: msg }); toast.error(`Run failed: ${msg}`); },
  });

  const activeCode = mode === "generate" ? genCode : writeCode;
  const activeFile = mode === "generate" ? genFile : "qiskit_metal_chip.py";

  const copy = useCallback(() => { if (!activeCode) return; navigator.clipboard.writeText(activeCode); toast.success("Copied"); }, [activeCode]);
  const dl   = useCallback(() => {
    if (!activeCode) return;
    const url = URL.createObjectURL(new Blob([activeCode], { type: "text/x-python" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: activeFile });
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Downloaded ${activeFile}`);
  }, [activeCode, activeFile]);

  const onMount = (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    if (mode === "write") editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => { if (!runMu.isPending) { setRunResult(null); runMu.mutate(); } });
  };

  const isPending = mode === "generate" ? genMu.isPending : runMu.isPending;

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e] text-white" style={{ animation: "slideInRight 0.2s ease-out" }}>
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/10 bg-[#252526] px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          {mode === "generate" ? "Generated Code" : "Code IDE"}
        </span>
        {isPending && <Loader2 className="h-3 w-3 animate-spin text-white/40" />}
        {runResult && mode === "write" && (
          <span className={cn("flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold", runResult.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
            {runResult.ok ? <><CheckCircle2 className="h-3 w-3" /> Applied</> : <><AlertTriangle className="h-3 w-3" /> Error</>}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {mode === "write" && (
            <div className="flex items-center">
              <Button size="sm" onClick={() => { setRunResult(null); runMu.mutate(); }} disabled={runMu.isPending}
                className="h-7 gap-1.5 rounded-r-none bg-emerald-600 text-[11px] text-white hover:bg-emerald-700">
                {runMu.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Run {runTarget === "new" ? "→ New" : "→ Current"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={runMu.isPending} className="h-7 rounded-l-none border-l border-emerald-700 bg-emerald-600 px-1.5 text-white hover:bg-emerald-700">
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem className="text-[11px] gap-2" onSelect={() => setRunTarget("current")}>
                    <span className={cn("h-2 w-2 rounded-full", runTarget === "current" ? "bg-emerald-500" : "bg-muted-foreground/30")} /> Run → Current Canvas
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-[11px] gap-2" onSelect={() => setRunTarget("new")}>
                    <span className={cn("h-2 w-2 rounded-full", runTarget === "new" ? "bg-emerald-500" : "bg-muted-foreground/30")} /> Run → New Canvas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {mode === "generate" && (
            <Button size="sm" variant="ghost" onClick={() => genMu.mutate()} disabled={genMu.isPending}
              className="h-7 gap-1.5 text-[11px] text-white/70 hover:bg-white/10 hover:text-white">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={copy} disabled={!activeCode} className="h-7 gap-1.5 text-[11px] text-white/70 hover:bg-white/10 hover:text-white">
            <Copy className="h-3 w-3" /> Copy
          </Button>
          <Button size="sm" variant="ghost" onClick={dl} disabled={!activeCode} className="h-7 gap-1.5 text-[11px] text-white/70 hover:bg-white/10 hover:text-white">
            <Download className="h-3 w-3" /> Download
          </Button>
          <div className="mx-1 h-4 w-px bg-white/10" />
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error output */}
      {mode === "write" && runResult && !runResult.ok && runResult.error && (
        <div className="max-h-36 shrink-0 overflow-auto border-b border-red-500/30 bg-red-950/40 p-3">
          <p className="mb-1 text-[10px] font-bold uppercase text-red-400">Execution Error</p>
          <pre className="whitespace-pre-wrap font-mono text-[10px] text-red-300">{runResult.error}</pre>
        </div>
      )}

      {/* Monaco */}
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={mode === "generate" ? genCode : writeCode}
          onChange={(val) => { if (mode === "write") { setWriteCode(val ?? ""); setRunResult(null); } }}
          options={{
            readOnly: mode === "generate", fontSize: 12, lineNumbers: "on",
            minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true,
            wordWrap: "on", tabSize: 4, autoIndent: "full", fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
          onMount={onMount}
          loading={<div className="flex h-full items-center justify-center text-[11px] text-white/40">Loading editor…</div>}
        />
      </div>

      {/* Status bar */}
      <div className="flex h-6 shrink-0 items-center gap-3 border-t border-white/10 bg-[#007acc] px-3 text-[10px] text-white/80">
        <span>Python</span><span>·</span>
        <span>{mode === "generate" ? "Read-only · auto-synced" : "'design' + all QComponents pre-loaded · Ctrl+Enter to run"}</span>
        {activeCode && <><span>·</span><span>{activeCode.split("\n").length} lines</span></>}
      </div>
    </div>
  );
}
