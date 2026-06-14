"""
runner.py — Orchestrate all DRC domains into a single report.

run_full_drc()       — takes a DesignGraph + DesignConstraints
run_drc_from_payload() — takes a legacy GenerateResponse dict (backward compat)
"""

from __future__ import annotations

from typing import Any

from app.drc.connectivity_drc import ConnectivityDRC
from app.drc.fabrication_drc import FabricationDRC
from app.drc.frequency_drc import FrequencyDRC
from app.drc.geometry_drc import GeometryDRC
from app.drc.report import DRCReport, DRCViolation


def run_full_drc(graph, constraints) -> DRCReport:
    """
    Run all four DRC domains against a DesignGraph + DesignConstraints.

    Parameters
    ----------
    graph       : app.core.design_graph.DesignGraph
    constraints : app.constraints.DesignConstraints

    Returns
    -------
    DRCReport with violations grouped by domain.
    """
    from app.core.design_graph.node import NodeKind

    violations: list[DRCViolation] = []
    fab = constraints.fab
    freq_c = constraints.freq

    # ── Geometry ─────────────────────────────────────────────────────────────
    qubit_pos = {
        q.id: (q.x_mm or 0.0, q.y_mm or 0.0)
        for q in graph.qubits if q.placed
    }
    if qubit_pos:
        coupler_pairs = [
            (c.qubit_a_id, c.qubit_b_id)
            for c in graph.couplers
        ]
        geo = GeometryDRC(
            qubit_positions  = qubit_pos,
            chip_width_mm    = graph.chip_width_mm,
            chip_height_mm   = graph.chip_height_mm,
            pocket_half_mm   = fab.pocket_half_size_mm,
            min_spacing_mm   = fab.min_qubit_spacing_mm,
            min_clr_res_mm   = fab.min_resonator_gap_mm,
            coupler_pairs    = coupler_pairs,
        )
        violations.extend(geo.run())

    # ── Frequency ────────────────────────────────────────────────────────────
    qubit_freqs = {q.id: q.frequency_ghz for q in graph.qubits}
    res_freqs   = {r.id: r.frequency_ghz for r in graph.resonators}
    qr_map      = {r.target_qubit_id: r.id for r in graph.resonators if r.target_qubit_id}
    coupling_graph = graph.connectivity_matrix()

    if qubit_freqs:
        fdrc = FrequencyDRC(
            qubit_freqs          = qubit_freqs,
            resonator_freqs      = res_freqs,
            qubit_resonator_map  = qr_map,
            coupling_graph       = coupling_graph,
            min_qubit_detuning_mhz   = freq_c.min_qubit_detuning_mhz,
            min_global_detuning_mhz  = freq_c.min_qubit_detuning_mhz / 2,
            min_readout_sep_mhz      = freq_c.min_readout_detuning_mhz,
            min_dispersive_ghz       = freq_c.min_dispersive_detuning_ghz,
            max_dispersive_ghz       = freq_c.max_dispersive_detuning_ghz,
            qubit_band_ghz           = (freq_c.qubit_freq_min_ghz, freq_c.qubit_freq_max_ghz),
            readout_band_ghz         = (freq_c.readout_freq_min_ghz, freq_c.readout_freq_max_ghz),
        )
        violations.extend(fdrc.run())

    # ── Fabrication ───────────────────────────────────────────────────────────
    from app.services.materials import get_material
    mat = get_material(graph.substrate)
    fabdrc = FabricationDRC(
        substrate      = graph.substrate,
        metal          = graph.metal,
        cpw_width_um   = mat.get("cpw_width_um", 10.0),
        cpw_gap_um     = mat.get("cpw_gap_um", 6.0),
        bend_radius_um = fab.min_bend_radius_um * 2,   # design value is 2× minimum
        rules_override = {
            "min_cpw_width_um":   fab.min_cpw_width_um,
            "min_cpw_gap_um":     fab.min_cpw_gap_um,
            "min_bend_radius_um": fab.min_bend_radius_um,
        },
    )
    violations.extend(fabdrc.run())

    # ── Connectivity ──────────────────────────────────────────────────────────
    resonator_map   = {r.id: r.target_qubit_id for r in graph.resonators}
    coupler_pairs_c = [(c.qubit_a_id, c.qubit_b_id) for c in graph.couplers]
    feedline_taps   = {fl.id: [r.id for r in graph.resonators] for fl in graph.feedlines}
    lp_feeds        = {fl.id: [lp.id for lp in graph.launchpads] for fl in graph.feedlines}

    condrc = ConnectivityDRC(
        qubit_ids       = [q.id for q in graph.qubits],
        coupler_edges   = coupler_pairs_c,
        resonator_map   = resonator_map,
        feedline_taps   = feedline_taps,
        launchpad_feeds = lp_feeds,
    )
    violations.extend(condrc.run())

    return DRCReport(violations=violations)


