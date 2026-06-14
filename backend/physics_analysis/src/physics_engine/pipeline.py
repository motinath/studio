"""End-to-end physics analysis pipeline orchestrator.

Single entry point that coordinates:
  EM parse → convert → single-qubit → noise → multi-qubit →
  readout → validate → visualize → report
"""

from __future__ import annotations

import logging
import time
from pathlib import Path

from physics_engine.core.multi_qubit import MultiQubitAnalyzer
from physics_engine.core.noise_analyzer import NoiseAnalyzer
from physics_engine.core.parameter_converter import ParameterConverter
from physics_engine.core.readout_analyzer import ReadoutAnalyzer
from physics_engine.core.single_qubit import SingleQubitAnalyzer
from physics_engine.models.design_spec import DesignSpec
from physics_engine.models.em_results import EMResults
from physics_engine.models.enums import ValidationStatus
from physics_engine.models.physics_report import PhysicsReport
from physics_engine.report.report_generator import ReportGenerator
from physics_engine.validators.physics_validator import PhysicsValidator
from physics_engine.visualization.coherence_plots import plot_coherence_breakdown
from physics_engine.visualization.coupling_map import plot_coupling_map
from physics_engine.visualization.energy_levels import plot_energy_levels
from physics_engine.visualization.frequency_map import plot_frequency_map

logger = logging.getLogger(__name__)


