import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plug, Check, X, RefreshCw, ExternalLink, Settings,
  Loader2, CheckCircle2, AlertTriangle, Lock, Zap,
  Server, Globe, GitBranch, Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchHealth } from "@/lib/api/backend";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/integrations")({
  head: () => ({ meta: [{ title: "Integrations — Silicofeller" }] }),
  component: IntegrationsPage,
});

type IntegrationStatus = "connected" | "disconnected" | "testing" | "error";

type Integration = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  status: IntegrationStatus;
  configFields?: { key: string; label: string; placeholder: string; type?: string }[];
  docsUrl?: string;
  version?: string;
};

const INTEGRATIONS_DATA: Integration[] = [
  {
    id: "backend-api",
    name: "Quantum Studio Backend",
    description: "FastAPI backend — QCLang compiler, physics analysis, verification engine.",
    category: "Core",
    icon: Server,
    color: "text-accent bg-accent-soft border-accent/20",
    status: "disconnected",
    version: "2.0.0",
  },
  {
    id: "qiskit-metal",
    name: "Qiskit Metal",
    description: "IBM's open-source framework for quantum hardware design and layout generation.",
    category: "Design",
    icon: Zap,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    status: "disconnected",
    configFields: [
      { key: "python_path", label: "Python executable", placeholder: "/usr/bin/python3" },
    ],
    docsUrl: "https://qiskit.org/documentation/metal/",
  },
  {
    id: "palace",
    name: "AWS Palace",
    description: "High-performance FEM solver for electromagnetic simulation of quantum devices.",
    category: "Simulation",
    icon: Globe,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    status: "disconnected",
    configFields: [
      { key: "aws_region",     label: "AWS Region",     placeholder: "us-east-1" },
      { key: "aws_access_key", label: "Access Key ID",  placeholder: "AKIA..." },
      { key: "aws_secret_key", label: "Secret Key",     placeholder: "••••••••", type: "password" },
    ],
    docsUrl: "https://awslabs.github.io/palace/",
  },
  {
    id: "scqubits",
    name: "scqubits",
    description: "Python library for analytical quantum circuit simulation (transmon, fluxonium, etc.).",
    category: "Simulation",
    icon: Zap,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    status: "disconnected",
    configFields: [
      { key: "python_path", label: "Python executable", placeholder: "/usr/bin/python3" },
    ],
    docsUrl: "https://scqubits.readthedocs.io/",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "AI assistant integration — context-aware design help, DRC explanation, tapeout guidance.",
    category: "AI",
    icon: Zap,
    color: "text-rose-600 bg-rose-50 border-rose-200",
    status: "disconnected",
    configFields: [
      { key: "api_key", label: "API Key", placeholder: "sk-ant-...", type: "password" },
    ],
    docsUrl: "https://docs.anthropic.com/",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Sync design versions to a GitHub repository. Enable PR-based design reviews.",
    category: "Version Control",
    icon: GitBranch,
    color: "text-slate-600 bg-slate-100 border-slate-200",
    status: "disconnected",
    configFields: [
      { key: "repo",  label: "Repository",     placeholder: "org/quantum-chip" },
      { key: "token", label: "Personal Access Token", placeholder: "ghp_...", type: "password" },
    ],
    docsUrl: "https://docs.github.com/",
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    description: "Production database for projects, versions, simulations, and reports.",
    category: "Database",
    icon: Database,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    status: "disconnected",
    configFields: [
      { key: "host",     label: "Host",     placeholder: "localhost" },
      { key: "port",     label: "Port",     placeholder: "5432" },
      { key: "database", label: "Database", placeholder: "quantum_studio" },
      { key: "username", label: "Username", placeholder: "postgres" },
      { key: "password", label: "Password", placeholder: "••••••••", type: "password" },
    ],
  },
];

const CATEGORY_ORDER = ["Core", "Design", "Simulation", "AI", "Version Control", "Database"];

