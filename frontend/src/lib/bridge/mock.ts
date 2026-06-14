// Development-only fallback data used when VITE_BRIDGE_URL is not configured.
// Lets the editor be exercised end-to-end (drag/drop, pins, connections,
// persistence) before the real Qiskit Metal Python bridge ships.
//
// IMPORTANT: These are NOT canonical component definitions. The real bridge
// remains the single source of truth. Mock data is intentionally minimal —
// just enough geometry/pins to make the UI walkable.

import type {
  ComponentMetadata,
  ComponentPins,
  ComponentPreview,
  ComponentSummary,
  DesignDocument,
  GeneratedCode,
  RenderResult,
  ValidationResult,
} from "./types";

export const MOCK_COMPONENTS: ComponentSummary[] = [
  {
    id: "TransmonPocket",
    name: "Transmon Pocket",
    module: "qiskit_metal.qlibrary.qubits.transmon_pocket",
    category: "qubits",
    description: "Pocket-style transmon qubit (mock fixture).",
  },
  {
    id: "TransmonCross",
    name: "Transmon Cross",
    module: "qiskit_metal.qlibrary.qubits.transmon_cross",
    category: "qubits",
    description: "Cross-shaped transmon qubit (mock fixture).",
  },
  {
    id: "ResonatorCoilRect",
    name: "Resonator Coil Rect",
    module: "qiskit_metal.qlibrary.resonator.resonator_coil_rect",
    category: "resonators",
    description: "Rectangular coil readout resonator (mock fixture).",
  },
  {
    id: "LaunchpadWirebond",
    name: "Launchpad Wirebond",
    module: "qiskit_metal.qlibrary.terminations.launchpad_wb",
    category: "launchpads",
    description: "Wirebond launchpad for I/O (mock fixture).",
  },
  {
    id: "RouteMeander",
    name: "Route Meander",
    module: "qiskit_metal.qlibrary.tlines.meandered",
    category: "routes",
    description: "Meandered CPW route (mock fixture).",
  },
  {
    id: "RouteStraight",
    name: "Route Straight",
    module: "qiskit_metal.qlibrary.tlines.straight_path",
    category: "routes",
    description: "Straight CPW route (mock fixture).",
  },
];

const META: Record<string, ComponentMetadata> = {
  TransmonPocket: {
    id: "TransmonPocket",
    parameters: [
      { name: "pad_width", type: "length", unit: "um", default: "455" },
      { name: "pad_height", type: "length", unit: "um", default: "90" },
      { name: "pad_gap", type: "length", unit: "um", default: "30" },
      { name: "pocket_width", type: "length", unit: "um", default: "650" },
      { name: "pocket_height", type: "length", unit: "um", default: "650" },
    ],
    supportedRouteComponents: ["RouteMeander"],
  },
  TransmonCross: {
    id: "TransmonCross",
    parameters: [
      { name: "cross_width", type: "length", unit: "um", default: "20" },
      { name: "cross_length", type: "length", unit: "um", default: "200" },
      { name: "cross_gap", type: "length", unit: "um", default: "20" },
    ],
    supportedRouteComponents: ["RouteMeander"],
  },
  LaunchpadWirebond: {
    id: "LaunchpadWirebond",
    parameters: [
      { name: "trace_width", type: "length", unit: "um", default: "10" },
      { name: "trace_gap", type: "length", unit: "um", default: "6" },
      { name: "lead_length", type: "length", unit: "um", default: "25" },
      { name: "pad_width", type: "length", unit: "um", default: "260" },
      { name: "pad_height", type: "length", unit: "um", default: "260" },
    ],
  },
  ResonatorCoilRect: {
    id: "ResonatorCoilRect",
    parameters: [
      { name: "coupling_length", type: "length", unit: "um", default: "200" },
      { name: "total_length", type: "length", unit: "um", default: "5000" },
      { name: "coil_width", type: "length", unit: "um", default: "10" },
      { name: "spacing", type: "length", unit: "um", default: "5" },
    ],
    supportedRouteComponents: ["RouteStraight"],
  },
  RouteMeander: {
    id: "RouteMeander",
    parameters: [
      { name: "total_length", type: "length", unit: "um", default: "7000" },
      { name: "meander_spacing", type: "length", unit: "um", default: "200" },
      { name: "asymmetry", type: "length", unit: "um", default: "0" },
    ],
  },
  RouteStraight: {
    id: "RouteStraight",
    parameters: [
      { name: "total_length", type: "length", unit: "um", default: "3000" },
    ],
  },
};

