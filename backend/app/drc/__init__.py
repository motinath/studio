"""
drc/ — Advanced multi-domain DRC engine for Quantum Studio V2.

Modules
-------
geometry_drc      — metal overlap, CPW overlap, resonator/coupler collision
frequency_drc     — qubit collision, readout overlap, Purcell risk
fabrication_drc   — min width, min spacing, min bend radius
connectivity_drc  — disconnected qubit, missing resonator, broken feedline

Usage
-----
    from app.drc import run_full_drc, DRCReport
    report = run_full_drc(graph, constraints)
    if not report.passed:
        for v in report.errors:
            print(v)
"""

from app.drc.report import DRCViolation, DRCReport
from app.drc.runner import run_full_drc, run_drc_from_payload

__all__ = ["DRCViolation", "DRCReport", "run_full_drc", "run_drc_from_payload"]
