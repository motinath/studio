"""
pipeline.py — Orchestrate all routing stages into a RouteResult.

route_design(graph, constraints) is the single entry point for all routing.
"""

from __future__ import annotations

from typing import Any

from app.routing.cpw_router import CPWRouter
from app.routing.feedline_router import FeedlineRouter
from app.routing.resonator_router import ResonatorRouter
from app.routing.result import RouteResult


def route_design(graph, constraints) -> RouteResult:
    """
    Run full routing pipeline on a placed DesignGraph.

    Parameters
    ----------
    graph       : app.core.design_graph.DesignGraph  (qubits must be placed)
    constraints : app.constraints.DesignConstraints

    Returns
    -------
    RouteResult with coupler_routes, resonator_routes, feedline_routes.
    """
    result   = RouteResult()
    warnings = result.warnings

    # ── Build position dict ───────────────────────────────────────────────────
    qpos = {}
    for q in graph.qubits:
        if q.placed:
            qpos[q.id] = (q.x_mm, q.y_mm)
        else:
            warnings.append(f"Qubit '{q.id}' has no placement — skipped in routing")
            result.unrouted.append(q.id)

    if not qpos:
        warnings.append("No placed qubits — routing skipped")
        return result

    # ── Stage 1: CPW coupler routes ───────────────────────────────────────────
    coupler_pairs = [(c.qubit_a_id, c.qubit_b_id) for c in graph.couplers
                     if c.qubit_a_id in qpos and c.qubit_b_id in qpos]
    if coupler_pairs:
        cpw_r = CPWRouter(
            qubit_positions = qpos,
            coupler_pairs   = coupler_pairs,
            cpw_width_um    = constraints.fab.min_cpw_width_um * 2,
            cpw_gap_um      = constraints.fab.min_cpw_gap_um * 1.5,
            pocket_half_mm  = constraints.fab.pocket_half_size_mm,
        )
        result.coupler_routes = cpw_r.route()
    else:
        warnings.append("No coupler pairs to route")

    # ── Stage 2: Resonator meander routes ─────────────────────────────────────
    res_map = {}
    for res in graph.resonators:
        if res.target_qubit_id in qpos:
            res_map[res.id] = (res.target_qubit_id, res.length_mm)

    if res_map:
        res_r = ResonatorRouter(
            qubit_positions = qpos,
            resonator_map   = res_map,
            cpw_width_um    = constraints.fab.min_cpw_width_um * 2,
            cpw_gap_um      = constraints.fab.min_cpw_gap_um * 1.5,
            pocket_half_mm  = constraints.fab.pocket_half_size_mm,
        )
        result.resonator_routes = res_r.route()
    else:
        warnings.append("No resonators to route")

    # ── Stage 3: Feedline ─────────────────────────────────────────────────────
    res_endpoints = [
        seg.end for seg in result.resonator_routes
    ]
    if res_endpoints:
        fl_r = FeedlineRouter(
            chip_width_mm        = graph.chip_width_mm,
            chip_height_mm       = graph.chip_height_mm,
            resonator_endpoints  = res_endpoints,
            cpw_width_um         = constraints.fab.min_cpw_width_um * 2,
            cpw_gap_um           = constraints.fab.min_cpw_gap_um * 1.5,
        )
        fl_segs, fl_y = fl_r.route()
        result.feedline_routes = fl_segs
    else:
        warnings.append("No resonator endpoints — feedline routing skipped")

    return result


def route_from_placement_dict(placement: dict, constraints_dict: dict | None = None) -> dict[str, Any]:
    """
    Backward-compatible routing from a legacy placement dict.
    Returns a RouteResult dict suitable for API responses.
    """
    from app.constraints.constraints import DesignConstraints
    from app.core.design_graph.graph import DesignGraph
    from app.core.design_graph.node import QubitNode, CouplerNode, ResonatorNode

    c = DesignConstraints.from_dict(constraints_dict or {})
    g = DesignGraph(
        chip_name      = "RoutedChip",
        chip_width_mm  = c.chip_width_mm,
        chip_height_mm = c.chip_height_mm,
        substrate      = c.substrate,
        metal          = c.metal,
        topology       = c.topology,
    )

    # Add placed qubits
    for q in placement.get("qubits", []):
        name = q.get("name", "Q?")
        node = QubitNode(id=name, frequency_ghz=5.0)
        node.x_mm = float(q.get("x", q.get("x_mm", 0.0)))
        node.y_mm = float(q.get("y", q.get("y_mm", 0.0)))
        try:
            g.add_node(node)
        except ValueError:
            pass

    # Add couplers
    for i, e in enumerate(placement.get("edges", [])):
        qa = e.get("qubit_a", "")
        qb = e.get("qubit_b", "")
        from app.core.design_graph.node import CouplerNode
        coupler = CouplerNode(id=f"C{i+1}", qubit_a_id=qa, qubit_b_id=qb)
        try:
            g.add_node(coupler)
        except ValueError:
            pass

    result = route_design(g, c)
    return result.to_dict()