const PINS: Record<string, ComponentPins> = {
  TransmonPocket: {
    id: "TransmonPocket",
    pins: [
      { name: "a", direction: "io", hint: { x: -325, y: 0, angle: 180 } },
      { name: "b", direction: "io", hint: { x: 325, y: 0, angle: 0 } },
      { name: "c", direction: "io", hint: { x: 0, y: 325, angle: 90 } },
      { name: "d", direction: "io", hint: { x: 0, y: -325, angle: 270 } },
    ],
  },
  TransmonCross: {
    id: "TransmonCross",
    pins: [
      { name: "north", direction: "io", hint: { x: 0, y: 200, angle: 90 } },
      { name: "south", direction: "io", hint: { x: 0, y: -200, angle: 270 } },
      { name: "east", direction: "io", hint: { x: 200, y: 0, angle: 0 } },
      { name: "west", direction: "io", hint: { x: -200, y: 0, angle: 180 } },
    ],
  },
  LaunchpadWirebond: {
    id: "LaunchpadWirebond",
    pins: [{ name: "tie", direction: "io", hint: { x: 150, y: 0, angle: 0 } }],
  },
  ResonatorCoilRect: {
    id: "ResonatorCoilRect",
    pins: [
      { name: "in", direction: "io", hint: { x: -200, y: 0, angle: 180 } },
      { name: "out", direction: "io", hint: { x: 200, y: 0, angle: 0 } },
    ],
  },
  RouteMeander: {
    id: "RouteMeander",
    pins: [
      { name: "start", direction: "io", hint: { x: -500, y: 0, angle: 180 } },
      { name: "end", direction: "io", hint: { x: 500, y: 0, angle: 0 } },
    ],
  },
  RouteStraight: {
    id: "RouteStraight",
    pins: [
      { name: "start", direction: "io", hint: { x: -250, y: 0, angle: 180 } },
      { name: "end", direction: "io", hint: { x: 250, y: 0, angle: 0 } },
    ],
  },
};

