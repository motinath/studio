import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, UserPlus, Trash2 } from "lucide-react";
import { useAuth, canAccess } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_app/team")({
  head: () => ({ meta: [{ title: "Team Management — Silicofeller" }] }),
  component: TeamPage,
});

interface Member {
  id: string;
  name: string;
  email: string;
  role: "Engineer" | "Organization Manager";
  initials: string;
}

function TeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [members, setMembers] = useState<Member[]>([
    {
      id: "m1",
      name: "Eli Novak",
      email: "engineer@quantumlabs.com",
      role: "Engineer",
      initials: "EN",
    },
    {
      id: "m2",
      name: "Riley Kim",
      email: "riley@quantumlabs.com",
      role: "Engineer",
      initials: "RK",
    },
    {
      id: "m3",
      name: "Mira Chen",
      email: "manager@quantumlabs.com",
      role: "Organization Manager",
      initials: "MC",
    },
  ]);

  useEffect(() => {
    if (user && !canAccess(user.role, "team")) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const invite = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    const initials = email.slice(0, 2).toUpperCase();
    setMembers((m) => [
      ...m,
      { id: `m_${Date.now()}`, name: email.split("@")[0], email, role: "Engineer", initials },
    ]);
    toast.success(`Invite sent to ${email}`);
    setEmail("");
  };

  const remove = (id: string) => {
    setMembers((m) => m.filter((x) => x.id !== id));
    toast("Member removed");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-5xl px-6 py-10"
    >
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Team Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.role === "admin"
              ? "Manage members across every organization."
              : `Manage engineers in ${user.organization}.`}
          </p>
        </div>
        <Badge variant="secondary" className="rounded-full">
          {user.organization}
        </Badge>
      </div>

      <Card className="rounded-3xl border-border p-6 shadow-none">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium text-muted-foreground">
              Invite engineer by email
            </label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="engineer@yourcompany.com"
              className="mt-1.5 h-11 rounded-xl"
            />
          </div>
          <Button onClick={invite} className="h-11 rounded-full px-5">
            <UserPlus className="mr-2 h-4 w-4" /> Send invite
          </Button>
        </div>
      </Card>

      <Card className="mt-6 rounded-3xl border-border p-6 shadow-none">
        <h2 className="text-sm font-semibold text-foreground">Members ({members.length})</h2>
        <div className="mt-4 divide-y divide-border">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-foreground text-xs font-semibold text-background">
                  {m.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{m.name}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> {m.email}
                </div>
              </div>
              <Badge
                variant="secondary"
                className="rounded-full bg-[color:var(--accent-soft)] text-foreground"
              >
                {m.role}
              </Badge>
              {m.role === "Engineer" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(m.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
