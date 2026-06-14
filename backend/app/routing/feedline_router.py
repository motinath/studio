"""
feedline_router.py — Route the common CPW feedline across the chip.

Strategy
--------
The feedline runs horizontally across the top of the chip, passing close
to every readout resonator endpoint so a gap-coupled tap can be formed.
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional, Tuple

from app.routing.result import Point, RouteSegment


class FeedlineRouter:
    """
    Routes a single horizontal feedline that passes close to all
    readout resonator endpoints.

    The feedline:
    - Starts at the left launchpad (chip_left + margin, fl_y)
    - Ends at the right launchpad (chip_right - margin, fl_y)
    - fl_y is chosen to be above all resonator endpoints
    """

    def __init__(
        self,
        chip_width_mm:   float,
        chip_height_mm:  float,
        resonator_endpoints: List[Point],  # (x_mm, y_mm) end of each resonator
        cpw_width_um:    float = 10.0,
        cpw_gap_um:      float = 6.0,
        margin_mm:       float = 0.5,
        fl_y_offset_mm:  float = 0.3,   # clearance above highest resonator endpoint
    ) -> None:
        self.cw        = chip_width_mm
        self.ch        = chip_height_mm
        self.res_eps   = resonator_endpoints
        self.width     = cpw_width_um
        self.gap       = cpw_gap_um
        self.margin    = margin_mm
        self.fl_y_off  = fl_y_offset_mm

    def _feedline_y(self) -> float:
        """Place feedline above all resonator endpoints."""
        if not self.res_eps:
            return self.ch / 2.0
        max_y = max(y for _, y in self.res_eps)
        return round(max_y + self.fl_y_off, 4)

    def route(self) -> Tuple[List[RouteSegment], float]:
        """
        Returns (segments, feedline_y_mm).
        Segments contains one main feedline segment plus short stubs
        toward each resonator endpoint.
        """
        fl_y = self._feedline_y()
        x_start = -self.cw / 2.0 + self.margin
        x_end   =  self.cw / 2.0 - self.margin

        # Main feedline
        length_main = abs(x_end - x_start)
        main_seg = RouteSegment(
            start     = (x_start, fl_y),
            end       = (x_end,   fl_y),
            waypoints = [],
            width_um  = self.width,
            gap_um    = self.gap,
            length_mm = round(length_main, 4),
            label     = "Feedline_main",
        )

        segments: List[RouteSegment] = [main_seg]

        # Short stub from feedline down to each resonator endpoint
        for i, (rx, ry) in enumerate(self.res_eps):
            tap_x    = rx                       # tap is directly above resonator end
            stub_len = abs(fl_y - ry)
            stub = RouteSegment(
                start     = (tap_x, fl_y),
                end       = (tap_x, ry),
                waypoints = [],
                width_um  = self.width,
                gap_um    = self.gap,
                length_mm = round(stub_len, 4),
                label     = f"FL_tap_{i+1}",
            )
            segments.append(stub)

        return segments, fl_y
