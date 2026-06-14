"""
physics/ — IBM-grade superconducting quantum chip physics engine.

Ported from backend2/ prototype. Pure Python, no Flask dependencies.

Modules:
  frequency_planner  — Schneider CPW ε_eff, A/B bipartite qubit coloring,
                       EJ/EC from Koch 2007, 6.3–7.2 GHz resonator band.
  topology_router    — Kamada-Kawai graph-based physical placement solver.
  drc                — 7-rule DRC checker (IBM-style).
  ml_intent          — PyTorch bag-of-words intent classifier + regex fallback.

Public API:
  full_physics_analysis(payload) — run frequency plan + placement + DRC on a
                                    design payload dict from the database.
"""
from __future__ import annotations

from typing import Any


def full_physics_analysis(payload: dict) -> dict[str, Any]:
    """
    Run full physics analysis on a design payload from the DB.

    Accepts a GenerateResponse-like dict (what is stored in Project.design_payload)
    and re-runs the upgraded frequency planner, placement, and DRC on it.

    Returns a dict suitable for Simulation.results.
    """
    from app.services.physics.frequency_planner import FrequencyPlanner
    from app.services.physics.topology_router import place_qubits, placement_to_dict
    from app.services.physics.drc import run_drc
    from app.services.materials import get_physics_substrate

    n = int(payload.get("num_qubits", 4))
    topology = str(payload.get("topology", "grid"))
    substrate_name = payload.get("material", {}).get("substrate", "silicon")

    physics_substrate = get_physics_substrate(substrate_name)

    freq_plan = FrequencyPlanner(n=n, substrate=physics_substrate, topology=topology).plan()
    placement = place_qubits(n, topology=topology)
    pd = placement_to_dict(placement)
    # Normalise x_mm/y_mm → x/y
    for q in pd.get("qubits", []):
        if "x_mm" in q:
            q["x"] = q.pop("x_mm")
            q["y"] = q.pop("y_mm")

    drc_report = run_drc(placement, freq_plan)

    return {
        "engine": "qclang-v3-physics",
        "frequency_plan": {
            "epsilon_eff": freq_plan.epsilon_eff,
            "qubit_frequencies_GHz": {q.name: q.freq_GHz for q in freq_plan.qubits},
            "qubit_groups": {q.name: q.group for q in freq_plan.qubits},
            "EJ_GHz": {q.name: q.EJ_GHz for q in freq_plan.qubits},
            "EC_GHz": {q.name: q.EC_GHz for q in freq_plan.qubits},
            "resonator_frequencies_GHz": {r.name: r.freq_GHz for r in freq_plan.resonators},
            "resonator_lengths_mm": {r.name: r.length_mm for r in freq_plan.resonators},
            "detunings_GHz": {r.name: r.detuning_GHz for r in freq_plan.resonators},
            "warnings": [w.message for w in freq_plan.warnings],
        },
        "placement": pd,
        "drc": drc_report.to_dict(),
        "T1_estimate_us": _estimate_T1(substrate_name, payload.get("material", {}).get("metal", "aluminum")),
        "T2_estimate_us": None,
    }


def _estimate_T1(substrate: str, metal: str) -> float:
    """Rough analytical T1 estimate based on substrate/metal combination."""
    base = {
        "silicon": 80.0,
        "sapphire": 250.0,
        "silicon_nitride": 40.0,
    }.get(substrate, 80.0)
    metal_factor = {
        "tantalum": 1.5,
        "niobium": 1.2,
        "nbtin": 0.8,
        "aluminum": 1.0,
    }.get(metal, 1.0)
    return round(base * metal_factor, 1)
