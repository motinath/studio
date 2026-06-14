import React, { useState, useEffect } from "react";
import { Search, MessageSquare, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentationSidebar } from "./DocumentationSidebar";
import { DocumentationSection } from "./DocumentationSection";
import { SearchModal, AssistantModal } from "./search-assistant-modal";
import { SECTIONS_DATA, SEARCH_ITEMS } from "./sections-data";
import "./documentation.css";

// 10 main tabs for the horizontal top bar navigation
const TABS = [
  { label: "Home", section: "home" },
  { label: "Getting Started", section: "getting-started" },
  { label: "User Guide", section: "user-guide" },
  { label: "Language Reference", section: "language-reference" },
  { label: "Compiler Reference", section: "compiler-reference" },
  { label: "Chip Synthesis", section: "chip-synthesis" },
  { label: "Simulation Tutorials", section: "hfss-tutorial" },
  { label: "Results Analysis", section: "hfss-results-analysis" },
  { label: "Integration", section: "integration" },
  { label: "Support", section: "support" },
];

// Helper to check if a hash ID is a primary section or subsection
const getParentSectionId = (hashId: string): string => {
  const cleanId = hashId.replace("#", "");
  
  if (SECTIONS_DATA[cleanId]) return cleanId;

  // List of superconducting materials (they are full sections)
  const materialsSections = [
    "material-aluminum-al", "material-niobium-nb", "material-silicon-si-substrate",
    "material-sapphire-al2o3-substrate", "material-titanium-nitride-tin", "material-niobium-nitride-nbn",
    "material-niobium-titanium-nitride-nbtin", "material-aluminum-oxide-alox-tunnel-barrier",
    "material-molybdenum-rhenium-more", "material-indium-in-bump-bonds", "materials-summary"
  ];
  if (materialsSections.includes(cleanId)) return cleanId;

  // Section groupings for child items inside Results Analysis sheets
  if (cleanId === "hfss-tutorial") return "hfss-tutorial";
  if (cleanId.startsWith("hfss-")) return "hfss-results-analysis";

  if (cleanId === "q3d-tutorial") return "q3d-tutorial";
  if (cleanId.startsWith("q3d-")) return "q3d-results-analysis";

  if (cleanId === "epr-tutorial") return "epr-tutorial";
  if (cleanId.startsWith("epr-")) return "epr-results-analysis";

  return "home";
};

// Helper to determine which tab should highlight based on active section
const getActiveTabForSection = (sectionId: string): string => {
  if (sectionId === "home") return "home";

  if ([
    "getting-started", "hello-world", "installation", "using-python",
    "qclang-overview", "syntax-part-1", "syntax-part-2", "synthesis-tutorial",
    "execution-part-1", "execution-part-2"
  ].includes(sectionId)) {
    return "getting-started";
  }

  if (sectionId === "user-guide") return "user-guide";

  if (["language-reference", "design-rules"].includes(sectionId)) {
    return "language-reference";
  }

  if (["compiler-reference", "targets"].includes(sectionId)) {
    return "compiler-reference";
  }

  if ([
    "chip-synthesis", "superconducting-materials", "materials-summary",
    "material-aluminum-al", "material-niobium-nb", "material-silicon-si-substrate",
    "material-sapphire-al2o3-substrate", "material-titanium-nitride-tin",
    "material-niobium-nitride-nbn", "material-niobium-titanium-nitride-nbtin",
    "material-aluminum-oxide-alox-tunnel-barrier", "material-molybdenum-rhenium-more",
    "material-indium-in-bump-bonds"
  ].includes(sectionId)) {
    return "chip-synthesis";
  }

  if ([
    "hfss-tutorial", "q3d-tutorial", "epr-tutorial",
    "simulation-dashboard", "results-reports"
  ].includes(sectionId)) {
    return "hfss-tutorial";
  }

  if (["hfss-results-analysis", "q3d-results-analysis", "epr-results-analysis"].includes(sectionId)) {
    return "hfss-results-analysis";
  }

  if (sectionId === "integration") return "integration";
  if (sectionId === "support") return "support";

  return "home";
};

