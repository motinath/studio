"""
Physics analysis service (scqubits-style calculations).

Implements:
  - Transmon qubit properties from EJ/EC
  - Coupling strength estimates
  - T1/T2 coherence estimates
  - Purcell effect estimate
  - Anharmonicity

These are analytical approximations — a full Palace/scqubits simulation
would require the actual compiled geometry GDS + FEM solver.
"""

from __future__ import annotations

import math
from typing import Any


def transmon_properties(EJ_GHz: float, EC_GHz: float) -> dict[str, float]:
    """
    Compute key transmon properties from Josephson and charging energies.
    All values in GHz unless stated otherwise.
    """
    # 01 transition frequency (f_01 ≈ sqrt(8*EJ*EC) - EC)
    f_01 = math.sqrt(8.0 * EJ_GHz * EC_GHz) - EC_GHz

    # Anharmonicity (f_12 - f_01 ≈ -EC)
    anharmonicity = -EC_GHz

    # Effective EJ/EC ratio
    ratio = EJ_GHz / EC_GHz if EC_GHz > 0 else 0.0

    # Charge dispersion (exponential suppression for large EJ/EC)
    epsilon_charge = 0.0  # negligible for EJ/EC > 20
    if ratio < 100:
        epsilon_charge = math.exp(-math.sqrt(8 * ratio)) * EJ_GHz

    return {
        "f_01_GHz": round(f_01, 4),
        "anharmonicity_MHz": round(anharmonicity * 1000, 2),
        "EJ_EC_ratio": round(ratio, 2),
        "charge_dispersion_kHz": round(epsilon_charge * 1e6, 3),
    }


def coupling_strength(g_MHz: float, delta_GHz: float) -> dict[str, float]:
    """
    Dispersive coupling regime: qubit-resonator coupling.
    g = coupling strength in MHz, delta = detuning in GHz.
    Returns chi (dispersive shift) and effective coupling.
    """
    g_GHz = g_MHz / 1000.0
    chi = (g_GHz ** 2) / delta_GHz if delta_GHz != 0 else 0.0
    return {
        "g_MHz": g_MHz,
        "detuning_GHz": delta_GHz,
        "chi_MHz": round(chi * 1000, 3),
        "dressed_freq_shift_MHz": round(chi * 1000, 3),
    }


def coherence_estimate(
    substrate: str = "silicon",
    metal: str = "aluminum",
    qubit_freq_GHz: float = 5.0,
) -> dict[str, Any]:
    """
    Estimate T1 and T2 based on substrate and metal choices.
    Values are approximate experimental medians from literature.
    """
    base = {
        "silicon": {"T1": 80, "T2": 120},
        "sapphire": {"T1": 250, "T2": 350},
        "silicon_nitride": {"T1": 30, "T2": 50},
    }.get(substrate, {"T1": 80, "T2": 120})

    metal_factor = {
        "aluminum": 1.0,
        "niobium": 1.3,
        "tantalum": 2.5,
        "nbtin": 0.8,
    }.get(metal, 1.0)

    T1 = base["T1"] * metal_factor
    T2 = base["T2"] * metal_factor

    # Purcell limit estimate (T1_purcell ≈ Q_res / (2π * f_res * κ))
    # Approximate: κ/2π ~ 100 kHz, Q_res ~ 10^6
    T1_purcell = 1e6 / (2 * math.pi * qubit_freq_GHz * 1e9 * 1e5) * 1e6  # µs

    return {
        "T1_us": round(T1, 1),
        "T2_us": round(T2, 1),
        "T2_star_us": round(T2 * 0.7, 1),
        "T1_purcell_us": round(T1_purcell, 1),
        "gate_fidelity_1q_percent": round(100 * (1 - 1e-7 / (T1 * 1e-6)), 4),
        "gate_fidelity_2q_percent": round(100 * (1 - 5e-7 / (T1 * 1e-6)), 4),
        "substrate": substrate,
        "metal": metal,
        "notes": f"Estimates based on published {substrate}/{metal} device data",
    }


def full_physics_analysis(payload: dict[str, Any]) -> dict[str, Any]:
    """Run full physics analysis on a compiled design payload."""
    fp = payload.get("frequency_plan", {})
    substrate = fp.get("substrate", "silicon")
    metal = fp.get("metal", "aluminum")

    qubit_physics: dict[str, Any] = {}
    for q_name, q_freq in fp.get("qubit_frequencies_GHz", {}).items():
        ej = fp.get("EJ_GHz", {}).get(q_name, 13.0)
        ec = fp.get("EC_GHz", {}).get(q_name, 0.28)

        props = transmon_properties(ej, ec)
        coh = coherence_estimate(substrate, metal, q_freq)

        res_name = f"R{q_name[1:]}"  # R0 for Q0
        res_freq = fp.get("resonator_frequencies_GHz", {}).get(res_name, q_freq + 1.5)
        detuning = res_freq - q_freq

        coup = coupling_strength(g_MHz=80.0, delta_GHz=detuning)

        qubit_physics[q_name] = {
            **props,
            **coh,
            "coupling": coup,
        }

    return {
        "qubit_physics": qubit_physics,
        "substrate": substrate,
        "metal": metal,
        "num_qubits": len(qubit_physics),
    }
