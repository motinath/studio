import React, { useState, useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQAccordionProps {
  id?: string;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  variant?: "sheet" | "category" | "subcategory" | "default";
  defaultOpen?: boolean;
  activeHash?: string;
  children: React.ReactNode;
  className?: string;
}

export function FAQAccordion({
  id,
  title,
  subtitle,
  variant = "default",
  defaultOpen = false,
  activeHash,
  children,
  className,
}: FAQAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Auto-open when activeHash matches this accordion's ID,
  // or matches any element inside this accordion's children.
  useEffect(() => {
    if (!activeHash) return;
    
    const hashId = activeHash.replace("#", "");
    if (!hashId) return;

    if (id === hashId) {
      setIsOpen(true);
      return;
    }

    if (detailsRef.current) {
      const child = detailsRef.current.querySelector(`#${hashId}`);
      if (child) {
        setIsOpen(true);
      }
    }
  }, [activeHash, id]);

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    // Only update state if details is toggled by user action
    setIsOpen(e.currentTarget.open);
  };

  // Determine styles based on variant
  let containerClass = "my-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]";
  let summaryClass = "flex cursor-pointer items-center justify-between px-5 py-4 font-bold text-[var(--text)] hover:bg-[var(--panel-2)] transition-colors select-none [&::-webkit-details-marker]:display-none list-none";
  let contentClass = "p-5 border-t border-[var(--line)] bg-[var(--panel)]";

  if (variant === "sheet") {
    containerClass = "result-sheet my-5 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]";
    summaryClass = "flex cursor-pointer flex-col gap-1 px-4.5 py-4 bg-[var(--panel-2)] text-[var(--text)] font-extrabold select-none list-none relative pr-10";
    contentClass = "p-0";
  } else if (variant === "category") {
    containerClass = "result-category my-4.5 overflow-hidden rounded-xl border border-[var(--line)] bg-white";
    summaryClass = "flex cursor-pointer items-center justify-between px-4.5 py-3.5 bg-[#eef5ff] text-[#244fdb] font-extrabold select-none list-none";
    contentClass = "p-0";
  } else if (variant === "subcategory") {
    containerClass = "result-subcategory my-3 overflow-hidden rounded-xl border border-[var(--line)] bg-white";
    summaryClass = "flex cursor-pointer items-center justify-between px-4.5 py-3.5 bg-[#f6f8fb] text-[var(--text)] font-extrabold select-none list-none";
    contentClass = "p-0";
  }

  return (
    <details
      ref={detailsRef}
      id={id}
      open={isOpen}
      onToggle={handleToggle}
      className={cn(containerClass, className)}
    >
      <summary className={summaryClass}>
        {variant === "sheet" ? (
          <>
            <span className="text-[16px] md:text-[18px] block">{title}</span>
            {subtitle && (
              <small className="text-[var(--muted)] text-[13px] font-semibold block leading-normal mt-0.5">
                {subtitle}
              </small>
            )}
            <ChevronRight
              className={cn(
                "absolute right-4.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--muted)] transition-transform duration-200",
                isOpen ? "rotate-90" : ""
              )}
            />
          </>
        ) : (
          <>
            <span className="pr-4">{title}</span>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                isOpen ? "rotate-90" : ""
              )}
            />
          </>
        )}
      </summary>
      <div className={contentClass}>{children}</div>
    </details>
  );
}
