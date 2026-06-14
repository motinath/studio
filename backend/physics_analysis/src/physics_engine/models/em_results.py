"""Pydantic models for AWS Palace EM simulation results.

This is the INPUT contract from the Palace / Simulation team.
The Physics Engine consumes this data to compute qubit parameters.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class CapacitanceMatrix(BaseModel):
    """Maxwell capacitance matrix extracted from Palace electrostatic simulation.

    The matrix is N×N where N is the number of terminals (qubit islands,
    resonator pads, etc.). Diagonal elements are self-capacitances (positive),
    off-diagonal elements are mutual capacitances (negative in Maxwell convention).
    """

    units: str = Field(
        default="fF",
        description="Units for capacitance values. Typically 'fF' (femtofarads).",
    )
    terminal_ids: list[str] = Field(
        description="Ordered list of terminal identifiers matching matrix rows/columns. "
        "E.g., ['Q1_island', 'Q2_island', 'R1'].",
    )
    matrix: list[list[float]] = Field(
        description="N×N capacitance matrix. matrix[i][j] is the capacitance between "
        "terminal_ids[i] and terminal_ids[j].",
    )

    @property
    def size(self) -> int:
        """Number of terminals."""
        return len(self.terminal_ids)

    def get_self_capacitance(self, terminal_id: str) -> float:
        """Get diagonal (self) capacitance for a terminal, in the matrix units."""
        idx = self.terminal_ids.index(terminal_id)
        return self.matrix[idx][idx]

    def get_mutual_capacitance(self, terminal_a: str, terminal_b: str) -> float:
        """Get off-diagonal (mutual) capacitance between two terminals."""
        idx_a = self.terminal_ids.index(terminal_a)
        idx_b = self.terminal_ids.index(terminal_b)
        return self.matrix[idx_a][idx_b]


class InductanceEntry(BaseModel):
    """Inductance value for a specific inductive element (e.g., superinductor).

    Extracted from Palace magnetostatic simulation.
    """

    element_id: str = Field(description="Identifier for the inductive element.")
    inductance_nH: float = Field(
        description="Inductance value in nanohenries (nH).", gt=0
    )


class EigenmodeResult(BaseModel):
    """Single eigenmode from Palace eigenmode simulation.

    Each mode has a frequency, quality factor, and energy participation
    ratios (EPR) across the Josephson junctions in the design.
    """

    mode_index: int = Field(description="Mode number (1-indexed).", ge=1)
    frequency_ghz: float = Field(description="Resonant frequency in GHz.", gt=0)
    quality_factor: float = Field(
        description="Quality factor (Q) of this mode.", gt=0
    )
    epr: dict[str, float] = Field(
        default_factory=dict,
        description="Energy participation ratios: {junction_id: participation_fraction}. "
        "Values between 0 and 1. High EPR (>0.8) in a junction means this mode "
        "is primarily the qubit mode for that junction.",
    )


class ElectrostaticResults(BaseModel):
    """Electrostatic simulation results from Palace."""

    capacitance_matrix: CapacitanceMatrix


class MagnetostaticResults(BaseModel):
    """Magnetostatic simulation results from Palace."""

    inductance_data: list[InductanceEntry] = Field(default_factory=list)


class EigenmodeSuite(BaseModel):
    """Collection of eigenmode results from Palace."""

    modes: list[EigenmodeResult] = Field(default_factory=list)


class EMResults(BaseModel):
    """Top-level container for all Palace EM simulation results.

    This is the primary input to the Physics Analysis Engine from the
    simulation pipeline (Stage 4 → Stage 5 in the Silicofeller flow).

    Schema: silicofeller/em_results/v1
    """

    simulation_id: str = Field(description="Unique identifier for this simulation run.")
    timestamp: str = Field(description="ISO 8601 timestamp of simulation completion.")
    design_id: str = Field(description="Design identifier this simulation corresponds to.")
    electrostatic: ElectrostaticResults | None = Field(
        default=None,
        description="Capacitance extraction results.",
    )
    magnetostatic: MagnetostaticResults | None = Field(
        default=None,
        description="Inductance extraction results.",
    )
    eigenmode: EigenmodeSuite | None = Field(
        default=None,
        description="Eigenmode (resonant frequency) analysis results.",
    )

    def get_capacitance_matrix(self) -> CapacitanceMatrix:
        """Get the capacitance matrix, raising if not available."""
        if self.electrostatic is None:
            raise ValueError(
                "No electrostatic results available. "
                "Run Palace electrostatic simulation first."
            )
        return self.electrostatic.capacitance_matrix

    def get_inductance(self, element_id: str) -> float | None:
        """Get inductance for a specific element in nH, or None if not found."""
        if self.magnetostatic is None:
            return None
        for entry in self.magnetostatic.inductance_data:
            if entry.element_id == element_id:
                return entry.inductance_nH
        return None

    def get_eigenmode_for_junction(self, junction_id: str) -> EigenmodeResult | None:
        """Find the eigenmode with highest EPR for a given junction (i.e., the qubit mode)."""
        if self.eigenmode is None:
            return None
        best_mode = None
        best_epr = 0.0
        for mode in self.eigenmode.modes:
            epr_val = mode.epr.get(junction_id, 0.0)
            if epr_val > best_epr:
                best_epr = epr_val
                best_mode = mode
        return best_mode
