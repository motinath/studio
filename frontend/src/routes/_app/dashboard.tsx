import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Network, Cpu, Sparkles, Upload, CheckCircle2, Trash2, Clock, ArrowRight
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useProject } from "@/lib/project-context";
import { fetchSimulations, deleteProject, createProject, type Project } from "@/lib/api/backend";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Workspace — Silicofeller" }] }),
  component: WorkspaceHomePage,
});

// Time formatting helper
function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${Math.max(1, diffMins)}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return "Yesterday";
  } else {
    return `${diffDays} days ago`;
  }
}

// Connection count estimator based on topology and qubit count
function calculateConnections(topology: string, numQubits: number): number {
  const n = numQubits;
  const topo = (topology || "grid").toLowerCase();
  if (n <= 1) return 0;
  if (topo === "chain" || topo === "linear") {
    return n - 1;
  }
  if (topo === "ring") {
    return n;
  }
  if (topo === "star") {
    return n - 1;
  }
  if (topo === "all-to-all") {
    return (n * (n - 1)) / 2;
  }
  if (topo === "heavy-hex" || topo === "heavy_hex") {
    return Math.floor(1.2 * n);
  }
  
  // Default grid
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const hEdges = rows * (cols - 1);
  const vEdges = cols * (rows - 1);
  
  const missing = (cols * rows) - n;
  let edges = hEdges + vEdges;
  if (missing > 0) {
    edges -= missing;
  }
  return Math.max(0, edges);
}

// Dynamic qubit chip schematic preview
function ChipSchematic({ topology, numQubits }: { topology: string; numQubits: number }) {
  const positions: { id: string; x: number; y: number }[] = [];
  const n = Math.min(Math.max(numQubits, 1), 32); // cap for visual preview
  const topo = (topology || "grid").toLowerCase();

  if (topo === "chain" || topo === "linear") {
    for (let i = 0; i < n; i++) {
      positions.push({ id: `Q${i + 1}`, x: 30 + i * (200 / Math.max(n - 1, 1)), y: 100 });
    }
  } else if (topo === "ring") {
    const r = 60;
    const cx = 130, cy = 100;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n;
      positions.push({
        id: `Q${i + 1}`,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
  } else if (topo === "heavy-hex" || topo === "heavy_hex") {
    const cols = 5;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const offset = r % 2 === 0 ? 0 : 20;
      positions.push({ id: `Q${i + 1}`, x: 40 + c * 40 + offset, y: 40 + r * 35 });
    }
  } else {
    // Default grid
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      positions.push({
        id: `Q${i + 1}`,
        x: 40 + c * (180 / Math.max(cols - 1, 1)),
        y: 40 + r * (120 / Math.max(rows - 1, 1)),
      });
    }
  }

  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const maxDist = topo === "chain" ? 220 / n + 10 : topo === "ring" ? (2 * Math.PI * 60) / n + 15 : 55;

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p = positions[i];
      const q = positions[j];
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      if (dist <= maxDist) {
        edges.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
      }
    }
  }

  return (
    <svg
      viewBox="0 0 260 200"
      className="w-full h-[180px] rounded-2xl border border-slate-100 bg-slate-50/40"
    >
      {edges.map((e, idx) => (
        <line
          key={idx}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke="#7C3AED"
          strokeWidth="1.2"
          strokeDasharray="2,2"
          opacity="0.5"
        />
      ))}
      {positions.map((p) => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r="8" fill="#fff" stroke="#7C3AED" strokeWidth="1.5" />
          <text
            x={p.x}
            y={p.y + 2.5}
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="bold"
            fill="#7C3AED"
          >
            {p.id.replace("Q", "")}
          </text>
        </g>
      ))}
    </svg>
  );
}

function WorkspaceHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projects, activeProject, setActiveProject, refreshProjects } = useProject();
  const [simulations, setSimulations] = useState<any[]>([]);

  useEffect(() => {
    fetchSimulations()
      .then((data) => setSimulations(data))
      .catch(() => {});
  }, [projects]);

  const handleDuplicate = async (p: Project) => {
    try {
      await createProject({
        name: `${p.name} (Copy)`,
        description: p.description,
        topology: p.topology,
        num_qubits: p.num_qubits,
        target_frequency_ghz: p.target_frequency_ghz,
        substrate_material: p.substrate_material,
        metal_layer: p.metal_layer,
      });
      toast.success(`Duplicated ${p.name} successfully`);
      await refreshProjects();
    } catch {
      toast.error("Failed to duplicate project");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    try {
      await deleteProject(id);
      toast.success("Project deleted successfully");
      await refreshProjects();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  // Sort projects by recently updated to show in Continue Working
  const sortedProjects = [...projects].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const projectsCount = projects.length;
  const layoutsCount = projects.filter((p) => p.has_design).length;
  const componentsCount = projects.reduce((acc, p) => {
    const q = p.num_qubits || 0;
    const c = calculateConnections(p.topology, q);
    return acc + q + q + c; // Estimate: qubits + resonators (1 per qubit) + couplers
  }, 0);
  const simulationsCount = simulations.length;

  // Compile last 5 activities
  const dynamicActivities = [
    ...projects.slice(0, 3).map((p) => ({
      title: `${p.name} saved`,
      sub: `${p.topology.replace("-", " ")} · ${p.num_qubits}Q`,
      time: formatTimeAgo(p.updated_at),
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50",
    })),
    ...simulations.slice(0, 2).map((s) => {
      const proj = projects.find((p) => p.id === s.project_id);
      return {
        title: `Simulation ${s.status === "completed" ? "completed" : s.status}`,
        sub: `${proj ? proj.name : "Design"} · ${s.solver}`,
        time: formatTimeAgo(s.created_at),
        icon: s.status === "completed" ? CheckCircle2 : Clock,
        color: s.status === "completed" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50",
      };
    }),
  ];

  const activityFeed = dynamicActivities.slice(0, 5);

  return (
    <div className="h-full overflow-y-auto bg-[#F8F9FB]">
      <div className="mx-auto max-w-[1600px] px-6 py-6 space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Welcome Back, {user?.name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quantum Design Workspace is active. Select a project or run quick layout actions below.
          </p>
        </motion.div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Continue Working Section */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                Continue Working
              </h2>
              {sortedProjects.length === 0 ? (
                <Card className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <Cpu className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No active designs yet</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Create your first project to start designing.
                  </p>
                  <Button
                    onClick={() => navigate({ to: "/projects" })}
                    className="rounded-xl bg-accent text-white text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create Project
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedProjects.slice(0, 2).map((p) => (
                    <Card
                      key={p.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between h-40 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setActiveProject(p);
                        navigate({ to: "/schematic-editor" });
                      }}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
                              <Cpu className="h-4 w-4 text-accent" />
                            </div>
                            <span className="font-bold text-slate-900 text-sm truncate max-w-[180px]">
                              {p.name}
                            </span>
                          </div>
                          {activeProject?.id === p.id && (
                            <Badge className="bg-accent-soft text-accent hover:bg-accent-soft/80 border-0 rounded-full text-[9px] font-bold px-2">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-2.5 capitalize">
                          {p.topology.replace("-", " ")} · {p.num_qubits || "—"} Qubits
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] text-slate-500 font-semibold">
                          Last opened {formatTimeAgo(p.updated_at)}
                        </span>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveProject(p);
                            navigate({ to: "/schematic-editor" });
                          }}
                          className="rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold px-3 py-1.5 h-8 shadow-sm shadow-accent/10"
                        >
                          Open Project
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Grid */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: Plus,
                    label: "New Project",
                    desc: "Initialize a new QPU design",
                    to: "/projects",
                  },
                  {
                    icon: Network,
                    label: "New Schematic",
                    desc: "Compose transmons on canvas",
                    to: "/schematic-editor",
                  },
                  {
                    icon: Cpu,
                    label: "Open Layout Editor",
                    desc: "View physical layout & GDS",
                    to: "/layout-viewer",
                  },
                ].map((a) => (
                  <Link
                    key={a.label}
                    to={a.to}
                    className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-accent hover:bg-accent-soft transition-colors flex flex-col items-start justify-between h-32 group"
                  >
                    <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <a.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">{a.label}</h3>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal font-medium">{a.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Projects Table */}
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">Recent Projects</h2>
                <Link
                  to="/projects"
                  className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {projects.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No projects found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 font-black">
                        <th className="pb-2 font-bold">Project</th>
                        <th className="pb-2 font-bold text-center">Qubits</th>
                        <th className="pb-2 font-bold">Topology</th>
                        <th className="pb-2 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.slice(0, 5).map((p) => (
                        <tr
                          key={p.id}
                          className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="py-3 font-bold text-slate-900">{p.name}</td>
                          <td className="py-3 text-center text-slate-700 font-semibold">
                            {p.num_qubits || "—"}
                          </td>
                          <td className="py-3 text-slate-600 font-medium capitalize">
                            {p.topology.replace("-", " ")}
                          </td>
                          <td className="py-3 text-right space-x-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveProject(p);
                                navigate({ to: "/schematic-editor" });
                              }}
                              className="h-7 text-[10px] rounded-lg px-2"
                            >
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDuplicate(p)}
                              className="h-7 text-[10px] rounded-lg px-2 text-slate-600 hover:bg-slate-50"
                            >
                              Duplicate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(p.id)}
                              className="h-7 text-[10px] rounded-lg px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-100"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Current Active Design Card */}
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">Current Active Design</h2>
                {activeProject && (
                  <Badge className="bg-accent-soft text-accent border-0 rounded-full text-[9px] font-bold px-2">
                    Active
                  </Badge>
                )}
              </div>

              {activeProject ? (
                <div className="space-y-4">
                  <ChipSchematic
                    topology={activeProject.topology}
                    numQubits={activeProject.num_qubits}
                  />
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">Project</span>
                      <span className="font-bold text-slate-900">{activeProject.name}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">Qubits</span>
                      <span className="font-bold text-slate-900">{activeProject.num_qubits}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-600 font-semibold">Estimated Connections</span>
                      <span className="font-bold text-slate-900">
                        {calculateConnections(activeProject.topology, activeProject.num_qubits)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-semibold">Last Modified</span>
                      <span className="font-bold text-slate-800">
                        {formatTimeAgo(activeProject.updated_at)}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate({ to: "/schematic-editor" })}
                    className="w-full mt-2 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-bold h-9 shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 animate-pulse" /> Open Editor
                  </Button>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <Cpu className="h-8 w-8 mx-auto mb-2 opacity-45 text-slate-400 animate-pulse" />
                  <p className="text-xs font-bold text-slate-700">No active design</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-normal">
                    Select a project from the left or projects page to load a preview.
                  </p>
                </div>
              )}
            </Card>

            {/* Design Status statistics */}
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Design Status</h2>
              <div className="space-y-3 text-xs">
                {[
                  { label: "Projects", value: projectsCount },
                  { label: "Layouts", value: layoutsCount },
                  { label: "Components", value: componentsCount },
                  { label: "Simulations", value: simulationsCount },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-slate-600 font-semibold">{stat.label}</span>
                    <span className="text-sm font-black text-slate-900">{stat.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Activity Feed */}
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Recent Activity</h2>
              {activityFeed.length === 0 ? (
                <div className="py-6 text-center text-slate-400">
                  <Clock className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold text-slate-500">No recent activity yet</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Create a project and run a design to see activity here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {activityFeed.map((a, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div
                        className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${a.color}`}
                      >
                        <a.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {a.title}
                          </span>
                          <span className="text-[9px] text-slate-500 font-semibold shrink-0">{a.time}</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium truncate mt-0.5">{a.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

