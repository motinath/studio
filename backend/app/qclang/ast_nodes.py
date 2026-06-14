"""
QCLang AST node definitions.

The AST is a plain dataclass hierarchy — serialisable to/from dicts.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Attribute:
    key: str
    value: str | float | int | bool


@dataclass
class QubitNode:
    name: str
    qubit_type: str = "transmon"
    attributes: list[Attribute] = field(default_factory=list)

    def get(self, key: str, default: Any = None) -> Any:
        for a in self.attributes:
            if a.key == key:
                return a.value
        return default


@dataclass
class CouplerNode:
    name: str
    qubit_a: str
    qubit_b: str
    attributes: list[Attribute] = field(default_factory=list)

    def get(self, key: str, default: Any = None) -> Any:
        for a in self.attributes:
            if a.key == key:
                return a.value
        return default


@dataclass
class ReadoutNode:
    name: str
    target_qubit: str
    attributes: list[Attribute] = field(default_factory=list)


@dataclass
class ResonatorNode:
    name: str
    target_qubit: str
    attributes: list[Attribute] = field(default_factory=list)


@dataclass
class VariableNode:
    name: str
    value: str | float | int | bool


@dataclass
class ChipNode:
    name: str
    qubits: list[QubitNode] = field(default_factory=list)
    couplers: list[CouplerNode] = field(default_factory=list)
    readouts: list[ReadoutNode] = field(default_factory=list)
    resonators: list[ResonatorNode] = field(default_factory=list)
    variables: list[VariableNode] = field(default_factory=list)

    @property
    def qubit_names(self) -> list[str]:
        return [q.name for q in self.qubits]

    @property
    def num_qubits(self) -> int:
        return len(self.qubits)


@dataclass
class Program:
    chips: list[ChipNode] = field(default_factory=list)

    @property
    def primary_chip(self) -> ChipNode | None:
        return self.chips[0] if self.chips else None


def ast_to_dict(node: Any) -> Any:
    """Recursively convert AST nodes to JSON-serialisable dicts."""
    if isinstance(node, (str, int, float, bool, type(None))):
        return node
    if isinstance(node, list):
        return [ast_to_dict(n) for n in node]
    if hasattr(node, "__dataclass_fields__"):
        return {
            "__type__": type(node).__name__,
            **{k: ast_to_dict(getattr(node, k)) for k in node.__dataclass_fields__},
        }
    return str(node)
