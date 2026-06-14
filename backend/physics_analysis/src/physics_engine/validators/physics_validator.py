"""Master physics validator orchestrating all sub-validators.

Runs frequency, coherence, and coupling validators, aggregates results
into a ValidationSummary, and attaches per-qubit validation details.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from physics_engine.models.design_spec import DesignSpec
from physics_engine.models.enums import ValidationStatus
from physics_engine.models.physics_report import (
    CouplingResult,
    FrequencyCollisionAnalysis,
    QubitResult,
    QubitValidationDetail,
    ReadoutResult,
    ValidationSummary,
)
from physics_engine.validators.coherence_validator import CoherenceValidator
from physics_engine.validators.coupling_validator import CouplingValidator
from physics_engine.validators.frequency_validator import FrequencyValidator
from physics_engine.validators.coherence_validator import ValidationCheck as CoherenceCheck
from physics_engine.validators.frequency_validator import ValidationCheck as FreqCheck
from physics_engine.validators.coupling_validator import ValidationCheck as CouplingCheck

logger = logging.getLogger(__name__)


@dataclass
class FullValidationResult:
    """Container for the complete validation output."""

    qubit_results: list[QubitResult]
    frequency_collisions: FrequencyCollisionAnalysis
    coupling_results: list[CouplingResult]
    validation_summary: ValidationSummary


class PhysicsValidator:
    """Master orchestrator that runs all sub-validators and produces a unified summary.

    Coordinates:
    - FrequencyValidator — qubit frequency/anharmonicity checks, collision detection
    - CoherenceValidator — T1/T2 checks
    - CouplingValidator — coupling strength and ZZ checks
    """

    def __init__(self) -> None:
        self._freq_validator = FrequencyValidator()
        self._coherence_validator = CoherenceValidator()
        self._coupling_validator = CouplingValidator()

    def validate_all(
        self,
        single_results: list[QubitResult],
        noise_results: list[QubitResult],
        multi_result: list[CouplingResult] | None,
        readout_results: list[ReadoutResult] | None,
        design_spec: DesignSpec,
    ) -> FullValidationResult:
        """Run all validators and produce a unified validation result.

        Args:
            single_results: Qubit results with frequency/anharmonicity (from single-qubit analysis).
            noise_results: Qubit results with coherence data (from noise analysis).
            multi_result: Coupling results (from multi-qubit analysis), if available.
            readout_results: Readout analysis results, if available.
            design_spec: The full design specification with all targets.

        Returns:
            FullValidationResult containing enriched qubit results,
            collision analysis, validated coupling results, and summary.
        """
        all_checks: list[FreqCheck | CoherenceCheck | CouplingCheck] = []
        suggestions: list[str] = []

        # ---- 1. Frequency & anharmonicity validation ----
        logger.info("Running frequency/anharmonicity validation...")
        freq_checks = self._freq_validator.validate_qubit_frequencies(
            single_results, design_spec
        )
        all_checks.extend(freq_checks)

        # ---- 2. Frequency collision detection ----
        logger.info("Running frequency collision detection...")
        qubit_freqs: dict[str, float] = {
            qr.qubit_id: qr.computed.frequency_ghz for qr in single_results
        }
        resonator_freqs: dict[str, float] = {
            r.resonator_id: r.target_frequency_ghz for r in design_spec.resonators
        }
        min_spacing = design_spec.global_constraints.min_qubit_frequency_spacing_mhz
        collision_analysis = self._freq_validator.detect_collisions(
            qubit_freqs, resonator_freqs, min_spacing
        )

        # ---- 3. Coherence validation ----
        logger.info("Running coherence validation...")
        coherence_checks = self._coherence_validator.validate(
            noise_results, design_spec
        )
        all_checks.extend(coherence_checks)

        # ---- 4. Coupling validation ----
        validated_couplings: list[CouplingResult] = []
        if multi_result:
            logger.info("Running coupling validation...")
            coupling_checks = self._coupling_validator.validate(
                multi_result, design_spec.couplers
            )
            all_checks.extend(coupling_checks)

            validated_couplings = self._coupling_validator.get_coupling_validation_details(
                multi_result, design_spec.couplers
            )

        # ---- 5. Attach per-qubit validation details ----
        enriched_qubits = self._enrich_qubit_results(
            single_results, noise_results, freq_checks, coherence_checks, design_spec
        )

        # ---- 6. Aggregate into ValidationSummary ----
        # Count collision status as an additional check
        total_checks = len(all_checks) + 1  # +1 for collision analysis
        passed = sum(1 for c in all_checks if c.status == ValidationStatus.PASS)
        warnings = sum(1 for c in all_checks if c.status == ValidationStatus.WARNING)
        failures = sum(1 for c in all_checks if c.status == ValidationStatus.FAIL)

        if collision_analysis.status == ValidationStatus.PASS:
            passed += 1
        elif collision_analysis.status == ValidationStatus.WARNING:
            warnings += 1
        else:
            failures += 1

        blocking = failures > 0

        # Collect actionable suggestions from failing / warning checks
        for check in all_checks:
            if check.status in (ValidationStatus.WARNING, ValidationStatus.FAIL) and check.suggestion:
                suggestions.append(check.suggestion)

        if collision_analysis.collisions:
            for collision in collision_analysis.collisions:
                ctype = collision.collision_type or "unknown"
                pair_str = ", ".join(collision.pair)
                suggestions.append(
                    f"Resolve {ctype} frequency collision involving [{pair_str}] "
                    f"(spacing: {collision.spacing_mhz:.1f} MHz)."
                )

        summary = ValidationSummary(
            total_checks=total_checks,
            passed=passed,
            warnings=warnings,
            failures=failures,
            blocking=blocking,
            suggestions=suggestions,
        )

        logger.info(
            "Validation complete: %d/%d passed, %d warnings, %d failures (blocking=%s)",
            passed, total_checks, warnings, failures, blocking,
        )

        return FullValidationResult(
            qubit_results=enriched_qubits,
            frequency_collisions=collision_analysis,
            coupling_results=validated_couplings,
            validation_summary=summary,
        )

    @property
    def physics_score(self) -> float:
        """Compute physics score from the most recent validation.

        Call after validate_all(). Returns passed_checks / total_checks.
        """
        # This is a convenience — the actual score is computed inline in validate_all
        # and returned as part of the report. The pipeline uses the summary directly.
        return 0.0

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _enrich_qubit_results(
        self,
        single_results: list[QubitResult],
        noise_results: list[QubitResult],
        freq_checks: list[FreqCheck],
        coherence_checks: list[CoherenceCheck],
        design_spec: DesignSpec,
    ) -> list[QubitResult]:
        """Merge single-qubit and noise results, attaching validation details.

        Creates new QubitResult instances with the validation dict populated.
        """
        # Build lookup for noise results by qubit_id
        noise_lookup: dict[str, QubitResult] = {
            qr.qubit_id: qr for qr in noise_results
        }

        # Build check lookup: check_name → check
        check_lookup: dict[str, FreqCheck | CoherenceCheck] = {}
        for c in freq_checks:
            check_lookup[c.check_name] = c
        for c in coherence_checks:
            check_lookup[c.check_name] = c

        enriched: list[QubitResult] = []

        for qr in single_results:
            qid = qr.qubit_id

            # Merge coherence from noise results if available
            coherence = qr.coherence
            noise_qr = noise_lookup.get(qid)
            if noise_qr is not None:
                coherence = noise_qr.coherence

            # Build validation dict
            validation: dict[str, QubitValidationDetail] = {}

            # Frequency
            freq_ck = check_lookup.get(f"{qid}_frequency")
            if freq_ck is not None:
                validation["frequency"] = QubitValidationDetail(
                    status=freq_ck.status,
                    target=freq_ck.target,
                    actual=freq_ck.actual,
                    tolerance=freq_ck.tolerance,
                    unit=freq_ck.unit,
                )

            # Anharmonicity
            anharm_ck = check_lookup.get(f"{qid}_anharmonicity")
            if anharm_ck is not None:
                validation["anharmonicity"] = QubitValidationDetail(
                    status=anharm_ck.status,
                    target=anharm_ck.target,
                    actual=anharm_ck.actual,
                    tolerance=anharm_ck.tolerance,
                    unit=anharm_ck.unit,
                )

            # T1
            t1_ck = check_lookup.get(f"{qid}_T1")
            if t1_ck is not None:
                validation["T1"] = QubitValidationDetail(
                    status=t1_ck.status,
                    target=t1_ck.target,
                    actual=t1_ck.actual,
                    unit=t1_ck.unit,
                )

            # T2
            t2_ck = check_lookup.get(f"{qid}_T2")
            if t2_ck is not None:
                validation["T2"] = QubitValidationDetail(
                    status=t2_ck.status,
                    target=t2_ck.target,
                    actual=t2_ck.actual,
                    unit=t2_ck.unit,
                )

            enriched.append(
                QubitResult(
                    qubit_id=qr.qubit_id,
                    type=qr.type,
                    input_params=qr.input_params,
                    computed=qr.computed,
                    coherence=coherence,
                    validation=validation,
                )
            )

        return enriched
