import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/auth/form-field";

export const Route = createFileRoute("/_auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Silicofeller" },
      {
        name: "description",
        content:
          "Enter your email and we'll send you a secure reset link for your Silicofeller account.",
      },
      { property: "og:title", content: "Reset your password — Silicofeller" },
      {
        property: "og:description",
        content:
          "Enter your email and we'll send you a secure reset link for your Silicofeller account.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError(undefined);
    setSent(true);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AuthCard
              title="Reset your password"
              subtitle="Enter your email and we'll send a secure reset link."
              footer={
                <Link
                  to="/sign-in"
                  className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-accent/80"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              }
            >
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <FormField label="Email" htmlFor="email" error={error}>
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
                <Button type="submit" className="h-11 w-full rounded-full text-sm font-semibold">
                  Send reset link
                </Button>
              </form>
            </AuthCard>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AuthCard
              title="Reset link sent"
              subtitle={`We sent a secure reset link to ${email}. Check your inbox.`}
              footer={
                <Link
                  to="/sign-in"
                  className="inline-flex items-center gap-1.5 font-medium text-accent hover:text-accent/80"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              }
            >
              <div className="flex flex-col items-center gap-4 py-2 text-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--accent-soft)]"
                >
                  <Check className="h-7 w-7 text-accent" strokeWidth={3} />
                </motion.div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Reset Link Sent Successfully
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                >
                  Send to a different email
                </Button>
              </div>
            </AuthCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
