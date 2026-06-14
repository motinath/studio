import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ChevronDown, ChevronRight, Search, Box, Loader2, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { componentsQueryOptions, componentMetadataQueryOptions, componentPreviewQueryOptions } from "@/lib/bridge/queries";
import { QISKIT_CATALOG, QISKIT_CATEGORY_ORDER, QISKIT_CATEGORY_LABEL } from "./qiskit-metal-catalog";

import type { ComponentCategory, ComponentSummary } from "@/lib/bridge/types";
import type { QiskitCategory } from "./qiskit-metal-catalog";

// Map Qiskit catalog categories to bridge ComponentCategory
const QISKIT_TO_BRIDGE: Record<QiskitCategory, ComponentCategory> = {
  qubits: "qubits",
  couplers: "couplers",
  tlines: "routes",
  resonators: "resonators",
  terminations: "terminations",
  lumped: "other",
  "sample shapes": "other",
};

// Convert the static catalog to ComponentSummary format for fallback
const STATIC_COMPONENTS: ComponentSummary[] = QISKIT_CATALOG.map((c) => ({
  id: c.className,
  name: c.label,
  module: c.modulePath,
  category: QISKIT_TO_BRIDGE[c.category],
  description: c.description,
}));

// All ordered categories for display
const DISPLAY_CATEGORY_ORDER: ComponentCategory[] = [
  "qubits",
  "resonators",
  "couplers",
  "routes",
  "launchpads",
  "ground",
  "terminations",
  "other",
];

export function ComponentLibrary() {
  return <LibraryContent />;
}

function LibraryContent() {
  const [filter, setFilter] = useState("");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<Partial<Record<ComponentCategory, boolean>>>({
    qubits: true,
    routes: true,
  });

  // Suppress SSR/client mismatch by only showing dynamic content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: bridgeData,
    isLoading,
    isError,
  } = useQuery({
    ...componentsQueryOptions(),
    // Don't run on server — avoids hydration mismatch from async bridge data
    enabled: mounted,
    // Don't show error state if bridge is unavailable — we have a fallback
    retry: 1,
  });

  // Use bridge data if available, otherwise fall back to static catalog
  const components: ComponentSummary[] = useMemo(() => {
    if (bridgeData && bridgeData.length > 0) return bridgeData;
    return STATIC_COMPONENTS;
  }, [bridgeData]);

  const usingFallback = !isLoading && (isError || !bridgeData || bridgeData.length === 0);

  const grouped: Record<ComponentCategory, ComponentSummary[]> = {
    qubits: [],
    resonators: [],
    couplers: [],
    routes: [],
    launchpads: [],
    ground: [],
    terminations: [],
    other: [],
  };
  const q = filter.trim().toLowerCase();
  for (const c of components) {
    if (q && !c.name.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) continue;
    (grouped[c.category] ?? grouped.other).push(c);
  }

  const sourceLabel = usingFallback
    ? "Qiskit Metal catalog (offline)"
    : isLoading
      ? "Loading from bridge…"
      : `Bridge · ${components.length} components`;

  return (
    <div className="flex h-full flex-col gap-2 text-xs min-w-[155px]">
      <div className="px-1 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Component Library
        </p>
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
          {usingFallback && <WifiOff className="h-2.5 w-2.5 shrink-0" />}
          {mounted ? sourceLabel : "Loading…"}
        </p>
      </div>
      <div className="relative px-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter components"
          className="h-7 pl-7 text-[11px]"
        />
      </div>

      {!mounted && (
        <div className="flex flex-1 items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {mounted && components.length === 0 && (
        <div className="flex flex-1 items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading components…
        </div>
      )}

      {mounted && components.length > 0 && (
        <div className="flex-1 space-y-1 overflow-y-auto px-1 pb-2">
          {DISPLAY_CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat];
            if (items.length === 0) return null;
            const isOpen = open[cat] ?? false;
            return (
              <div key={cat} className="overflow-hidden rounded-md border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setOpen((s) => ({ ...s, [cat]: !isOpen }))}
                  className="flex w-full items-center justify-between border-b border-border bg-muted/40 px-2 py-1.5 text-left text-[11px] font-semibold text-foreground hover:bg-muted"
                >
                  <span className="capitalize">{cat}</span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {items.length}
                    {isOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </span>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-2 gap-1.5 p-1.5">
                    {items.map((c) => (
                      <LibraryItem key={c.id} component={c} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LibraryItem({ component }: { component: ComponentSummary }) {
  const [dragging, setDragging] = useState(false);
  const qc = useQueryClient();

  // Look up the static catalog entry for the thumbnail image
  const catalogEntry = useMemo(
    () => QISKIT_CATALOG.find((c) => c.className === component.id),
    [component.id],
  );

  const handlePrefetch = () => {
    qc.prefetchQuery(componentMetadataQueryOptions(component.id));
    qc.prefetchQuery(componentPreviewQueryOptions(component.id));
  };

  return (
    <div
      draggable
      onMouseEnter={handlePrefetch}
      onDragStart={(e) => {
        handlePrefetch();
        if (e.dataTransfer) {
          e.dataTransfer.setData(`application/x-silicofeller-component:${component.id}`, "");
          e.dataTransfer.setData("application/x-silicofeller-component", component.id);
          e.dataTransfer.effectAllowed = "copy";
        }
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={cn(
        "group flex cursor-grab flex-col items-center gap-1 rounded-md border border-border bg-background p-1.5 transition-all duration-150 hover:border-primary hover:shadow-sm active:cursor-grabbing",
        dragging && "scale-[0.95] opacity-60"
      )}
      title={`${component.name} — ${component.description ?? component.category}`}
    >
      {/* Preview thumbnail — use CDN image from static catalog if available */}
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded bg-muted/40">
        {catalogEntry?.image ? (
          <img
            src={catalogEntry.image}
            alt={component.name}
            className="h-full w-full object-contain"
            onError={(e) => {
              // If CDN image fails, fall back to icon
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML =
                  '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>';
              }
            }}
          />
        ) : (
          <Box className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
        )}
      </div>

      {/* Name — truncated with full name on hover via title */}
      <span
        className="w-full truncate text-center text-[10px] font-semibold leading-tight text-foreground"
        title={component.name}
      >
        {component.name}
      </span>
    </div>
  );
}
