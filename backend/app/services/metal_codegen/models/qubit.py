"""
Transmon qubit model for superconducting quantum chip design.

Implements the transmon Hamiltonian relations to derive Josephson energy (Ej)
and charging energy (Ec) from the qubit frequency and anharmonicity.  All
computed properties use the standard approximations valid in the transmon
regime (Ej/Ec >> 1).

Key relations
-------------
- Anharmonicity: α ≈ −Ec   (first-order transmon approximation)
- Transition frequency: f₀₁ ≈ √(8·Ej·Ec) − Ec
- Ej/Ec ratio: must be in [20, 100] for the transmon regime
"""

from __future__ import annotations

import math
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator
from typing_extensions import Self

from app.services.metal_codegen.utils.logging import get_logger
from app.services.metal_codegen.utils.units import um_to_mm, to_metal_um_str

logger = get_logger("models.qubit")


class TransmonQubit(BaseModel):
    """Transmon qubit with physically accurate parameter derivation.

    When ``ej_ghz`` or ``ec_mhz`` are not supplied the model validator
    automatically computes them from ``frequency_ghz`` and
    ``anharmonicity_mhz`` using the standard transmon approximations.

    Attributes:
        id: Unique qubit identifier (e.g. ``"Q0"``).
        frequency_ghz: Qubit 0→1 transition frequency in GHz.
        anharmonicity_mhz: Anharmonicity α in MHz (negative for transmon).
        ej_ghz: Josephson energy in GHz (derived if not supplied).
        ec_mhz: Charging energy in MHz (derived if not supplied).
        junction_type: ``"single"`` junction or ``"squid"`` loop.
        pos_x_mm: X placement coordinate (set by placement engine).
        pos_y_mm: Y placement coordinate (set by placement engine).
        orientation_deg: Rotation angle in degrees.
        pocket_width_um: Transmon pocket width in μm.
        pocket_height_um: Transmon pocket height in μm.
        pad_width_um: Capacitor pad width in μm.
        pad_height_um: Capacitor pad height in μm.
        pad_gap_um: Gap between the two capacitor pads in μm.
        connection_pads: Qiskit Metal–compatible pad configuration dict.
    """

    id: str = Field(
        ...,
        min_length=1,
        description="Unique qubit identifier",
    )
    frequency_ghz: float = Field(
        ...,
        ge=3.5,
        le=8.0,
        description="Qubit 0-1 transition frequency in GHz",
    )
    anharmonicity_mhz: float = Field(
        ...,
        ge=-400.0,
        le=-150.0,
        description="Anharmonicity in MHz (negative for transmon)",
    )
    ej_ghz: Optional[float] = Field(
        default=None,
        description="Josephson energy Ej in GHz (auto-derived if omitted)",
    )
    ec_mhz: Optional[float] = Field(
        default=None,
        description="Charging energy Ec in MHz (auto-derived if omitted)",
    )
    junction_type: Literal["single", "squid"] = Field(
        default="single",
        description="Junction type: single junction or SQUID loop",
    )

    # ── Placement (set by the placement engine) ─────────────────────────────
    pos_x_mm: float = Field(default=0.0, description="X position in mm")
    pos_y_mm: float = Field(default=0.0, description="Y position in mm")
    orientation_deg: float = Field(default=0.0, description="Rotation angle in degrees")

    # ── Geometry (Qiskit Metal TransmonPocket defaults) ─────────────────────
    pocket_width_um: float = Field(
        default=650.0, gt=0, description="Pocket width in μm"
    )
    pocket_height_um: float = Field(
        default=325.0, gt=0, description="Pocket height in μm"
    )
    pad_width_um: float = Field(
        default=275.0, gt=0, description="Capacitor pad width in μm"
    )
    pad_height_um: float = Field(
        default=100.0, gt=0, description="Capacitor pad height in μm"
    )
    pad_gap_um: float = Field(
        default=30.0, gt=0, description="Gap between pads in μm"
    )

    # ── Connection pads (Qiskit Metal–compatible) ───────────────────────────
    connection_pads: dict[str, dict[str, str]] = Field(
        default_factory=dict,
        description="Metal-compatible pad configuration keyed by pad name",
    )

    # ── Field Validators ────────────────────────────────────────────────────

    @field_validator("ej_ghz")
    @classmethod
    def _ej_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError(f"ej_ghz must be positive, got {v}")
        return v

    @field_validator("ec_mhz")
    @classmethod
    def _ec_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError(f"ec_mhz must be positive, got {v}")
        return v

    # ── Model Validator — auto-compute Ej / Ec ──────────────────────────────

    @model_validator(mode="after")
    def _derive_energies(self) -> Self:
        """Compute Ej and Ec from frequency and anharmonicity if not given.

        Uses the transmon approximations:
            Ec ≈ |α|   (charging energy equals magnitude of anharmonicity)
            f₀₁ ≈ √(8·Ej·Ec) − Ec   →   Ej = (f₀₁ + Ec)² / (8·Ec)
        """
        # Derive Ec from anharmonicity if not provided
        if self.ec_mhz is None:
            self.ec_mhz = self.compute_ec_from_anharmonicity()
            logger.debug(
                "Qubit %s: derived Ec = %.2f MHz from anharmonicity %.2f MHz",
                self.id, self.ec_mhz, self.anharmonicity_mhz,
            )

        # Derive Ej from frequency and Ec if not provided
        if self.ej_ghz is None:
            self.ej_ghz = self.compute_ej_from_frequency()
            logger.debug(
                "Qubit %s: derived Ej = %.4f GHz from f01 = %.4f GHz, Ec = %.2f MHz",
                self.id, self.ej_ghz, self.frequency_ghz, self.ec_mhz,
            )

        # Validate transmon regime
        ratio = self.ej_ec_ratio
        if ratio < 20.0 or ratio > 100.0:
            logger.warning(
                "Qubit %s: Ej/Ec = %.1f is outside the recommended transmon "
                "regime [20, 100]. Check frequency and anharmonicity values.",
                self.id, ratio,
            )
        return self

    # ── Computed Properties ─────────────────────────────────────────────────

    @property
    def ec_ghz(self) -> float:
        """Charging energy in GHz.

        Returns:
            Ec converted from MHz to GHz.
        """
        if self.ec_mhz is None:  # pragma: no cover – guarded by validator
            return abs(self.anharmonicity_mhz) * 1e-3
        return self.ec_mhz * 1e-3

    @property
    def ej_ec_ratio(self) -> float:
        """Ratio Ej / Ec (dimensionless).

        The transmon regime requires this ratio to be in [20, 100].
        """
        ec_ghz = self.ec_ghz
        if ec_ghz == 0:
            return float("inf")
        if self.ej_ghz is None:  # pragma: no cover
            return 0.0
        return self.ej_ghz / ec_ghz

    def compute_ec_from_anharmonicity(self) -> float:
        """Compute charging energy from anharmonicity.

        For a transmon qubit the anharmonicity to first order equals ``-Ec``:
            Ec ≈ |α|

        Returns:
            Ec in MHz (positive).
        """
        return abs(self.anharmonicity_mhz)

    def compute_ej_from_frequency(self) -> float:
        """Compute Josephson energy from the 0→1 transition frequency and Ec.

        Uses:
            f₀₁ ≈ √(8·Ej·Ec) − Ec
            ⟹  Ej = (f₀₁ + Ec)² / (8·Ec)

        Both ``frequency_ghz`` and ``ec_mhz`` must be set before calling.

        Returns:
            Ej in GHz.
        """
        ec_ghz = self.ec_ghz  # Ec in GHz
        f01 = self.frequency_ghz  # GHz
        if ec_ghz == 0:
            raise ValueError("Cannot compute Ej: Ec is zero")
        # Ej = (f01 + Ec)^2 / (8 * Ec)   — all in GHz
        ej = (f01 + ec_ghz) ** 2 / (8.0 * ec_ghz)
        return ej

    @property
    def bounding_box_mm(self) -> tuple[float, float, float, float]:
        """Axis-aligned bounding box centred at the qubit position.

        Returns:
            ``(x_min, y_min, x_max, y_max)`` in mm, derived from the pocket
            dimensions (ignoring rotation for simplicity).
        """
        half_w = um_to_mm(self.pocket_width_um) / 2.0
        half_h = um_to_mm(self.pocket_height_um) / 2.0
        return (
            self.pos_x_mm - half_w,
            self.pos_y_mm - half_h,
            self.pos_x_mm + half_w,
            self.pos_y_mm + half_h,
        )

    # ── Qiskit Metal Integration ────────────────────────────────────────────

    def metal_options(self) -> dict[str, str | dict[str, str]]:
        """Return a dict compatible with Qiskit Metal ``TransmonPocket`` options.

        The returned dict can be passed directly as keyword arguments when
        creating a ``TransmonPocket`` component.

        Returns:
            Options dict with all lengths as Metal unit strings.
        """
        opts: dict[str, str | dict[str, str]] = {
            "pocket_width": to_metal_um_str(self.pocket_width_um),
            "pocket_height": to_metal_um_str(self.pocket_height_um),
            "pad_width": to_metal_um_str(self.pad_width_um),
            "pad_height": to_metal_um_str(self.pad_height_um),
            "pad_gap": to_metal_um_str(self.pad_gap_um),
            "pos_x": f"{self.pos_x_mm}mm",
            "pos_y": f"{self.pos_y_mm}mm",
            "orientation": str(self.orientation_deg),
        }
        if self.connection_pads:
            opts["connection_pads"] = dict(self.connection_pads)  # type: ignore[assignment]
        return opts

    # ── Display ─────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"TransmonQubit(id={self.id!r}, f01={self.frequency_ghz:.3f} GHz, "
            f"α={self.anharmonicity_mhz:.1f} MHz, "
            f"Ej={self.ej_ghz:.3f} GHz, Ec={self.ec_mhz:.1f} MHz, "
            f"Ej/Ec={self.ej_ec_ratio:.1f})"
        )
