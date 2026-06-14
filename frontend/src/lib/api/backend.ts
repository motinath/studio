/**
 * Silicofeller Quantum Studio — Backend API client
 * All requests go to VITE_BACKEND_URL (default http://localhost:5000)
 */

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000").replace(
  /\/$/,
  "",
);

// ── Generic fetch helper ──────────────────────────────────────────────────────

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("qs_token") : null;
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers ?? {}) as Record<string, string>),
    },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${msg}`);
  }
  if (res.status === 204) {
    return null as unknown as T;
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DRCReport {
  passed: boolean;
  violations: Array<{
    severity: "error" | "warning";
    rule: string;
    message: string;
  }>;
}

export interface FrequencyPlan {
  epsilon_eff: number;
  qubit_frequencies_GHz: Record<string, number>;
  qubit_groups: Record<string, number | string>;
  EJ_GHz: Record<string, number>;
  EC_GHz: Record<string, number>;
  resonator_frequencies_GHz: Record<string, number>;
  resonator_lengths_mm: Record<string, number>;
  detunings_GHz: Record<string, number>;
  warnings: string[];
  substrate?: string;
  metal?: string;
}

export interface PlacementQubit {
  name: string;
  x: number;
  y: number;
  orientation_deg?: number;
}

export interface PlacementEdge {
  qubit_a: string;
  pin_a?: string;
  qubit_b: string;
  pin_b?: string;
  label?: string;
}

export interface Placement {
  solver: string;
  qubits: PlacementQubit[];
  edges?: PlacementEdge[];
  topology?: string;
  cols?: number;
  rows?: number;
  pitch_mm?: number;
}

export interface MLPrediction {
  qubits: number;
  topology: string;
  class_index: number | null;
  confidence: number | null;
  method: string;
  ml_skipped?: boolean;
  reason?: string;
}

export interface GenerateResponse {
  label: string;
  num_qubits: number;
  topology: string;
  engine: string;
  interpretation: string;
  chip_image?: string;
  fabricated_image?: string;
  drc?: DRCReport;
  frequency_plan?: FrequencyPlan;
  placement?: Placement;
  code?: string;
  qclang_source?: string;
  material?: { substrate: string; metal: string };
  ml_prediction?: MLPrediction;
  error_hint?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  max_qubits: number;
  qiskit_metal: string;
  metal_version: string;
  ml_intent: string;
  pipeline: string[];
  error?: string;
}

export interface Material {
  key: string;
  label: string;
  description: string;
  epsilon_r?: number;
  loss_tangent?: number;
  substrate_thickness_um?: number;
  Tc_K?: number;
  london_penetration_depth_nm?: number;
  sheet_resistance_mOhm?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  topology: string;
  num_qubits: number;
  target_frequency_ghz: number;
  status: string;
  substrate_material: string;
  metal_layer: string;
  has_design: boolean;
  created_at: string;
  updated_at: string;
  owner_id: string;
  design_payload?: GenerateResponse;
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<HealthResponse> {
  try {
    return await api<HealthResponse>("/health");
  } catch {
    return {
      status: "offline",
      version: "—",
      max_qubits: 0,
      qiskit_metal: "—",
      metal_version: "—",
      ml_intent: "—",
      pipeline: [],
      error: "Backend unreachable",
    };
  }
}

// ── Chip generation ───────────────────────────────────────────────────────────

export async function generateChip(
  prompt: string,
  substrate?: string,
  metal?: string,
): Promise<GenerateResponse> {
  return api<GenerateResponse>("/generate", {
    method: "POST",
    body: JSON.stringify({ prompt, substrate, metal }),
  });
}

// ── QCLang ────────────────────────────────────────────────────────────────────

export interface QCLangParseResult {
  success: boolean;
  errors: Array<{ severity: string; message: string; line?: number }>;
  ast: unknown;
  num_chips: number;
  num_qubits: number;
}

export async function parseQCLang(source: string): Promise<QCLangParseResult> {
  return api<QCLangParseResult>("/api/qclang/parse", {
    method: "POST",
    body: JSON.stringify({ source }),
  });
}

export async function compileQCLang(
  source: string,
  options?: {
    target_freq_ghz?: number;
    substrate?: string;
    metal?: string;
    chip_size_mm?: number;
  },
): Promise<{ success: boolean; errors: unknown[]; result: GenerateResponse | null }> {
  return api("/api/qclang/compile", {
    method: "POST",
    body: JSON.stringify({ source, ...options }),
  });
}

export interface MetalCodeRequest {
  components: Array<Record<string, unknown>>;
  connections: Array<Record<string, unknown>>;
  variables: Record<string, unknown>;
}

export interface MetalCodeResponse {
  success: boolean;
  code: string;
  warnings: string[];
  component_count: number;
}

export async function generateMetalCode(payload: MetalCodeRequest): Promise<MetalCodeResponse> {
  return api<MetalCodeResponse>("/api/generate/metal-code", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getQCLangTemplates(): Promise<
  Array<{ name: string; description: string; source: string }>
> {
  try {
    return await api("/api/qclang/templates");
  } catch {
    return [];
  }
}

// ── Materials ─────────────────────────────────────────────────────────────────

export async function fetchMaterials(): Promise<{
  substrates: Record<string, Material>;
  metals: Record<string, Material>;
}> {
  return api("/api/materials");
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  return api<Project[]>("/api/projects");
}

export async function createProject(data: {
  name: string;
  description?: string;
  topology?: string;
  num_qubits?: number;
  target_frequency_ghz?: number;
  substrate_material?: string;
  metal_layer?: string;
}): Promise<Project> {
  return api<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  return api<Project>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await api(`/api/projects/${id}`, { method: "DELETE" });
}

export async function saveDesignToProject(
  projectId: string,
  payload: GenerateResponse,
): Promise<void> {
  await api(`/api/projects/${projectId}/save-design`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Verification ──────────────────────────────────────────────────────────────

export interface VerificationReport {
  id?: string;
  status: "passed" | "failed" | "warning" | "pending";
  drc_passed: boolean;
  violations: unknown[];
  frequency_collisions: unknown[];
  crosstalk_warnings: unknown[];
  summary: {
    total_issues: number;
    critical: number;
    major: number;
    minor: number;
    yield_estimate: number;
    coherence_budget?: { T1_us: number; T2_us: number };
    num_qubits?: number;
  };
}

export async function runVerification(payload: GenerateResponse): Promise<VerificationReport> {
  return api<VerificationReport>("/api/verification/check", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Simulations ───────────────────────────────────────────────────────────────

export async function fetchSimulations(): Promise<any[]> {
  return api<any[]>("/api/simulations");
}

// ── Claude ────────────────────────────────────────────────────────────────────

export async function askClaude(
  message: string,
  contextType: string = "general",
  contextData?: unknown,
  history?: Array<{ role: string; content: string }>,
): Promise<{ role: string; content: string }> {
  try {
    return await api("/api/claude/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        context_type: contextType,
        context_data: contextData,
        history,
      }),
    });
  } catch {
    return {
      role: "assistant",
      content:
        "I'm currently unavailable (backend offline). " +
        "Run `cd backend && python run.py` to start the server.",
    };
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string) {
  const formData = new FormData();
  formData.append("username", email);
  formData.append("password", password);
  const res = await fetch(`${BACKEND_URL}/api/auth/token`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  if (data.access_token && typeof window !== "undefined") {
    localStorage.setItem("qs_token", data.access_token);
  }
  return data;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  organization: string,
  role?: string,
) {
  const data = await api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, organization, role }),
  });
  const d = data as { access_token?: string };
  if (d.access_token && typeof window !== "undefined") {
    localStorage.setItem("qs_token", d.access_token);
  }
  return data;
}
