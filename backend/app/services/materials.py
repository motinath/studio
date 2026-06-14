"""
Single source of truth for all material parameters.

Import this module everywhere instead of using local MATERIALS dicts.
Fixes the epsilon_r discrepancy (11.9 vs 11.45 for silicon) and the
missing cpw_width_um/cpw_gap_um fields in the compiler's copy.
"""
from __future__ import annotations

from typing import Any

MATERIALS: dict[str, dict[str, Any]] = {
    # ── Substrates ──────────────────────────────────────────────────────────
    "silicon": {
        "label": "Silicon (Si)",
        "epsilon_r": 11.45,          # microwave value at 10 mK (IBM/NIST standard)
        "loss_tangent": 1e-6,
        "substrate_thickness_um": 430.0,
        "cpw_width_um": 10.0,
        "cpw_gap_um": 6.0,
        "description": "High-resistivity float-zone silicon — standard CQED substrate",
    },
    "sapphire": {
        "label": "Sapphire (Al₂O₃)",
        "epsilon_r": 9.3,
        "loss_tangent": 3e-8,
        "substrate_thickness_um": 430.0,
        "cpw_width_um": 10.0,
        "cpw_gap_um": 6.0,
        "description": "C-plane sapphire — ultra-low-loss substrate for high-coherence devices",
    },
    "silicon_nitride": {
        "label": "Silicon Nitride (SiN)",
        "epsilon_r": 7.5,
        "loss_tangent": 5e-5,
        "substrate_thickness_um": 300.0,
        "cpw_width_um": 10.0,
        "cpw_gap_um": 6.0,
        "description": "LPCVD Si₃N₄ — used for suspended resonators and KID detectors",
    },
    # ── Metals ──────────────────────────────────────────────────────────────
    "aluminum": {
        "label": "Aluminum (Al)",
        "metal_type": "superconductor",
        "Tc_K": 1.2,
        "london_penetration_depth_nm": 16,
        "sheet_resistance_mOhm": 0.4,
        "description": "Standard superconducting metal — Al Manhattan-junction qubits",
    },
    "niobium": {
        "label": "Niobium (Nb)",
        "metal_type": "superconductor",
        "Tc_K": 9.2,
        "london_penetration_depth_nm": 39,
        "sheet_resistance_mOhm": 0.1,
        "description": "High-Tc superconductor — resonators and transmission lines",
    },
    "tantalum": {
        "label": "Tantalum (Ta)",
        "metal_type": "superconductor",
        "Tc_K": 4.5,
        "london_penetration_depth_nm": 96,
        "sheet_resistance_mOhm": 0.2,
        "description": "α-phase Ta — state-of-the-art coherence (T1 > 300 µs)",
    },
    "nbtin": {
        "label": "Niobium Titanium Nitride (NbTiN)",
        "metal_type": "superconductor",
        "Tc_K": 15.0,
        "london_penetration_depth_nm": 200,
        "sheet_resistance_mOhm": 10.0,
        "description": "High kinetic inductance — KID detectors and SNAIL arrays",
    },
}


def get_material(name: str) -> dict[str, Any]:
    """Return material parameters by name (case-insensitive). Falls back to silicon."""
    return MATERIALS.get(name.lower(), MATERIALS["silicon"])


def get_physics_substrate(name: str) -> dict[str, Any]:
    """Return the subset of material params needed by the physics engine."""
    mat = get_material(name)
    return {
        "epsilon_r":          mat.get("epsilon_r", 11.45),
        "cpw_width_um":       mat.get("cpw_width_um", 10.0),
        "cpw_gap_um":         mat.get("cpw_gap_um", 6.0),
        "substrate_height_um": mat.get("substrate_thickness_um", 430.0),
    }
