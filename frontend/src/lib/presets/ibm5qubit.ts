import type { DesignDocument } from "@/lib/bridge/types";

// IBM Quantum Experience 5-qubit "bowtie" topology (ibmq_5_yorktown).
// 5 TransmonPocket qubits connected by RouteMeander CPW resonators.
// Positions in mm — centered at origin, 9mm × 6mm chip.
//
//        Q0
//       /  \
//      Q1   Q2
//       \  /
//        Q3
//        |
//        Q4
//
// Pin connections use the 4-pin TransmonPocket layout: a(left) b(right) c(top) d(bottom)

export const IBM5QubitPreset: DesignDocument = {
  placements: [
    {
      id: "pl_Q0",
      componentId: "TransmonPocket",
      name: "Q0",
      x: 0,
      y: 1.8,
      rotation: 0,
      params: { pad_width: "455um", pad_height: "90um", pad_gap: "30um", pocket_width: "650um", pocket_height: "650um" },
    },
    {
      id: "pl_Q1",
      componentId: "TransmonPocket",
      name: "Q1",
      x: -1.5,
      y: 0,
      rotation: 0,
      params: { pad_width: "455um", pad_height: "90um", pad_gap: "30um", pocket_width: "650um", pocket_height: "650um" },
    },
    {
      id: "pl_Q2",
      componentId: "TransmonPocket",
      name: "Q2",
      x: 1.5,
      y: 0,
      rotation: 0,
      params: { pad_width: "455um", pad_height: "90um", pad_gap: "30um", pocket_width: "650um", pocket_height: "650um" },
    },
    {
      id: "pl_Q3",
      componentId: "TransmonPocket",
      name: "Q3",
      x: 0,
      y: -1.2,
      rotation: 0,
      params: { pad_width: "455um", pad_height: "90um", pad_gap: "30um", pocket_width: "650um", pocket_height: "650um" },
    },
    {
      id: "pl_Q4",
      componentId: "TransmonPocket",
      name: "Q4",
      x: 0,
      y: -2.8,
      rotation: 0,
      params: { pad_width: "455um", pad_height: "90um", pad_gap: "30um", pocket_width: "650um", pocket_height: "650um" },
    },
  ],
  connections: [
    // Q0 ↔ Q1  (Q0.a → Q1.c)
    {
      id: "conn_Q0_Q1",
      from: { placementId: "pl_Q0", pinName: "a" },
      to: { placementId: "pl_Q1", pinName: "c" },
      routeComponentId: "RouteMeander",
      routeOverrides: {},
    },
    // Q0 ↔ Q2  (Q0.b → Q2.c)
    {
      id: "conn_Q0_Q2",
      from: { placementId: "pl_Q0", pinName: "b" },
      to: { placementId: "pl_Q2", pinName: "c" },
      routeComponentId: "RouteMeander",
      routeOverrides: {},
    },
    // Q1 ↔ Q3  (Q1.d → Q3.a)
    {
      id: "conn_Q1_Q3",
      from: { placementId: "pl_Q1", pinName: "d" },
      to: { placementId: "pl_Q3", pinName: "a" },
      routeComponentId: "RouteMeander",
      routeOverrides: {},
    },
    // Q2 ↔ Q3  (Q2.d → Q3.b)
    {
      id: "conn_Q2_Q3",
      from: { placementId: "pl_Q2", pinName: "d" },
      to: { placementId: "pl_Q3", pinName: "b" },
      routeComponentId: "RouteMeander",
      routeOverrides: {},
    },
    // Q3 ↔ Q4  (Q3.d → Q4.c)
    {
      id: "conn_Q3_Q4",
      from: { placementId: "pl_Q3", pinName: "d" },
      to: { placementId: "pl_Q4", pinName: "c" },
      routeComponentId: "RouteMeander",
      routeOverrides: {},
    },
  ],
};
