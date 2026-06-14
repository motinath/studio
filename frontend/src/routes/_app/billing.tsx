import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Check,
  CreditCard,
  Download,
  Plus,
  Sparkles,
  Zap,
  Layers,
  Lock,
  Users,
  GitBranch,
  Cpu,
  FileCheck,
  Microscope,
  ArrowRight,
  X,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth, canAccess } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Plans — Quantum Studio" },
      {
        name: "description",
        content:
          "Manage your Quantum Studio subscription — Free, Basic, or Pro with collaborative chip design.",
      },
    ],
  }),
  component: BillingPage,
});

// ─── Plan data ────────────────────────────────────────────────────────────────

type PlanKey = "free" | "basic" | "pro";

const PLANS: {
  key: PlanKey;
  name: string;
  price: { monthly: number | null; annual: number | null };
  tagline: string;
  designs: number;
  badge?: string;
  accentClass: string;
  ringClass: string;
  features: { icon: React.ElementType; text: string; muted?: boolean }[];
  cta: string;
  ctaVariant: "ghost" | "outline" | "default";
}[] = [
  {
    key: "free",
    name: "Free",
    price: { monthly: 0, annual: 0 },
    tagline: "Explore quantum chip design at no cost.",
    designs: 1,
    accentClass: "text-slate-500",
    ringClass: "border-border",
    features: [
      { icon: Layers, text: "1 active chip design" },
      { icon: Cpu, text: "Quantum Editor access" },
      { icon: FileCheck, text: "Basic DRC checks" },
      { icon: Microscope, text: "Community support" },
      { icon: GitBranch, text: "Version control", muted: true },
      { icon: Users, text: "Collaborative mode", muted: true },
    ],
    cta: "Current Plan",
    ctaVariant: "ghost",
  },
  {
    key: "basic",
    name: "Basic",
    price: { monthly: 199, annual: 169 },
    tagline: "For engineers working on real projects.",
    designs: 5,
    badge: "Most Popular",
    accentClass: "text-violet-500",
    ringClass: "border-violet-500/60",
    features: [
      { icon: Layers, text: "5 active chip designs" },
      { icon: Cpu, text: "Full Quantum Editor + QCLang" },
      { icon: FileCheck, text: "Advanced DRC + fabrication rules" },
      { icon: Microscope, text: "Physics analysis & simulations" },
      { icon: GitBranch, text: "Version control + branch history" },
      { icon: Users, text: "Collaborative mode", muted: true },
    ],
    cta: "Upgrade to Basic",
    ctaVariant: "default",
  },
  {
    key: "pro",
    name: "Pro",
    price: { monthly: 249, annual: 209 },
    tagline: "Build together. Ship faster. Go quantum.",
    designs: 10,
    accentClass: "text-fuchsia-500",
    ringClass: "border-fuchsia-500/60",
    features: [
      { icon: Layers, text: "10 active chip designs (2× Basic)" },
      { icon: Cpu, text: "Everything in Basic" },
      { icon: FileCheck, text: "Priority DRC queue" },
      { icon: Microscope, text: "Advanced EM simulations" },
      { icon: GitBranch, text: "Full version control history" },
      { icon: Users, text: "Real-time collaborative mode ✦" },
    ],
    cta: "Upgrade to Pro",
    ctaVariant: "default",
  },
];

// ─── Analytics data ────────────────────────────────────────────────────────────

const designsData = [
  { m: "Jan", v: 0 },
  { m: "Feb", v: 0 },
  { m: "Mar", v: 1 },
  { m: "Apr", v: 0 },
  { m: "May", v: 1 },
  { m: "Jun", v: 0 },
];

const spendData = [
  { m: "Jan", v: 0 },
  { m: "Feb", v: 0 },
  { m: "Mar", v: 0 },
  { m: "Apr", v: 0 },
  { m: "May", v: 0 },
  { m: "Jun", v: 0 },
];

const invoices = [
  { id: "INV-2026-001", date: "May 2026", amount: "$0", status: "Free" },
];

const ACCENT = "#8B5CF6";
const MUTED = "#A3A3A3";

