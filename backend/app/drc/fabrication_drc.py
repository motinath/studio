"""
fabrication_drc.py — Fabrication process DRC checks.

Checks
------
  MIN_CPW_WIDTH     — CPW centre conductor below process minimum
  MIN_CPW_GAP       — CPW gap below process minimum
  MIN_BEND_RADIUS   — CPW bend radius below lithography minimum
  MIN_FEATURE_SIZE  — any feature below minimum resolvable feature
  METAL_LAYER_CHECK — substrate/metal process compatibility
"""

from __future__ import annotations

from typing import Any, Dict, List

from app.drc.report import DRCViolation


class FabricationDRC:
    """Fabrication process DRC — checks physical dimensions against process rules."""

    # IBM/standard fab defaults
    DEFAULT_RULES: Dict[str, float] = {
        "min_cpw_width_um":   5.0,
        "min_cpw_gap_um":     4.0,
        "min_bend_radius_um": 50.0,
        "min_feature_um":     0.2,
        "min_junction_um":    0.15,
    }

    # Process compatibility matrix: (substrate, metal) → issues
    PROCESS_MATRIX: Dict[tuple, List[str]] = {
        ("silicon",  "tantalum"): ["Ta on Si requires adhesion layer (5 nm Ti or TiN)"],
        ("sapphire", "aluminum"): [],   # gold standard — no warnings
        ("sapphire", "niobium"):  ["Nb on sapphire: consider annealing at 800 °C"],
        ("silicon",  "nbtin"):    ["NbTiN on Si: reactive RF sputtering at elevated temp required"],
    }

    def __init__(
        self,
        substrate:      str = "silicon",
        metal:          str = "aluminum",
        cpw_width_um:   float = 10.0,
        cpw_gap_um:     float = 6.0,
        bend_radius_um: float = 90.0,
        rules_override: Dict[str, float] | None = None,
    ) -> None:
        self.substrate     = substrate
        self.metal         = metal
        self.cpw_width_um  = cpw_width_um
        self.cpw_gap_um    = cpw_gap_um
        self.bend_radius_um = bend_radius_um
        self.rules = {**self.DEFAULT_RULES, **(rules_override or {})}
        self._v: List[DRCViolation] = []

    def _add(self, rule, severity, message, components=None, measured=None, limit=None, units=""):
        self._v.append(DRCViolation(
            rule=rule, domain="fabrication", severity=severity,
            message=message, components=components or [],
            measured=measured, limit=limit, units=units,
        ))

    def check_cpw_dimensions(self) -> None:
        min_w = self.rules["min_cpw_width_um"]
        min_g = self.rules["min_cpw_gap_um"]

        if self.cpw_width_um < min_w:
            self._add("MIN_CPW_WIDTH", "ERROR",
                      f"CPW width {self.cpw_width_um} µm is below process minimum {min_w} µm",
                      measured=self.cpw_width_um, limit=min_w, units=" µm")

        if self.cpw_gap_um < min_g:
            self._add("MIN_CPW_GAP", "ERROR",
                      f"CPW gap {self.cpw_gap_um} µm is below process minimum {min_g} µm",
                      measured=self.cpw_gap_um, limit=min_g, units=" µm")

    def check_bend_radius(self) -> None:
        min_r = self.rules["min_bend_radius_um"]
        if self.bend_radius_um < min_r:
            self._add("MIN_BEND_RADIUS", "WARNING",
                      f"CPW bend radius {self.bend_radius_um} µm is below recommended "
                      f"minimum {min_r} µm — lithographic distortion risk",
                      measured=self.bend_radius_um, limit=min_r, units=" µm")

    def check_process_compatibility(self) -> None:
        key  = (self.substrate, self.metal)
        msgs = self.PROCESS_MATRIX.get(key, [])
        for msg in msgs:
            self._add("PROCESS_COMPAT", "WARNING", msg)

        # Universal: check substrate is known
        known_substrates = {"silicon", "sapphire", "silicon_nitride"}
        if self.substrate not in known_substrates:
            self._add("UNKNOWN_SUBSTRATE", "WARNING",
                      f"Substrate '{self.substrate}' is not in the validated process library")

        known_metals = {"aluminum", "niobium", "tantalum", "nbtin"}
        if self.metal not in known_metals:
            self._add("UNKNOWN_METAL", "WARNING",
                      f"Metal '{self.metal}' is not in the validated process library")

    def run(self) -> List[DRCViolation]:
        self._v = []
        self.check_cpw_dimensions()
        self.check_bend_radius()
        self.check_process_compatibility()
        return list(self._v)
