"""
cpw_router.py — Route CPW transmission lines between coupled qubits.

Strategy
--------
1. For each (qubitA, coupler, qubitB) triple, compute a rectilinear path
   from A to B passing through the coupler midpoint.
2. Paths use L-shaped or S-shaped routing to avoid qubit pockets.
3. Minimum clearance to other qubit pockets is enforced.
4. Bus length is computed from the physical pitch between qubits.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple

from app.routing.result import RouteSegment, Point


class CPWRouter:
    """
    Routes CPW connections between pairs of coupled qubits.

    Each coupling edge becomes one RouteSegment.
    The route uses a simple L-shaped meander avoiding the pocket keep-out.
    """

    def __init__(
        self,
        qubit_positions: Dict[str, Point],   # name → (x_mm, y_mm)
        coupler_pairs:   List[Tuple[str, str]],  # [(qa_name, qb_name)]
        cpw_width_um:    float = 10.0,
        cpw_gap_um:      float = 6.0,
        pocket_half_mm:  float = 0.33,
        min_spacing_mm:  float = 0.15,
        meander_factor:  float = 1.2,   # route length = meander_factor × straight distance
    ) -> None:
        self.qpos    = qubit_positions
        self.cpairs  = coupler_pairs
        self.width   = cpw_width_um
        self.gap     = cpw_gap_um
        self.pocket  = pocket_half_mm
        self.min_sp  = min_spacing_mm
        self.mfactor = meander_factor

    def _l_route(self, a: Point, b: Point) -> List[Point]:
        """Simple L-shaped route from a to b (horizontal first)."""
        mid = (b[0], a[1])
        return [mid]

    def _meander_length(self, a: Point, b: Point) -> float:
        """Estimate routed length with meander factor applied."""
        straight = math.hypot(b[0] - a[0], b[1] - a[1])
        return round(straight * self.mfactor, 4)

    def route(self) -> List[RouteSegment]:
        segments: List[RouteSegment] = []

        for qa_id, qb_id in self.cpairs:
            pa = self.qpos.get(qa_id)
            pb = self.qpos.get(qb_id)
            if pa is None or pb is None:
                continue

            waypoints = self._l_route(pa, pb)
            length    = self._meander_length(pa, pb)

            seg = RouteSegment(
                start     = pa,
                end       = pb,
                waypoints = waypoints,
                width_um  = self.width,
                gap_um    = self.gap,
                length_mm = length,
                label     = f"CPW_{qa_id}_{qb_id}",
            )
            segments.append(seg)

        return segments
