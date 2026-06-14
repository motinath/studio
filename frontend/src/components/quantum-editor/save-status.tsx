import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useWorkspace } from "@/lib/editor/workspace-store";
import { cn } from "@/lib/utils";

export function SaveStatus() {
  const { workspace } = useWorkspace();
  const { saveStatus } = workspace;

  const title =
    saveStatus === "saved"
      ? "All changes saved"
      : saveStatus === "unsaved"
      ? "Unsaved changes"
      : "Saving…";

  return (
    <div
      title={title}
      className={cn(
        "flex items-center justify-center transition-all",
        saveStatus === "saved"   && "text-emerald-600",
        saveStatus === "unsaved" && "text-amber-500",
        saveStatus === "saving"  && "text-muted-foreground",
      )}
    >
      {saveStatus === "saved"   && <CheckCircle2 className="h-3.5 w-3.5" />}
      {saveStatus === "unsaved" && <Circle       className="h-3.5 w-3.5 fill-amber-500/30" />}
      {saveStatus === "saving"  && <Loader2      className="h-3.5 w-3.5 animate-spin" />}
    </div>
  );
}
