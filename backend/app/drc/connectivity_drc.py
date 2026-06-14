"""
connectivity_drc.py — Connectivity domain DRC checks.

Checks
------
  DISCONNECTED_QUBIT  — qubit has no coupler connections
  MISSING_RESONATOR   — qubit has no readout resonator
  BROKEN_FEEDLINE     — resonator not connected to any feedline
  FLOATING_RESONATOR  — resonator not connected to any qubit
  MISSING_LAUNCHPAD   — feedline has no launch pads (no I/O path)
  ISOLATED_COMPONENT  — any node with no edges at all
"""

from __future__ import annotations

from typing import Any, Dict, List, Set

from app.drc.report import DRCViolation


class ConnectivityDRC:
    """Connectivity domain DRC — checks that all nodes are properly connected."""

    def __init__(
        self,
        qubit_ids:       List[str],
        coupler_edges:   List[tuple],        # [(qa_id, qb_id)]
        resonator_map:   Dict[str, str],     # resonator_id → qubit_id
        feedline_taps:   Dict[str, List[str]], # feedline_id → [resonator_ids]
        launchpad_feeds: Dict[str, List[str]], # feedline_id → [launchpad_ids]
    ) -> None:
        self.qubit_ids     = qubit_ids
        self.coupler_edges = coupler_edges       # qubit ↔ qubit pairs
        self.resonator_map = resonator_map       # res_id → qubit_id
        self.feedline_taps = feedline_taps
        self.lp_feeds      = launchpad_feeds
        self._v: List[DRCViolation] = []

    def _add(self, rule, severity, message, components=None):
        self._v.append(DRCViolation(
            rule=rule, domain="connectivity", severity=severity,
            message=message, components=components or [],
        ))

    def check_disconnected_qubits(self) -> None:
        """Every qubit (except in single-qubit designs) must have at least one coupler."""
        if len(self.qubit_ids) <= 1:
            return
        coupled: Set[str] = set()
        for qa, qb in self.coupler_edges:
            coupled.add(qa); coupled.add(qb)
        for qid in self.qubit_ids:
            if qid not in coupled:
                self._add("DISCONNECTED_QUBIT", "WARNING",
                          f"Qubit '{qid}' has no coupler connections", [qid])

    def check_missing_resonators(self) -> None:
        """Every qubit should have a readout resonator."""
        qubits_with_resonator: Set[str] = set(self.resonator_map.values())
        for qid in self.qubit_ids:
            if qid not in qubits_with_resonator:
                self._add("MISSING_RESONATOR", "WARNING",
                          f"Qubit '{qid}' has no readout resonator — "
                          f"qubit cannot be measured", [qid])

    def check_floating_resonators(self) -> None:
        """Resonators not connected to any qubit."""
        valid_qubits: Set[str] = set(self.qubit_ids)
        for res_id, qubit_id in self.resonator_map.items():
            if qubit_id not in valid_qubits:
                self._add("FLOATING_RESONATOR", "ERROR",
                          f"Resonator '{res_id}' references unknown qubit '{qubit_id}'",
                          [res_id, qubit_id])

    def check_broken_feedline(self) -> None:
        """Resonators not tapped into any feedline."""
        tapped: Set[str] = {
            r for taps in self.feedline_taps.values() for r in taps
        }
        all_resonators = set(self.resonator_map.keys())
        for res_id in all_resonators:
            if res_id not in tapped:
                self._add("BROKEN_FEEDLINE", "WARNING",
                          f"Resonator '{res_id}' is not connected to any feedline — "
                          f"readout signal has no path to I/O", [res_id])

    def check_launchpads(self) -> None:
        """Feedlines should have at least one launchpad."""
        for fl_id in self.feedline_taps:
            lps = self.lp_feeds.get(fl_id, [])
            if not lps:
                self._add("MISSING_LAUNCHPAD", "WARNING",
                          f"Feedline '{fl_id}' has no launchpads — no I/O path", [fl_id])

    def check_isolated_components(self) -> None:
        """Any qubit with zero edges of any kind."""
        all_ids_in_edges: Set[str] = set()
        for qa, qb in self.coupler_edges:
            all_ids_in_edges.add(qa); all_ids_in_edges.add(qb)
        all_ids_in_edges.update(self.resonator_map.values())
        for qid in self.qubit_ids:
            if qid not in all_ids_in_edges:
                self._add("ISOLATED_COMPONENT", "ERROR",
                          f"Qubit '{qid}' is completely isolated (no couplers, no resonator)",
                          [qid])

    def run(self) -> List[DRCViolation]:
        self._v = []
        self.check_disconnected_qubits()
        self.check_missing_resonators()
        self.check_floating_resonators()
        self.check_broken_feedline()
        self.check_launchpads()
        self.check_isolated_components()
        return list(self._v)
