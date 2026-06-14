"""Physical constants and default configuration for the physics engine.

All energies are in GHz unless otherwise noted.
All times are in seconds internally, converted to µs for output.
"""

from __future__ import annotations

import math
from dataclasses import dataclass



# Physical Constants (SI)


E_CHARGE: float = 1.602176634e-19
"""Elementary charge in Coulombs."""

H_PLANCK: float = 6.62607015e-34
"""Planck constant in J·s."""

HBAR: float = H_PLANCK / (2.0 * math.pi)
"""Reduced Planck constant in J·s."""

PHI0: float = H_PLANCK / (2.0 * E_CHARGE)
"""Magnetic flux quantum Φ₀ = h/(2e) in Wb."""

KB: float = 1.380649e-23
"""Boltzmann constant in J/K."""

RQ: float = H_PLANCK / (4.0 * E_CHARGE**2)
"""Resistance quantum R_Q = h/(4e²) ≈ 6.45 kΩ."""



# Unit Conversion Factors


FF_TO_F: float = 1e-15
"""Femtofarads → Farads."""

NH_TO_H: float = 1e-9
"""Nanohenries → Henries."""

NA_TO_A: float = 1e-9
"""Nanoamps → Amps."""

GHZ_TO_HZ: float = 1e9
"""GHz → Hz."""

MHZ_TO_GHZ: float = 1e-3
"""MHz → GHz."""

US_TO_S: float = 1e-6
"""Microseconds → seconds."""

MK_TO_K: float = 1e-3
"""Millikelvin → Kelvin."""



# scqubits Truncation Defaults


TRANSMON_NCUT: int = 31
"""Charge basis cutoff for Transmon (should be ≈ 2 * (EJ/EC)^(1/4) for convergence)."""

FLUXONIUM_CUTOFF: int = 110
"""Oscillator basis cutoff for Fluxonium."""

EIGENVALUES_COUNT: int = 10
"""Number of eigenvalues to compute for single-qubit analysis."""



# Multi-Qubit Hilbert Space Configuration


@dataclass(frozen=True)
class HilbertSpaceConfig:
    """Configuration for multi-qubit HilbertSpace construction.

    The truncated_dim per subsystem is chosen based on the total
    number of subsystems to keep the Hilbert space dimension manageable.
    """

    max_qubits: int = 5
    """Maximum number of qubits supported."""

    def get_truncated_dim(self, num_subsystems: int) -> int:
        """Get the per-subsystem truncation dimension.

        Balances accuracy vs. computational cost:
        - ≤4 subsystems: dim=4 (good accuracy, dim ≤ 256)
        - 5-6 subsystems: dim=4 (dim ≤ 4096)
        - 7-8 subsystems: dim=3 (dim ≤ 6561)
        - 9-10 subsystems: dim=3 (dim ≤ 59049)
        """
        if num_subsystems <= 6:
            return 4
        return 3


HILBERT_CONFIG = HilbertSpaceConfig()



# Default Noise Parameters


@dataclass(frozen=True)
class DefaultNoiseParams:
    """Default noise environment parameters.

    Represents a typical dilution refrigerator with standard Al-on-Si
    fabrication process.
    """

    temperature_K: float = 0.015
    """Operating temperature in Kelvin (15 mK)."""

    Q_capacitive: float = 1e6
    """Capacitor quality factor (1/tan_δ for dielectric loss)."""

    Q_inductive: float = 500e6
    """Inductor quality factor."""

    flux_noise_amplitude: float = 1e-6
    """1/f flux noise amplitude in Φ₀."""

    charge_noise_amplitude: float = 1e-4
    """1/f charge noise amplitude (dimensionless)."""

    critical_current_noise_amplitude: float = 1e-7
    """1/f critical current noise amplitude."""

    quasiparticle_density: float = 1e-8
    """Normalized quasiparticle density x_qp."""


DEFAULT_NOISE = DefaultNoiseParams()



# Noise Channel Registry


# Maps qubit types to their applicable noise channels.
# Each entry is (channel_name, channel_type) where channel_type is "t1" or "tphi".

T1_CHANNELS: dict[str, list[str]] = {
    "transmon": [
        "t1_capacitive",
        "t1_charge_impedance",
        "t1_quasiparticle_tunneling",
    ],
    "tunable_transmon": [
        "t1_capacitive",
        "t1_charge_impedance",
        "t1_quasiparticle_tunneling",
        "t1_flux_bias_line",
    ],
    "fluxonium": [
        "t1_capacitive",
        "t1_inductive",
        "t1_quasiparticle_tunneling",
        "t1_flux_bias_line",
    ],
}

TPHI_CHANNELS: dict[str, list[str]] = {
    "transmon": [
        "tphi_1_over_f_cc",
        "tphi_1_over_f_ng",
    ],
    "tunable_transmon": [
        "tphi_1_over_f_cc",
        "tphi_1_over_f_flux",
        "tphi_1_over_f_ng",
    ],
    "fluxonium": [
        "tphi_1_over_f_cc",
        "tphi_1_over_f_flux",
    ],
}

# Maps noise channel names to the keyword arguments they accept from NoiseEnvironment.
NOISE_CHANNEL_PARAMS: dict[str, dict[str, str]] = {
    "t1_capacitive": {"T": "temperature_K", "Q_cap": "Q_capacitive"},
    "t1_inductive": {"T": "temperature_K", "Q_ind": "Q_inductive"},
    "t1_charge_impedance": {"T": "temperature_K"},
    "t1_flux_bias_line": {"T": "temperature_K"},
    "t1_quasiparticle_tunneling": {"x_qp": "quasiparticle_density"},
    "tphi_1_over_f_cc": {"A_noise": "critical_current_noise_amplitude"},
    "tphi_1_over_f_flux": {"A_noise": "flux_noise_amplitude"},
    "tphi_1_over_f_ng": {"A_noise": "charge_noise_amplitude"},
}



# Validation Thresholds


MIN_EJ_EC_RATIO_TRANSMON: float = 20.0
"""Minimum EJ/EC ratio for valid transmon approximation."""

MAX_EJ_EC_RATIO_TRANSMON: float = 100.0
"""Maximum recommended EJ/EC for transmon (beyond this, charge dispersion is negligible
but anharmonicity becomes very small)."""

FREQUENCY_COLLISION_TYPES: dict[str, str] = {
    "direct": "f_i ≈ f_j (direct qubit-qubit collision)",
    "straddling": "f_i + f_j ≈ 2·f_k (straddling condition)",
    "two_photon": "2·f_i ≈ f_r (two-photon resonance with resonator)",
    "qubit_resonator": "f_q ≈ f_r (qubit-resonator collision)",
}
