import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({ title, subtitle, children, footer, className }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative w-full max-w-[440px] rounded-3xl border border-border bg-card p-8 sm:p-10",
        className,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="mb-7 space-y-1.5">
        <h1 className="text-[1.625rem] font-semibold leading-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-[0.9375rem] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
      {footer && (
        <div className="mt-7 border-t border-border pt-5 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </motion.div>
  );
}
