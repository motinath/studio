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
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_auth/sign-up")({
  head: () => ({
    meta: [
      { title: "Create your account — Silicofeller" },
      {
        name: "description",
        content:
          "Start designing quantum hardware with AI. Create your Silicofeller account in seconds.",
      },
      { property: "og:title", content: "Create your account — Silicofeller" },
      {
        property: "og:description",
        content:
          "Start designing quantum hardware with AI. Create your Silicofeller account in seconds.",
      },
    ],
  }),
  component: SignUpPage,
});

interface FormState {
  fullName: string;
  organization: string;
  email: string;
  password: string;
  confirm: string;
  terms: boolean;
  updates: boolean;
}

function SignUpPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState<FormState>({
    fullName: "",
    organization: "",
    email: "",
    password: "",
    confirm: "",
    terms: false,
    updates: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (form.fullName.trim().length < 2) next.fullName = "Enter your full name";
    if (form.organization.trim().length < 2) next.organization = "Enter your organization";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
    if (form.password.length < 8) next.password = "At least 8 characters";
    if (form.password !== form.confirm) next.confirm = "Passwords don't match";
    if (!form.terms) next.terms = "You must accept the terms";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const res = await signUp(form.fullName, form.email, form.password, form.organization);
      if (!res.ok) {
        toast.error(res.error ?? "Registration failed");
        return;
      }
      toast.success(`Welcome — account created for ${form.organization}`);
      navigate({ to: "/" });
    } finally {
      setLoading(false);
    }
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
          eyebrow="Join 4,000+ chip designers"
          headline="Start Designing Quantum Hardware with AI"
          description="From natural-language requirements to optimized qubit layouts and routing — generated in seconds."
        />
      </motion.section>

      <section className="flex items-center justify-center py-6 lg:py-12">
        <AuthCard
          title="Create your account"
          subtitle="Free to start. No credit card required."
          footer={
            <>
              Already have an account?{" "}
              <Link to="/sign-in" className="font-medium text-accent hover:text-accent/80">
                Sign in
              </Link>
            </>
          }
        >
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Full name" htmlFor="fullName" error={errors.fullName}>
                <Input
                  id="fullName"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  value={form.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  className="h-11"
                />
              </FormField>
              <FormField label="Organization" htmlFor="org" error={errors.organization}>
                <Input
                  id="org"
                  autoComplete="organization"
                  placeholder="Acme Quantum"
                  value={form.organization}
                  onChange={(e) => update("organization", e.target.value)}
                  className="h-11"
                />
              </FormField>
            </div>
            <FormField label="Work email" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="h-11"
              />
            </FormField>
            <FormField
              label="Password"
              htmlFor="password"
              error={errors.password}
              hint="At least 8 characters"
            >
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="h-11"
              />
            </FormField>
            <FormField label="Confirm password" htmlFor="confirm" error={errors.confirm}>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => update("confirm", e.target.value)}
                className="h-11"
              />
            </FormField>

            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Checkbox
                  id="terms"
                  checked={form.terms}
                  onCheckedChange={(v) => update("terms", Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  I agree to the{" "}
                  <a href="#" className="text-foreground underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-foreground underline">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              {errors.terms && (
                <p className="pl-7 text-xs text-destructive" role="alert">
                  {errors.terms}
                </p>
              )}
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Checkbox
                  id="updates"
                  checked={form.updates}
                  onCheckedChange={(v) => update("updates", Boolean(v))}
                  className="mt-0.5"
                />
                <span>Send me product updates and quantum research news.</span>
              </label>
            </div>

            <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-full text-sm font-semibold"
              >
                {loading ? "Creating account…" : "Create account"}
              </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or sign up with</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid gap-2.5">
            <SocialButton
              provider="google"
              label="Sign up with Google"
              onClick={() => toast("Demo only")}
            />
            <SocialButton
              provider="github"
              label="Sign up with GitHub"
              onClick={() => toast("Demo only")}
            />
          </div>
        </AuthCard>
      </section>
    </div>
  );
}
