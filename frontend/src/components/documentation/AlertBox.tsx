import React from "react";
import { cn } from "@/lib/utils";

interface AlertBoxProps {
  type: "info" | "note";
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function AlertBox({ type, title, className, children }: AlertBoxProps) {
  if (type === "note") {
    return (
      <div
        className={cn(
          "note border-l-3 border-[var(--accent)] pl-4 my-6 text-slate-600 dark:text-slate-300",
          className
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "info-box my-[18px] mb-[26px] rounded-xl border border-[#b9d2ff] bg-[#eaf2ff] px-[18px] py-4 text-slate-700",
        className
      )}
    >
      {title && (
        <strong className="block mb-1.5 font-bold text-[var(--text)]">
          {title}
        </strong>
      )}
      <div className="m-0 text-[16px] leading-[1.7]">{children}</div>
    </div>
  );
}
