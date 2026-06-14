"""
serializer.py — Convert DesignGraph ↔ plain dict (JSON-serialisable).

Used by:
  - API endpoints (return graph as JSON)
  - Database storage (store graph in project.design_payload)
  - Frontend canvas (receive/send graph as JSON)
"""

from __future__ import annotations

from typing import Any

from app.core.design_graph.edge import DesignEdge, EdgeKind
from app.core.design_graph.graph import DesignGraph
from app.core.design_graph.node import (
    NodeKind, QubitNode, CouplerNode, ResonatorNode,
    FeedlineNode, LaunchpadNode,
    QubitType, CouplerType, ResonatorType, LaunchpadStyle,
)


def graph_to_dict(g: DesignGraph) -> dict[str, Any]:
    """Serialise a DesignGraph to a JSON-friendly dict."""
    return {
        "chip_name":      g.chip_name,
        "chip_width_mm":  g.chip_width_mm,
        "chip_height_mm": g.chip_height_mm,
        "substrate":      g.substrate,
        "metal":          g.metal,
        "topology":       g.topology,
        "nodes":          [n.to_dict() for n in g.nodes],
        "edges":          [e.to_dict() for e in g.edges],
        "stats":          g.stats(),
    }


def dict_to_graph(d: dict[str, Any]) -> DesignGraph:
    """Deserialise a dict produced by graph_to_dict() back into a DesignGraph."""
    g = DesignGraph(
        chip_name      = d.get("chip_name", "QuantumChip"),
        chip_width_mm  = float(d.get("chip_width_mm", 10.0)),
        chip_height_mm = float(d.get("chip_height_mm", 10.0)),
        substrate      = d.get("substrate", "silicon"),
        metal          = d.get("metal", "aluminum"),
        topology       = d.get("topology", "grid"),
    )

    for nd in d.get("nodes", []):
        node = _node_from_dict(nd)
        if node is not None:
            g.add_node(node)

    for ed in d.get("edges", []):
        try:
            g.add_edge(DesignEdge.from_dict(ed))
        except (ValueError, KeyError):
            pass  # skip edges referencing nodes that weren't deserialised

    return g


def _node_from_dict(d: dict[str, Any]) -> Any:
    kind = d.get("kind")
    nid  = d.get("id", "")
    x    = d.get("x_mm")
    y    = d.get("y_mm")
    ori  = int(d.get("orientation_deg", 0))

    if kind == NodeKind.QUBIT.value:
        n = QubitNode(
            id              = nid,
            qubit_type      = QubitType(d.get("qubit_type", "transmon")),
            frequency_ghz   = float(d.get("frequency_ghz", 5.0)),
            anharmonicity_ghz = float(d.get("anharmonicity_ghz", -0.340)),
            ej_ghz          = float(d.get("ej_ghz", 0.0)),
            ec_ghz          = float(d.get("ec_ghz", 0.0)),
            group           = d.get("group", "A"),
            t1_us           = float(d.get("t1_us", 0.0)),
            t2_us           = float(d.get("t2_us", 0.0)),
        )
        n.x_mm = x; n.y_mm = y; n.orientation_deg = ori
        return n

    if kind == NodeKind.COUPLER.value:
        n = CouplerNode(
            id           = nid,
            coupler_type = CouplerType(d.get("coupler_type", "fixed")),
            strength_mhz = float(d.get("strength_mhz", 10.0)),
            qubit_a_id   = d.get("qubit_a_id", ""),
            qubit_b_id   = d.get("qubit_b_id", ""),
        )
        n.x_mm = x; n.y_mm = y; n.orientation_deg = ori
        return n

    if kind == NodeKind.RESONATOR.value:
        n = ResonatorNode(
            id              = nid,
            resonator_type  = ResonatorType(d.get("resonator_type", "readout")),
            frequency_ghz   = float(d.get("frequency_ghz", 6.5)),
            length_mm       = float(d.get("length_mm", 7.5)),
            detuning_ghz    = float(d.get("detuning_ghz", 1.5)),
            target_qubit_id = d.get("target_qubit_id", ""),
        )
        n.x_mm = x; n.y_mm = y; n.orientation_deg = ori
        return n

    if kind == NodeKind.FEEDLINE.value:
        n = FeedlineNode(
            id          = nid,
            length_mm   = float(d.get("length_mm", 10.0)),
            cpw_width_um = float(d.get("cpw_width_um", 10.0)),
            cpw_gap_um  = float(d.get("cpw_gap_um", 6.0)),
        )
        n.x_mm = x; n.y_mm = y; n.orientation_deg = ori
        return n

    if kind == NodeKind.LAUNCHPAD.value:
        n = LaunchpadNode(
            id          = nid,
            style       = LaunchpadStyle(d.get("style", "wirebond")),
            pad_width_um = float(d.get("pad_width_um", 300.0)),
        )
        n.x_mm = x; n.y_mm = y; n.orientation_deg = ori
        return n

    return None  # unknown kind — skip silently
