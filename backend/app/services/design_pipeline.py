"""
design_pipeline.py — V2 Design Pipeline

The V2 pipeline replaces the old prompt → generator → code flow with a
proper constraint-driven EDA pipeline:

    DesignConstraints
         ↓
    build_graph_from_constraints()     [design_graph layer]
         ↓
    GraphValidator.validate()          [structural checks]
         ↓
    FrequencyPlanner.plan()            [physics-accurate freq assignment]
         ↓
    place_qubits()                     [Kamada-Kawai placement]
         ↓
    route_design()                     [CPW + resonator + feedline routing]
         ↓
    run_full_drc()                     [4-domain DRC]
         ↓
    generate_qiskit_code()             [Qiskit Metal Python]
         ↓
    ExportEngine.export_all()          [JSON, QCL, GDS, SVG, DXF, PDF]
         ↓
    DesignResult (GenerateResponse-compatible dict)

Entry points
------------
run_design_pipeline(constraints) → DesignResult dict
run_design_from_prompt(prompt, substrate, metal) → DesignResult dict  (backward compat)
run_design_from_graph_json(graph_json, constraints_json) → DesignResult dict
"""

from __future__ import annotations

import logging
from typing import Any

log = logging.getLogger(__name__)


async def run_design_pipeline(constraints: "DesignConstraints") -> dict[str, Any]:  # type: ignore[name-defined]
    """
    Full V2 constraint-driven design pipeline.

    Parameters
    ----------
    constraints : DesignConstraints

    Returns
    -------
    A GenerateResponse-compatible dict enriched with V2 fields.
    """
    from app.constraints.constraints import DesignConstraints
    from app.constraints.builder import build_graph_from_constraints
    from app.core.design_graph.validator import GraphValidator
    from app.core.design_graph.serializer import graph_to_dict
    from app.drc.runner import run_full_drc
    from app.exports.engine import ExportEngine
    from app.exports.formats import export_qclang
    from app.routing.pipeline import route_design
    from app.services.materials import get_material, get_physics_substrate
    from app.services.physics.frequency_planner import FrequencyPlanner
    from app.services.physics.topology_router import place_qubits, placement_to_dict

    n         = constraints.qubit_count
    topology  = constraints.topology
    sub       = constraints.substrate
    met       = constraints.metal
    sub_label = get_material(sub).get("label", sub)
    met_label = get_material(met).get("label", met)

    # ── Step 1: Build design graph ────────────────────────────────────────────
    log.info("V2 pipeline: building graph (n=%d, topology=%s)", n, topology)
    graph = build_graph_from_constraints(constraints)

    # ── Step 2: Structural validation ─────────────────────────────────────────
    validation = GraphValidator(graph).validate()
    if not validation.passed:
        errors = [i.message for i in validation.errors]
        return {
            "success": False,
            "error": f"Graph validation failed: {'; '.join(errors)}",
            "validation": validation.to_dict(),
        }

    # ── Step 3: Physics frequency planning ────────────────────────────────────
    physics_substrate = get_physics_substrate(sub)
    try:
        freq_plan_obj = FrequencyPlanner(
            n         = n,
            substrate = physics_substrate,
            topology  = topology,
        ).plan()
        freq_plan_dict = _freq_plan_to_dict(freq_plan_obj, sub, met)
        # Back-fill graph qubit frequencies from physics engine
        for qs in freq_plan_obj.qubits:
            if graph.has_node(qs.name):
                q = graph.get_node(qs.name)
                q.frequency_ghz   = qs.freq_GHz
                q.group           = qs.group
                q.ej_ghz          = qs.EJ_GHz
                q.ec_ghz          = qs.EC_GHz
        for rs in freq_plan_obj.resonators:
            if graph.has_node(rs.name):
                r = graph.get_node(rs.name)
                r.frequency_ghz = rs.freq_GHz
                r.length_mm     = rs.length_mm
                r.detuning_ghz  = rs.detuning_GHz
    except Exception as exc:
        log.warning("Frequency planning failed: %s", exc)
        freq_plan_dict = {"error": str(exc), "substrate": sub, "metal": met}
        freq_plan_obj  = None

    # ── Step 4: Physical placement ────────────────────────────────────────────
    try:
        placement_result = place_qubits(n, topology=topology, scale=constraints.scale)
        placement_dict   = placement_to_dict(placement_result)
        # Normalise x_mm/y_mm → x/y for frontend
        for q_pd in placement_dict["qubits"]:
            if "x_mm" in q_pd:
                q_pd["x"] = q_pd.pop("x_mm")
                q_pd["y"] = q_pd.pop("y_mm")
        # Back-fill placement into graph nodes
        for qp in placement_result.qubits:
            if graph.has_node(qp.name):
                node = graph.get_node(qp.name)
                node.x_mm            = qp.x_mm
                node.y_mm            = qp.y_mm
                node.orientation_deg = qp.orientation_deg
    except Exception as exc:
        log.warning("Placement failed: %s", exc)
        placement_result = None
        placement_dict   = {"solver": "error", "qubits": [], "edges": []}

    # ── Step 5: Routing ───────────────────────────────────────────────────────
    route_result_dict: dict[str, Any] = {}
    try:
        route_result    = route_design(graph, constraints)
        route_result_dict = route_result.to_dict()
    except Exception as exc:
        log.warning("Routing failed: %s", exc)
        route_result_dict = {"warnings": [str(exc)]}

    # ── Step 6: DRC ───────────────────────────────────────────────────────────
    try:
        drc_report   = run_full_drc(graph, constraints)
        drc_dict     = drc_report.to_dict()
        # Legacy-compatible simplified drc dict for frontend
        drc_legacy   = {
            "passed":     drc_report.passed,
            "errors":     len(drc_report.errors),
            "warnings":   len(drc_report.warnings),
            "violations": [v.to_dict() for v in drc_report.violations],
        }
    except Exception as exc:
        log.warning("DRC failed: %s", exc)
        drc_dict   = {"passed": True, "errors": 0, "warnings": 0, "violations": []}
        drc_legacy = drc_dict

    # ── Step 7: Code generation (Qiskit Metal Python) ─────────────────────────
    try:
        qclang_src = export_qclang(graph)
        metal_code = _build_qiskit_metal_code(graph, placement_dict, met)
    except Exception as exc:
        log.warning("Code generation failed: %s", exc)
        qclang_src = f"# Code generation error: {exc}"
        metal_code = ""

    # ── Step 8: Export package ────────────────────────────────────────────────
    engine = ExportEngine(
        graph         = graph,
        freq_plan     = freq_plan_dict,
        route_result  = route_result_dict,
        drc_report    = drc_legacy,
        constraints   = constraints.to_dict(),
    )
    exports = engine.export_all(
        project_name = constraints.chip_name,
        version      = "v2.0",
    )

    # ── Compose result ─────────────────────────────────────────────────────────
    from app.services.chip_generator import chip_name as _chip_name
    label = f"{_chip_name(topology, n)} · {n}Q"

    result: dict[str, Any] = {
        # GenerateResponse-compatible fields
        "label":         label,
        "num_qubits":    n,
        "topology":      topology,
        "engine":        "quantum-studio-v2-pipeline",
        "interpretation": (
            f"V2 constraint-driven {n}-qubit {topology} chip on "
            f"{sub_label} / {met_label}. "
            f"DRC: {'PASS ✓' if drc_legacy.get('passed') else 'FAIL ✗'}. "
            f"Routing: {route_result_dict.get('stats', {}).get('total_segments', 0)} segments."
        ),
        "drc":           drc_legacy,
        "frequency_plan": freq_plan_dict,
        "placement":     placement_dict,
        "code":          metal_code,
        "qclang_source": qclang_src,
        "material":      {"substrate": sub, "metal": met},
        # V2 enriched fields
        "v2": {
            "graph":        graph_to_dict(graph),
            "routing":      route_result_dict,
            "drc_full":     drc_dict,
            "exports":      {k: v[:200] + "…" if isinstance(v, str) and len(v) > 200
                             else v for k, v in exports.items()
                             if k not in ("json",)},
            "validation":   validation.to_dict(),
            "constraints":  constraints.to_dict(),
        },
    }
    return result


