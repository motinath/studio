import type {
  ComponentMetadata,
  Connection,
  DesignDocument,
  Placement,
} from "./types";

/**
 * Adapters map bridge DTOs to view-model shapes the editor uses directly,
 * so the editor never imports raw bridge types. Keep these intentionally
 * thin — heavier transformations belong on the bridge side.
 */

export interface ParameterFieldVM {
  name: string;
  label: string;
  kind: "length" | "string" | "number" | "bool" | "enum";
  unit?: string;
  options?: string[];
  defaultValue: string;
  description?: string;
}

export function metadataToFields(meta: ComponentMetadata): ParameterFieldVM[] {
  return meta.parameters.map((p) => ({
    name: p.name,
    label: p.name.replace(/_/g, " "),
    kind: p.type,
    unit: p.unit,
    options: p.options,
    defaultValue: p.default,
    description: p.description,
  }));
}

export function defaultParamsFromMetadata(meta: ComponentMetadata): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of meta.parameters) {
    if (p.unit && p.type === "length" && !/[a-zA-Z]/.test(p.default)) {
      out[p.name] = `${p.default}${p.unit}`;
    } else {
      out[p.name] = p.default;
    }
  }
  return out;
}

export function toDesignDocument(
  placements: Placement[],
  connections: Connection[],
): DesignDocument {
  return { placements, connections };
}
