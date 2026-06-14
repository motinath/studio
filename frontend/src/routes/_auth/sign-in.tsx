import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { SocialButton } from "@/components/auth/social-button";
import { QuantumHero } from "@/components/auth/quantum-hero";
import { DEMO_ACCOUNTS, useAuth, type Role } from "@/lib/auth/auth-context";
import { Card } from "@/components/ui/card";
import { Shield, Building2, Cpu } from "lucide-react";

export const Route = createFileRoute("/_auth/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign in — Silicofeller" },
      {
        name: "description",
        content: "Sign in to Silicofeller to design optimized quantum chip architectures with AI.",
      },
      { property: "og:title", content: "Sign in — Silicofeller" },
      {
        property: "og:description",
        content: "Sign in to Silicofeller to design optimized quantum chip architectures with AI.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { signIn, signInAs } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address";
    if (password.length < 4) next.password = "Enter your password";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (!res.ok) {
        toast.error(res.error);
        setErrors({ password: res.error });
        return;
      }
      toast.success("Signed in — welcome back");
      navigate({ to: "/" });
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role: Role) => {
    await signInAs(role);
    const acct = DEMO_ACCOUNTS.find((a) => a.role === role);
    toast.success(`Signed in as ${acct?.name}`);
    navigate({ to: "/" });
  };

  return (
    <div className="grid flex-1 grid-cols-1 gap-8 px-6 pb-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:block"
      >
        <QuantumHero
          eyebrow="Quantum chip design platform"
          headline="Design Quantum Chips Using AI"
          description="Transform engineering requirements into production-ready quantum architectures through natural language."
        />
      </motion.section>

      <section className="flex items-center justify-center py-6 lg:py-12">
        <div className="w-full max-w-[440px] space-y-5">
          <AuthCard
            title="Welcome back"
            subtitle="Sign in to continue designing quantum hardware."
            footer={
              <>
                Don't have an account?{" "}
                <Link to="/sign-up" className="font-medium text-accent hover:text-accent/80">
                  Sign up
                </Link>
              </>
            }
          >
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <FormField label="Email" htmlFor="email" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </FormField>
              <FormField label="Password" htmlFor="password" error={errors.password}>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </FormField>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox id="remember" />
                  <span>Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-accent hover:text-accent/80"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-full text-sm font-semibold"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-2.5">
              <SocialButton
                provider="google"
                label="Continue with Google"
                onClick={() => toast("Demo only")}
              />
              <SocialButton
                provider="github"
                label="Continue with GitHub"
                onClick={() => toast("Demo only")}
              />
            </div>
          </AuthCard>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Demo quick login
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-2.5">
              {[
                {
                  role: "admin" as const,
                  icon: Shield,
                  title: "Admin",
                  desc: "admin@silicofeller.com",
                },
                {
                  role: "org_manager" as const,
                  icon: Building2,
                  title: "Organization Manager",
                  desc: "manager@quantumlabs.com",
                },
                {
                  role: "engineer" as const,
                  icon: Cpu,
                  title: "Engineer",
                  desc: "engineer@quantumlabs.com",
                },
              ].map((q) => (
                <Card
                  key={q.role}
                  onClick={() => quickLogin(q.role)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && quickLogin(q.role)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border-border p-3 shadow-none transition-colors hover:bg-[color:var(--accent-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                    <q.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{q.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{q.desc}</div>
                  </div>
                  <span className="text-xs font-medium text-accent">Sign in →</span>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
