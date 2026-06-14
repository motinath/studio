"""
validator.py — Structural validity checks for DesignGraph.

These checks run before any physics computation (placement, routing, DRC).
They catch structural problems: dangling references, duplicate IDs,
disconnected qubits, missing resonators.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from app.core.design_graph.graph import DesignGraph
from app.core.design_graph.node import NodeKind


@dataclass
class ValidationIssue:
    severity: str   # "error" | "warning"
    code:     str   # e.g. "DISCONNECTED_QUBIT"
    message:  str
    nodes:    List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "severity": self.severity,
            "code":     self.code,
            "message":  self.message,
            "nodes":    self.nodes,
        }


@dataclass
class ValidationResult:
    issues: List[ValidationIssue] = field(default_factory=list)

    @property
    def errors(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == "warning"]

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0

    def to_dict(self) -> dict:
        return {
            "passed":   self.passed,
            "errors":   len(self.errors),
            "warnings": len(self.warnings),
            "issues":   [i.to_dict() for i in self.issues],
        }


class GraphValidator:
    """Validates a DesignGraph for structural correctness."""

    def __init__(self, graph: DesignGraph) -> None:
        self.graph = graph
        self._issues: List[ValidationIssue] = []

    def _add(self, severity: str, code: str, message: str, nodes: list | None = None) -> None:
        self._issues.append(ValidationIssue(
            severity=severity,
            code=code,
            message=message,
            nodes=nodes or [],
        ))

    # ── Check: at least one qubit ────────────────────────────────────────────
    def _check_has_qubits(self) -> None:
        if len(self.graph.qubits) == 0:
            self._add("error", "NO_QUBITS", "Design graph has no qubit nodes")

    # ── Check: unique node IDs ────────────────────────────────────────────────
    def _check_unique_ids(self) -> None:
        seen: set[str] = set()
        for node in self.graph.nodes:
            if node.id in seen:
                self._add("error", "DUPLICATE_NODE_ID",
                          f"Node ID '{node.id}' is duplicated", [node.id])
            seen.add(node.id)

    # ── Check: coupler references valid qubit IDs ────────────────────────────
    def _check_coupler_references(self) -> None:
        qubit_ids = {q.id for q in self.graph.qubits}
        for c in self.graph.couplers:
            if c.qubit_a_id and c.qubit_a_id not in qubit_ids:
                self._add("error", "INVALID_COUPLER_REF",
                          f"Coupler '{c.id}' references unknown qubit '{c.qubit_a_id}'",
                          [c.id, c.qubit_a_id])
            if c.qubit_b_id and c.qubit_b_id not in qubit_ids:
                self._add("error", "INVALID_COUPLER_REF",
                          f"Coupler '{c.id}' references unknown qubit '{c.qubit_b_id}'",
                          [c.id, c.qubit_b_id])
            if c.qubit_a_id and c.qubit_a_id == c.qubit_b_id:
                self._add("error", "SELF_COUPLING",
                          f"Coupler '{c.id}' connects qubit to itself", [c.id])

    # ── Check: resonator references valid qubit IDs ──────────────────────────
    def _check_resonator_references(self) -> None:
        qubit_ids = {q.id for q in self.graph.qubits}
        for r in self.graph.resonators:
            if r.target_qubit_id and r.target_qubit_id not in qubit_ids:
                self._add("error", "INVALID_RESONATOR_REF",
                          f"Resonator '{r.id}' references unknown qubit '{r.target_qubit_id}'",
                          [r.id, r.target_qubit_id])

    # ── Check: every qubit has a readout resonator ───────────────────────────
    def _check_readout_coverage(self) -> None:
        qubits_with_resonator = {r.target_qubit_id for r in self.graph.resonators}
        for q in self.graph.qubits:
            if q.id not in qubits_with_resonator:
                self._add("warning", "MISSING_RESONATOR",
                          f"Qubit '{q.id}' has no readout resonator", [q.id])

    # ── Check: no isolated (uncoupled) qubits ────────────────────────────────
    def _check_no_isolated_qubits(self) -> None:
        if len(self.graph.qubits) <= 1:
            return
        for q in self.graph.qubits:
            if not self.graph.coupled_qubits(q.id) and not self.graph.neighbors(q.id):
                self._add("warning", "ISOLATED_QUBIT",
                          f"Qubit '{q.id}' is not connected to any coupler", [q.id])

    # ── Check: chip size is reasonable ───────────────────────────────────────
    def _check_chip_size(self) -> None:
        n = len(self.graph.qubits)
        area = self.graph.chip_width_mm * self.graph.chip_height_mm
        # Rough heuristic: each qubit needs ~0.5 mm²
        min_area = n * 0.5
        if area < min_area:
            self._add("warning", "CHIP_TOO_SMALL",
                      f"Chip area {area:.1f}mm² may be too small for {n} qubits "
                      f"(recommend ≥ {min_area:.1f}mm²)")

    # ── Run all ───────────────────────────────────────────────────────────────
    def validate(self) -> ValidationResult:
        self._issues = []
        self._check_has_qubits()
        self._check_unique_ids()
        self._check_coupler_references()
        self._check_resonator_references()
        self._check_readout_coverage()
        self._check_no_isolated_qubits()
        self._check_chip_size()
        return ValidationResult(issues=list(self._issues))