const PREVIEWS: Record<string, ComponentPreview> = {
  TransmonPocket: {
    id: "TransmonPocket",
    svg: `<g fill="none" stroke="currentColor" stroke-width="8">
      <rect x="-325" y="-325" width="650" height="650" rx="20" opacity="0.5"/>
      <rect x="-228" y="-110" width="455" height="90" fill="currentColor"/>
      <rect x="-228" y="20" width="455" height="90" fill="currentColor"/>
    </g>`,
    viewBox: { x: -350, y: -350, w: 700, h: 700 },
    units: "um",
  },
  TransmonCross: {
    id: "TransmonCross",
    svg: `<g fill="currentColor">
      <rect x="-10" y="-200" width="20" height="400"/>
      <rect x="-200" y="-10" width="400" height="20"/>
    </g>`,
    viewBox: { x: -220, y: -220, w: 440, h: 440 },
    units: "um",
  },
  LaunchpadWirebond: {
    id: "LaunchpadWirebond",
    svg: `<g fill="currentColor">
      <rect x="-130" y="-130" width="260" height="260" rx="10"/>
      <rect x="130" y="-5" width="40" height="10"/>
    </g>`,
    viewBox: { x: -140, y: -140, w: 320, h: 280 },
    units: "um",
  },
  ResonatorCoilRect: {
    id: "ResonatorCoilRect",
    svg: `<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round">
      <rect x="-180" y="-120" width="360" height="240" rx="12" stroke-dasharray="8 4" opacity="0.3"/>
      <path d="M -200 0 L -140 0 L -140 80 L -60 80 L -60 -80 L 20 -80 L 20 80 L 100 80 L 100 -80 L 140 -80 L 140 0 L 200 0"/>
    </g>`,
    viewBox: { x: -220, y: -140, w: 440, h: 280 },
    units: "um",
  },
  RouteMeander: {
    id: "RouteMeander",
    svg: `<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round">
      <path d="M -500 0 L -300 0 L -300 100 L -100 100 L -100 -100 L 100 -100 L 100 100 L 300 100 L 300 0 L 500 0"/>
    </g>`,
    viewBox: { x: -520, y: -140, w: 1040, h: 280 },
    units: "um",
  },
  RouteStraight: {
    id: "RouteStraight",
    svg: `<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round">
      <line x1="-250" y1="0" x2="250" y2="0"/>
    </g>`,
    viewBox: { x: -270, y: -20, w: 540, h: 40 },
    units: "um",
  },
};

export const mockBridge = {
  listComponents: (): ComponentSummary[] => MOCK_COMPONENTS,
  getComponent: (id: string): ComponentSummary | null =>
    MOCK_COMPONENTS.find((c) => c.id === id) ?? null,
  getMetadata: (id: string): ComponentMetadata | null => META[id] ?? null,
  getPins: (id: string): ComponentPins | null => PINS[id] ?? null,
  getPreview: (id: string): ComponentPreview | null => PREVIEWS[id] ?? null,
  validateDesign: (doc: DesignDocument): ValidationResult => {
    const issues: ValidationResult["issues"] = [];
    if (doc.placements.length === 0) {
      issues.push({
        severity: "warning",
        rule: "non-empty",
        message: "Design has no placements.",
      });
    }
    for (const c of doc.connections) {
      if (c.from.placementId === c.to.placementId) {
        issues.push({
          severity: "error",
          rule: "no-self-loop",
          message: `Connection ${c.id} loops back to the same component.`,
        });
      }
    }
    return {
      valid: !issues.some((i) => i.severity === "error"),
      issues: [
        ...issues,
        {
          severity: "info",
          rule: "dev-mode",
          message: "Validated by development preview (no Qiskit Metal bridge).",
        },
      ],
    };
  },
  generateCode: (doc: DesignDocument): GeneratedCode => {
    const header = [
      "# Generated by Silicofeller — DEVELOPMENT PREVIEW (no Qiskit Metal bridge).",
      "# This file is a placeholder. Connect VITE_BRIDGE_URL for real codegen.",
      "from qiskit_metal import designs, MetalGUI",
      "",
      "design = designs.DesignPlanar()",
      "",
    ].join("\n");
    const body =
      doc.placements
          .map(
            (p) =>
              `# ${p.name}: ${p.componentId} @ (${p.x}, ${p.y}) mm — params: ${JSON.stringify(p.params)}`,
          )
          .join("\n") || "# (no placements)";
    const conns =
      doc.connections
          .map(
            (c) =>
              `# connect ${c.from.placementId}.${c.from.pinName} -> ${c.to.placementId}.${c.to.pinName} via ${c.routeComponentId ?? "RouteMeander"}`,
          )
          .join("\n") || "# (no connections)";
    return {
      language: "python",
      filename: "design_preview.py",
      code: `${header}${body}\n\n${conns}\n`,
    };
  },
  renderDesign: (_doc: DesignDocument): RenderResult => ({
    svg: "",
    viewBox: { x: -4500, y: -3000, w: 9000, h: 6000 },
    units: "um",
    layers: [],
    routes: [],
  }),
};
