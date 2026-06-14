import React, { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  title: string;
  code: string;
  className?: string;
}

export function CodeBlock({ title, code, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [code]);

  return (
    <div
      className={cn(
        "code-card overflow-hidden border border-[var(--line)] rounded-[18px] bg-[var(--code)] shadow-[var(--shadow)] my-5 mb-7",
        className
      )}
    >
      <div className="code-title flex items-center justify-between border-b border-[var(--line)] px-[18px] py-3 text-[14px] text-[var(--muted)] bg-[#e4edf2]">
        <span className="font-medium">{title}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
          type="button"
          aria-label={`Copy code from ${title}`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-600 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="m-0 p-5 overflow-auto">
        <code className="p-0 border-0 bg-transparent text-[#111827] font-mono text-[14px] leading-[1.7] block whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}