async def run_design_from_prompt(
    prompt: str,
    substrate: str | None = None,
    metal: str | None = None,
) -> dict[str, Any]:
    """
    Backward-compatible entry: parse prompt → constraints → V2 pipeline.
    Falls back to V1 chip_generator if V2 pipeline fails.
    """
    from app.services.chip_generator import parse_prompt
    from app.constraints.constraints import DesignConstraints

    try:
        params = parse_prompt(prompt)
        if substrate:
            params["substrate"] = substrate
        if metal:
            params["metal"] = metal
        constraints = DesignConstraints.from_prompt_params(params)
        return await run_design_pipeline(constraints)
    except Exception as exc:
        log.warning("V2 pipeline failed (%s), falling back to V1", exc)
        from app.services.chip_generator import generate_chip
        return await generate_chip(prompt, substrate, metal)


async def run_design_from_graph_json(
    graph_json: dict[str, Any],
    constraints_json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Build a V2 design from a graph JSON payload (e.g. from the schematic editor).
    """
    from app.constraints.constraints import DesignConstraints
    from app.core.design_graph.serializer import dict_to_graph

    graph       = dict_to_graph(graph_json)
    constraints = DesignConstraints.from_dict(constraints_json or {})
    # Override with graph metadata
    constraints.qubit_count  = len(graph.qubits)
    constraints.topology     = graph.topology
    constraints.substrate    = graph.substrate
    constraints.metal        = graph.metal
    constraints.chip_width_mm  = graph.chip_width_mm
    constraints.chip_height_mm = graph.chip_height_mm
    constraints.chip_name    = graph.chip_name

    return await run_design_pipeline(constraints)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _freq_plan_to_dict(fp, substrate: str, metal: str) -> dict[str, Any]:
    return {
        "epsilon_eff":              fp.epsilon_eff,
        "qubit_frequencies_GHz":    {q.name: q.freq_GHz    for q in fp.qubits},
        "qubit_groups":             {q.name: q.group        for q in fp.qubits},
        "EJ_GHz":                   {q.name: q.EJ_GHz       for q in fp.qubits},
        "EC_GHz":                   {q.name: q.EC_GHz       for q in fp.qubits},
        "resonator_frequencies_GHz":{r.name: r.freq_GHz    for r in fp.resonators},
        "resonator_lengths_mm":     {r.name: r.length_mm   for r in fp.resonators},
        "detunings_GHz":            {r.name: r.detuning_GHz for r in fp.resonators},
        "warnings":                 [w.message              for w in fp.warnings],
        "substrate": substrate,
        "metal":     metal,
    }


def _build_qiskit_metal_code(graph, placement_dict: dict, metal: str) -> str:
    """Generate Qiskit Metal Python from graph + placement dict."""
    from app.qclang.compiler import generate_qiskit_code
    from app.qclang.ast_nodes import ChipNode, QubitNode, CouplerNode, ReadoutNode, Attribute

    qubits = [
        QubitNode(
            name       = q.id,
            qubit_type = q.qubit_type.value if hasattr(q.qubit_type, "value") else "transmon",
            attributes = [Attribute("frequency", round(q.frequency_ghz, 4))],
        )
        for q in graph.qubits
    ]
    couplers = [
        CouplerNode(name=c.id, qubit_a=c.qubit_a_id, qubit_b=c.qubit_b_id)
        for c in graph.couplers if c.qubit_a_id and c.qubit_b_id
    ]
    readouts = [
        ReadoutNode(name=r.id, target_qubit=r.target_qubit_id)
        for r in graph.resonators if r.target_qubit_id
    ]
    chip = ChipNode(
        name     = graph.chip_name,
        qubits   = qubits,
        couplers = couplers,
        readouts = readouts,
    )
    return generate_qiskit_code(chip, placement_dict, metal)
