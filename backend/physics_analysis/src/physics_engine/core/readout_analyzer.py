"""Dispersive readout analysis for qubit-resonator pairs.

Computes dispersive shift χ, Purcell T1 limit, critical photon number,
and readout SNR estimates.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

from physics_engine.config import GHZ_TO_HZ, US_TO_S
from physics_engine.core.multi_qubit import MultiQubitAnalysisResult
from physics_engine.core.parameter_converter import ConvertedQubitParams, ParameterConverter
from physics_engine.core.single_qubit import SingleQubitAnalysisResult
from physics_engine.models.design_spec import ResonatorSpec

logger = logging.getLogger(__name__)


@dataclass
class ReadoutAnalysisResult:
    """Readout analysis for a single qubit-resonator pair."""

    resonator_id: str
    qubit_id: str
    resonator_freq_ghz: float
    detuning_ghz: float
    coupling_mhz: float
    dispersive_shift_mhz: float
    purcell_t1_limit_us: float
    critical_photon_number: float


class ReadoutAnalyzer:
    """Analyze dispersive readout performance for qubit-resonator pairs."""

    def analyze(
        self,
        multi_result: MultiQubitAnalysisResult,
        single_results: list[SingleQubitAnalysisResult],
        qubit_params: list[ConvertedQubitParams],
        resonator_specs: list[ResonatorSpec],
    ) -> list[ReadoutAnalysisResult]:
        """Compute readout metrics for all qubit-resonator pairs.

        Args:
            multi_result: Multi-qubit analysis containing dispersive shifts.
            single_results: Per-qubit analysis results.
            qubit_params: Converted qubit parameters.
            resonator_specs: Resonator specifications with targets.

        Returns:
            List of ReadoutAnalysisResult, one per qubit-resonator pair.
        """
        sq_map = {sr.qubit_id: sr for sr in single_results}
        qp_map = {qp.qubit_id: qp for qp in qubit_params}
        results: list[ReadoutAnalysisResult] = []

        for rspec in resonator_specs:
            qubit_id = rspec.coupled_to
            if qubit_id not in sq_map:
                logger.warning(
                    "Resonator '%s' coupled to unknown qubit '%s' — skipping.",
                    rspec.resonator_id, qubit_id,
                )
                continue

            sr = sq_map[qubit_id]
            qp = qp_map.get(qubit_id)

            # Detuning Δ = ω_r - ω_q
            detuning_ghz = rspec.target_frequency_ghz - sr.frequency_ghz

            # Dispersive shift χ from multi-qubit analysis
            chi_ghz = multi_result.readout_dispersive_shifts.get(qubit_id, 0.0)

            # If no chi from multi-qubit, estimate from parameters
            if abs(chi_ghz) < 1e-10 and qp is not None:
                chi_ghz = self._estimate_dispersive_shift(
                    detuning_ghz=detuning_ghz,
                    anharmonicity_ghz=sr.anharmonicity_ghz,
                    qubit_params=qp,
                    resonator_spec=rspec,
                )

            # Coupling strength estimate
            g_ghz = 0.0
            if qp is not None and abs(detuning_ghz) > 0.01:
                # Back-calculate g from χ: χ ≈ g² · α / (Δ · (Δ + α))
                alpha = sr.anharmonicity_ghz
                denom = detuning_ghz * (detuning_ghz + alpha)
                if abs(denom) > 1e-10 and abs(alpha) > 1e-10:
                    g2 = abs(chi_ghz * denom / alpha)
                    g_ghz = np.sqrt(g2) if g2 > 0 else 0.0

            # Purcell T1 limit: T1_P = (Δ/g)² / κ
            kappa_ghz = rspec.target_kappa_khz * 1e-6  # kHz → GHz
            purcell_t1_us = float('inf')
            if g_ghz > 0 and kappa_ghz > 0:
                purcell_t1_s = (detuning_ghz / g_ghz) ** 2 / (2.0 * np.pi * kappa_ghz * GHZ_TO_HZ)
                purcell_t1_us = purcell_t1_s / US_TO_S

            # Critical photon number: n_crit = Δ² / (4g²)
            critical_photon = float('inf')
            if g_ghz > 0:
                critical_photon = detuning_ghz**2 / (4.0 * g_ghz**2)

            result = ReadoutAnalysisResult(
                resonator_id=rspec.resonator_id,
                qubit_id=qubit_id,
                resonator_freq_ghz=rspec.target_frequency_ghz,
                detuning_ghz=detuning_ghz,
                coupling_mhz=g_ghz * 1000.0,
                dispersive_shift_mhz=chi_ghz * 1000.0,
                purcell_t1_limit_us=purcell_t1_us,
                critical_photon_number=critical_photon,
            )
            results.append(result)

            logger.info(
                "Readout %s → %s: χ=%.3f MHz, Purcell T1=%.0f µs, n_crit=%.0f",
                rspec.resonator_id, qubit_id,
                chi_ghz * 1000, purcell_t1_us, critical_photon,
            )

        return results

    def _estimate_dispersive_shift(
        self,
        detuning_ghz: float,
        anharmonicity_ghz: float,
        qubit_params: ConvertedQubitParams,
        resonator_spec: ResonatorSpec,
    ) -> float:
        """Estimate χ when not available from full multi-qubit analysis."""
        # Find qubit-resonator coupling capacitance
        C_qr = 0.0
        for terminal, c_val in qubit_params.coupling_caps.items():
            if resonator_spec.terminal_id in terminal or terminal == resonator_spec.terminal_id:
                C_qr = abs(c_val)
                break

        if C_qr <= 0 or abs(detuning_ghz) < 0.01:
            return 0.0

        # Estimate g from capacitance
        from physics_engine.core.single_qubit import SingleQubitAnalyzer
        freq_q = np.sqrt(8.0 * qubit_params.EJ_ghz * qubit_params.EC_ghz) - qubit_params.EC_ghz

        g_ghz = ParameterConverter.compute_coupling_strength(
            C_coupling_fF=C_qr,
            C_a_fF=qubit_params.capacitance_fF,
            C_b_fF=40.0,  # typical resonator capacitance
            freq_a_ghz=freq_q,
            freq_b_ghz=resonator_spec.target_frequency_ghz,
        )

        # χ ≈ g² · α / (Δ · (Δ + α))
        alpha = anharmonicity_ghz
        denom = detuning_ghz * (detuning_ghz + alpha)
        if abs(denom) < 1e-10:
            return 0.0
        return g_ghz**2 * alpha / denom