class PhysicsAnalysisPipeline:
    """Orchestrates the full physics analysis pipeline."""

    def __init__(self) -> None:
        self.converter = ParameterConverter()
        self.single_analyzer = SingleQubitAnalyzer()
        self.noise_analyzer = NoiseAnalyzer()
        self.multi_analyzer = MultiQubitAnalyzer()
        self.readout_analyzer = ReadoutAnalyzer()
        self.validator = PhysicsValidator()
        self.report_gen = ReportGenerator()

    def run(
        self,
        em_results: EMResults,
        design_spec: DesignSpec,
        output_dir: str = "output",
    ) -> PhysicsReport:
        """Run the complete physics analysis pipeline.

        Args:
            em_results: Palace EM simulation results.
            design_spec: User design specification with targets.
            output_dir: Directory for output plots.

        Returns:
            Complete PhysicsReport with all analysis results and validation.
        """
        t_start = time.perf_counter()
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        # Step 1: Convert EM parameters
        logger.info("=" * 60)
        logger.info("STEP 1: Converting EM parameters")
        t0 = time.perf_counter()
        qubit_params = self.converter.convert_all(em_results, design_spec)
        logger.info("  → %d qubits converted (%.2fs)", len(qubit_params), time.perf_counter() - t0)

        # Step 2: Single-qubit analysis
        logger.info("STEP 2: Single-qubit analysis")
        t0 = time.perf_counter()
        single_results = self.single_analyzer.analyze_all(qubit_params)
        logger.info("  → %d qubits analyzed (%.2fs)", len(single_results), time.perf_counter() - t0)

        # Step 3: Noise & coherence
        logger.info("STEP 3: Noise & coherence analysis")
        t0 = time.perf_counter()
        noise_results = self.noise_analyzer.analyze_all(single_results, design_spec)
        logger.info("  → %d coherence results (%.2fs)", len(noise_results), time.perf_counter() - t0)

        # Step 4: Multi-qubit analysis
        logger.info("STEP 4: Multi-qubit analysis")
        t0 = time.perf_counter()
        multi_result = self.multi_analyzer.analyze(
            qubit_params, single_results,
            design_spec.resonators, design_spec.couplers,
        )
        logger.info(
            "  → %d coupling pairs analyzed (%.2fs)",
            len(multi_result.coupling_results), time.perf_counter() - t0,
        )

        # Step 5: Readout analysis
        logger.info("STEP 5: Readout analysis")
        t0 = time.perf_counter()
        readout_results = self.readout_analyzer.analyze(
            multi_result, single_results, qubit_params, design_spec.resonators,
        )
        logger.info("  → %d readout pairs (%.2fs)", len(readout_results), time.perf_counter() - t0)

        # Step 6: Validate
        # Bridge: convert internal dataclasses → Pydantic QubitResult for validators
        logger.info("STEP 6: Physics validation")
        t0 = time.perf_counter()

        from physics_engine.models.physics_report import (
            QubitCoherenceResult,
            QubitComputedProps,
            QubitInputParams,
            QubitResult,
            CoherenceChannelResult,
            CouplingResult,
        )

        # Build QubitResult objects from single + noise results
        noise_map = {nr.qubit_id: nr for nr in noise_results}
        pydantic_qubit_results: list[QubitResult] = []
        for sr in single_results:
            nr = noise_map.get(sr.qubit_id)
            coherence = QubitCoherenceResult(
                T1_effective_us=nr.T1_effective_s * 1e6 if nr else 0.0,
                T2_effective_us=nr.T2_effective_s * 1e6 if nr else 0.0,
                T1_channels=[
                    CoherenceChannelResult(channel=ch.channel_name, value_us=ch.value_s * 1e6)
                    for ch in (nr.t1_channels if nr else [])
                ],
                Tphi_channels=[
                    CoherenceChannelResult(channel=ch.channel_name, value_us=ch.value_s * 1e6)
                    for ch in (nr.tphi_channels if nr else [])
                ],
                dominant_T1_channel=nr.dominant_t1 if nr else "unknown",
                dominant_Tphi_channel=nr.dominant_tphi if nr else "unknown",
            )
            pydantic_qubit_results.append(QubitResult(
                qubit_id=sr.qubit_id,
                type=sr.qubit_type,
                input_params=QubitInputParams(
                    EC_ghz=0.0, EJ_ghz=0.0, EJ_EC_ratio=sr.ej_ec_ratio,
                    capacitance_fF=0.0,
                ),
                computed=QubitComputedProps(
                    frequency_ghz=sr.frequency_ghz,
                    anharmonicity_mhz=sr.anharmonicity_ghz * 1000,
                    f12_ghz=sr.f12_ghz,
                    energy_levels_ghz=list(sr.energy_levels),
                    transmon_regime=sr.transmon_regime,
                ),
                coherence=coherence,
                validation={},
            ))

        # Build Pydantic CouplingResult objects
        pydantic_coupling_results: list[CouplingResult] = [
            CouplingResult(
                qubit_a=pc.qubit_a,
                qubit_b=pc.qubit_b,
                coupling_capacitance_fF=pc.coupling_capacitance_fF,
                bare_coupling_mhz=pc.bare_coupling_ghz * 1000,
                dispersive_shift_khz=pc.dispersive_shift_ghz * 1e6 if hasattr(pc, 'dispersive_shift_ghz') else 0.0,
                zz_coupling_khz=pc.zz_coupling_ghz * 1e6,
            )
            for pc in multi_result.coupling_results
        ]

        # Build readout Pydantic objects
        from physics_engine.models.physics_report import ReadoutResult
        pydantic_readout_results: list[ReadoutResult] = [
            ReadoutResult(
                resonator_id=rr.resonator_id,
                qubit_id=rr.qubit_id,
                resonator_frequency_ghz=rr.resonator_freq_ghz,
                qubit_resonator_detuning_ghz=rr.detuning_ghz,
                coupling_strength_mhz=rr.coupling_mhz,
                dispersive_shift_mhz=rr.dispersive_shift_mhz,
                purcell_T1_limit_us=rr.purcell_t1_limit_us,
                critical_photon_number=rr.critical_photon_number,
            )
            for rr in readout_results
        ]

        validation_result = self.validator.validate_all(
            pydantic_qubit_results,
            pydantic_qubit_results,  # noise data is already merged above
            pydantic_coupling_results,
            pydantic_readout_results,
            design_spec,
        )
        validation_summary = validation_result.validation_summary
        logger.info(
            "  → %d checks: %d pass, %d warn, %d fail (%.2fs)",
            validation_summary.total_checks,
            validation_summary.passed,
            validation_summary.warnings,
            validation_summary.failures,
            time.perf_counter() - t0,
        )

        # Step 7: Generate plots
        logger.info("STEP 7: Generating visualizations")
        t0 = time.perf_counter()
        plots = self._generate_plots(
            single_results, noise_results, multi_result,
            design_spec, output_dir,
        )
        logger.info("  → %d plots generated (%.2fs)", len(plots), time.perf_counter() - t0)

        # Step 8: Assemble report
        logger.info("STEP 8: Assembling report")
        from physics_engine.models.physics_report import PhysicsReport, FrequencyCollisionAnalysis
        from physics_engine import __version__
        from datetime import datetime, timezone

        timestamp = datetime.now(timezone.utc).isoformat()
        analysis_id = f"phys_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        overall_status = (
            ValidationStatus.FAIL if validation_summary.blocking
            else (ValidationStatus.WARNING if validation_summary.warnings > 0
                  else ValidationStatus.PASS)
        )
        physics_score = (
            validation_summary.passed / validation_summary.total_checks
            if validation_summary.total_checks > 0 else 0.0
        )

        report = PhysicsReport(
            analysis_id=analysis_id,
            timestamp=timestamp,
            design_id=design_spec.design_id,
            simulation_id=em_results.simulation_id,
            engine_version=__version__,
            overall_status=overall_status,
            physics_score=physics_score,
            qubit_results=validation_result.qubit_results,
            coupling_results=validation_result.coupling_results,
            readout_results=pydantic_readout_results,
            frequency_collision_analysis=validation_result.frequency_collisions,
            validation_summary=validation_summary,
            plots=plots,
        )

        elapsed = time.perf_counter() - t_start
        logger.info("=" * 60)
        logger.info(
            "PHYSICS ANALYSIS COMPLETE — Status: %s  Score: %.1f%%  Time: %.2fs",
            report.overall_status.value, report.physics_score * 100, elapsed,
        )
        logger.info("=" * 60)

        return report

    def _generate_plots(
        self,
        single_results: list,
        noise_results: list,
        multi_result,
        design_spec: DesignSpec,
        output_dir: str,
    ) -> dict[str, str]:
        """Generate all visualization plots."""
        plots: dict[str, str] = {}

        try:
            # Energy levels
            el_data = [
                {
                    "qubit_id": sr.qubit_id,
                    "energy_levels_ghz": list(sr.energy_levels),
                    "frequency_ghz": sr.frequency_ghz,
                    "anharmonicity_ghz": sr.anharmonicity_ghz,
                }
                for sr in single_results
            ]
            plots["energy_levels"] = plot_energy_levels(el_data, output_dir)
        except Exception as exc:
            logger.warning("Failed to generate energy levels plot: %s", exc)

        try:
            # Coherence breakdown
            coh_data = [
                {
                    "qubit_id": nr.qubit_id,
                    "T1_effective_us": nr.T1_effective_s * 1e6,
                    "T2_effective_us": nr.T2_effective_s * 1e6,
                    "t1_channels": [
                        {"channel": ch.channel_name, "value_us": ch.value_s * 1e6}
                        for ch in nr.t1_channels
                    ],
                    "tphi_channels": [
                        {"channel": ch.channel_name, "value_us": ch.value_s * 1e6}
                        for ch in nr.tphi_channels
                    ],
                }
                for nr in noise_results
            ]
            t1_target = design_spec.qubits[0].targets.T1_min_us if design_spec.qubits else 50.0
            t2_target = design_spec.qubits[0].targets.T2_min_us if design_spec.qubits else 30.0
            plots["coherence_breakdown"] = plot_coherence_breakdown(
                coh_data, t1_target, t2_target, output_dir,
            )
        except Exception as exc:
            logger.warning("Failed to generate coherence plot: %s", exc)

        try:
            # Coupling map
            coupling_data = [
                {
                    "qubit_a": pc.qubit_a,
                    "qubit_b": pc.qubit_b,
                    "bare_coupling_mhz": pc.bare_coupling_ghz * 1000,
                    "zz_coupling_khz": pc.zz_coupling_ghz * 1e6,
                }
                for pc in multi_result.coupling_results
            ]
            qubit_ids = [sr.qubit_id for sr in single_results]
            plots["coupling_map"] = plot_coupling_map(coupling_data, qubit_ids, output_dir)
        except Exception as exc:
            logger.warning("Failed to generate coupling map: %s", exc)

        try:
            # Frequency map
            qubit_freqs = {sr.qubit_id: sr.frequency_ghz for sr in single_results}
            res_freqs = {r.resonator_id: r.target_frequency_ghz for r in design_spec.resonators}
            min_spacing = design_spec.global_constraints.min_qubit_frequency_spacing_mhz
            plots["frequency_map"] = plot_frequency_map(
                qubit_freqs, res_freqs, min_spacing, output_dir,
            )
        except Exception as exc:
            logger.warning("Failed to generate frequency map: %s", exc)

        return plots
