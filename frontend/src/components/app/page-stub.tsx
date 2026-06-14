import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
  features?: string[];
  ctaLabel?: string;
  ctaTo?: string;
}

export function PageStub({
  title,
  description,
  icon: Icon,
  features = [],
  ctaLabel,
  ctaTo,
}: Props) {
  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-accent" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          </div>
          <p className="text-sm text-slate-500 mb-6">{description}</p>
        </motion.div>

        <Card className="rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2 text-accent text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            This module is in active development.
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            We're polishing the interface and wiring it up to your existing Silicofeller data
            sources. Here's what to expect:
          </p>
          {features.length > 0 && (
            <ul className="space-y-2 mb-6">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {ctaLabel && ctaTo && (
            <Button asChild className="rounded-lg bg-accent hover:bg-accent-2 text-white">
              <Link to={ctaTo}>
                {ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
