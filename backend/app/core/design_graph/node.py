"""
node.py — Typed node definitions for the quantum chip design graph.

Every physical component in a quantum chip is represented as a node.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class NodeKind(str, Enum):
    QUBIT     = "qubit"
    COUPLER   = "coupler"
    RESONATOR = "resonator"
    FEEDLINE  = "feedline"
    LAUNCHPAD = "launchpad"


class QubitType(str, Enum):
    TRANSMON   = "transmon"
    FLUXONIUM  = "fluxonium"
    XMON       = "xmon"
    FLUX_QUBIT = "flux_qubit"


class CouplerType(str, Enum):
    FIXED   = "fixed"
    TUNABLE = "tunable"
    BUS     = "bus"


class ResonatorType(str, Enum):
    READOUT = "readout"
    BUS     = "bus"


class LaunchpadStyle(str, Enum):
    WIREBOND  = "wirebond"
    FLIP_CHIP = "flip_chip"
    CPW       = "cpw"


# ─────────────────────────────────────────────────────────────────────────────
# Base node — NOT a dataclass; subclasses use @dataclass
# ─────────────────────────────────────────────────────────────────────────────

class DesignNode:
    """Base class for all design-graph nodes."""

    kind: NodeKind  # set by each subclass __init__

    def __init__(self, id: str) -> None:
        self.id               = id
        self.x_mm: Optional[float]  = None
        self.y_mm: Optional[float]  = None
        self.orientation_deg: int   = 0
        self.meta: dict[str, Any]   = {}

    @property
    def placed(self) -> bool:
        return self.x_mm is not None and self.y_mm is not None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id":              self.id,
            "kind":            self.kind.value,
            "x_mm":            self.x_mm,
            "y_mm":            self.y_mm,
            "orientation_deg": self.orientation_deg,
            **self._extra_fields(),
        }

    def _extra_fields(self) -> dict[str, Any]:
        return {}


# ─────────────────────────────────────────────────────────────────────────────
# QubitNode
# ─────────────────────────────────────────────────────────────────────────────

class QubitNode(DesignNode):
    kind = NodeKind.QUBIT

    def __init__(
        self,
        id: str,
        qubit_type:        QubitType  = QubitType.TRANSMON,
        frequency_ghz:     float      = 5.0,
        anharmonicity_ghz: float      = -0.340,
        ej_ghz:            float      = 0.0,
        ec_ghz:            float      = 0.0,
        group:             str        = "A",
        pad_gap_um:        float      = 30.0,
        pad_width_um:      float      = 455.0,
        pad_height_um:     float      = 90.0,
        pocket_width_um:   float      = 650.0,
        pocket_height_um:  float      = 650.0,
        t1_us:             float      = 0.0,
        t2_us:             float      = 0.0,
    ) -> None:
        super().__init__(id)
        self.qubit_type        = qubit_type
        self.frequency_ghz     = frequency_ghz
        self.anharmonicity_ghz = anharmonicity_ghz
        self.group             = group
        self.pad_gap_um        = pad_gap_um
        self.pad_width_um      = pad_width_um
        self.pad_height_um     = pad_height_um
        self.pocket_width_um   = pocket_width_um
        self.pocket_height_um  = pocket_height_um
        self.t1_us             = t1_us
        self.t2_us             = t2_us

        # Derive EJ / EC if not supplied
        ec = abs(anharmonicity_ghz)
        ej = (frequency_ghz + ec) ** 2 / (8.0 * ec) if ec > 0 else 0.0
        self.ec_ghz = round(ec_ghz if ec_ghz != 0.0 else ec, 4)
        self.ej_ghz = round(ej_ghz if ej_ghz != 0.0 else ej, 3)

    def _extra_fields(self) -> dict[str, Any]:
        return {
            "qubit_type":        self.qubit_type.value,
            "frequency_ghz":     self.frequency_ghz,
            "anharmonicity_ghz": self.anharmonicity_ghz,
            "ej_ghz":            self.ej_ghz,
            "ec_ghz":            self.ec_ghz,
            "group":             self.group,
            "pad_gap_um":        self.pad_gap_um,
            "t1_us":             self.t1_us,
            "t2_us":             self.t2_us,
        }


# ─────────────────────────────────────────────────────────────────────────────
# CouplerNode
# ─────────────────────────────────────────────────────────────────────────────

class CouplerNode(DesignNode):
    kind = NodeKind.COUPLER

    def __init__(
        self,
        id: str,
        coupler_type: CouplerType = CouplerType.FIXED,
        strength_mhz: float       = 10.0,
        cpw_width_um: float       = 10.0,
        cpw_gap_um:   float       = 6.0,
        qubit_a_id:   str         = "",
        qubit_b_id:   str         = "",
    ) -> None:
        super().__init__(id)
        self.coupler_type = coupler_type
        self.strength_mhz = strength_mhz
        self.cpw_width_um = cpw_width_um
        self.cpw_gap_um   = cpw_gap_um
        self.qubit_a_id   = qubit_a_id
        self.qubit_b_id   = qubit_b_id

    def _extra_fields(self) -> dict[str, Any]:
        return {
            "coupler_type": self.coupler_type.value,
            "strength_mhz": self.strength_mhz,
            "qubit_a_id":   self.qubit_a_id,
            "qubit_b_id":   self.qubit_b_id,
        }


# ─────────────────────────────────────────────────────────────────────────────
# ResonatorNode
# ─────────────────────────────────────────────────────────────────────────────

class ResonatorNode(DesignNode):
    kind = NodeKind.RESONATOR

    def __init__(
        self,
        id: str,
        resonator_type:  ResonatorType = ResonatorType.READOUT,
        frequency_ghz:   float         = 6.5,
        length_mm:       float         = 7.5,
        detuning_ghz:    float         = 1.5,
        cpw_width_um:    float         = 10.0,
        cpw_gap_um:      float         = 6.0,
        target_qubit_id: str           = "",
    ) -> None:
        super().__init__(id)
        self.resonator_type  = resonator_type
        self.frequency_ghz   = frequency_ghz
        self.length_mm       = length_mm
        self.detuning_ghz    = detuning_ghz
        self.cpw_width_um    = cpw_width_um
        self.cpw_gap_um      = cpw_gap_um
        self.target_qubit_id = target_qubit_id

    def _extra_fields(self) -> dict[str, Any]:
        return {
            "resonator_type":  self.resonator_type.value,
            "frequency_ghz":   self.frequency_ghz,
            "length_mm":       self.length_mm,
            "detuning_ghz":    self.detuning_ghz,
            "target_qubit_id": self.target_qubit_id,
        }


# ─────────────────────────────────────────────────────────────────────────────
# FeedlineNode
# ─────────────────────────────────────────────────────────────────────────────

class FeedlineNode(DesignNode):
    kind = NodeKind.FEEDLINE

    def __init__(
        self,
        id: str,
        length_mm:    float = 10.0,
        cpw_width_um: float = 10.0,
        cpw_gap_um:   float = 6.0,
        x2_mm:        float = 0.0,
        y2_mm:        float = 0.0,
    ) -> None:
        super().__init__(id)
        self.length_mm    = length_mm
        self.cpw_width_um = cpw_width_um
        self.cpw_gap_um   = cpw_gap_um
        self.x2_mm        = x2_mm
        self.y2_mm        = y2_mm

    def _extra_fields(self) -> dict[str, Any]:
        return {
            "length_mm":    self.length_mm,
            "cpw_width_um": self.cpw_width_um,
            "cpw_gap_um":   self.cpw_gap_um,
            "x2_mm":        self.x2_mm,
            "y2_mm":        self.y2_mm,
        }


# ─────────────────────────────────────────────────────────────────────────────
# LaunchpadNode
# ─────────────────────────────────────────────────────────────────────────────

class LaunchpadNode(DesignNode):
    kind = NodeKind.LAUNCHPAD

    def __init__(
        self,
        id: str,
        style:        LaunchpadStyle = LaunchpadStyle.WIREBOND,
        pad_width_um: float          = 300.0,
        pad_gap_um:   float          = 15.0,
    ) -> None:
        super().__init__(id)
        self.style        = style
        self.pad_width_um = pad_width_um
        self.pad_gap_um   = pad_gap_um

    def _extra_fields(self) -> dict[str, Any]:
        return {
            "style":        self.style.value,
            "pad_width_um": self.pad_width_um,
        }
