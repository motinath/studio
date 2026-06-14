"""result.py — Route result data structures."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Tuple


Point = Tuple[float, float]   # (x_mm, y_mm)


@dataclass
class RouteSegment:
    """A single CPW segment between two points."""
    start:    Point
    end:      Point
    waypoints: List[Point] = field(default_factory=list)
    width_um: float = 10.0
    gap_um:   float = 6.0
    length_mm: float = 0.0
    label:    str = ""

    def all_points(self) -> List[Point]:
        return [self.start] + self.waypoints + [self.end]

    def to_dict(self) -> dict[str, Any]:
        return {
            "start":      list(self.start),
            "end":        list(self.end),
            "waypoints":  [list(p) for p in self.waypoints],
            "width_um":   self.width_um,
            "gap_um":     self.gap_um,
            "length_mm":  round(self.length_mm, 4),
            "label":      self.label,
        }


@dataclass
class RouteResult:
    """Collection of all routed CPW segments for a chip."""
    coupler_routes:   List[RouteSegment] = field(default_factory=list)
    resonator_routes: List[RouteSegment] = field(default_factory=list)
    feedline_routes:  List[RouteSegment] = field(default_factory=list)
    unrouted:         List[str]          = field(default_factory=list)
    warnings:         List[str]          = field(default_factory=list)

    @property
    def total_length_mm(self) -> float:
        all_segs = self.coupler_routes + self.resonator_routes + self.feedline_routes
        return round(sum(s.length_mm for s in all_segs), 4)

    @property
    def routed_count(self) -> int:
        return len(self.coupler_routes) + len(self.resonator_routes) + len(self.feedline_routes)

    def to_dict(self) -> dict[str, Any]:
        return {
            "coupler_routes":   [s.to_dict() for s in self.coupler_routes],
            "resonator_routes": [s.to_dict() for s in self.resonator_routes],
            "feedline_routes":  [s.to_dict() for s in self.feedline_routes],
            "unrouted":         self.unrouted,
            "warnings":         self.warnings,
            "stats": {
                "total_segments":  self.routed_count,
                "total_length_mm": self.total_length_mm,
                "unrouted_count":  len(self.unrouted),
            },
        }
