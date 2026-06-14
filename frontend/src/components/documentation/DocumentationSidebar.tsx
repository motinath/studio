import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

// Sidebar structure matching the original index.html
const SIDEBAR_STRUCTURE: SidebarGroup[] = [
  {
    title: "Getting Started",
    items: [
      { id: "hello-world", label: "Hello World" },
      { id: "installation", label: "Installation" },
      { id: "using-python", label: "Using Python and QClang" },
    ],
  },
  {
    title: "Onboarding Tutorial",
    items: [
      { id: "getting-started", label: "Onboarding Tutorial" },
      { id: "qclang-overview", label: "QClang Overview Tutorial" },
      { id: "syntax-part-1", label: "Syntax Tutorial - Part 1" },
      { id: "syntax-part-2", label: "Syntax Tutorial - Part 2" },
      { id: "synthesis-tutorial", label: "Synthesis Tutorial" },
      { id: "execution-part-1", label: "Execution Tutorial - Part 1" },
      { id: "execution-part-2", label: "Execution Tutorial - Part 2" },
    ],
  },
  {
    title: "Reference Parameters",
    items: [
      { id: "language-reference", label: "Language Blocks" },
      { id: "compiler-reference", label: "Compiler Pipeline" },
      { id: "design-rules", label: "Design Rules" },
      { id: "targets", label: "Compilation Targets" },
      { id: "api-reference", label: "API Reference" },
      {
        id: "superconducting-materials",
        label: "Superconducting Materials",
        children: [
          { id: "material-aluminum-al", label: "Aluminum (Al)" },
          { id: "material-niobium-nb", label: "Niobium (Nb)" },
          { id: "material-silicon-si-substrate", label: "Silicon (Si) Substrate" },
          { id: "material-sapphire-al2o3-substrate", label: "Sapphire (Al2O3) Substrate" },
          { id: "material-titanium-nitride-tin", label: "Titanium Nitride (TiN)" },
          { id: "material-niobium-nitride-nbn", label: "Niobium Nitride (NbN)" },
          { id: "material-niobium-titanium-nitride-nbtin", label: "Niobium Titanium Nitride (NbTiN)" },
          { id: "material-aluminum-oxide-alox-tunnel-barrier", label: "Aluminum Oxide (AlOx) Tunnel Barrier" },
          { id: "material-molybdenum-rhenium-more", label: "Molybdenum Rhenium (MoRe)" },
          { id: "material-indium-in-bump-bonds", label: "Indium (In) Bump Bonds" },
          { id: "materials-summary", label: "Materials Summary" },
        ],
      },
    ],
  },
  {
    title: "Simulation and Analysis",
    items: [
      { id: "hfss-tutorial", label: "HFSS Tutorial" },
      { id: "q3d-tutorial", label: "Q3D Analysis Tutorial" },
      { id: "epr-tutorial", label: "EPR / scQubits Tutorial" },
      { id: "simulation-dashboard", label: "Simulation Dashboard" },
      { id: "results-reports", label: "Results and Reports" },
      {
        id: "hfss-results-analysis",
        label: "HFSS Results Analysis",
        children: [
          { id: "hfss-s-parameters", label: "S-Parameters & RF Performance" },
          { id: "hfss-resonator-cavity", label: "Resonator & Cavity Parameters" },
          { id: "hfss-em-fields", label: "Electromagnetic Field Outputs" },
          { id: "hfss-qubit-performance", label: "Qubit Performance Metrics" },
          { id: "hfss-crosstalk-isolation", label: "Crosstalk & Isolation" },
          { id: "hfss-thermal-loss", label: "Thermal & Loss Parameters" },
          { id: "hfss-convergence", label: "Simulation Convergence Metrics" },
          { id: "hfss-summary", label: "HFSS Summary" },
        ],
      },
      {
        id: "q3d-results-analysis",
        label: "Q3D Results Analysis",
        children: [
          { id: "q3d-resistance-matrix", label: "Resistance Matrix (R)" },
          { id: "q3d-inductance-matrix", label: "Inductance Matrix (L)" },
          { id: "q3d-conductance-matrix", label: "Conductance Matrix (G)" },
          { id: "q3d-capacitance-matrix", label: "Capacitance Matrix (C)" },
          { id: "q3d-parasitic-resistance", label: "Parasitic Resistance" },
          { id: "q3d-parasitic-inductance", label: "Parasitic Inductance" },
          { id: "q3d-parasitic-capacitance", label: "Parasitic Capacitance" },
          { id: "q3d-electromagnetic-coupling", label: "Electromagnetic Coupling" },
          { id: "q3d-substrate-dielectric-loss", label: "Substrate & Dielectric Loss" },
          { id: "q3d-skin-effect-frequency", label: "Skin Effect & Frequency-Dependent" },
          { id: "q3d-post-processing-derived", label: "Post-Processing Derived Outputs" },
          { id: "q3d-key-takeaways", label: "Key Takeaways" },
        ],
      },
      {
        id: "epr-results-analysis",
        label: "EPR / scQubits Results",
        children: [
          { id: "epr-overview-table", label: "Overview" },
          { id: "epr-core-parameters", label: "Core EPR Parameters" },
          { id: "epr-qubit-performance", label: "Qubit Performance" },
          { id: "epr-resonator-coupling", label: "Resonator & Coupling" },
          { id: "epr-loss-dissipation", label: "Loss & Dissipation" },
          { id: "epr-junction-parameters", label: "Junction Parameters" },
          { id: "epr-simulation-convergence", label: "Simulation Convergence" },
          { id: "epr-summary-table", label: "Summary Table" },
        ],
      },
    ],
  },
];

