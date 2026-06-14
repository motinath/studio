"""
builder.py — Build a DesignGraph from DesignConstraints.

This is the constraint-driven entry point: instead of generating a chip
from a prompt, the builder constructs the graph from structured constraints
so every downstream engine operates within known bounds.
"""

from __future__ import annotations

import math
from typing import Any

from app.constraints.constraints import DesignConstraints
from app.core.design_graph.edge import DesignEdge, EdgeKind
from app.core.design_graph.graph import DesignGraph
from app.core.design_graph.node import (
    CouplerNode, CouplerType, FeedlineNode,
    LaunchpadNode, LaunchpadStyle,
    QubitNode, QubitType, ResonatorNode, ResonatorType,
)


def build_graph_from_constraints(c: DesignConstraints) -> DesignGraph:
    """
    Build a complete DesignGraph from DesignConstraints.

    Steps
    -----
    1. Create qubit nodes (IDs Q1…QN)
    2. Create coupler nodes based on topology
    3. Create readout resonator nodes (one per qubit)
    4. Add a feedline node + launchpads
    5. Wire up all edges
    """
    g = DesignGraph(
        chip_name      = c.chip_name,
        chip_width_mm  = c.chip_width_mm,
        chip_height_mm = c.chip_height_mm,
        substrate      = c.substrate,
        metal          = c.metal,
        topology       = c.topology,
    )

    n = max(1, c.qubit_count)
    qtype = _qubit_type(c.technology)

    # ── 1. Qubits ────────────────────────────────────────────────────────────
    for i in range(n):
        group = "A" if i % 2 == 0 else "B"
        base  = c.freq.qubit_freq_min_ghz + (
            (c.freq.qubit_freq_max_ghz - c.freq.qubit_freq_min_ghz) * 0.25
            if group == "A" else
            (c.freq.qubit_freq_max_ghz - c.freq.qubit_freq_min_ghz) * 0.75
        )
        freq  = round(base + (i * 0.013 % 0.06), 4)
        q = QubitNode(id=f"Q{i+1}", qubit_type=qtype, frequency_ghz=freq, group=group)
        g.add_node(q)

    # ── 2. Couplers ───────────────────────────────────────────────────────────
    coupler_pairs = _topology_pairs(n, c.topology)
    for ci, (a_idx, b_idx) in enumerate(coupler_pairs):
        qa_id = f"Q{a_idx+1}"
        qb_id = f"Q{b_idx+1}"
        coupler = CouplerNode(
            id           = f"C{ci+1}",
            coupler_type = CouplerType.FIXED,
            strength_mhz = 10.0,
            qubit_a_id   = qa_id,
            qubit_b_id   = qb_id,
        )
        g.add_node(coupler)
        g.add_edge(DesignEdge(qa_id, coupler.id, EdgeKind.COUPLING, pin_source="a", pin_target="in"))
        g.add_edge(DesignEdge(coupler.id, qb_id, EdgeKind.COUPLING, pin_source="out", pin_target="b"))

    # ── 3. Readout resonators ─────────────────────────────────────────────────
    ro_base = c.freq.readout_freq_min_ghz
    ro_step = (c.freq.readout_freq_max_ghz - c.freq.readout_freq_min_ghz) / max(n, 1)
    for i in range(n):
        qid = f"Q{i+1}"
        q   = g.get_node(qid)
        q_freq = getattr(q, "frequency_ghz", 5.0)
        r_freq = max(round(ro_base + i * ro_step, 4),
                     round(q_freq + c.freq.min_dispersive_detuning_ghz + 0.1, 4))
        res = ResonatorNode(
            id              = f"RO_Q{i+1}",
            resonator_type  = ResonatorType.READOUT,
            frequency_ghz   = r_freq,
            detuning_ghz    = round(r_freq - q_freq, 4),
            target_qubit_id = qid,
        )
        g.add_node(res)
        g.add_edge(DesignEdge(qid, res.id, EdgeKind.READOUT, pin_source="readout", pin_target="in"))

    # ── 4. Feedline + launchpads ─────────────────────────────────────────────
    fl = FeedlineNode(id="FL1", length_mm=c.chip_width_mm * 0.9)
    g.add_node(fl)
    for i in range(n):
        res_id = f"RO_Q{i+1}"
        g.add_edge(DesignEdge(res_id, fl.id, EdgeKind.FEEDLINE, pin_source="out", pin_target="tap"))

    lp_in  = LaunchpadNode(id="LP_IN",  style=LaunchpadStyle.WIREBOND)
    lp_out = LaunchpadNode(id="LP_OUT", style=LaunchpadStyle.WIREBOND)
    g.add_node(lp_in);  g.add_node(lp_out)
    g.add_edge(DesignEdge(lp_in.id,  fl.id, EdgeKind.IO, pin_source="tie", pin_target="start"))
    g.add_edge(DesignEdge(fl.id, lp_out.id, EdgeKind.IO, pin_source="end", pin_target="tie"))

    return g


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _qubit_type(technology: str) -> QubitType:
    return {
        "transmon":   QubitType.TRANSMON,
        "fluxonium":  QubitType.FLUXONIUM,
        "xmon":       QubitType.XMON,
        "flux_qubit": QubitType.FLUX_QUBIT,
    }.get(technology.lower(), QubitType.TRANSMON)


def _topology_pairs(n: int, topology: str) -> list[tuple[int, int]]:
    """Return 0-indexed qubit index pairs for the given topology."""
    pairs: list[tuple[int, int]] = []
    t = topology.lower()

    if t in ("line", "chain", "linear"):
        for i in range(n - 1):
            pairs.append((i, i + 1))

    elif t == "ring":
        for i in range(n):
            pairs.append((i, (i + 1) % n))

    elif t == "star":
        for i in range(1, n):
            pairs.append((0, i))

    elif t in ("heavy_hex", "heavy-hex"):
        for i in range(n - 1):
            pairs.append((i, i + 1))
        for i in range(0, n - 3, 3):
            if i + 3 < n:
                pairs.append((i, i + 3))

    else:  # grid (default)
        cols = max(2, math.ceil(math.sqrt(n)))
        for i in range(n):
            r, c = divmod(i, cols)
            if c + 1 < cols and i + 1 < n:
                pairs.append((i, i + 1))
            if r + 1 < math.ceil(n / cols) and i + cols < n:
                pairs.append((i, i + cols))

    return pairs