const tooltipStyle = {
  background: "#0A0A0A",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 12,
  padding: "6px 10px",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DesignDots({ total, used }: { total: number; used: number }) {
  // Show stacked chip graphic
  return (
    <div className="mt-4 flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            i < used ? "bg-foreground" : "bg-border",
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {used}/{total} designs
      </span>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrentPlan,
  annual,
}: {
  plan: (typeof PLANS)[0];
  isCurrentPlan: boolean;
  annual: boolean;
}) {
  const price = annual ? plan.price.annual : plan.price.monthly;
  const isPro = plan.key === "pro";
  const isFree = plan.key === "free";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex h-full flex-col"
    >
      {/* Pro glow halo */}
      {isPro && (
        <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-br from-fuchsia-500/20 via-violet-500/10 to-transparent blur-xl" />
      )}

      <Card
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-3xl border p-7 shadow-none",
          plan.ringClass,
          isPro && "bg-gradient-to-b from-fuchsia-950/5 to-background",
          isCurrentPlan && "ring-1 ring-foreground/20",
        )}
      >
        {/* Badge */}
        {plan.badge && (
          <div className="absolute right-5 top-5">
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              {plan.badge}
            </span>
          </div>
        )}

        {/* Collab badge for Pro */}
        {isPro && (
          <div className="absolute left-5 top-5">
            <span className="flex items-center gap-1 rounded-full bg-fuchsia-100 px-2.5 py-0.5 text-[11px] font-semibold text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300">
              <Users className="h-3 w-3" />
              Collaborative
            </span>
          </div>
        )}

        {/* Name + price */}
        <div className={cn("mt-0", (isPro || plan.badge) && "mt-7")}>
          <div className={cn("text-xs font-semibold uppercase tracking-widest", plan.accentClass)}>
            {plan.name}
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            {price === 0 ? (
              <span className="text-4xl font-bold tracking-tight text-foreground">Free</span>
            ) : (
              <>
                <span className="text-4xl font-bold tracking-tight text-foreground">
                  ${price}
                </span>
                <span className="text-sm text-muted-foreground">/month</span>
                {annual && (
                  <span className="ml-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Save 15%
                  </span>
                )}
              </>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{plan.tagline}</p>
        </div>

        {/* Design dots */}
        <DesignDots total={plan.designs} used={isFree ? 1 : plan.key === "basic" ? 2 : 4} />

        {/* Divider */}
        <div className="my-5 h-px bg-border" />

        {/* Features */}
        <ul className="flex-1 space-y-3">
          {plan.features.map((f, i) => (
            <li
              key={i}
              className={cn(
                "flex items-center gap-2.5 text-sm",
                f.muted ? "text-muted-foreground/50" : "text-foreground",
              )}
            >
              {f.muted ? (
                <Lock className="h-4 w-4 shrink-0 text-border" />
              ) : (
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isPro ? "text-fuchsia-500" : plan.key === "basic" ? "text-violet-500" : "text-slate-400",
                  )}
                />
              )}
              <span>{f.text}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          className={cn(
            "mt-7 h-11 w-full rounded-full text-sm font-semibold",
            isCurrentPlan && "cursor-default opacity-60",
            isPro &&
              !isCurrentPlan &&
              "bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white hover:from-fuchsia-500 hover:to-violet-500",
            plan.key === "basic" &&
              !isCurrentPlan &&
              "bg-foreground text-background hover:bg-foreground/90",
          )}
          variant={isCurrentPlan ? "outline" : plan.ctaVariant}
          disabled={isCurrentPlan}
          onClick={() => !isCurrentPlan && toast.success(`${plan.name} — upgrade flow (demo)`)}
        >
          {isCurrentPlan ? "Current Plan" : plan.cta}
          {!isCurrentPlan && <ArrowRight className="ml-1.5 h-4 w-4" />}
        </Button>
      </Card>
    </motion.div>
  );
}

// ─── Collab Mode Banner ────────────────────────────────────────────────────────

function CollabBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 p-px"
      >
        <div className="relative flex items-center justify-between gap-4 rounded-[15px] bg-background px-6 py-4">
          {/* Ambient shimmer */}
          <div className="pointer-events-none absolute inset-0 rounded-[15px] bg-gradient-to-r from-fuchsia-500/5 via-violet-500/5 to-indigo-500/5" />
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Pro: Real-time collaborative chip design
              </p>
              <p className="text-xs text-muted-foreground">
                Invite teammates to co-design on the same quantum chip canvas simultaneously.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              size="sm"
              className="h-9 rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 text-white hover:from-fuchsia-500 hover:to-violet-500"
              onClick={() => toast.success("Upgrade to Pro — demo")}
            >
              Try Pro
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Usage Snapshot ────────────────────────────────────────────────────────────

function UsageSnapshot() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[
        {
          label: "Active Plan",
          value: "Free",
          sub: "1 design slot",
          icon: Sparkles,
          color: "text-slate-500",
          bg: "bg-slate-50 dark:bg-slate-900/40",
        },
        {
          label: "Designs Used",
          value: "1 / 1",
          sub: "At free-tier limit",
          icon: Layers,
          color: "text-violet-500",
          bg: "bg-violet-50 dark:bg-violet-900/20",
          progress: 100,
        },
        {
          label: "API Credits",
          value: "50",
          sub: "Free monthly allocation",
          icon: Zap,
          color: "text-amber-500",
          bg: "bg-amber-50 dark:bg-amber-900/20",
          progress: 34,
        },
      ].map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
        >
          <Card className="rounded-2xl border-border p-5 shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", s.bg)}>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-foreground">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.sub}</div>
            {typeof s.progress === "number" && (
              <Progress value={s.progress} className="mt-3 h-1.5" />
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Plan comparison table ─────────────────────────────────────────────────────

const COMPARE_ROWS: {
  feature: string;
  free: string | boolean;
  basic: string | boolean;
  pro: string | boolean;
}[] = [
  { feature: "Active designs", free: "1", basic: "5", pro: "10" },
  { feature: "Quantum Editor", free: true, basic: true, pro: true },
  { feature: "QCLang compiler", free: false, basic: true, pro: true },
  { feature: "DRC checks", free: "Basic", basic: "Full", pro: "Full + Priority" },
  { feature: "EM simulation", free: false, basic: true, pro: "Advanced" },
  { feature: "Physics analysis", free: false, basic: true, pro: true },
  { feature: "Version control", free: false, basic: true, pro: true },
  { feature: "Export (GDSII, SPICE)", free: false, basic: true, pro: true },
  { feature: "Collaborative mode", free: false, basic: false, pro: true },
  { feature: "Priority support", free: false, basic: false, pro: true },
];

function CompareValue({ val }: { val: string | boolean }) {
  if (val === false)
    return <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  if (val === true)
    return <Check className="mx-auto h-4 w-4 text-violet-500" />;
  return <span className="text-sm font-medium text-foreground">{val}</span>;
}

function CompareTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="py-3.5 pl-5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Feature
            </th>
            <th className="py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Free
            </th>
            <th className="py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-violet-500">
              Basic
            </th>
            <th className="py-3.5 pr-5 text-center text-xs font-semibold uppercase tracking-wider text-fuchsia-500">
              Pro
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row, i) => (
            <tr
              key={row.feature}
              className={cn(
                "border-b border-border/50 last:border-0",
                i % 2 === 0 ? "bg-background" : "bg-muted/20",
              )}
            >
              <td className="py-3 pl-5 font-medium text-foreground">{row.feature}</td>
              <td className="py-3 text-center">
                <CompareValue val={row.free} />
              </td>
              <td className="py-3 text-center">
                <CompareValue val={row.basic} />
              </td>
              <td className="py-3 pr-5 text-center">
                <CompareValue val={row.pro} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function BillingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !canAccess(user.role, "billing"))
      navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  const [annual, setAnnual] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [emailInvoice, setEmailInvoice] = useState(true);
  const [showCompare, setShowCompare] = useState(false);

  // current plan is free for the demo
  const currentPlan: PlanKey = "free";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10"
    >
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-[2rem] font-bold tracking-tight text-foreground">
          Plans &amp; Billing
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You're on the <strong>Free plan</strong>. Upgrade to unlock more designs and team features.
        </p>
      </div>

      {/* ── Collab banner ── */}
      <div className="mb-8">
        <CollabBanner />
      </div>

      {/* ── Usage snapshot ── */}
      <section className="mb-10">
        <UsageSnapshot />
      </section>

      {/* ── Plan picker ── */}
      <section className="mb-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Choose a Plan</h2>
            <p className="text-sm text-muted-foreground">
              All plans include the Quantum Editor and DRC engine.
            </p>
          </div>

          {/* Annual toggle */}
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-2">
            <span className={cn("text-sm", !annual ? "font-semibold text-foreground" : "text-muted-foreground")}>
              Monthly
            </span>
            <Switch checked={annual} onCheckedChange={setAnnual} />
            <span className={cn("text-sm", annual ? "font-semibold text-foreground" : "text-muted-foreground")}>
              Annual
            </span>
            {annual && (
              <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Save 15%
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              isCurrentPlan={plan.key === currentPlan}
              annual={annual}
            />
          ))}
        </div>

        {/* Compare toggle */}
        <div className="mt-5 text-center">
          <button
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setShowCompare((v) => !v)}
          >
            {showCompare ? "Hide" : "See full"} feature comparison
          </button>
        </div>

        <AnimatePresence>
          {showCompare && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 overflow-hidden"
            >
              <CompareTable />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Analytics ── */}
      <section className="mb-10">
        <h2 className="mb-5 text-xl font-semibold text-foreground">Usage Overview</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-border p-5 shadow-none">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Designs Created</h3>
              <p className="text-xs text-muted-foreground">Monthly volume</p>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={designsData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="m" stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(139,92,246,0.08)" }} />
                  <Bar dataKey="v" fill={ACCENT} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="rounded-2xl border-border p-5 shadow-none">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Monthly Spend</h3>
              <p className="text-xs text-muted-foreground">USD billed</p>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g-spend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="m" stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={2} fill="url(#g-spend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Payment + Settings ── */}
      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-border p-6 shadow-none lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Payment Methods</h2>
            <AddPaymentDialog />
          </div>
          <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
            No payment method added yet.
            <br />
            <span className="text-xs">Required when upgrading to a paid plan.</span>
          </div>
        </Card>

        <Card className="rounded-2xl border-border p-6 shadow-none">
          <h2 className="text-base font-semibold text-foreground">Billing Settings</h2>
          <div className="mt-4 space-y-4">
            <ToggleRow label="Auto Renewal" checked={autoRenew} onChange={setAutoRenew} />
            <ToggleRow label="Email Invoice" checked={emailInvoice} onChange={setEmailInvoice} />
          </div>
        </Card>
      </section>

      {/* ── Invoices ── */}
      <section>
        <Card className="rounded-2xl border-border p-6 shadow-none">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Invoices</h2>
            <span className="text-xs text-muted-foreground">{invoices.length} total</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium text-foreground">{inv.id}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.date}</TableCell>
                  <TableCell className="text-foreground">{inv.amount}</TableCell>
                  <TableCell>
                    <Badge className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full"
                      onClick={() => toast(`${inv.id}.pdf — demo only`)}
                    >
                      <Download className="mr-1 h-4 w-4" /> PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    </motion.div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function AddPaymentDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 rounded-full">
          <Plus className="mr-1 h-4 w-4" /> Add Card
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Securely add a new card. Required to upgrade your plan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cc-name">Cardholder name</Label>
            <Input id="cc-name" placeholder="Alex Chen" className="mt-1.5 h-10" />
          </div>
          <div>
            <Label htmlFor="cc-number">Card number</Label>
            <Input id="cc-number" placeholder="1234 5678 9012 3456" className="mt-1.5 h-10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cc-exp">Expiry</Label>
              <Input id="cc-exp" placeholder="MM / YY" className="mt-1.5 h-10" />
            </div>
            <div>
              <Label htmlFor="cc-cvc">CVC</Label>
              <Input id="cc-cvc" placeholder="123" className="mt-1.5 h-10" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="h-10 rounded-full px-5"
            onClick={() => {
              setOpen(false);
              toast.success("Card added — demo only");
            }}
          >
            Save card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
