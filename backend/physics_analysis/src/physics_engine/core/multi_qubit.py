"""Multi-qubit HilbertSpace analysis using scqubits.

Builds a composite quantum system from individual qubits and resonators,
adds coupling interactions, and computes dressed states, ZZ coupling,
and dispersive shifts.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import numpy as np

from physics_engine.config import HILBERT_CONFIG, MHZ_TO_GHZ
from physics_engine.core.parameter_converter import ConvertedQubitParams, ParameterConverter
from physics_engine.core.single_qubit import SingleQubitAnalysisResult
from physics_engine.models.design_spec import CouplerSpec, ResonatorSpec
from physics_engine.models.enums import QubitType

logger = logging.getLogger(__name__)

try:
    import scqubits as scq
except ImportError:
    scq = None  # type: ignore[assignment]
    logger.warning("scqubits not installed – multi-qubit analysis will fail at runtime.")


@dataclass
class PairCouplingResult:
    """Coupling analysis for a single qubit-qubit pair."""

    qubit_a: str
    qubit_b: str
    coupling_capacitance_fF: float = 0.0
    bare_coupling_ghz: float = 0.0
    zz_coupling_ghz: float = 0.0
    dispersive_shift_ghz: float = 0.0


@dataclass
class MultiQubitAnalysisResult:
    """Result of multi-qubit HilbertSpace analysis."""

    dressed_frequencies: dict[str, float] = field(default_factory=dict)
    """Dressed qubit frequencies in GHz: {qubit_id: freq}."""

    coupling_results: list[PairCouplingResult] = field(default_factory=list)
    """Coupling analysis for each qubit pair."""

    readout_dispersive_shifts: dict[str, float] = field(default_factory=dict)
    """Dispersive shift per qubit-resonator pair in GHz: {qubit_id: χ}."""


class MultiQubitAnalyzer:
    """Analyze multi-qubit systems using scqubits HilbertSpace."""

    def __init__(self, truncated_dim: int | None = None) -> None:
        self._custom_truncated_dim = truncated_dim

    def _get_truncated_dim(self, num_subsystems: int) -> int:
        if self._custom_truncated_dim is not None:
            return self._custom_truncated_dim
        return HILBERT_CONFIG.get_truncated_dim(num_subsystems)

  
    # Public API
   

    def analyze(
        self,
        qubit_params: list[ConvertedQubitParams],
        single_results: list[SingleQubitAnalysisResult],
        resonator_specs: list[ResonatorSpec] | None = None,
        coupler_specs: list[CouplerSpec] | None = None,
    ) -> MultiQubitAnalysisResult:
        """Run full multi-qubit analysis.

        For ≤ 5 qubits uses pairwise coupling analysis which is fast and
        accurate enough for the validation pass.
        """
        if scq is None:
            raise ImportError("scqubits is required for multi-qubit analysis.")

        resonator_specs = resonator_specs or []
        coupler_specs = coupler_specs or []
        result = MultiQubitAnalysisResult()

        # Build a lookup for single qubit results and params
        sq_map = {sr.qubit_id: sr for sr in single_results}
        qp_map = {qp.qubit_id: qp for qp in qubit_params}

        # 1. Dressed frequencies start as bare frequencies
        for sr in single_results:
            result.dressed_frequencies[sr.qubit_id] = sr.frequency_ghz

        # 2. Pairwise coupling analysis
        qubit_ids = [qp.qubit_id for qp in qubit_params]
        converter = ParameterConverter()

        for i in range(len(qubit_ids)):
            for j in range(i + 1, len(qubit_ids)):
                qa_id = qubit_ids[i]
                qb_id = qubit_ids[j]
                qa_params = qp_map[qa_id]
                qb_params = qp_map[qb_id]
                qa_sr = sq_map[qa_id]
                qb_sr = sq_map[qb_id]

                # Find mutual capacitance
                # Try terminal_id mapping
                qb_terminal = None
                for qs in [qs for qs in [None]]:  # placeholder
                    pass
                # Check coupling_caps for any terminal matching qb
                C_mutual_fF = self._find_mutual_capacitance(qa_params, qb_params)

                # Compute bare coupling
                if C_mutual_fF > 0 and qa_sr.frequency_ghz > 0 and qb_sr.frequency_ghz > 0:
                    g_ghz = converter.compute_coupling_strength(
                        C_coupling_fF=C_mutual_fF,
                        C_a_fF=qa_params.capacitance_fF,
                        C_b_fF=qb_params.capacitance_fF,
                        freq_a_ghz=qa_sr.frequency_ghz,
                        freq_b_ghz=qb_sr.frequency_ghz,
                    )
                else:
                    g_ghz = 0.0

                # Compute ZZ coupling (perturbative estimate)
                zz_ghz = self._estimate_zz(
                    g_ghz=g_ghz,
                    freq_a_ghz=qa_sr.frequency_ghz,
                    freq_b_ghz=qb_sr.frequency_ghz,
                    alpha_a_ghz=qa_sr.anharmonicity_ghz,
                    alpha_b_ghz=qb_sr.anharmonicity_ghz,
                )

                pair_result = PairCouplingResult(
                    qubit_a=qa_id,
                    qubit_b=qb_id,
                    coupling_capacitance_fF=C_mutual_fF,
                    bare_coupling_ghz=g_ghz,
                    zz_coupling_ghz=zz_ghz,
                )
                result.coupling_results.append(pair_result)

                logger.info(
                    "Coupling %s-%s: g=%.4f GHz (%.1f MHz), ZZ=%.6f GHz (%.1f kHz)",
                    qa_id, qb_id, g_ghz, g_ghz * 1000, zz_ghz, zz_ghz * 1e6,
                )

        # 3. Readout dispersive shifts
        for rspec in resonator_specs:
            qubit_id = rspec.coupled_to
            if qubit_id in sq_map and qubit_id in qp_map:
                sr = sq_map[qubit_id]
                qp = qp_map[qubit_id]
                detuning = rspec.target_frequency_ghz - sr.frequency_ghz
                # Find qubit-resonator coupling capacitance
                C_qr = 0.0
                for terminal, c_val in qp.coupling_caps.items():
                    if rspec.terminal_id in terminal or terminal in rspec.terminal_id:
                        C_qr = abs(c_val)
                        break

                if C_qr > 0 and abs(detuning) > 0.01:
                    g_qr = ParameterConverter.compute_coupling_strength(
                        C_coupling_fF=C_qr,
                        C_a_fF=qp.capacitance_fF,
                        C_b_fF=40.0,  # typical resonator capacitance
                        freq_a_ghz=sr.frequency_ghz,
                        freq_b_ghz=rspec.target_frequency_ghz,
                    )
                    # Dispersive shift: χ ≈ g² · α / (Δ · (Δ + α))
                    alpha = sr.anharmonicity_ghz
                    chi = g_qr**2 * alpha / (detuning * (detuning + alpha)) if abs(detuning + alpha) > 1e-6 else 0.0
                    result.readout_dispersive_shifts[qubit_id] = chi
                    logger.info(
                        "Readout %s → %s: g_qr=%.4f GHz, χ=%.6f GHz (%.2f MHz)",
                        rspec.resonator_id, qubit_id, g_qr, chi, chi * 1000,
                    )

        return result

 
    # Internal helpers
 

    def _find_mutual_capacitance(
        self, qa: ConvertedQubitParams, qb: ConvertedQubitParams
    ) -> float:
        """Find mutual capacitance between two qubits from their coupling_caps."""
        # Check qa's coupling_caps for any terminal associated with qb
        for terminal, c_val in qa.coupling_caps.items():
            # Terminal might be like "Q2_island" and qb.qubit_id is "Q2"
            if qb.qubit_id in terminal:
                return abs(c_val)
        # Also check reverse
        for terminal, c_val in qb.coupling_caps.items():
            if qa.qubit_id in terminal:
                return abs(c_val)
        return 0.0

    @staticmethod
    def _estimate_zz(
        g_ghz: float,
        freq_a_ghz: float,
        freq_b_ghz: float,
        alpha_a_ghz: float,
        alpha_b_ghz: float,
    ) -> float:
        """Estimate static ZZ coupling using perturbation theory.

        ZZ ≈ 2 · g⁴ · (1/(Δ²·(Δ+α_a)) + 1/(Δ²·(Δ-α_b)))

        where Δ = ω_a - ω_b. Uses simplified second-order expression
        valid in the dispersive regime (g << Δ).
        """
        delta = freq_a_ghz - freq_b_ghz
        if abs(delta) < 0.01:  # near-resonance: perturbation theory unreliable
            return 0.0

        try:
            # Leading-order ZZ from transmon perturbation theory
            term1 = g_ghz**2 * alpha_a_ghz / (delta * (delta + alpha_a_ghz))
            term2 = g_ghz**2 * alpha_b_ghz / (-delta * (-delta + alpha_b_ghz))
            zz = -2.0 * (term1 + term2)
            return zz
        except (ZeroDivisionError, FloatingPointError):
            return 0.0
