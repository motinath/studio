import type {
  BridgeResult,
  ComponentMetadata,
  ComponentPins,
  ComponentPreview,
  ComponentSummary,
  DesignDocument,
  GeneratedCode,
  RenderResult,
  ValidationResult,
} from "./types";

const RAW_URL = (import.meta.env.VITE_BRIDGE_URL as string | undefined) ?? 
                (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 
                "http://localhost:5000";
const BASE_URL = RAW_URL.replace(/\/$/, "");

export function bridgeUrl(): string {
  return BASE_URL;
}

async function call<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<BridgeResult<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body?.error?.message) detail = body.error.message;
      } catch { /* ignore */ }
      return { data: null, error: detail };
    }
    return { data: (await res.json()) as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export const bridgeClient = {
  listComponents: (signal?: AbortSignal) =>
    call<ComponentSummary[]>("/components", { method: "GET", signal }),

  getComponent: (id: string, signal?: AbortSignal) =>
    call<ComponentSummary>(`/components/${encodeURIComponent(id)}`, { method: "GET", signal }),

  getMetadata: (id: string, signal?: AbortSignal) =>
    call<ComponentMetadata>(`/components/${encodeURIComponent(id)}/metadata`, { method: "GET", signal }),

  getPins: (id: string, params?: Record<string, string | number>, signal?: AbortSignal) => {
    const qs = params ? `?params=${encodeURIComponent(JSON.stringify(params))}` : "";
    return call<ComponentPins>(`/components/${encodeURIComponent(id)}/pins${qs}`, { method: "GET", signal });
  },

  getPreview: (id: string, params?: Record<string, string | number>, signal?: AbortSignal) => {
    const qs = params ? `?params=${encodeURIComponent(JSON.stringify(params))}` : "";
    return call<ComponentPreview>(`/components/${encodeURIComponent(id)}/preview${qs}`, { method: "GET", signal });
  },

  validateDesign: (doc: DesignDocument, signal?: AbortSignal) =>
    call<ValidationResult>("/design/validate", { method: "POST", body: JSON.stringify(doc), signal }),

  generateCode: (doc: DesignDocument, signal?: AbortSignal) =>
    call<GeneratedCode>("/design/generate-code", { method: "POST", body: JSON.stringify(doc), signal }),

  renderDesign: (doc: DesignDocument, signal?: AbortSignal) =>
    call<RenderResult>("/design/render", { method: "POST", body: JSON.stringify(doc), signal }),

  runCode: (code: string, signal?: AbortSignal) =>
    call<{ ok: boolean; design: DesignDocument | null; error: string | null }>(
      "/design/run-code", { method: "POST", body: JSON.stringify({ code }), signal }),
};
