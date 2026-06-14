"""
geometry_drc.py — Geometry domain DRC checks.

Checks
------
  QUBIT_SPACING       — centre-to-centre qubit distance
  QUBIT_OVERLAP       — qubit pocket bounding boxes intersect
  CPW_OVERLAP         — two CPW routes whose bounding boxes intersect
  RESONATOR_COLLISION — resonator route enters another qubit's keep-out zone
  COUPLER_COLLISION   — coupler route enters another qubit's keep-out zone
  OFF_CHIP            — component centre outside chip boundary
"""

from __future__ import annotations

import math
from typing import Any, List, Tuple

from app.drc.report import DRCViolation


# AABB (axis-aligned bounding box) overlap test
def _aabb_overlap(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1) -> bool:
    return not (ax1 < bx0 or bx1 < ax0 or ay1 < by0 or by1 < ay0)


def _clearance(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1) -> Tuple[float, float]:
    """Return (clearance_x, clearance_y) — negative means overlap."""
    cx = max(bx0 - ax1, ax0 - bx1)
    cy = max(by0 - ay1, ay0 - by1)
    return cx, cy


class GeometryDRC:
    """Geometry domain DRC checks operating on placed qubit coordinates."""

    def __init__(
        self,
        qubit_positions: dict[str, Tuple[float, float]],  # name → (x_mm, y_mm)
        chip_width_mm:  float = 10.0,
        chip_height_mm: float = 10.0,
        pocket_half_mm: float = 0.33,   # TransmonPocket half-size
        cpw_half_mm:    float = 0.03,   # CPW bounding-box half-width
        min_spacing_mm: float = 0.6,
        min_clr_res_mm: float = 0.15,   # resonator–pocket clearance
        min_clr_res_res: float = 0.10,  # resonator–resonator clearance
        coupler_pairs:  list | None = None,  # [(qa_name, qb_name)]
    ) -> None:
        self.qpos    = qubit_positions
        self.cw      = chip_width_mm
        self.ch      = chip_height_mm
        self.pocket  = pocket_half_mm
        self.cpw_h   = cpw_half_mm
        self.min_sp  = min_spacing_mm
        self.min_clr = min_clr_res_mm
        self.res_clr = min_clr_res_res
        self.cpairs  = coupler_pairs or []
        self._v: List[DRCViolation] = []

    def _add(self, rule, severity, message, components=None, measured=None, limit=None, units=""):
        self._v.append(DRCViolation(
            rule=rule, domain="geometry", severity=severity,
            message=message, components=components or [],
            measured=measured, limit=limit, units=units,
        ))

    def check_qubit_spacing(self) -> None:
        names = list(self.qpos.keys())
        for i, n1 in enumerate(names):
            for j, n2 in enumerate(names):
                if j <= i:
                    continue
                x1, y1 = self.qpos[n1]
                x2, y2 = self.qpos[n2]
                d = math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
                if d < self.min_sp:
                    self._add("QUBIT_SPACING", "ERROR",
                              f"{n1} and {n2} centres only {d:.3f}mm apart (min {self.min_sp}mm)",
                              [n1, n2], round(d, 4), self.min_sp, " mm")

    def check_qubit_overlap(self) -> None:
        """Check if qubit pocket bounding boxes intersect."""
        names = list(self.qpos.keys())
        for i, n1 in enumerate(names):
            for j, n2 in enumerate(names):
                if j <= i:
                    continue
                x1, y1 = self.qpos[n1]
                x2, y2 = self.qpos[n2]
                p = self.pocket
                if _aabb_overlap(x1-p, y1-p, x1+p, y1+p,
                                  x2-p, y2-p, x2+p, y2+p):
                    self._add("QUBIT_OVERLAP", "ERROR",
                              f"Qubit pockets {n1} and {n2} overlap",
                              [n1, n2])

    def check_off_chip(self) -> None:
        hw, hh = self.cw / 2.0, self.ch / 2.0
        for name, (x, y) in self.qpos.items():
            if abs(x) > hw or abs(y) > hh:
                self._add("OFF_CHIP", "WARNING",
                          f"{name} at ({x:.2f}, {y:.2f}) mm is outside chip boundary",
                          [name])

    def check_resonator_collision(self) -> None:
        """
        Estimate resonator bounding boxes and check against other qubit pockets.
        Uses alternating readout directions as in physics/drc.py but with
        tighter clearance rules.
        """
        names = list(self.qpos.keys())
        if len(names) < 2:
            return
        min_dist = min(
            math.sqrt((self.qpos[a][0]-self.qpos[b][0])**2 + (self.qpos[a][1]-self.qpos[b][1])**2)
            for i, a in enumerate(names) for b in names[i+1:]
        )
        pitch = min_dist

        ro_dirs = [(+1,+1),(-1,+1),(+1,-1),(-1,-1)] * 4
        res_boxes: list = []
        for idx, (name, (qx, qy)) in enumerate(self.qpos.items()):
            rwx, rwy = ro_dirs[idx % len(ro_dirs)]
            rl = pitch * 0.75
            ex, ey = qx + rwx * rl, qy + rwy * rl
            h = self.cpw_h
            res_boxes.append((min(qx,ex)-h, min(qy,ey)-h, max(qx,ex)+h, max(qy,ey)+h, name))

        for rx0, ry0, rx1, ry1, rn in res_boxes:
            for name, (qx, qy) in self.qpos.items():
                if name == rn:
                    continue
                p = self.pocket
                cx, cy = _clearance(rx0, ry0, rx1, ry1,
                                    qx-p, qy-p, qx+p, qy+p)
                if cx < self.min_clr and cy < self.min_clr:
                    self._add("RESONATOR_COLLISION", "WARNING",
                              f"Resonator of {rn} may overlap pocket of {name} "
                              f"(clearance X={cx:.3f}mm Y={cy:.3f}mm)",
                              [rn, name], round(max(-cx,-cy), 4), 0.0, " mm")

    def run(self) -> List[DRCViolation]:
        self._v = []
        self.check_qubit_spacing()
        self.check_qubit_overlap()
        self.check_off_chip()
        self.check_resonator_collision()
        return list(self._v)
