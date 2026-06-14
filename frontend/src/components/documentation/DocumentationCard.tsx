import React from "react";
import { cn } from "@/lib/utils";

interface DocumentationCardProps {
  type?: "metric" | "parameter" | "reference" | "pipeline" | "material" | "generic";
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  number?: number; // For pipeline cards
  tc?: string;     // For material cards
  role?: string;   // For material cards
  why?: string;    // For material cards
  facts?: string[]; // For material cards
  className?: string;
}

export function DocumentationCard({
  type = "generic",
  title,
  subtitle,
  number,
  tc,
  role,
  why,
  facts,
  className,
}: DocumentationCardProps) {
  
  if (type === "material") {
    return (
      <article
        className={cn(
          "material-card display-grid gap-[18px] p-6 border border-[var(--line)] rounded-[22px] bg-[var(--panel)] shadow-[var(--shadow)] text-[var(--muted)]",
          className
        )}
      >
        <div>
          {tc && (
            <p className="eyebrow mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              Tc = {tc}
            </p>
          )}
          <h3 className="m-0 text-[clamp(1.45rem,1.5vw,2rem)] font-bold text-[var(--text)] leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="material-subtitle mt-2 mb-0 font-bold text-[var(--muted)]">
              {subtitle}
            </p>
          )}
        </div>
        
        {role && (
          <div className="material-detail pt-0.5 mt-2">
            <strong className="block mb-2 text-[var(--text)] font-semibold">
              Role in quantum circuits
            </strong>
            <p className="m-0 text-[16px] leading-[1.7]">{role}</p>
          </div>
        )}
        
        {why && (
          <div className="material-detail pt-0.5 mt-2">
            <strong className="block mb-2 text-[var(--text)] font-semibold">
              Why it matters
            </strong>
            <p className="m-0 text-[16px] leading-[1.7]">{why}</p>
          </div>
        )}
        
        {facts && facts.length > 0 && (
          <div className="material-detail pt-0.5 mt-2">
            <strong className="block mb-2 text-[var(--text)] font-semibold">
              Key facts
            </strong>
            <ul className="m-0 pl-5.5 list-disc space-y-2 text-[16px] leading-[1.7]">
              {facts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>
        )}
      </article>
    );
  }

  if (type === "metric") {
    return (
      <article
        className={cn(
          "border border-[var(--line)] rounded-[18px] bg-[var(--panel)] p-5 shadow-[var(--shadow)]",
          className
        )}
      >
        <strong className="block text-[var(--lime)] text-[34px] font-extrabold leading-none mb-1.5">
          {title}
        </strong>
        <span className="text-[var(--muted)] text-[16px] leading-[1.7]">
          {subtitle}
        </span>
      </article>
    );
  }

  if (type === "pipeline") {
    return (
      <article
        className={cn(
          "border border-[var(--line)] rounded-[18px] bg-[var(--panel)] p-5 shadow-[var(--shadow)]",
          className
        )}
      >
        {number !== undefined && (
          <span className="inline-grid place-items:center w-[34px] height-[34px] mb-3.5 rounded-full text-white bg-[var(--accent)] font-extrabold text-[14px] aspect-square flex items-center justify-center">
            {number}
          </span>
        )}
        <h3 className="m-0 mb-1.5 text-[20px] font-bold text-[var(--text)] leading-tight">
          {title}
        </h3>
        <p className="m-0 text-[var(--muted)] text-[16px] leading-[1.7]">
          {subtitle}
        </p>
      </article>
    );
  }

  // Parameter, reference, or generic card
  return (
    <article
      className={cn(
        "border border-[var(--line)] rounded-[18px] bg-[var(--panel)] p-5 shadow-[var(--shadow)]",
        className
      )}
    >
      <strong className="block text-[var(--text)] font-bold text-[18px] mb-1.5 leading-tight">
        {title}
      </strong>
      {subtitle && (
        <span className="block text-[var(--muted)] text-[16px] leading-[1.7]">
          {subtitle}
        </span>
      )}
    </article>
  );
}