export function DocumentationPage() {
  const [activeHash, setActiveHash] = useState("#home");
  const [activeSectionId, setActiveSectionId] = useState("home");
  
  // Theme state: default "light" (Blue accent) vs "soft" (Teal/Lime accent)
  const [theme, setTheme] = useState<"light" | "soft">("light");
  
  // Modals visibility states
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Sync state with window location hash
  useEffect(() => {
    const handleHashChange = () => {
      const currentHash = window.location.hash || "#home";
      setActiveHash(currentHash);
    };

    // Initialize hash
    handleHashChange();

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  // Update active section when hash changes and handle scrolls/focuses
  useEffect(() => {
    const hashId = activeHash.replace("#", "");
    const parentId = getParentSectionId(hashId);
    
    // Set active section ID
    setActiveSectionId(parentId);

    // Handle smooth scrolling and auto-expanding accordion details
    if (parentId !== hashId) {
      // Small timeout to wait for section rendering to display hidden content
      setTimeout(() => {
        const targetEl = document.getElementById(hashId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          
          // Auto-expand if the targeted sub-element is a details element or inside one
          if (targetEl.tagName === "DETAILS") {
            (targetEl as HTMLDetailsElement).open = true;
          } else {
            const parentDetails = targetEl.closest("details");
            if (parentDetails) {
              parentDetails.open = true;
            }
          }
        }
      }, 100);
    } else {
      // If switching main sections, scroll to the top of the viewport
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeHash]);

  // Hook to handle Ctrl+K keyboard shortcut for Search dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Apply body theme class
  useEffect(() => {
    if (theme === "soft") {
      document.body.classList.add("soft-theme");
    } else {
      document.body.classList.remove("soft-theme");
    }
  }, [theme]);

  const handleNavigate = (hash: string) => {
    window.location.hash = hash;
  };

  const handleTabClick = (section: string, e: React.MouseEvent) => {
    e.preventDefault();
    handleNavigate(`#${section}`);
  };

  const activeTabSection = getActiveTabForSection(activeSectionId);

  return (
    <div className="site-shell max-w-[1740px] mx-auto px-[5vw] pb-16">
      {/* Top Header Bar */}
      <header className="topbar sticky top-0 z-20 grid grid-cols-[1fr_minmax(320px,420px)_auto_auto] items-center gap-2.5 py-7 pb-5 bg-gradient-to-b from-[var(--bg)] via-[var(--bg)] to-transparent select-none">
        <div className="brand" />

        {/* Search Input Bar Trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="search-button flex items-center justify-between gap-3.5 text-left border border-[var(--line)] bg-white text-[var(--muted)] rounded-2xl min-h-[48px] px-4.5 cursor-pointer font-sans"
          type="button"
        >
          <span className="flex items-center gap-2">
            <Search className="h-4.5 w-4.5 text-[var(--text)] shrink-0" />
            <span>Search docs...</span>
          </span>
          <kbd className="text-[var(--faint)] font-mono font-semibold text-xs leading-none">
            Ctrl K
          </kbd>
        </button>

        {/* AI Assistant Chat Trigger */}
        <button
          onClick={() => setAssistantOpen(true)}
          className="assistant-button flex items-center gap-2 border border-[var(--line)] bg-white text-[var(--muted)] rounded-2xl min-h-[48px] px-4.5 cursor-pointer font-sans font-semibold hover:text-[var(--accent)] hover:bg-[#eaf2ff] hover:border-[#b9d2ff] transition-all"
          type="button"
        >
          <MessageSquare className="h-4.5 w-4.5 shrink-0" />
          <span>Ask Assistant</span>
        </button>

        {/* Theme Toggler */}
        <button
          onClick={() => setTheme((prev) => (prev === "light" ? "soft" : "light"))}
          className="theme-button flex items-center gap-2 border border-[var(--line)] bg-white text-[var(--muted)] rounded-2xl min-h-[48px] px-4.5 cursor-pointer font-sans font-semibold hover:text-[var(--accent)] hover:bg-[#eaf2ff] hover:border-[#b9d2ff] transition-all"
          type="button"
          aria-label="Theme status"
        >
          {theme === "light" ? (
            <>
              <Sun className="h-4.5 w-4.5 text-amber-500 shrink-0 animate-spin-slow" />
              <span>Light</span>
            </>
          ) : (
            <>
              <Moon className="h-4.5 w-4.5 text-[var(--accent)] shrink-0" />
              <span>Soft</span>
            </>
          )}
        </button>
      </header>

      {/* Tabs Navigation Bar */}
      <nav className="tabs flex items-center flex-wrap gap-7.5 min-h-[60px] border-t border-b border-[var(--line)] text-[var(--muted)] text-[16px]" aria-label="Primary navigation">
        {TABS.map((tab) => {
          const isActive = activeTabSection === tab.section;
          return (
            <a
              key={tab.section}
              href={`#${tab.section}`}
              onClick={(e) => handleTabClick(tab.section, e)}
              className={cn(
                "relative whitespace-nowrap py-5 hover:text-[var(--text)] transition-colors cursor-pointer",
                isActive
                  ? "active text-[var(--text)] font-bold after:absolute after:left-0 after:right-0 after:bottom-[-1px] after:h-[2px] after:bg-[var(--accent)]"
                  : ""
              )}
            >
              {tab.label}
            </a>
          );
        })}
      </nav>

      {/* Main Grid Layout */}
      <div className="layout grid grid-cols-[340px_1fr] gap-3 pt-5.5">
        {/* Sidebar Nav panel */}
        <DocumentationSidebar
          activeHash={activeHash}
          onNavigate={handleNavigate}
        />

        {/* Content Stream panel */}
        <main className="content pb-12 max-w-none ml-0">
          {Object.entries(SECTIONS_DATA).map(([sectionId, Component]) => {
            const isCurrent = activeSectionId === sectionId;
            
            // Reconstruct classes from parsing
            let sectionClass = "";
            if (sectionId === "home") {
              sectionClass = "hero-section pt-2.5";
            } else if (sectionId.startsWith("material-")) {
              sectionClass = "material-doc-section";
            }
            
            return (
              <DocumentationSection
                key={sectionId}
                id={sectionId}
                sectionClass={sectionClass}
                isCurrent={isCurrent}
                onNavigate={handleNavigate}
              >
                <Component
                  activeHash={activeHash}
                  onNavigate={handleNavigate}
                />
              </DocumentationSection>
            );
          })}
        </main>
      </div>

      {/* Global Search and Chat Modals */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchItems={SEARCH_ITEMS}
        onNavigate={handleNavigate}
      />
      <AssistantModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        searchItems={SEARCH_ITEMS}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
