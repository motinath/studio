// Typed contract for the Qiskit Metal Python bridge.
// See docs/bridge-contract.md for the full specification.

export type ComponentCategory =
  | "qubits"
  | "resonators"
  | "couplers"
  | "routes"
  | "launchpads"
  | "ground"
  | "terminations"
  | "other";

export interface ComponentSummary {
  id: string;
  name: string;
  module: string;
  category: ComponentCategory;
  description?: string;
}

export type ParameterType = "length" | "string" | "number" | "bool" | "enum";

export interface ParameterSpec {
  name: string;
  type: ParameterType;
  unit?: string;
  default: string;
  description?: string;
  options?: string[];
}

export interface ComponentMetadata {
  id: string;
  parameters: ParameterSpec[];
  /** Route components the bridge will accept when a connection originates here. */
  supportedRouteComponents?: string[];
}

export type PinDirection = "in" | "out" | "io";

export interface PinSpec {
  name: string;
  direction: PinDirection;
  /** Coordinates in micrometers at the component's default parameters. */
  hint: { x: number; y: number; angle: number };
}

export interface ComponentPins {
  id: string;
  pins: PinSpec[];
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ComponentPreview {
  id: string;
  /** SVG fragment (no <svg> wrapper) ready to embed. */
  svg: string;
  viewBox: ViewBox;
  units: "um" | "mm";
}

// ---------- Frontend-owned design document ----------

export interface Placement {
  id: string;
  componentId: string;
  name: string;
  /** Position in mm (canvas world units). */
  x: number;
  y: number;
  rotation: number;
  params: Record<string, string | number>;
}

export interface PinRef {
  placementId: string;
  pinName: string;
}

export interface Connection {
  id: string;
  from: PinRef;
  to: PinRef;
  /** Route QComponent the bridge should instantiate; falls back to bridge default if omitted. */
  routeComponentId?: string;
  routeOverrides?: Record<string, string | number>;
}

export interface DesignDocument {
  placements: Placement[];
  connections: Connection[];
}

// ---------- Bridge call results ----------

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  rule: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface GeneratedCode {
  language: "python";
  filename: string;
  code: string;
}

export interface RouteRender {
  connectionId: string;
  svg: string;
}

export interface LayerRender {
  name: string;
  svg: string;
}

export interface RenderResult {
  svg: string;
  viewBox: ViewBox;
  units: "um" | "mm";
  layers: LayerRender[];
  routes: RouteRender[];
}

// ---------- Uniform call envelope ----------

export type BridgeResult<T> = { data: T; error: null } | { data: null; error: string };
