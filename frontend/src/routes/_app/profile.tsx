import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useProject } from "@/lib/project-context";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Silicofeller" }] }),
  component: ProfilePage,
});

const ROLE_LABELS: Record<string, string> = {
  admin:       "Admin",
  org_manager: "Organization Manager",
  engineer:    "Quantum Engineer",
};

function ProfilePage() {
  const { user } = useAuth();
  const { projects, activeProject } = useProject();

  const [name,  setName]  = useState(user?.name  ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [org,   setOrg]   = useState(user?.organization ?? "");
  const [saved, setSaved] = useState(false);

  const save = () => {
    // In a real app, call PATCH /api/auth/me
    // For now, show success feedback
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!user) return null;

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl px-6 py-8 space-y-6"
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">User Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your personal information.</p>
        </div>

        {/* Identity card */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16 border-2 border-accent/20">
              <AvatarFallback className="bg-accent text-lg font-black text-white">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-black text-slate-900">{user.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="rounded-full text-[10px] font-bold px-2.5 py-0.5 bg-accent-soft text-accent border-accent/20">
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
                <span className="text-xs text-slate-400">{user.organization}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name" className="text-xs font-bold text-slate-600">Full Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1.5 h-9 rounded-xl text-sm border-slate-200" />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs font-bold text-slate-600">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1.5 h-9 rounded-xl text-sm border-slate-200" />
            </div>
            <div>
              <Label htmlFor="org" className="text-xs font-bold text-slate-600">Organization</Label>
              <Input id="org" value={org} onChange={e => setOrg(e.target.value)} className="mt-1.5 h-9 rounded-xl text-sm border-slate-200" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-600">Role</Label>
              <div className="mt-1.5 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center px-3">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400 mr-2" />
                <span className="text-sm text-slate-600">{ROLE_LABELS[user.role] ?? user.role}</span>
              </div>
            </div>
          </div>

          <Button onClick={save} className="mt-5 h-9 rounded-xl bg-accent text-white text-xs font-bold px-5">
            {saved ? <><Check className="mr-1.5 h-3.5 w-3.5 text-emerald-300" /> Saved!</> : "Save Profile"}
          </Button>
        </Card>

        {/* Account stats */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Account Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Projects",       value: projects.length },
              { label: "Active Project", value: activeProject?.name?.slice(0, 10) ?? "None" },
              { label: "Account ID",     value: user.id.slice(0, 8) + "…" },
              { label: "Auth",           value: "JWT" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                <p className="text-sm font-black text-slate-800 mt-0.5 truncate">{s.value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Security */}
        <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Security</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-800">Password</p>
                <p className="text-[10px] text-slate-400">Last changed: never (demo mode)</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl text-xs h-7" disabled>
                Change
              </Button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-xs font-bold text-slate-800">Session Token</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {localStorage.getItem("qs_token")?.slice(0, 20) ?? "Not authenticated with backend"}…
                </p>
              </div>
              <Badge variant="outline" className="rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                Active
              </Badge>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
