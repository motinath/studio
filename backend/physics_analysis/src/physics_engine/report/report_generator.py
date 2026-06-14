"""Report generator — assembles all analysis results into a PhysicsReport."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from physics_engine import __version__
from physics_engine.core.multi_qubit import MultiQubitAnalysisResult, PairCouplingResult
from physics_engine.core.noise_analyzer import NoiseAnalysisResult
from physics_engine.core.readout_analyzer import ReadoutAnalysisResult
from physics_engine.core.single_qubit import SingleQubitAnalysisResult
from physics_engine.models.enums import ValidationStatus
from physics_engine.models.physics_report import (
    CoherenceChannelResult,
    CouplingResult,
    CouplingValidationDetail,
    FrequencyCollisionAnalysis,
    PhysicsReport,
    QubitCoherenceResult,
    QubitComputedProps,
    QubitInputParams,
    QubitResult,
    QubitValidationDetail,
    ReadoutResult,
    ValidationSummary,
)

logger = logging.getLogger(__name__)


class ReportGenerator:
    """Assemble analysis results into a structured PhysicsReport."""

    def build(
        self,
        single_results: list[SingleQubitAnalysisResult],
        noise_results: list[NoiseAnalysisResult],
        multi_result: MultiQubitAnalysisResult,
        readout_results: list[ReadoutAnalysisResult],
        qubit_validations: dict[str, dict[str, QubitValidationDetail]],
        coupling_validations: dict[str, dict[str, CouplingValidationDetail]],
        freq_collision: FrequencyCollisionAnalysis,
        validation_summary: ValidationSummary,
        plots: dict[str, str],
        design_id: str,
        simulation_id: str,
    ) -> PhysicsReport:
        """Build the complete PhysicsReport from all analysis outputs."""
        timestamp = datetime.now(timezone.utc).isoformat()
        analysis_id = f"phys_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        # Build per-qubit results
        noise_map = {nr.qubit_id: nr for nr in noise_results}
        qubit_results: list[QubitResult] = []

        for sr in single_results:
            nr = noise_map.get(sr.qubit_id)

            # Input params
            input_params = QubitInputParams(
                EC_ghz=sr.ec_ghz if hasattr(sr, 'ec_ghz') else 0.0,
                EJ_ghz=sr.ej_ghz if hasattr(sr, 'ej_ghz') else 0.0,
                EL_ghz=getattr(sr, 'el_ghz', None),
                EJ_EC_ratio=sr.ej_ec_ratio,
                capacitance_fF=getattr(sr, 'capacitance_fF', 0.0),
                flux_bias=getattr(sr, 'flux_bias', 0.0),
            )

            # Computed properties
            computed = QubitComputedProps(
                frequency_ghz=sr.frequency_ghz,
                anharmonicity_mhz=sr.anharmonicity_ghz * 1000,
                f12_ghz=sr.f12_ghz,
                energy_levels_ghz=list(sr.energy_levels),
                transmon_regime=sr.transmon_regime,
            )

            # Coherence
            if nr is not None:
                coherence = QubitCoherenceResult(
                    T1_effective_us=nr.T1_effective_s * 1e6,
                    T2_effective_us=nr.T2_effective_s * 1e6,
                    T1_channels=[
                        CoherenceChannelResult(channel=ch.channel_name, value_us=ch.value_s * 1e6)
                        for ch in nr.t1_channels
                    ],
                    Tphi_channels=[
                        CoherenceChannelResult(channel=ch.channel_name, value_us=ch.value_s * 1e6)
                        for ch in nr.tphi_channels
                    ],
                    dominant_T1_channel=nr.dominant_t1,
                    dominant_Tphi_channel=nr.dominant_tphi,
                )
            else:
                coherence = QubitCoherenceResult(
                    T1_effective_us=0.0, T2_effective_us=0.0,
                    T1_channels=[], Tphi_channels=[],
                    dominant_T1_channel="unknown", dominant_Tphi_channel="unknown",
                )

            qubit_results.append(QubitResult(
                qubit_id=sr.qubit_id,
                type=sr.qubit_type,
                input_params=input_params,
                computed=computed,
                coherence=coherence,
                validation=qubit_validations.get(sr.qubit_id, {}),
            ))

        # Build coupling results
        coupling_results: list[CouplingResult] = []
        for pc in multi_result.coupling_results:
            pair_key = f"{pc.qubit_a}_{pc.qubit_b}"
            coupling_results.append(CouplingResult(
                qubit_a=pc.qubit_a,
                qubit_b=pc.qubit_b,
                coupling_capacitance_fF=pc.coupling_capacitance_fF,
                bare_coupling_mhz=pc.bare_coupling_ghz * 1000,
                dispersive_shift_khz=pc.dispersive_shift_ghz * 1e6,
                zz_coupling_khz=pc.zz_coupling_ghz * 1e6,
                validation=coupling_validations.get(pair_key, {}),
            ))

        # Build readout results
        readout_report: list[ReadoutResult] = []
        for rr in readout_results:
            readout_report.append(ReadoutResult(
                resonator_id=rr.resonator_id,
                qubit_id=rr.qubit_id,
                resonator_frequency_ghz=rr.resonator_freq_ghz,
                qubit_resonator_detuning_ghz=rr.detuning_ghz,
                coupling_strength_mhz=rr.coupling_mhz,
                dispersive_shift_mhz=rr.dispersive_shift_mhz,
                purcell_T1_limit_us=rr.purcell_t1_limit_us,
                critical_photon_number=rr.critical_photon_number,
            ))

        # Overall status
        overall_status = validation_summary.blocking and ValidationStatus.FAIL or (
            ValidationStatus.WARNING if validation_summary.warnings > 0
            else ValidationStatus.PASS
        )

        physics_score = (
            validation_summary.passed / validation_summary.total_checks
            if validation_summary.total_checks > 0 else 0.0
        )

        return PhysicsReport(
            analysis_id=analysis_id,
            timestamp=timestamp,
            design_id=design_id,
            simulation_id=simulation_id,
            engine_version=__version__,
            overall_status=overall_status,
            physics_score=physics_score,
            qubit_results=qubit_results,
            coupling_results=coupling_results,
            readout_results=readout_report,
            frequency_collision_analysis=freq_collision,
            validation_summary=validation_summary,
            plots=plots,
        )
