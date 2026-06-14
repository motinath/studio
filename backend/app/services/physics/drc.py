"""
drc.py  —  QBETA V2 Phase 7
============================
Design Rule Checking (DRC) for superconducting quantum chips.

WHAT THIS DOES
--------------
Validates a chip design BEFORE rendering or GDS export by checking:

  1.  SPACING       — minimum centre-to-centre qubit distance
  2.  CPW_GAP       — CPW gap must meet minimum fabrication rule
  3.  RESONATOR     — resonator frequencies must be unique (no collisions)
  4.  FEEDLINE      — feedline must not overlap qubit bounding boxes
  5.  LAUNCHPAD     — launchpads must not collide with each other
  6.  FREQUENCY     — qubit frequency collisions (< 100 MHz detuning)
  7.  DETUNING      — readout detuning must be >= minimum for dispersive regime

WHY DRC MATTERS
---------------
Without DRC, invalid designs silently produce:
  - Overlapping components → fabrication failure
  - Frequency collisions   → readout confusion
  - Insufficient detuning  → non-dispersive readout

IBM runs DRC at every design iteration before tape-out.

USAGE
-----
    checker = DRCChecker(placement, freq_plan)
    report  = checker.run_all()
    if report.has_errors():
        for v in report.errors:
            print(v)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional


# ─────────────────────────────────────────────────────────────────────────────
# Design rules (IBM-style defaults, µm / GHz)
# ─────────────────────────────────────────────────────────────────────────────

RULES = {
    # Physical spacing rules (mm)
    "min_qubit_spacing_mm":     0.6,     # centre-to-centre minimum
    "min_launchpad_spacing_mm": 0.8,     # launchpad centre-to-centre
    "feedline_qubit_clearance_mm": 0.4,  # feedline edge to qubit pocket edge

    # CPW rules (µm)
    "min_cpw_gap_um":    4.0,    # minimum gap for Nb on Si
    "min_cpw_width_um":  5.0,    # minimum centre conductor

    # Frequency rules (GHz)
    "min_qubit_detuning_GHz":     0.10,  # nearest-neighbour qubit separation
    "min_resonator_detuning_GHz": 0.05,  # resonator frequency separation
    "min_dispersive_detuning_GHz": 1.0,  # |f_r - f_q| minimum (dispersive regime)
    "max_dispersive_detuning_GHz": 3.0,  # above this → too far, χ too small

    # Qubit pocket dimensions (mm) — used for clearance checks
    "qubit_pocket_half_size_mm": 0.33,   # half-width of TransmonPocket

    # Geometry overlap rules (mm)
    # Minimum clear distance between a resonator route bounding envelope
    # and any adjacent qubit pocket edge.
    "min_resonator_pocket_clearance_mm": 0.15,
    # Minimum clear distance between two resonator route envelopes.
    "min_resonator_resonator_clearance_mm": 0.10,
}


# ─────────────────────────────────────────────────────────────────────────────
# Violation severity
# ─────────────────────────────────────────────────────────────────────────────

SEVERITY_ERROR   = "ERROR"
SEVERITY_WARNING = "WARNING"
SEVERITY_INFO    = "INFO"


# ─────────────────────────────────────────────────────────────────────────────
# DRC result containers
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class DRCViolation:
    rule:        str
    severity:    str
    message:     str
    components:  List[str] = field(default_factory=list)
    measured:    Optional[float] = None
    limit:       Optional[float] = None
    units:       str = ""

    def __str__(self) -> str:
        loc = f" [{', '.join(self.components)}]" if self.components else ""
        val = f"  measured={self.measured:.4f}{self.units}  limit={self.limit:.4f}{self.units}" \
              if self.measured is not None else ""
        return f"[{self.severity}] {self.rule}{loc}: {self.message}{val}"


@dataclass
class DRCReport:
    violations: List[DRCViolation] = field(default_factory=list)

    @property
    def errors(self) -> List[DRCViolation]:
        return [v for v in self.violations if v.severity == SEVERITY_ERROR]

    @property
    def warnings(self) -> List[DRCViolation]:
        return [v for v in self.violations if v.severity == SEVERITY_WARNING]

    def has_errors(self) -> bool:
        return len(self.errors) > 0

    def passed(self) -> bool:
        return not self.has_errors()

    def to_dict(self) -> dict:
        return {
            "passed":    self.passed(),
            "errors":    len(self.errors),
            "warnings":  len(self.warnings),
            "violations": [
                {
                    "rule":       v.rule,
                    "severity":   v.severity,
                    "message":    v.message,
                    "components": v.components,
                    "measured":   v.measured,
                    "limit":      v.limit,
                    "units":      v.units,
                }
                for v in self.violations
            ],
        }

    def __str__(self) -> str:
        lines = [f"DRC Report: {'PASSED' if self.passed() else 'FAILED'} "
                 f"({len(self.errors)} errors, {len(self.warnings)} warnings)"]
        for v in self.violations:
            lines.append(f"  {v}")
        return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# DRC Checker
# ─────────────────────────────────────────────────────────────────────────────

class DRCChecker:
    """
    Runs all design rule checks for a QBETA chip.

    Parameters
    ----------
    placement  : PlacementResult from topology_router
    freq_plan  : FrequencyPlan from frequency_planner
    rules      : override default rule values
    """

    def __init__(self, placement, freq_plan, rules: dict | None = None):
        self.placement  = placement
        self.freq_plan  = freq_plan
        self.rules      = {**RULES, **(rules or {})}
        self._violations: List[DRCViolation] = []

    def _add(self, rule, severity, message, components=None,
             measured=None, limit=None, units=""):
        self._violations.append(DRCViolation(
            rule       = rule,
            severity   = severity,
            message    = message,
            components = components or [],
            measured   = measured,
            limit      = limit,
            units      = units,
        ))

    # ── Rule 1: Qubit spacing ─────────────────────────────────────────────────
    def _check_qubit_spacing(self) -> None:
        qubits = self.placement.qubits
        min_d  = self.rules["min_qubit_spacing_mm"]
        for i, qa in enumerate(qubits):
            for j, qb in enumerate(qubits):
                if j <= i:
                    continue
                d = math.sqrt((qa.x_mm - qb.x_mm)**2 + (qa.y_mm - qb.y_mm)**2)
                if d < min_d:
                    self._add(
                        rule       = "SPACING.QUBIT",
                        severity   = SEVERITY_ERROR,
                        message    = f"{qa.name} and {qb.name} are too close",
                        components = [qa.name, qb.name],
                        measured   = round(d, 4),
                        limit      = min_d,
                        units      = " mm",
                    )

    # ── Rule 2: CPW dimensions ────────────────────────────────────────────────
    def _check_cpw_dims(self) -> None:
        substrate = self.freq_plan.substrate
        gap   = substrate.get("cpw_gap_um", 6.0)
        width = substrate.get("cpw_width_um", 10.0)

        if gap < self.rules["min_cpw_gap_um"]:
            self._add(
                rule     = "CPW.GAP",
                severity = SEVERITY_ERROR,
                message  = f"CPW gap {gap} µm below minimum fabrication rule",
                measured = gap,
                limit    = self.rules["min_cpw_gap_um"],
                units    = " µm",
            )

        if width < self.rules["min_cpw_width_um"]:
            self._add(
                rule     = "CPW.WIDTH",
                severity = SEVERITY_ERROR,
                message  = f"CPW width {width} µm below minimum fabrication rule",
                measured = width,
                limit    = self.rules["min_cpw_width_um"],
                units    = " µm",
            )

    # ── Rule 3: Qubit frequency detuning ──────────────────────────────────────
    def _check_qubit_frequency_detuning(self) -> None:
        qubits    = self.freq_plan.qubits
        min_det   = self.rules["min_qubit_detuning_GHz"]

        for i, qa in enumerate(qubits):
            for j, qb in enumerate(qubits):
                if j <= i:
                    continue
                delta = abs(qa.freq_GHz - qb.freq_GHz)
                # Only flag ADJACENT (coupled) qubits — check against edges
                is_adjacent = any(
                    (e.qubit_a in (qa.name, qb.name) and
                     e.qubit_b in (qa.name, qb.name))
                    for e in self.placement.edges
                )
                if is_adjacent and delta < min_det:
                    self._add(
                        rule       = "FREQUENCY.QUBIT_COLLISION",
                        severity   = SEVERITY_ERROR,
                        message    = (f"Adjacent qubits {qa.name} ({qa.freq_GHz} GHz) and "
                                      f"{qb.name} ({qb.freq_GHz} GHz) are too close in frequency"),
                        components = [qa.name, qb.name],
                        measured   = round(delta * 1000, 1),
                        limit      = min_det * 1000,
                        units      = " MHz",
                    )

    # ── Rule 4: Resonator frequency uniqueness ────────────────────────────────
    def _check_resonator_frequencies(self) -> None:
        resonators = self.freq_plan.resonators
        min_sep    = self.rules["min_resonator_detuning_GHz"]

        for i, ra in enumerate(resonators):
            for j, rb in enumerate(resonators):
                if j <= i:
                    continue
                delta = abs(ra.freq_GHz - rb.freq_GHz)
                if delta < min_sep:
                    self._add(
                        rule       = "FREQUENCY.RESONATOR_COLLISION",
                        severity   = SEVERITY_ERROR,
                        message    = (f"Resonators {ra.name} ({ra.freq_GHz} GHz) and "
                                      f"{rb.name} ({rb.freq_GHz} GHz) are too close"),
                        components = [ra.name, rb.name],
                        measured   = round(delta * 1000, 1),
                        limit      = min_sep * 1000,
                        units      = " MHz",
                    )

    # ── Rule 5: Dispersive detuning ───────────────────────────────────────────
    def _check_dispersive_detuning(self) -> None:
        resonators = self.freq_plan.resonators
        min_det = self.rules["min_dispersive_detuning_GHz"]
        max_det = self.rules["max_dispersive_detuning_GHz"]

        for r in resonators:
            det = r.detuning_GHz
            if det < min_det:
                self._add(
                    rule       = "FREQUENCY.DISPERSIVE_DETUNING_LOW",
                    severity   = SEVERITY_ERROR,
                    message    = (f"{r.name} detuning {det:.3f} GHz too small — "
                                  f"not in dispersive regime (need ≥ {min_det} GHz)"),
                    components = [r.name, r.qubit],
                    measured   = round(det, 4),
                    limit      = min_det,
                    units      = " GHz",
                )
            elif det > max_det:
                self._add(
                    rule       = "FREQUENCY.DISPERSIVE_DETUNING_HIGH",
                    severity   = SEVERITY_WARNING,
                    message    = (f"{r.name} detuning {det:.3f} GHz very large — "
                                  f"dispersive shift χ may be too small for readout"),
                    components = [r.name, r.qubit],
                    measured   = round(det, 4),
                    limit      = max_det,
                    units      = " GHz",
                )

    # ── Rule 6: Feedline clearance ────────────────────────────────────────────
    def _check_feedline_clearance(self) -> None:
        """Warn if any qubit centre is too close to the feedline y-position."""
        qubits = self.placement.qubits
        if not qubits:
            return

        fl_y    = max(q.y_mm for q in qubits) + 1.5    # expected feedline y
        min_clr = self.rules["feedline_qubit_clearance_mm"]
        pocket  = self.rules["qubit_pocket_half_size_mm"]

        for q in qubits:
            clearance = abs(fl_y - q.y_mm) - pocket
            if clearance < min_clr:
                self._add(
                    rule       = "SPACING.FEEDLINE_CLEARANCE",
                    severity   = SEVERITY_WARNING,
                    message    = f"{q.name} pocket may be too close to feedline",
                    components = [q.name],
                    measured   = round(clearance, 4),
                    limit      = min_clr,
                    units      = " mm",
                )

    # ── Rule 7: Geometry overlap pre-check ─────────────────────────────────
    def _check_geometry_overlap(self) -> None:
        """Pre-check potential geometry overlaps BEFORE Qiskit Metal build.

        Estimates whether resonator routes (modelled as straight-line bounding
        boxes) would intersect adjacent qubit pockets.  This mirrors the
        GEOMETRY.OVERLAP errors that Qiskit Metal reports during rebuild().

        The check is conservative (axis-aligned bounding box approximation)
        so real overlaps may vary.  It fires a WARNING rather than an ERROR
        so that Metal still attempts the build; if Metal's own DRC then
        reports overlaps, those appear in the build log.
        """
        qubits  = self.placement.qubits
        pocket  = self.rules.get("qubit_pocket_half_size_mm", 0.33)
        min_clr = self.rules.get("min_resonator_pocket_clearance_mm", 0.15)
        res_clr = self.rules.get("min_resonator_resonator_clearance_mm", 0.10)

        if not qubits:
            return

        # Estimate resonator bounding envelope per qubit.
        # We use a simple model: the resonator starts at the qubit centre
        # and travels 0.75 * qubit_spacing_mm in an alternating direction.
        xs = [q.x_mm for q in qubits]
        ys = [q.y_mm for q in qubits]
        if len(xs) < 2:
            return
        # Approximate qubit pitch from actual placement
        min_dist = float("inf")
        for i, qa in enumerate(qubits):
            for j, qb in enumerate(qubits):
                if j <= i:
                    continue
                d = math.sqrt((qa.x_mm - qb.x_mm) ** 2 + (qa.y_mm - qb.y_mm) ** 2)
                if d < min_dist:
                    min_dist = d
        pitch_est = min_dist  # mm

        # Resonator route half-length ~ 0.75 * pitch along readout direction
        # Readout directions alternate per qubit (approximation)
        ro_dirs = [
            (+1, +1), (-1, +1), (+1, -1), (-1, -1),
            (+1, +1), (-1, +1), (+1, -1), (-1, -1),
        ]
        res_boxes: list = []  # (x_min, y_min, x_max, y_max, qubit_name)
        for idx, q in enumerate(qubits):
            rwx, rwy = ro_dirs[idx % len(ro_dirs)]
            rl = pitch_est * 0.75
            ex = q.x_mm + rwx * rl
            ey = q.y_mm + rwy * rl
            # Bounding box of the route (fat trace width ~ 0.03 mm)
            half_w = 0.03
            x_min = min(q.x_mm, ex) - half_w
            x_max = max(q.x_mm, ex) + half_w
            y_min = min(q.y_mm, ey) - half_w
            y_max = max(q.y_mm, ey) + half_w
            res_boxes.append((x_min, y_min, x_max, y_max, q.name))

        # Check resonator bounding boxes against OTHER qubit pockets
        for (rx0, ry0, rx1, ry1, rq_name) in res_boxes:
            for qb in qubits:
                if qb.name == rq_name:
                    continue  # Skip the qubit the resonator belongs to
                # Qubit pocket bounding box
                px0 = qb.x_mm - pocket
                px1 = qb.x_mm + pocket
                py0 = qb.y_mm - pocket
                py1 = qb.y_mm + pocket
                # Check AABB intersection with clearance margin
                clearance_x = max(px0 - rx1, rx0 - px1)
                clearance_y = max(py0 - ry1, ry0 - py1)
                if clearance_x < min_clr and clearance_y < min_clr:
                    overlap = max(-clearance_x, 0) * max(-clearance_y, 0)
                    self._add(
                        rule       = "GEOMETRY.OVERLAP",
                        severity   = SEVERITY_WARNING,
                        message    = (
                            f"Resonator of {rq_name} may overlap {qb.name} pocket "
                            f"(estimated clearance X={clearance_x:.3f}mm Y={clearance_y:.3f}mm)"
                        ),
                        components = [rq_name, qb.name],
                        measured   = round(overlap, 4),
                        limit      = 0.0,
                        units      = " mm²",
                    )

        # Check resonator bounding boxes against each other
        for i in range(len(res_boxes)):
            for j in range(i + 1, len(res_boxes)):
                rx0, ry0, rx1, ry1, rq_a = res_boxes[i]
                sx0, sy0, sx1, sy1, rq_b = res_boxes[j]
                clearance_x = max(sx0 - rx1, rx0 - sx1)
                clearance_y = max(sy0 - ry1, ry0 - sy1)
                if clearance_x < res_clr and clearance_y < res_clr:
                    self._add(
                        rule       = "GEOMETRY.OVERLAP",
                        severity   = SEVERITY_WARNING,
                        message    = (
                            f"Resonator routes of {rq_a} and {rq_b} may intersect "
                            f"(estimated clearance X={clearance_x:.3f}mm Y={clearance_y:.3f}mm)"
                        ),
                        components = [rq_a, rq_b],
                        measured   = 0.0,
                        limit      = 0.0,
                        units      = " mm²",
                    )

    # ── Run all ────────────────────────────────────────────────────────────────
    def run_all(self) -> DRCReport:
        """Run all DRC checks and return a DRCReport."""
        self._violations = []
        self._check_qubit_spacing()
        self._check_cpw_dims()
        self._check_qubit_frequency_detuning()
        self._check_resonator_frequencies()
        self._check_dispersive_detuning()
        self._check_feedline_clearance()
        self._check_geometry_overlap()  # pre-check before Metal build
        return DRCReport(violations=list(self._violations))

    def run(self, rules: List[str] | None = None) -> DRCReport:
        """Run specific rules by name prefix (e.g. ['FREQUENCY', 'SPACING'])."""
        self.run_all()
        if rules:
            filtered = [v for v in self._violations
                        if any(v.rule.startswith(r) for r in rules)]
            return DRCReport(violations=filtered)
        return DRCReport(violations=list(self._violations))


# ─────────────────────────────────────────────────────────────────────────────
# Convenience function
# ─────────────────────────────────────────────────────────────────────────────

def run_drc(placement, freq_plan, rules: dict | None = None) -> DRCReport:
    """One-call DRC — returns a DRCReport."""
    return DRCChecker(placement, freq_plan, rules).run_all()


# ─────────────────────────────────────────────────────────────────────────────
# Standalone demo
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from frequency_planner import plan_chip
    from topology_router   import place_qubits

    for n in [4, 8]:
        print(f"\n{'='*60}")
        print(f"  DRC for {n}-qubit grid chip")
        print(f"{'='*60}")
        freq_plan = plan_chip(n)
        placement = place_qubits(n, "grid")
        report    = run_drc(placement, freq_plan)
        print(report)
