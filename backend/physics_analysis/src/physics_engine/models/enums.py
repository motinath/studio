"""Enumerations used throughout the physics engine."""

from enum import Enum


class QubitType(str, Enum):
    """Supported superconducting qubit types."""

    TRANSMON = "transmon"
    TUNABLE_TRANSMON = "tunable_transmon"
    FLUXONIUM = "fluxonium"


class ValidationStatus(str, Enum):
    """Result status for a physics validation check."""

    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"


class NoiseChannelType(str, Enum):
    """Noise channel identifiers matching scqubits method names."""

    # T1 (depolarization / relaxation) channels
    T1_CAPACITIVE = "t1_capacitive"
    T1_INDUCTIVE = "t1_inductive"
    T1_CHARGE_IMPEDANCE = "t1_charge_impedance"
    T1_FLUX_BIAS_LINE = "t1_flux_bias_line"
    T1_QUASIPARTICLE_TUNNELING = "t1_quasiparticle_tunneling"

    # Tφ (pure dephasing) channels
    TPHI_1_OVER_F_CC = "tphi_1_over_f_cc"
    TPHI_1_OVER_F_FLUX = "tphi_1_over_f_flux"
    TPHI_1_OVER_F_NG = "tphi_1_over_f_ng"


class CouplerType(str, Enum):
    """Types of qubit-qubit coupling."""

    CAPACITIVE = "capacitive"
    INDUCTIVE = "inductive"
    RESONATOR_MEDIATED = "resonator_mediated"


class ResonatorType(str, Enum):
    """Types of resonators."""

    READOUT = "readout"
    BUS = "bus"
    PURCELL_FILTER = "purcell_filter"
