"""
Readout resonator model for superconducting quantum chip design.

Computes physical resonator length from the target frequency using the
coplanar-waveguide (CPW) dispersion relation.  The effective dielectric
constant for a CPW on silicon is:

    ε_eff = (1 + ε_r) / 2 ≈ (1 + 11.45) / 2 = 6.225

The half-wave resonator length is then:

    L = c / (2 · f · √ε_eff)
"""

from __future__ import annotations

import math
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.services.metal_codegen.config import SPEED_OF_LIGHT, SILICON_EPSILON_R
from app.services.metal_codegen.utils.logging import get_logger
from app.services.metal_codegen.utils.units import um_to_mm, to_metal_um_str

logger = get_logger("models.resonator")

# Effective permittivity for CPW on silicon (quasi-TEM approximation)
_EPSILON_EFF_SILICON: float = (1.0 + SILICON_EPSILON_R) / 2.0  # ≈ 6.225


class Resonator(BaseModel):
    """Half-wave coplanar-waveguide readout resonator.

    Attributes:
        id: Unique resonator identifier (e.g. ``"R0"``).
        frequency_ghz: Target resonance frequency in GHz.
        target_qubit_id: ID of the qubit this resonator reads out.
        coupling_type: ``"capacitive"`` or ``"inductive"`` coupling.
        coupling_strength_mhz: Coupling strength *g* in MHz.
        cpw_trace_width_um: CPW centre-trace width in μm.
        cpw_gap_um: CPW gap width in μm.
        pos_x_mm: X placement coordinate (set by placement engine).
        pos_y_mm: Y placement coordinate (set by placement engine).
        orientation_deg: Rotation angle in degrees.
    """

    id: str = Field(
        ...,
        min_length=1,
        description="Unique resonator identifier",
    )
    frequency_ghz: float = Field(
        ...,
        ge=5.0,
        le=10.0,
        description="Resonance frequency in GHz",
    )
    target_qubit_id: str = Field(
        ...,
        min_length=1,
        description="ID of the qubit coupled to this resonator",
    )
    coupling_type: Literal["capacitive", "inductive"] = Field(
        default="capacitive",
        description="Type of qubit-resonator coupling",
    )
    coupling_strength_mhz: float = Field(
        default=50.0,
        gt=0,
        description="Coupling strength g in MHz",
    )
    cpw_trace_width_um: float = Field(
        default=10.0,
        gt=0,
        description="CPW centre-trace width in μm",
    )
    cpw_gap_um: float = Field(
        default=6.0,
        gt=0,
        description="CPW gap width in μm",
    )

    # ── Placement (set by the placement engine) ─────────────────────────────
    pos_x_mm: float = Field(default=0.0, description="X position in mm")
    pos_y_mm: float = Field(default=0.0, description="Y position in mm")
    orientation_deg: float = Field(default=0.0, description="Rotation angle in degrees")

    # ── Field Validators ────────────────────────────────────────────────────

    @field_validator("coupling_strength_mhz")
    @classmethod
    def _coupling_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError(f"coupling_strength_mhz must be > 0, got {v}")
        return v

    # ── Computed Properties ─────────────────────────────────────────────────

    @property
    def epsilon_eff(self) -> float:
        """Effective dielectric constant for CPW on silicon.

        Uses the quasi-TEM approximation:
            ε_eff = (1 + ε_r) / 2
        """
        return _EPSILON_EFF_SILICON

    @property
    def wavelength_mm(self) -> float:
        """Guided wavelength λ in mm at the resonance frequency.

            λ = c / (f · √ε_eff)

        Returns:
            Wavelength in mm.
        """
        freq_hz = self.frequency_ghz * 1e9
        wavelength_m = SPEED_OF_LIGHT / (freq_hz * math.sqrt(self.epsilon_eff))
        return wavelength_m * 1e3  # m → mm

    @property
    def physical_length_mm(self) -> float:
        """Physical length of the half-wave resonator in mm.

            L = c / (2 · f · √ε_eff) = λ / 2

        Returns:
            Resonator length in mm.
        """
        return self.wavelength_mm / 2.0

    @property
    def total_meander_length_mm(self) -> float:
        """Total meander length — identical to :attr:`physical_length_mm`.

        The meandered route must traverse the full electrical length of the
        half-wave resonator.
        """
        return self.physical_length_mm

    @property
    def bounding_box_mm(self) -> tuple[float, float, float, float]:
        """Estimated axis-aligned bounding box for the meandered resonator.

        The estimate assumes the meander is laid out in a roughly rectangular
        region.  The width is taken as the total CPW cross-section × 5 (a
        conservative estimate for meander pitch) and the height is derived
        from the total length assuming a square-ish meander fill.

        Returns:
            ``(x_min, y_min, x_max, y_max)`` in mm.
        """
        # Estimate meander footprint: assume ~10 turns in a rectangular area
        cpw_pitch_mm = um_to_mm(self.cpw_trace_width_um + 2.0 * self.cpw_gap_um) * 5.0
        num_turns = max(1, int(math.ceil(self.total_meander_length_mm / cpw_pitch_mm / 10.0)))
        est_width = cpw_pitch_mm * num_turns
        est_height = self.total_meander_length_mm / max(num_turns, 1) if num_turns > 0 else self.total_meander_length_mm

        # Clamp minimum dimensions
        est_width = max(est_width, 0.5)
        est_height = max(est_height, 0.5)

        half_w = est_width / 2.0
        half_h = est_height / 2.0
        return (
            self.pos_x_mm - half_w,
            self.pos_y_mm - half_h,
            self.pos_x_mm + half_w,
            self.pos_y_mm + half_h,
        )

    # ── Qiskit Metal Integration ────────────────────────────────────────────

    def metal_options(self) -> dict[str, str]:
        """Return a dict compatible with Qiskit Metal ``RouteMeander`` options.

        Returns:
            Options dict with all lengths as Metal unit strings.
        """
        return {
            "total_length": f"{self.total_meander_length_mm}mm",
            "trace_width": to_metal_um_str(self.cpw_trace_width_um),
            "trace_gap": to_metal_um_str(self.cpw_gap_um),
            "pos_x": f"{self.pos_x_mm}mm",
            "pos_y": f"{self.pos_y_mm}mm",
            "orientation": str(self.orientation_deg),
            "fillet": "50um",  # default fillet radius
        }

    # ── Display ─────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"Resonator(id={self.id!r}, f={self.frequency_ghz:.3f} GHz, "
            f"L={self.physical_length_mm:.3f} mm, "
            f"qubit={self.target_qubit_id!r}, "
            f"g={self.coupling_strength_mhz:.1f} MHz)"
        )
