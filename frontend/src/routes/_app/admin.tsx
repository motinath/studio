import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, ShieldPlus, Trash2, UserCog } from "lucide-react";
import { useAuth, canAccess } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin Console — Silicofeller" }] }),
  component: AdminConsole,
});

function AdminConsole() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [orgs, setOrgs] = useState([
    { id: "o1", name: "Quantum Labs", seats: 24, plan: "Pro" },
    { id: "o2", name: "Cryo Systems", seats: 8, plan: "Starter" },
    { id: "o3", name: "Helix Photonics", seats: 142, plan: "Enterprise" },
  ]);

  useEffect(() => {
    if (user && !canAccess(user.role, "admin")) navigate({ to: "/dashboard", replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const createOrg = () => {
    if (orgName.trim().length < 2) return toast.error("Enter an organization name");
    setOrgs((o) => [...o, { id: `o_${Date.now()}`, name: orgName, seats: 0, plan: "Starter" }]);
    toast.success(`Organization "${orgName}" created`);
    setOrgName("");
  };

  const removeOrg = (id: string) => {
    setOrgs((o) => o.filter((x) => x.id !== id));
    toast("Organization deleted");
  };

  const createAdmin = () => {
    if (!/^\S+@\S+\.\S+$/.test(adminEmail)) return toast.error("Enter a valid email");
    toast.success(`Admin invite sent to ${adminEmail}`);
    setAdminEmail("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-6xl px-6 py-10"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Admin Console</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-level controls. Visible to Silicofeller administrators only.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl border-border p-6 shadow-none">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Create organization</h2>
          </div>
          <Input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Quantum"
            className="mt-4 h-11 rounded-xl"
          />
          <Button onClick={createOrg} className="mt-3 h-10 rounded-full">
            Create organization
          </Button>
        </Card>

        <Card className="rounded-3xl border-border p-6 shadow-none">
          <div className="flex items-center gap-2">
            <ShieldPlus className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Invite new admin</h2>
          </div>
          <Input
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="new.admin@silicofeller.com"
            className="mt-4 h-11 rounded-xl"
          />
          <Button onClick={createAdmin} className="mt-3 h-10 rounded-full">
            Send admin invite
          </Button>
        </Card>
      </div>

      <Card className="mt-6 rounded-3xl border-border p-6 shadow-none">
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Organizations</h2>
        </div>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium text-foreground">{o.name}</TableCell>
                <TableCell>{o.seats}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="rounded-full">
                    {o.plan}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOrg(o.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
}
