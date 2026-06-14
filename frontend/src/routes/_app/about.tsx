import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { SilicofellerLogo } from "@/components/silicofeller-logo";

export const Route = createFileRoute("/_app/about")({
  head: () => ({ meta: [{ title: "About — Silicofeller" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-3xl px-6 py-12"
    >
      <SilicofellerLogo />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
        About Silicofeller
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Silicofeller is an AI quantum chip design platform used by hardware teams to translate
        natural-language requirements into production-ready quantum architectures.
      </p>
      <Card className="mt-8 rounded-3xl border-border p-6 shadow-none">
        <h2 className="text-sm font-semibold text-foreground">Roles in this workspace</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Admin</span> — Silicofeller platform
            owner. Full control.
          </li>
          <li>
            <span className="font-medium text-foreground">Organization Manager</span> — Manages
            users and billing within their company.
          </li>
          <li>
            <span className="font-medium text-foreground">Engineer</span> — Designs, iterates and
            exports quantum chips.
          </li>
        </ul>
      </Card>
    </motion.div>
  );
}
