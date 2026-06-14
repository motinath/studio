"""
Fabrication constraints for superconducting quantum chip design.

Encapsulates minimum trace widths, gaps, junction areas, and chip-level
dimensional limits enforced during placement, routing, and validation.
All values are stored in millimeters unless otherwise noted.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator
from typing_extensions import Self

from app.services.metal_codegen.utils.logging import get_logger

logger = get_logger("models.constraints")


class FabricationConstraints(BaseModel):
    """Fabrication constraints governing a superconducting quantum chip.

    All linear dimensions are in **millimeters** and area dimensions in **μm²**
    to align with foundry specification conventions.

    Attributes:
        min_trace_width_mm: Minimum CPW centre-trace width (default 10 μm).
        min_gap_mm: Minimum CPW gap width (default 6 μm).
        min_component_spacing_mm: Minimum clearance between any two components
            (default 50 μm).
        min_junction_area_um2: Smallest allowed Josephson junction area in μm².
        max_junction_area_um2: Largest allowed Josephson junction area in μm².
        chip_margin_mm: Keep-out margin from chip edge (default 200 μm).
        max_chip_width_mm: Maximum allowed chip width.
        max_chip_height_mm: Maximum allowed chip height.
        cpw_trace_width_mm: Default CPW centre-trace width.
        cpw_gap_mm: Default CPW gap width.
        fillet_radius_mm: Default fillet (bend) radius for CPW routing.
    """

    min_trace_width_mm: float = Field(
        default=0.010,
        gt=0,
        description="Minimum CPW trace width in mm (10 μm)",
    )
    min_gap_mm: float = Field(
        default=0.006,
        gt=0,
        description="Minimum CPW gap width in mm (6 μm)",
    )
    min_component_spacing_mm: float = Field(
        default=0.050,
        gt=0,
        description="Minimum spacing between components in mm (50 μm)",
    )
    min_junction_area_um2: float = Field(
        default=0.01,
        gt=0,
        description="Minimum Josephson junction area in μm²",
    )
    max_junction_area_um2: float = Field(
        default=1.0,
        gt=0,
        description="Maximum Josephson junction area in μm²",
    )
    chip_margin_mm: float = Field(
        default=0.200,
        ge=0,
        description="Keep-out margin from chip edge in mm (200 μm)",
    )
    max_chip_width_mm: float = Field(
        default=20.0,
        gt=0,
        description="Maximum allowed chip width in mm",
    )
    max_chip_height_mm: float = Field(
        default=20.0,
        gt=0,
        description="Maximum allowed chip height in mm",
    )
    cpw_trace_width_mm: float = Field(
        default=0.010,
        gt=0,
        description="Default CPW centre-trace width in mm (10 μm)",
    )
    cpw_gap_mm: float = Field(
        default=0.006,
        gt=0,
        description="Default CPW gap width in mm (6 μm)",
    )
    fillet_radius_mm: float = Field(
        default=0.050,
        gt=0,
        description="Default fillet (bend) radius in mm (50 μm)",
    )

    # ── Validators ──────────────────────────────────────────────────────────

    @model_validator(mode="after")
    def _validate_junction_area_range(self) -> Self:
        """Ensure min junction area does not exceed max junction area."""
        if self.min_junction_area_um2 >= self.max_junction_area_um2:
            raise ValueError(
                f"min_junction_area_um2 ({self.min_junction_area_um2}) must be "
                f"less than max_junction_area_um2 ({self.max_junction_area_um2})"
            )
        return self

    @model_validator(mode="after")
    def _validate_trace_width_ge_min(self) -> Self:
        """Ensure default CPW trace width respects the fabrication minimum."""
        if self.cpw_trace_width_mm < self.min_trace_width_mm:
            raise ValueError(
                f"cpw_trace_width_mm ({self.cpw_trace_width_mm}) must be >= "
                f"min_trace_width_mm ({self.min_trace_width_mm})"
            )
        return self

    @model_validator(mode="after")
    def _validate_gap_ge_min(self) -> Self:
        """Ensure default CPW gap respects the fabrication minimum."""
        if self.cpw_gap_mm < self.min_gap_mm:
            raise ValueError(
                f"cpw_gap_mm ({self.cpw_gap_mm}) must be >= "
                f"min_gap_mm ({self.min_gap_mm})"
            )
        return self

    # ── Factory ─────────────────────────────────────────────────────────────

    @classmethod
    def from_settings(cls) -> FabricationConstraints:
        """Create constraints from the global Quantum Studio settings.

        Reads ``FabricationDefaults`` and ``ChipDefaults`` from
        :func:`app.services.metal_codegen.config.get_settings` and converts μm values
        to mm.

        Returns:
            A ``FabricationConstraints`` instance populated from settings.
        """
        from app.services.metal_codegen.config import get_settings

        settings = get_settings()
        fab = settings.fabrication

        constraints = cls(
            min_trace_width_mm=fab.min_trace_width_um * 1e-3,
            min_gap_mm=fab.min_gap_um * 1e-3,
            min_component_spacing_mm=fab.min_spacing_um * 1e-3,
            min_junction_area_um2=fab.min_junction_area_um2,
            max_junction_area_um2=fab.max_junction_area_um2,
            chip_margin_mm=fab.ground_plane_margin_um * 1e-3,
            cpw_trace_width_mm=fab.default_cpw_trace_um * 1e-3,
            cpw_gap_mm=fab.default_cpw_gap_um * 1e-3,
            fillet_radius_mm=fab.fillet_radius_um * 1e-3,
        )
        logger.debug("FabricationConstraints loaded from settings: %s", constraints)
        return constraints

    # ── Helpers ──────────────────────────────────────────────────────────────

    def total_cpw_footprint_mm(self) -> float:
        """Return the full cross-sectional footprint of the default CPW.

        This equals ``trace + 2 × gap``, i.e. the total width consumed on the
        chip surface by a single CPW line.
        """
        return self.cpw_trace_width_mm + 2.0 * self.cpw_gap_mm

    def usable_chip_area_mm2(self) -> float:
        """Return the usable chip area after subtracting edge margins.

        Assumes a rectangular chip at the maximum allowed dimensions.
        """
        usable_w = self.max_chip_width_mm - 2.0 * self.chip_margin_mm
        usable_h = self.max_chip_height_mm - 2.0 * self.chip_margin_mm
        if usable_w <= 0 or usable_h <= 0:
            return 0.0
        return usable_w * usable_h

    def __repr__(self) -> str:
        return (
            f"FabricationConstraints("
            f"trace={self.cpw_trace_width_mm*1e3:.1f}μm, "
            f"gap={self.cpw_gap_mm*1e3:.1f}μm, "
            f"margin={self.chip_margin_mm*1e3:.0f}μm, "
            f"fillet={self.fillet_radius_mm*1e3:.0f}μm)"
        )
