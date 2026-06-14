"""
constraints/ — Constraint-driven design system.

The constraint system is what separates a professional EDA tool from a
code generator.  Instead of generating first and validating later, every
subsystem reads from a DesignConstraints object and generates WITHIN the
constraints.

Usage
-----
    from app.constraints import DesignConstraints
    c = DesignConstraints(qubit_count=20, chip_size_mm=10.0, topology="heavy_hex")
    graph = build_graph_from_constraints(c)
"""

from app.constraints.constraints import DesignConstraints, FabConstraints, FreqConstraints
from app.constraints.builder import build_graph_from_constraints

__all__ = [
    "DesignConstraints",
    "FabConstraints",
    "FreqConstraints",
    "build_graph_from_constraints",
]
