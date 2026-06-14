"""
Quantum chip model for superconducting circuit design.

Describes the physical chip substrate including dimensions, material stack,
and fabrication constraints.  Provides geometric helpers used by the
placement and validation engines.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator
from typing_extensions import Self

from app.services.metal_codegen.models.constraints import FabricationConstraints
from app.services.metal_codegen.utils.logging import get_logger

logger = get_logger("models.chip")


class QuantumChip(BaseModel):
    """Physical substrate for a superconducting quantum chip.

    Attributes:
        name: Human-readable chip identifier (e.g. ``"chip_5q_v1"``).
        width_mm: Chip width in millimeters (0 < width ≤ 20).
        height_mm: Chip height in millimeters (0 < height ≤ 20).
        substrate: Substrate material — silicon or sapphire.
        metal: Superconducting metal layer (e.g. ``"niobium"``, ``"aluminum"``).
        metal_thickness_nm: Thickness of the metal film in nanometers.
        constraints: Fabrication constraints applied to this chip.
    """

    name: str = Field(
        ...,
        min_length=1,
        description="Chip identifier",
    )
    width_mm: float = Field(
        ...,
        gt=0,
        le=20.0,
        description="Chip width in mm (max 20 mm)",
    )
    height_mm: float = Field(
        ...,
        gt=0,
        le=20.0,
        description="Chip height in mm (max 20 mm)",
    )
    substrate: Literal["silicon", "sapphire"] = Field(
        default="silicon",
        description="Substrate material",
    )
    metal: str = Field(
        default="niobium",
        min_length=1,
        description="Metal layer material",
    )
    metal_thickness_nm: float = Field(
        default=200.0,
        gt=0,
        description="Metal film thickness in nm",
    )
    constraints: FabricationConstraints = Field(
        default_factory=FabricationConstraints,
        description="Fabrication constraints applied to this chip",
    )

    # ── Validators ──────────────────────────────────────────────────────────

    @field_validator("width_mm")
    @classmethod
    def _validate_width(cls, v: float) -> float:
        """Enforce positive width within fabrication limits."""
        if v <= 0:
            raise ValueError(f"Chip width must be > 0, got {v}")
        if v > 20.0:
            raise ValueError(f"Chip width must be ≤ 20 mm, got {v}")
        return v

    @field_validator("height_mm")
    @classmethod
    def _validate_height(cls, v: float) -> float:
        """Enforce positive height within fabrication limits."""
        if v <= 0:
            raise ValueError(f"Chip height must be > 0, got {v}")
        if v > 20.0:
            raise ValueError(f"Chip height must be ≤ 20 mm, got {v}")
        return v

    @model_validator(mode="after")
    def _validate_dimensions_against_constraints(self) -> Self:
        """Ensure chip dimensions respect the fabrication constraint limits."""
        if self.width_mm > self.constraints.max_chip_width_mm:
            raise ValueError(
                f"Chip width {self.width_mm} mm exceeds constraint "
                f"max_chip_width_mm={self.constraints.max_chip_width_mm}"
            )
        if self.height_mm > self.constraints.max_chip_height_mm:
            raise ValueError(
                f"Chip height {self.height_mm} mm exceeds constraint "
                f"max_chip_height_mm={self.constraints.max_chip_height_mm}"
            )
        margin = self.constraints.chip_margin_mm
        if self.width_mm <= 2.0 * margin:
            raise ValueError(
                f"Chip width {self.width_mm} mm is too small for chip_margin "
                f"({margin} mm on each side)"
            )
        if self.height_mm <= 2.0 * margin:
            raise ValueError(
                f"Chip height {self.height_mm} mm is too small for chip_margin "
                f"({margin} mm on each side)"
            )
        return self

    # ── Properties ──────────────────────────────────────────────────────────

    @property
    def area_mm2(self) -> float:
        """Total chip area in mm²."""
        return self.width_mm * self.height_mm

    @property
    def center_mm(self) -> tuple[float, float]:
        """Centre coordinate of the chip in mm (origin at bottom-left)."""
        return (self.width_mm / 2.0, self.height_mm / 2.0)

    @property
    def bounds_mm(self) -> tuple[float, float, float, float]:
        """Axis-aligned bounding box ``(x_min, y_min, x_max, y_max)`` in mm.

        Uses origin at bottom-left corner of the chip.
        """
        return (0.0, 0.0, self.width_mm, self.height_mm)

    @property
    def usable_bounds_mm(self) -> tuple[float, float, float, float]:
        """Usable region after subtracting the chip margin.

        Returns:
            ``(x_min, y_min, x_max, y_max)`` of the usable interior.
        """
        m = self.constraints.chip_margin_mm
        return (m, m, self.width_mm - m, self.height_mm - m)

    @property
    def usable_area_mm2(self) -> float:
        """Usable chip area after subtracting edge margins."""
        x0, y0, x1, y1 = self.usable_bounds_mm
        return (x1 - x0) * (y1 - y0)

    @property
    def substrate_epsilon_r(self) -> float:
        """Relative permittivity of the substrate material."""
        from app.services.metal_codegen.config import SILICON_EPSILON_R, SAPPHIRE_EPSILON_R

        return (
            SILICON_EPSILON_R if self.substrate == "silicon" else SAPPHIRE_EPSILON_R
        )

    # ── Methods ─────────────────────────────────────────────────────────────

    def is_point_inside(self, x_mm: float, y_mm: float) -> bool:
        """Check whether a point lies within the usable chip area.

        The usable area excludes the ``chip_margin`` on every edge.

        Args:
            x_mm: X coordinate in mm (origin at bottom-left).
            y_mm: Y coordinate in mm (origin at bottom-left).

        Returns:
            ``True`` if the point is inside the usable area.
        """
        x0, y0, x1, y1 = self.usable_bounds_mm
        return x0 <= x_mm <= x1 and y0 <= y_mm <= y1

    def is_bbox_inside(
        self,
        x_min: float,
        y_min: float,
        x_max: float,
        y_max: float,
    ) -> bool:
        """Check whether an axis-aligned bounding box fits in the usable area.

        Args:
            x_min: Left edge of the bounding box in mm.
            y_min: Bottom edge of the bounding box in mm.
            x_max: Right edge of the bounding box in mm.
            y_max: Top edge of the bounding box in mm.

        Returns:
            ``True`` if the entire box is within the usable region.
        """
        ux0, uy0, ux1, uy1 = self.usable_bounds_mm
        return x_min >= ux0 and y_min >= uy0 and x_max <= ux1 and y_max <= uy1

    def __repr__(self) -> str:
        return (
            f"QuantumChip(name={self.name!r}, "
            f"{self.width_mm}×{self.height_mm} mm, "
            f"substrate={self.substrate!r}, metal={self.metal!r})"
        )
