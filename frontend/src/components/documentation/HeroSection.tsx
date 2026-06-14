import React from "react";
import { ArrowRight, Cpu } from "lucide-react";
import { DocumentationCard } from "./DocumentationCard";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  onNavigate: (hash: string) => void;
  className?: string;
}

export function HeroSection({ onNavigate, className }: HeroSectionProps) {
  return (
    <div className={cn("hero-section py-2", className)}>
      <p className="eyebrow mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
        QClang Development Documentation
      </p>
      <h1 className="m-0 mb-6 text-[32px] md:text-[48px] font-extrabold text-[var(--text)] leading-[1.15] tracking-tight">
        High-Performance Hardware Description Language for Quantum Chips.
      </h1>
      <p className="lead m-0 mb-8 text-[18px] md:text-[22px] leading-[1.7] text-[var(--muted)] max-w-[920px]">
        QClang is a domain-specific hardware description language (QHDL) designed for modeling, 
        synthesizing, and verifying superconducting quantum chip architectures. The compiler translates 
        declarative chip layouts into design graphs, runs Design Rule Checking (DRC), and generates exports 
        for Qiskit Metal, GDS layouts, and SPICE-level simulations.
      </p>
      
      <div className="hero-actions flex flex-wrap gap-3.5 mb-9">
        <a
          href="#getting-started"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("#getting-started");
          }}
          className="primary-link inline-flex items-center justify-center min-h-[44px] px-5 rounded-2xl bg-[var(--accent)] text-white font-extrabold shadow-sm hover:opacity-90 transition-opacity border border-transparent cursor-pointer"
        >
          <span>Start tutorial</span>
          <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
        </a>
        <a
          href="#compiler-reference"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("#compiler-reference");
          }}
          className="secondary-link inline-flex items-center justify-center min-h-[44px] px-5 border border-[var(--line)] rounded-2xl bg-[var(--panel)] text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--accent)] hover:border-[#b9d2ff] transition-all cursor-pointer"
        >
          <span>View compiler pipeline</span>
        </a>
      </div>

      <div className="metrics-grid grid gap-3.5 grid-cols-1 sm:grid-cols-3">
        <DocumentationCard
          type="metric"
          title=".qc / .qcl"
          subtitle="language files for quantum chip source descriptions"
        />
        <DocumentationCard
          type="metric"
          title="3"
          subtitle="main outputs: Qiskit Metal, JSON IR, and SPICE-style text"
        />
        <DocumentationCard
          type="metric"
          title="Production"
          subtitle="Enterprise-grade quantum synthesis pipeline"
        />
      </div>
    </div>
  );
}
