import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  X,
  Pencil,
  Settings,
  User,
  Lock,
  Cpu,
  Database,
  Key,
  Bell,
  Shield,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useProject } from "@/lib/project-context";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Silicofeller" }] }),
  component: SettingsPage,
});

const BACKEND = (import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { activeProject, backendOnline } = useProject();

  // Settings States
  const [fullName, setFullName] = useState(user?.name ?? "Admin User");
  const [email, setEmail] = useState(user?.email ?? "admin@silicofeller.com");
  const [phone, setPhone] = useState("+91 9876543210");
  const [password, setPassword] = useState("••••••••••••");
  const [wsName, setWsName] = useState(user?.organization ?? "Silicofeller Lab");
  const [maxQubits, setMaxQubits] = useState("256");
  const [backendUrl, setBackendUrl] = useState(BACKEND);
  const [claudeKey, setClaudeKey] = useState("••••••••••••");

  // Notifications State
  const [notifs, setNotifs] = useState({
    design_events: true,
    verification_alerts: true,
    simulation_done: true,
    weekly_digest: false,
  });

  // Admin Mode state
  const [adminMode, setAdminMode] = useState(user?.role === "admin");

  // Editing state trackers for inline edit rows
  const [editRow, setEditRow] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");

  // Feedback/Save indicators
  const [savedRow, setSavedRow] = useState<string | null>(null);

  const startEdit = (rowId: string, currentVal: string) => {
    setEditRow(rowId);
    setTempValue(currentVal);
  };

  const cancelEdit = () => {
    setEditRow(null);
    setTempValue("");
  };

  const saveEdit = (rowId: string) => {
    // Update local state
    if (rowId === "fullName") setFullName(tempValue);
    else if (rowId === "email") setEmail(tempValue);
    else if (rowId === "phone") setPhone(tempValue);
    else if (rowId === "password") setPassword(tempValue);
    else if (rowId === "wsName") setWsName(tempValue);
    else if (rowId === "maxQubits") setMaxQubits(tempValue);
    else if (rowId === "backendUrl") {
      setBackendUrl(tempValue);
      // Optional: Set in localStorage to persist backend URL across reloads
      localStorage.setItem("VITE_BACKEND_URL", tempValue);
    } else if (rowId === "claudeKey") setClaudeKey(tempValue);

    setSavedRow(rowId);
    setEditRow(null);
    setTimeout(() => setSavedRow(null), 2000);
  };

  const toggleNotif = (key: keyof typeof notifs) => {
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB] px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-4xl space-y-8"
      >
        {/* Main Page Title Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent shadow-[0_2px_8px_rgba(146,141,221,0.08)]">
              <Settings className="h-5.5 w-5.5 animate-[spin_20s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
                Settings
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Manage your credentials, payments, advanced preferences, and feedback.
              </p>
            </div>
          </div>

          <div>
            <button
              onClick={() => setAdminMode(!adminMode)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all duration-200 text-[10px] font-black tracking-wider uppercase cursor-pointer ${
                adminMode
                  ? "bg-accent border-accent text-white shadow-md shadow-accent/10"
                  : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${adminMode ? "bg-white" : "bg-slate-400"}`} />
              ADMIN MODE
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT COLUMN: Credentials & Workspace */}
          <div className="space-y-6">
            {/* CARD 1: Edit Credentials */}
            <Card className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 mb-6 select-none">
                <User className="h-4.5 w-4.5 text-accent" />
                <h2 className="text-sm font-black text-slate-900 tracking-tight font-display">
                  Edit Credentials
                </h2>
              </div>

              <div className="space-y-1">
                {/* Row: Full Name */}
                <div className="grid grid-cols-[1.2fr_2fr_auto] items-center py-4 border-b border-slate-100 min-h-[58px]">
                  <span className="text-xs font-extrabold text-slate-400 select-none">Full Name</span>
                  <div className="flex items-center text-xs font-black text-slate-800">
                    {editRow === "fullName" ? (
                      <Input
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="h-8 rounded-lg text-xs font-bold border-slate-200 max-w-[180px] bg-slate-50"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{fullName}</span>
                    )}
                    {savedRow === "fullName" && (
                      <Badge className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px]">Saved</Badge>
                    )}
                  </div>
                  <div className="flex justify-end pl-2">
                    {editRow === "fullName" ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => saveEdit("fullName")} className="p-1 rounded-md hover:bg-slate-100 text-emerald-600 cursor-pointer">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit("fullName", fullName)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row: Email Address */}
                <div className="grid grid-cols-[1.2fr_2fr_auto] items-center py-4 border-b border-slate-100 min-h-[58px]">
                  <div className="flex items-center gap-1.5 select-none">
                    <span className="text-xs font-extrabold text-slate-400">Email Address</span>
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>
                  <div className="flex items-center text-xs font-black text-slate-800">
                    {editRow === "email" ? (
                      <Input
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="h-8 rounded-lg text-xs font-bold border-slate-200 max-w-[180px] bg-slate-50"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate font-mono">{email}</span>
                    )}
                    {savedRow === "email" && (
                      <Badge className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px]">Saved</Badge>
                    )}
                  </div>
                  <div className="flex justify-end pl-2">
                    {editRow === "email" ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => saveEdit("email")} className="p-1 rounded-md hover:bg-slate-100 text-emerald-600 cursor-pointer">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit("email", email)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row: Contact Number */}
                <div className="grid grid-cols-[1.2fr_2fr_auto] items-center py-4 border-b border-slate-100 min-h-[58px]">
                  <span className="text-xs font-extrabold text-slate-400 select-none">Contact Number</span>
                  <div className="flex items-center text-xs font-black text-slate-800 gap-2">
                    <span className="text-base select-none">🇮🇳</span>
                    {editRow === "phone" ? (
                      <Input
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="h-8 rounded-lg text-xs font-bold border-slate-200 max-w-[180px] bg-slate-50"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono">{phone}</span>
                    )}
                    {savedRow === "phone" && (
                      <Badge className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px]">Saved</Badge>
                    )}
                  </div>
                  <div className="flex justify-end pl-2">
                    {editRow === "phone" ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => saveEdit("phone")} className="p-1 rounded-md hover:bg-slate-100 text-emerald-600 cursor-pointer">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit("phone", phone)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row: Security Password */}
                <div className="grid grid-cols-[1.2fr_2fr_auto] items-center py-4 last:border-0 min-h-[58px]">
                  <span className="text-xs font-extrabold text-slate-400 select-none">Security Password</span>
                  <div className="flex items-center text-xs font-black text-slate-800 gap-2">
                    <Lock className="h-3.5 w-3.5 text-slate-400 select-none" />
                    {editRow === "password" ? (
                      <Input
                        type="password"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="h-8 rounded-lg text-xs font-bold border-slate-200 max-w-[180px] bg-slate-50"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono select-none">••••••••••••</span>
                    )}
                    {savedRow === "password" && (
                      <Badge className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px]">Saved</Badge>
                    )}
                  </div>
                  <div className="flex justify-end pl-2">
                    {editRow === "password" ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => saveEdit("password")} className="p-1 rounded-md hover:bg-slate-100 text-emerald-600 cursor-pointer">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit("password", "")} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* CARD 2: Workspace & Limits */}
            <Card className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 mb-6 select-none">
                <Cpu className="h-4.5 w-4.5 text-accent" />
                <h2 className="text-sm font-black text-slate-900 tracking-tight font-display">
                  Workspace & Limits
                </h2>
              </div>

              <div className="space-y-1">
                {/* Row: Organization Name */}
                <div className="grid grid-cols-[1.2fr_2fr_auto] items-center py-4 border-b border-slate-100 min-h-[58px]">
                  <span className="text-xs font-extrabold text-slate-400 select-none">Organization Name</span>
                  <div className="flex items-center text-xs font-black text-slate-800">
                    {editRow === "wsName" ? (
                      <Input
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="h-8 rounded-lg text-xs font-bold border-slate-200 max-w-[180px] bg-slate-50"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate">{wsName}</span>
                    )}
                    {savedRow === "wsName" && (
                      <Badge className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px]">Saved</Badge>
                    )}
                  </div>
                  <div className="flex justify-end pl-2">
                    {editRow === "wsName" ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => saveEdit("wsName")} className="p-1 rounded-md hover:bg-slate-100 text-emerald-600 cursor-pointer">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit("wsName", wsName)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row: Active Project */}
                <div className="grid grid-cols-[1.2fr_2fr_auto] items-center py-4 border-b border-slate-100 min-h-[58px]">
                  <span className="text-xs font-extrabold text-slate-400 select-none">Active Project</span>
                  <div className="flex items-center text-xs font-black text-slate-800">
                    {activeProject ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="truncate">{activeProject.name}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-bold select-none">No active project</span>
                    )}
                  </div>
                  <div className="w-7 h-7" /> {/* Empty spacer */}
                </div>

                {/* Row: Max Qubits */}
                <div className="grid grid-cols-[1.2fr_2fr_auto] items-center py-4 last:border-0 min-h-[58px]">
                  <span className="text-xs font-extrabold text-slate-400 select-none">Max Qubit Limit</span>
                  <div className="flex items-center text-xs font-black text-slate-800">
                    {editRow === "maxQubits" ? (
                      <Input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="h-8 rounded-lg text-xs font-bold border-slate-200 max-w-[180px] bg-slate-50"
                        autoFocus
                      />
                    ) : (
                      <span>{maxQubits} Qubits</span>
                    )}
                    {savedRow === "maxQubits" && (
                      <Badge className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px]">Saved</Badge>
                    )}
                  </div>
                  <div className="flex justify-end pl-2">
                    {editRow === "maxQubits" ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => saveEdit("maxQubits")} className="p-1 rounded-md hover:bg-slate-100 text-emerald-600 cursor-pointer">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit("maxQubits", maxQubits)} className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Backend, AI & Notifications */}
          <div className="space-y-6">
            {/* CARD 4: Notifications Preference */}
            <Card className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2 mb-6 select-none">
                <Bell className="h-4.5 w-4.5 text-accent" />
                <h2 className="text-sm font-black text-slate-900 tracking-tight font-display">
                  Notifications
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  { id: "design_events", label: "Design Events", desc: "Alerts when chips are successfully compiled" },
                  { id: "verification_alerts", label: "Verification Alerts", desc: "DRC failure notices and layout collisions" },
                  { id: "simulation_done", label: "Simulation Updates", desc: "Receive updates when simulations are complete" },
                  { id: "weekly_digest", label: "Weekly Digest Report", desc: "Summary reports of workspace layouts built" },
                ].map((n) => (
                  <div key={n.id} className="flex items-center justify-between gap-4 py-1.5">
                    <div>
                      <p className="text-xs font-black text-slate-800 select-none">{n.label}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5 select-none">{n.desc}</p>
                    </div>
                    <Switch
                      checked={notifs[n.id as keyof typeof notifs]}
                      onCheckedChange={() => toggleNotif(n.id as keyof typeof notifs)}
                      className="cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom floating elements (Logout + AI Sparkles) */}
        <div className="relative mt-8 flex justify-end items-center gap-4 pb-12">
          <button
            onClick={() => {
              signOut();
              window.location.href = "/";
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-rose-100 bg-white hover:bg-rose-50/50 text-rose-600 text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </button>

          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-accent to-accent-2 text-white hover:shadow-lg hover:shadow-accent/30 transition-all active:scale-95 cursor-pointer border-0 border-transparent outline-none shadow-[0_4px_12px_rgba(146,141,221,0.3)]">
            <Sparkles className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
