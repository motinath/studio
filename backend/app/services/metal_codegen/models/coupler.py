"""
Qubit–qubit coupler model for superconducting quantum chip design.

Supports capacitive couplers and bus-resonator couplers.  For capacitive
coupling the coupling capacitance is estimated from the coupling strength
and a typical qubit frequency using:

    C_c ≈ g / (ω_q²·Z_r)

where Z_r is the CPW characteristic impedance (≈ 50 Ω).
"""

from __future__ import annotations

import math
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.services.metal_codegen.utils.logging import get_logger
from app.services.metal_codegen.utils.units import um_to_mm, to_metal_um_str

logger = get_logger("models.coupler")

# Typical CPW characteristic impedance in Ohms
_CPW_IMPEDANCE_OHM: float = 50.0

# Typical qubit frequency used for capacitance estimation (GHz → Hz)
_TYPICAL_QUBIT_FREQ_HZ: float = 5.0e9


class Coupler(BaseModel):
    """Coupler linking two transmon qubits on a superconducting chip.

    Attributes:
        id: Unique coupler identifier (e.g. ``"C0_1"``).
        source_qubit_id: ID of the first (source) qubit.
        target_qubit_id: ID of the second (target) qubit.
        strength_mhz: Coupling strength *J* in MHz.
        coupler_type: ``"capacitive"`` or ``"bus_resonator"``.
        pos_x_mm: X placement coordinate (set by placement engine).
        pos_y_mm: Y placement coordinate (set by placement engine).
        cpw_trace_width_um: CPW centre-trace width in μm.
        cpw_gap_um: CPW gap width in μm.
        coupling_length_um: Length of the coupling section in μm.
    """

    id: str = Field(
        ...,
        min_length=1,
        description="Unique coupler identifier",
    )
    source_qubit_id: str = Field(
        ...,
        min_length=1,
        description="ID of the source qubit",
    )
    target_qubit_id: str = Field(
        ...,
        min_length=1,
        description="ID of the target qubit",
    )
    strength_mhz: float = Field(
        ...,
        ge=0.5,
        le=50.0,
        description="Coupling strength J in MHz",
    )
    coupler_type: Literal["capacitive", "bus_resonator"] = Field(
        default="capacitive",
        description="Coupling mechanism type",
    )

    # ── Placement (set by the placement engine) ─────────────────────────────
    pos_x_mm: float = Field(default=0.0, description="X position in mm")
    pos_y_mm: float = Field(default=0.0, description="Y position in mm")

    # ── Geometry ────────────────────────────────────────────────────────────
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
    coupling_length_um: float = Field(
        default=200.0,
        gt=0,
        description="Length of the coupling section in μm",
    )

    # ── Validators ──────────────────────────────────────────────────────────

    @field_validator("target_qubit_id")
    @classmethod
    def _different_qubits(cls, v: str, info: object) -> str:
        """Ensure the coupler does not connect a qubit to itself."""
        # info.data contains previously validated fields
        data = getattr(info, "data", {})
        source = data.get("source_qubit_id")
        if source is not None and v == source:
            raise ValueError(
                f"source_qubit_id and target_qubit_id must differ, both are {v!r}"
            )
        return v

    # ── Computed Properties ─────────────────────────────────────────────────

    @property
    def coupling_capacitance_ff(self) -> float:
        """Estimated coupling capacitance in femtofarads (fF).

        Uses the relation:
            C_c ≈ g / (ω_q² · Z_r)

        where:
            g = coupling strength (rad/s)
            ω_q = 2π · f_q  (typical qubit angular frequency)
            Z_r = CPW characteristic impedance (50 Ω)

        This is an order-of-magnitude estimate useful for design-space
        exploration; exact values require electromagnetic simulation.

        Returns:
            Coupling capacitance in femtofarads.
        """
        g_hz = self.strength_mhz * 1e6  # MHz → Hz
        omega_q = 2.0 * math.pi * _TYPICAL_QUBIT_FREQ_HZ  # rad/s
        # C_c ≈ g / (ω_q² · Z_r)  [in Farads]
        c_farads = g_hz / (omega_q**2 * _CPW_IMPEDANCE_OHM)
        c_ff = c_farads * 1e15  # F → fF
        return c_ff

    @property
    def bounding_box_mm(self) -> tuple[float, float, float, float]:
        """Axis-aligned bounding box centred at the coupler position.

        Returns:
            ``(x_min, y_min, x_max, y_max)`` in mm.
        """
        half_length = um_to_mm(self.coupling_length_um) / 2.0
        # Width is the CPW cross-section
        cpw_width = um_to_mm(self.cpw_trace_width_um + 2.0 * self.cpw_gap_um)
        half_w = cpw_width / 2.0
        return (
            self.pos_x_mm - half_length,
            self.pos_y_mm - half_w,
            self.pos_x_mm + half_length,
            self.pos_y_mm + half_w,
        )

    # ── Qiskit Metal Integration ────────────────────────────────────────────

    def metal_options(self) -> dict[str, str]:
        """Return a dict compatible with Qiskit Metal ``CoupledLineTee`` options.

        Returns:
            Options dict with all lengths as Metal unit strings.
        """
        return {
            "coupling_length": to_metal_um_str(self.coupling_length_um),
            "line_width": to_metal_um_str(self.cpw_trace_width_um),
            "line_gap": to_metal_um_str(self.cpw_gap_um),
            "coupling_space": to_metal_um_str(self.cpw_gap_um),
            "pos_x": f"{self.pos_x_mm}mm",
            "pos_y": f"{self.pos_y_mm}mm",
        }

    # ── Display ─────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"Coupler(id={self.id!r}, "
            f"{self.source_qubit_id}↔{self.target_qubit_id}, "
            f"J={self.strength_mhz:.1f} MHz, "
            f"type={self.coupler_type!r}, "
            f"C_c≈{self.coupling_capacitance_ff:.2f} fF)"
        )