interface DocumentationSidebarProps {
  activeHash: string;
  onNavigate: (hash: string) => void;
}

export function DocumentationSidebar({ activeHash, onNavigate }: DocumentationSidebarProps) {
  // Map panel IDs to check their expand state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "superconducting-materials": false,
    "hfss-results-analysis": false,
    "q3d-results-analysis": false,
    "epr-results-analysis": false,
  });

  // Keep parent folders open when activeHash matches a child
  useEffect(() => {
    if (!activeHash) return;
    const cleanHash = activeHash.replace("#", "");

    SIDEBAR_STRUCTURE.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children) {
          const hasChildActive = item.children.some((child) => child.id === cleanHash);
          if (hasChildActive || item.id === cleanHash) {
            setExpanded((prev) => ({ ...prev, [item.id]: true }));
          }
        }
      });
    });
  }, [activeHash]);

  const toggleTree = (treeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isNowOpen = !expanded[treeId];
    setExpanded((prev) => ({ ...prev, [treeId]: isNowOpen }));

    // Navigate to the parent section if it is opened
    if (isNowOpen) {
      onNavigate(`#${treeId}`);
    }
  };

  return (
    <aside className="sidebar sticky top-[132px] self-start max-h-[calc(100vh-142px)] overflow-y-auto pr-2 text-[var(--muted)]" aria-label="Documentation sections">
      {SIDEBAR_STRUCTURE.map((group, gIdx) => (
        <div key={gIdx} className="mb-6">
          <div className="side-title text-[var(--text)] font-bold text-sm tracking-wide uppercase mt-7.5 mb-2.5">
            {group.title}
          </div>
          <div className="side-group grid gap-2">
            {group.items.map((item) => {
              const cleanHash = activeHash.replace("#", "");
              const isSelected = cleanHash === item.id;
              const hasChildren = !!item.children;
              const isExpanded = expanded[item.id] || false;

              if (hasChildren) {
                return (
                  <div key={item.id} className="flex flex-col">
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => toggleTree(item.id, e)}
                      aria-expanded={isExpanded}
                      className={cn(
                        "side-parent flex items-center justify-between rounded-[14px] min-h-[46px] px-4 py-2 hover:bg-[#43c7d5]/10 hover:text-[var(--accent)] transition-all cursor-pointer",
                        isExpanded ? "selected text-[var(--accent)] bg-[#43c7d5]/10" : ""
                      )}
                    >
                      <span className="flex items-center gap-3 font-semibold">
                        <span>{item.label}</span>
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-150 text-[var(--muted)]",
                          isExpanded ? "rotate-90" : ""
                        )}
                      />
                    </a>
                    
                    {isExpanded && (
                      <div className="side-children grid gap-1.5 mt-1">
                        {item.children?.map((child) => {
                          const isChildSelected = cleanHash === child.id;
                          return (
                            <a
                              key={child.id}
                              href={`#${child.id}`}
                              onClick={(e) => {
                                e.preventDefault();
                                onNavigate(`#${child.id}`);
                              }}
                              className={cn(
                                "side-child flex items-center gap-3 rounded-[10px] min-h-[34px] ml-[28px] pl-3.5 pr-3 text-[14px] hover:text-[var(--accent)] transition-colors cursor-pointer",
                                isChildSelected ? "selected text-[var(--accent)] font-bold" : "text-[var(--muted)]"
                              )}
                            >
                              <span className="truncate">{child.label}</span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(`#${item.id}`);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-[14px] min-h-[46px] px-4 py-2 hover:bg-[#43c7d5]/10 hover:text-[var(--accent)] transition-all cursor-pointer",
                    isSelected ? "selected text-[var(--accent)] bg-[#43c7d5]/10 font-bold" : ""
                  )}
                >
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}
