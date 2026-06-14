"""
Unit conversion utilities for quantum chip design.

Provides consistent conversion between mm, μm, nm, GHz, MHz, and SI units
used throughout the Quantum Studio pipeline.
"""

from __future__ import annotations

import math
from typing import Union

# ── Length Conversions ───────────────────────────────────────────────────────

def mm_to_m(val: float) -> float:
    """Convert millimeters to meters."""
    return val * 1e-3

def um_to_m(val: float) -> float:
    """Convert micrometers to meters."""
    return val * 1e-6

def nm_to_m(val: float) -> float:
    """Convert nanometers to meters."""
    return val * 1e-9

def m_to_mm(val: float) -> float:
    """Convert meters to millimeters."""
    return val * 1e3

def m_to_um(val: float) -> float:
    """Convert meters to micrometers."""
    return val * 1e6

def mm_to_um(val: float) -> float:
    """Convert millimeters to micrometers."""
    return val * 1e3

def um_to_mm(val: float) -> float:
    """Convert micrometers to millimeters."""
    return val * 1e-3


# ── Frequency Conversions ───────────────────────────────────────────────────

def ghz_to_hz(val: float) -> float:
    """Convert GHz to Hz."""
    return val * 1e9

def mhz_to_hz(val: float) -> float:
    """Convert MHz to Hz."""
    return val * 1e6

def hz_to_ghz(val: float) -> float:
    """Convert Hz to GHz."""
    return val * 1e-9

def hz_to_mhz(val: float) -> float:
    """Convert Hz to MHz."""
    return val * 1e-6

def ghz_to_mhz(val: float) -> float:
    """Convert GHz to MHz."""
    return val * 1e3

def mhz_to_ghz(val: float) -> float:
    """Convert MHz to GHz."""
    return val * 1e-3


# ── Angular Frequency ───────────────────────────────────────────────────────

def freq_to_angular(freq_hz: float) -> float:
    """Convert frequency (Hz) to angular frequency (rad/s)."""
    return 2.0 * math.pi * freq_hz

def angular_to_freq(omega: float) -> float:
    """Convert angular frequency (rad/s) to frequency (Hz)."""
    return omega / (2.0 * math.pi)


# ── Energy Conversions ──────────────────────────────────────────────────────

PLANCK_H = 6.62607015e-34  # J·s

def freq_to_energy(freq_hz: float) -> float:
    """Convert frequency (Hz) to energy (Joules): E = h·f."""
    return PLANCK_H * freq_hz

def energy_to_freq(energy_j: float) -> float:
    """Convert energy (Joules) to frequency (Hz): f = E/h."""
    return energy_j / PLANCK_H

def ghz_to_energy(freq_ghz: float) -> float:
    """Convert frequency (GHz) to energy (Joules)."""
    return freq_to_energy(ghz_to_hz(freq_ghz))


# ── Qiskit Metal Unit Strings ───────────────────────────────────────────────

def to_metal_str(value_mm: float) -> str:
    """
    Convert a value in mm to a Qiskit Metal option string.

    Example: 2.5 -> '2.5mm', -1.0 -> '-1.0mm'
    """
    return f"{value_mm}mm"

def to_metal_um_str(value_um: float) -> str:
    """
    Convert a value in μm to a Qiskit Metal option string.

    Example: 650 -> '650um'
    """
    return f"{value_um}um"


# ── String Parsing ──────────────────────────────────────────────────────────

def parse_length_to_mm(value: Union[str, float]) -> float:
    """
    Parse a length string with units to millimeters.

    Supported formats: '10mm', '650um', '200nm', or plain float (assumed mm).
    """
    if isinstance(value, (int, float)):
        return float(value)

    value = value.strip().lower()

    if value.endswith("mm"):
        return float(value[:-2])
    elif value.endswith("um"):
        return float(value[:-2]) * 1e-3
    elif value.endswith("nm"):
        return float(value[:-2]) * 1e-6
    elif value.endswith("m"):
        return float(value[:-1]) * 1e3
    else:
        # Try parsing as plain number (assume mm)
        return float(value)


def parse_frequency_to_ghz(value: Union[str, float]) -> float:
    """
    Parse a frequency string with units to GHz.

    Supported formats: '5.0GHz', '330MHz', '5e9Hz', or plain float (assumed GHz).
    """
    if isinstance(value, (int, float)):
        return float(value)

    value = value.strip()
    lower = value.lower()

    if lower.endswith("ghz"):
        return float(value[:-3])
    elif lower.endswith("mhz"):
        return float(value[:-3]) * 1e-3
    elif lower.endswith("hz"):
        return float(value[:-2]) * 1e-9
    else:
        return float(value)
