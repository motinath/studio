"""
edge.py — Typed edges for the quantum chip design graph.

Edges encode the physical / logical connections between nodes.
Every connection in the chip (qubit↔coupler, qubit↔resonator,
resonator↔feedline, feedline↔launchpad) is an edge.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class EdgeKind(str, Enum):
    COUPLING    = "coupling"     # qubit ↔ coupler ↔ qubit
    READOUT     = "readout"      # qubit ↔ resonator
    FEEDLINE    = "feedline"     # resonator ↔ feedline
    IO          = "io"           # feedline ↔ launchpad
    BUS         = "bus"          # qubit ↔ bus-resonator ↔ qubit


@dataclass
class DesignEdge:
    """Directed edge between two design nodes.

    For undirected connections (e.g. coupler between two qubits) the
    direction is arbitrary but consistent: source_id < target_id
    lexicographically when possible.
    """
    source_id: str
    target_id: str
    kind:      EdgeKind
    pin_source: str = ""   # e.g. "readout", "bus_0", "a", "b"
    pin_target: str = ""
    label:     str = ""
    meta:      dict[str, Any] = field(default_factory=dict)

    @property
    def key(self) -> tuple[str, str]:
        """Canonical undirected key — smaller id first."""
        a, b = self.source_id, self.target_id
        return (a, b) if a <= b else (b, a)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_id":  self.source_id,
            "target_id":  self.target_id,
            "kind":       self.kind.value,
            "pin_source": self.pin_source,
            "pin_target": self.pin_target,
            "label":      self.label,
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "DesignEdge":
        return cls(
            source_id  = d["source_id"],
            target_id  = d["target_id"],
            kind       = EdgeKind(d.get("kind", EdgeKind.COUPLING.value)),
            pin_source = d.get("pin_source", ""),
            pin_target = d.get("pin_target", ""),
            label      = d.get("label", ""),
        )