def run_drc_from_payload(payload: dict[str, Any]) -> DRCReport:
    """
    Backward-compatible DRC that runs against a legacy GenerateResponse dict.
    Used by the /api/verification/check endpoint.
    """
    violations: list[DRCViolation] = []

    fp        = payload.get("frequency_plan", {})
    placement = payload.get("placement", {})
    material  = payload.get("material", {})
    substrate = material.get("substrate", fp.get("substrate", "silicon"))
    metal     = material.get("metal",     fp.get("metal",     "aluminum"))

    # ── Geometry (from placement) ─────────────────────────────────────────────
    qubits_raw = placement.get("qubits", [])
    qubit_pos  = {
        q.get("name", f"Q{i+1}"): (
            float(q.get("x", q.get("x_mm", 0))),
            float(q.get("y", q.get("y_mm", 0))),
        )
        for i, q in enumerate(qubits_raw)
    }
    chip_size = float(payload.get("chip_size_mm", 10.0))
    if qubit_pos:
        geo = GeometryDRC(
            qubit_positions = qubit_pos,
            chip_width_mm   = chip_size,
            chip_height_mm  = chip_size,
        )
        violations.extend(geo.run())

    # ── Frequency (from frequency_plan) ──────────────────────────────────────
    qfreqs = fp.get("qubit_frequencies_GHz", {})
    rfreqs = fp.get("resonator_frequencies_GHz", {})
    detunings = fp.get("detunings_GHz", {})
    # Build qubit-resonator map: RO_Q1 → Q1
    qr_map = {
        rname.replace("RO_", ""): rname
        for rname in rfreqs
    }
    # Build coupling graph from placement edges
    edges   = placement.get("edges", [])
    cg: dict[str, list[str]] = {q: [] for q in qfreqs}
    for e in edges:
        qa = e.get("qubit_a", "")
        qb = e.get("qubit_b", "")
        if qa in cg:
            cg[qa].append(qb)
        if qb in cg:
            cg[qb].append(qa)

    if qfreqs:
        fdrc = FrequencyDRC(
            qubit_freqs         = qfreqs,
            resonator_freqs     = rfreqs,
            qubit_resonator_map = qr_map,
            coupling_graph      = cg,
        )
        violations.extend(fdrc.run())

    # ── Fabrication ───────────────────────────────────────────────────────────
    from app.services.materials import get_material
    mat = get_material(substrate)
    fabdrc = FabricationDRC(
        substrate    = substrate,
        metal        = metal,
        cpw_width_um = mat.get("cpw_width_um", 10.0),
        cpw_gap_um   = mat.get("cpw_gap_um", 6.0),
    )
    violations.extend(fabdrc.run())

    # ── Connectivity ──────────────────────────────────────────────────────────
    coupler_pairs_c = [
        (e.get("qubit_a", ""), e.get("qubit_b", "")) for e in edges
    ]
    resonator_map_c = {r: r.replace("RO_", "") for r in rfreqs}
    condrc = ConnectivityDRC(
        qubit_ids       = list(qfreqs.keys()),
        coupler_edges   = coupler_pairs_c,
        resonator_map   = resonator_map_c,
        feedline_taps   = {},
        launchpad_feeds = {},
    )
    violations.extend(condrc.run())

    return DRCReport(violations=violations)
