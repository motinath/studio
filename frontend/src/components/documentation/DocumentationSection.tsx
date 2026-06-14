import React, { useRef } from "react";
import { cn } from "@/lib/utils";

interface DocumentationSectionProps {
  id: string;
  sectionClass?: string;
  isCurrent: boolean;
  onNavigate: (hash: string) => void;
  children: React.ReactNode;
}

export function DocumentationSection({
  id,
  sectionClass,
  isCurrent,
  onNavigate,
  children,
}: DocumentationSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const handleClick = async (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;

    // 1. Intercept anchor links (e.g. <a href="#hello-world">)
    const anchor = target.closest("a");
    if (anchor) {
      const href = anchor.getAttribute("href");
      // Only intercept internal documentation hash links
      if (href && href.startsWith("#")) {
        e.preventDefault();
        onNavigate(href);
        return;
      }
    }

    // 2. Intercept copy button clicks (e.g. <button data-copy-section="getting-started">Copy page</button>)
    const copyBtn = target.closest("[data-copy-section]");
    if (copyBtn) {
      e.preventDefault();
      if (sectionRef.current) {
        // Extract section text, clean up any "Copy page" button text
        const textToCopy = sectionRef.current.innerText
          .replace(/Copy page/g, "")
          .replace(/Copied/g, "")
          .trim();

        try {
          await navigator.clipboard.writeText(textToCopy);
          
          const originalText = copyBtn.textContent;
          copyBtn.textContent = "Copied";
          copyBtn.classList.add("bg-emerald-50", "text-emerald-700", "border-emerald-200");
          
          setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove("bg-emerald-50", "text-emerald-700", "border-emerald-200");
          }, 1200);
        } catch (err) {
          console.error("Failed to copy section contents: ", err);
        }
      }
    }
  };

  return (
    <section
      ref={sectionRef}
      id={id}
      onClick={handleClick}
      hidden={!isCurrent}
      className={cn(
        "doc-section border-b border-[var(--line)] py-7 pb-12 transition-all duration-150 scroll-mt-[160px]",
        isCurrent ? "current-section block" : "hidden",
        sectionClass
      )}
    >
      {children}
    </section>
  );
}
