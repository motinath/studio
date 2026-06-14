"""
QChipLang AST Node Definitions

All nodes in the Abstract Syntax Tree of a .qcl program.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union


# ─── Value Types ──────────────────────────────────────────────────────────────

@dataclass
class QValue:
    """A numeric value with optional unit, e.g. 5.0GHz or 400um."""
    number: float
    unit: Optional[str] = None

    def to_si(self) -> float:
        """Convert to SI base units."""
        FREQ = {'Hz': 1, 'kHz': 1e3, 'MHz': 1e6, 'GHz': 1e9, 'THz': 1e12}
        LEN  = {'nm': 1e-9, 'um': 1e-6, 'mm': 1e-3, 'cm': 1e-2}
        TIME = {'ns': 1e-9, 'us': 1e-6, 'ms': 1e-3}
        for d in [FREQ, LEN, TIME]:
            if self.unit in d:
                return self.number * d[self.unit]
        return self.number

    def to_qm(self) -> str:
        """Format for Qiskit Metal (keeps natural units)."""
        if self.unit:
            return f"{self.number}{self.unit}"
        return str(self.number)

    def __repr__(self):
        return f"{self.number}{self.unit or ''}"


@dataclass
class QArray:
    """A list of values, e.g. [4.5GHz, 5.5GHz]."""
    items: List[Any]


@dataclass
class QTuple:
    """A parenthesized pair/triple, e.g. (1000um, 1000um)."""
    items: List[Any]


@dataclass
class QRange:
    """An index range, e.g. 0:49999."""
    start: int
    end: int


@dataclass
class QSweep:
    """A parametric sweep, e.g. sweep(4.8GHz, 5.2GHz, alternating)."""
    start: QValue
    end: QValue
    mode: str  # "alternating" | "linear" | "random"


@dataclass
class QFromFile:
    """A file reference, e.g. from_file("graph.edgelist")."""
    path: str


@dataclass
class QEdge:
    """A keyword=value entry for edge_attr e.g. north, south."""
    name: str


# ─── Top-Level Blocks ─────────────────────────────────────────────────────────

@dataclass
class ChipDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class QubitDecl:
    name: str
    dims: Optional[List[int]]      # None for scalar, [8,8] for 8x8 array
    index_range: Optional[QRange]  # for qubit[0:7] reference
    attrs: Dict[str, Any]


@dataclass
class ResonatorDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class CouplerDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class ConnectStmt:
    left: str
    right: str
    attrs: Dict[str, Any]


@dataclass
class TopologyDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class TileDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class TileArrayDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class FeedlineDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class FluxLineDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class DriveLineDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class PackageDecl:
    attrs: Dict[str, Any]


@dataclass
class IOPortDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class LayerDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class ProcessStackDecl:
    substrate: Dict[str, Any]
    layers: List[LayerDecl]


@dataclass
class DesignRulesDecl:
    attrs: Dict[str, Any]


@dataclass
class ApplicationDecl:
    name: str
    attrs: Dict[str, Any]


@dataclass
class SimulateDecl:
    attrs: Dict[str, Any]


@dataclass
class Program:
    """Root AST node — the entire .qcl program."""
    chip: Optional[ChipDecl] = None
    qubits: List[QubitDecl] = field(default_factory=list)
    resonators: List[ResonatorDecl] = field(default_factory=list)
    couplers: List[CouplerDecl] = field(default_factory=list)
    connections: List[ConnectStmt] = field(default_factory=list)
    topologies: List[TopologyDecl] = field(default_factory=list)
    tiles: List[TileDecl] = field(default_factory=list)
    tile_arrays: List[TileArrayDecl] = field(default_factory=list)
    feedlines: List[FeedlineDecl] = field(default_factory=list)
    flux_lines: List[FluxLineDecl] = field(default_factory=list)
    drive_lines: List[DriveLineDecl] = field(default_factory=list)
    package: Optional[PackageDecl] = None
    io_ports: List[IOPortDecl] = field(default_factory=list)
    process_stack: Optional[ProcessStackDecl] = None
    design_rules: Optional[DesignRulesDecl] = None
    applications: List[ApplicationDecl] = field(default_factory=list)
    simulate: Optional[SimulateDecl] = None