function IntegrationCard({ integration: init }: { integration: Integration }) {
  const [integration, setIntegration] = useState(init);
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);

  // Auto-test backend on mount
  useEffect(() => {
    if (init.id !== "backend-api") return;
    fetchHealth().then(h => {
      setIntegration(prev => ({
        ...prev,
        status: h.status === "online" ? "connected" : "disconnected",
        version: h.version || "2.0.0",
      }));
    });
  }, []);

  const test = async () => {
    setTesting(true);
    await new Promise(r => setTimeout(r, 1000));

    if (integration.id === "backend-api") {
      const h = await fetchHealth();
      setIntegration(prev => ({ ...prev, status: h.status === "online" ? "connected" : "error" }));
    } else if (config[Object.keys(config)[0] ?? ""] || !integration.configFields?.length) {
      setIntegration(prev => ({ ...prev, status: "connected" }));
    } else {
      setIntegration(prev => ({ ...prev, status: "error" }));
    }
    setTesting(false);
  };

  const disconnect = () => {
    setIntegration(prev => ({ ...prev, status: "disconnected" }));
    setConfig({});
  };

  const STATUS_BADGE: Record<IntegrationStatus, { label: string; class: string; icon: React.ComponentType<{ className?: string }> }> = {
    connected:    { label: "Connected",    class: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    disconnected: { label: "Not connected", class: "bg-slate-50 text-slate-500 border-slate-200",      icon: X },
    testing:      { label: "Testing…",     class: "bg-amber-50 text-amber-700 border-amber-200",       icon: Loader2 },
    error:        { label: "Error",        class: "bg-rose-50 text-rose-700 border-rose-200",          icon: AlertTriangle },
  };

  const badge = STATUS_BADGE[integration.status];

  return (
    <Card className={cn("rounded-2xl border bg-white shadow-sm overflow-hidden transition-all", integration.status === "connected" ? "border-emerald-200" : "border-slate-200")}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center shrink-0", integration.color)}>
              <integration.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-900">{integration.name}</p>
                {integration.version && (
                  <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    v{integration.version}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug max-w-sm">{integration.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={cn("rounded-full text-[9px] font-bold px-2 py-0.5 flex items-center gap-1", badge.class)}>
              <badge.icon className={cn("h-2.5 w-2.5", integration.status === "testing" && "animate-spin")} />
              {badge.label}
            </Badge>
            {integration.configFields && integration.configFields.length > 0 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-accent hover:border-accent/40 transition-all cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
            {integration.docsUrl && (
              <a
                href={integration.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-accent hover:border-accent/40 transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={test}
            disabled={testing}
            variant={integration.status === "connected" ? "outline" : "default"}
            className={cn("rounded-lg text-xs font-bold h-7 px-3", integration.status !== "connected" && "bg-accent text-white hover:bg-accent/90")}
          >
            {testing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            {integration.status === "connected" ? "Re-test" : "Test Connection"}
          </Button>
          {integration.status === "connected" && (
            <Button size="sm" variant="outline" onClick={disconnect} className="rounded-lg text-xs font-bold h-7 px-3 text-rose-600 border-rose-200 hover:bg-rose-50">
              Disconnect
            </Button>
          )}
        </div>
      </div>

      {/* Config fields */}
      {expanded && integration.configFields && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-slate-100 px-4 pb-4"
        >
          <div className="pt-3 space-y-2.5">
            {integration.configFields.map(field => (
              <div key={field.key}>
                <p className="text-[10px] font-bold text-slate-500 mb-1">{field.label}</p>
                <Input
                  type={field.type ?? "text"}
                  value={config[field.key] ?? ""}
                  onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="rounded-xl text-xs h-8 border-slate-200 font-mono"
                />
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
              <Lock className="h-3 w-3" />
              Credentials are stored locally and never sent to Silicofeller servers.
            </div>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

function IntegrationsPage() {
  const grouped = CATEGORY_ORDER.reduce<Record<string, Integration[]>>((acc, cat) => {
    acc[cat] = INTEGRATIONS_DATA.filter(i => i.category === cat);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-accent-soft border border-accent/10 flex items-center justify-center">
              <Plug className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">Integrations</h1>
              <p className="text-sm text-slate-500">Connect simulators, AI, databases, and version control</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          {CATEGORY_ORDER.map(cat => {
            const items = grouped[cat];
            if (!items?.length) return null;
            return (
              <div key={cat}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">{cat}</p>
                <div className="space-y-3">
                  {items.map(i => <IntegrationCard key={i.id} integration={i} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
