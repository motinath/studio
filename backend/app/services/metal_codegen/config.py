"""
Global configuration for Quantum Studio.

Centralizes all default parameters, fabrication constraints, and system settings
using Pydantic BaseSettings for environment-variable override support.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


# ── Physical Constants ──────────────────────────────────────────────────────

PLANCK_H = 6.62607015e-34          # J·s
PLANCK_HBAR = PLANCK_H / (2 * math.pi)
ELECTRON_CHARGE = 1.602176634e-19  # C
FLUX_QUANTUM = PLANCK_H / (2 * ELECTRON_CHARGE)  # Wb
SPEED_OF_LIGHT = 299_792_458       # m/s
EPSILON_0 = 8.854187817e-12        # F/m

# Substrate properties
SILICON_EPSILON_R = 11.45          # relative permittivity of silicon
SAPPHIRE_EPSILON_R = 9.9           # relative permittivity of sapphire


# ── Fabrication Constraints ─────────────────────────────────────────────────

class FabricationDefaults(BaseModel):
    """Default fabrication constraints for superconducting quantum chips."""

    min_trace_width_um: float = Field(
        default=10.0,
        description="Minimum CPW trace width in micrometers",
    )
    min_gap_um: float = Field(
        default=6.0,
        description="Minimum CPW gap width in micrometers",
    )
    min_spacing_um: float = Field(
        default=50.0,
        description="Minimum spacing between components in micrometers",
    )
    min_junction_area_um2: float = Field(
        default=0.01,
        description="Minimum Josephson junction area in μm²",
    )
    max_junction_area_um2: float = Field(
        default=1.0,
        description="Maximum Josephson junction area in μm²",
    )
    ground_plane_margin_um: float = Field(
        default=200.0,
        description="Margin from chip edge to ground plane in μm",
    )
    default_cpw_trace_um: float = Field(
        default=10.0,
        description="Default CPW center trace width in μm",
    )
    default_cpw_gap_um: float = Field(
        default=6.0,
        description="Default CPW gap width in μm",
    )
    fillet_radius_um: float = Field(
        default=50.0,
        description="Default fillet (bend) radius for CPW routing in μm",
    )


# ── Chip Defaults ───────────────────────────────────────────────────────────

class ChipDefaults(BaseModel):
    """Default chip parameters."""

    width_mm: float = Field(default=10.0, description="Default chip width in mm")
    height_mm: float = Field(default=10.0, description="Default chip height in mm")
    substrate: str = Field(default="silicon", description="Default substrate material")
    metal_layer: str = Field(default="niobium", description="Default metal layer material")
    metal_thickness_nm: float = Field(default=200.0, description="Metal film thickness in nm")


# ── Qubit Parameter Ranges ──────────────────────────────────────────────────

class QubitParameterRanges(BaseModel):
    """Valid ranges for transmon qubit parameters."""

    min_frequency_ghz: float = Field(default=3.5, description="Minimum qubit frequency (GHz)")
    max_frequency_ghz: float = Field(default=8.0, description="Maximum qubit frequency (GHz)")
    min_anharmonicity_mhz: float = Field(
        default=-400.0, description="Min anharmonicity (MHz, negative)"
    )
    max_anharmonicity_mhz: float = Field(
        default=-150.0, description="Max anharmonicity (MHz, negative)"
    )
    typical_ec_mhz: float = Field(default=250.0, description="Typical charging energy Ec (MHz)")
    min_ej_ec_ratio: float = Field(
        default=20.0, description="Minimum Ej/Ec ratio for transmon regime"
    )
    max_ej_ec_ratio: float = Field(
        default=100.0, description="Maximum practical Ej/Ec ratio"
    )


# ── Resonator Parameter Ranges ──────────────────────────────────────────────

class ResonatorParameterRanges(BaseModel):
    """Valid ranges for readout resonator parameters."""

    min_frequency_ghz: float = Field(default=5.0, description="Minimum resonator frequency (GHz)")
    max_frequency_ghz: float = Field(default=10.0, description="Maximum resonator frequency (GHz)")
    min_coupling_mhz: float = Field(default=1.0, description="Minimum coupling strength (MHz)")
    max_coupling_mhz: float = Field(default=200.0, description="Maximum coupling strength (MHz)")
    typical_q_factor: float = Field(default=10000.0, description="Typical quality factor")


# ── Coupler Parameter Ranges ────────────────────────────────────────────────

class CouplerParameterRanges(BaseModel):
    """Valid ranges for qubit-qubit coupler parameters."""

    min_strength_mhz: float = Field(default=0.5, description="Minimum coupling strength (MHz)")
    max_strength_mhz: float = Field(default=50.0, description="Maximum coupling strength (MHz)")


# ── Placement Configuration ─────────────────────────────────────────────────

class PlacementConfig(BaseModel):
    """Configuration for the automatic placement engine."""

    qubit_spacing_mm: float = Field(
        default=2.5,
        description="Default spacing between adjacent qubits in mm",
    )
    resonator_offset_mm: float = Field(
        default=0.8,
        description="Offset of resonator from qubit center in mm",
    )
    feedline_margin_mm: float = Field(
        default=1.5,
        description="Margin from chip edge to feedline in mm",
    )
    max_qubits: int = Field(default=5, description="Maximum supported qubit count")

    # TransmonPocket default dimensions (Qiskit Metal compatible)
    pocket_width_um: float = Field(default=650.0, description="Qubit pocket width in μm")
    pocket_height_um: float = Field(default=325.0, description="Qubit pocket height in μm")
    pad_width_um: float = Field(default=275.0, description="Qubit pad width in μm")
    pad_height_um: float = Field(default=100.0, description="Qubit pad height in μm")
    pad_gap_um: float = Field(default=30.0, description="Gap between qubit pads in μm")


# ── GDS Export Configuration ────────────────────────────────────────────────

class GDSConfig(BaseModel):
    """Configuration for GDS-II export."""

    gds_unit_m: float = Field(default=1e-6, description="GDS database unit in meters (1 μm)")
    gds_precision_m: float = Field(default=1e-9, description="GDS precision in meters (1 nm)")
    layer_metal: int = Field(default=1, description="GDS layer number for metal")
    layer_junction: int = Field(default=2, description="GDS layer number for junctions")
    layer_ground: int = Field(default=3, description="GDS layer number for ground plane")
    layer_keepout: int = Field(default=10, description="GDS layer number for keepout regions")
    layer_annotation: int = Field(default=100, description="GDS layer for annotations")


# ── Top-Level Settings ──────────────────────────────────────────────────────

class QuantumStudioSettings(BaseSettings):
    """
    Top-level application settings.

    All values can be overridden via environment variables prefixed with QS_.
    Example: QS_LOG_LEVEL=DEBUG
    """

    model_config = {"env_prefix": "QS_", "env_nested_delimiter": "__"}

    # General
    log_level: str = Field(default="INFO", description="Logging level")
    output_dir: str = Field(default="./output", description="Default output directory")

    # Sub-configs
    fabrication: FabricationDefaults = Field(default_factory=FabricationDefaults)
    chip: ChipDefaults = Field(default_factory=ChipDefaults)
    qubit_ranges: QubitParameterRanges = Field(default_factory=QubitParameterRanges)
    resonator_ranges: ResonatorParameterRanges = Field(default_factory=ResonatorParameterRanges)
    coupler_ranges: CouplerParameterRanges = Field(default_factory=CouplerParameterRanges)
    placement: PlacementConfig = Field(default_factory=PlacementConfig)
    gds: GDSConfig = Field(default_factory=GDSConfig)

    # Feature flags
    use_metal_backend: bool = Field(
        default=False,
        description="Use Qiskit Metal backend (requires quantum-metal installed)",
    )
    use_gdstk: bool = Field(
        default=True,
        description="Use gdstk for GDS export (falls back to JSON if unavailable)",
    )


def get_settings() -> QuantumStudioSettings:
    """Get application settings (cached singleton)."""
    return QuantumStudioSettings()
