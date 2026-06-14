"""Coherence validation against T1/T2 design targets.

Implements PASS/WARN/FAIL logic with dominant-channel diagnostics
and actionable design suggestions.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from physics_engine.models.design_spec import DesignSpec
from physics_engine.models.enums import ValidationStatus
from physics_engine.models.physics_report import (
    QubitCoherenceResult,
    QubitResult,
    QubitValidationDetail,
)

logger = logging.getLogger(__name__)


@dataclass
class ValidationCheck:
    """Result of a single coherence validation check."""

    check_name: str
    status: ValidationStatus
    target: float
    actual: float
    tolerance: float | None = None
    unit: str = ""
    message: str = ""
    suggestion: str = ""


# Maps dominant noise channels to human-readable improvement suggestions.
_CHANNEL_SUGGESTIONS: dict[str, str] = {
    "t1_capacitive": "Improve dielectric quality (lower loss tangent) or increase capacitor Q.",
    "t1_inductive": "Use higher-Q inductor material or reduce inductive losses.",
    "t1_charge_impedance": "Re-evaluate impedance environment around the qubit.",
    "t1_flux_bias_line": "Add filtering on flux bias lines or increase mutual inductance.",
    "t1_quasiparticle_tunneling": "Improve shielding and reduce quasiparticle density (lower x_qp).",
    "tphi_1_over_f_cc": "Reduce critical current noise (improve junction fabrication uniformity).",
    "tphi_1_over_f_flux": "Bias at flux sweet spot or improve flux noise filtering.",
    "tphi_1_over_f_ng": "Increase EJ/EC ratio to reduce charge sensitivity.",
}


class CoherenceValidator:
    """Validates T1 and T2 coherence times against design targets.

    Thresholding logic:
    - **PASS**: T ≥ target
    - **WARNING**: T ≥ 50% of target
    - **FAIL**: T < 50% of target
    """

    def validate(
        self,
        qubit_results: list[QubitResult],
        design_spec: DesignSpec,
    ) -> list[ValidationCheck]:
        """Run coherence validation for all qubits.

        Args:
            qubit_results: Qubit analysis results with coherence data.
            design_spec: Design specification with T1/T2 targets.

        Returns:
            List of ValidationCheck results covering T1 and T2 for each qubit.
        """
        checks: list[ValidationCheck] = []

        for qr in qubit_results:
            try:
                spec = design_spec.get_qubit(qr.qubit_id)
            except KeyError:
                logger.warning("No design spec for qubit %s, skipping coherence validation", qr.qubit_id)
                continue

            coherence = qr.coherence

            # --- T1 check ---
            t1_check = self._check_t1(qr.qubit_id, coherence, spec.targets.T1_min_us)
            checks.append(t1_check)

            # --- T2 check ---
            t2_check = self._check_t2(qr.qubit_id, coherence, spec.targets.T2_min_us)
            checks.append(t2_check)

        return checks

    def _check_t1(
        self,
        qubit_id: str,
        coherence: QubitCoherenceResult,
        target_us: float,
    ) -> ValidationCheck:
        """Check T1 against the minimum target."""
        actual = coherence.T1_effective_us
        dominant = coherence.dominant_T1_channel
        status = self._threshold(actual, target_us)

        if status == ValidationStatus.PASS:
            msg = (
                f"{qubit_id} T1={actual:.1f} µs ≥ target {target_us:.1f} µs. "
                f"Dominant channel: {dominant}."
            )
            suggestion = ""
        else:
            deficit_pct = (1.0 - actual / target_us) * 100.0 if target_us > 0 else 0.0
            severity = "below" if status == ValidationStatus.WARNING else "critically below"
            msg = (
                f"{qubit_id} T1={actual:.1f} µs is {severity} target {target_us:.1f} µs "
                f"({deficit_pct:.0f}% deficit). Limited by {dominant}."
            )
            suggestion = _CHANNEL_SUGGESTIONS.get(
                dominant,
                f"Investigate {dominant} channel for {qubit_id}.",
            )

        return ValidationCheck(
            check_name=f"{qubit_id}_T1",
            status=status,
            target=target_us,
            actual=actual,
            unit="µs",
            message=msg,
            suggestion=suggestion,
        )

    def _check_t2(
        self,
        qubit_id: str,
        coherence: QubitCoherenceResult,
        target_us: float,
    ) -> ValidationCheck:
        """Check T2 against the minimum target."""
        actual = coherence.T2_effective_us
        dominant_tphi = coherence.dominant_Tphi_channel
        dominant_t1 = coherence.dominant_T1_channel
        status = self._threshold(actual, target_us)

        # T2 is limited by both T1 and Tφ; identify the bottleneck
        # T2 = 1 / (1/(2*T1) + 1/Tφ)  =>  T2 ≤ 2*T1
        t1_eff = coherence.T1_effective_us
        t2_from_t1 = 2.0 * t1_eff
        bottleneck = dominant_t1 if actual >= t2_from_t1 * 0.9 else dominant_tphi

        if status == ValidationStatus.PASS:
            msg = (
                f"{qubit_id} T2={actual:.1f} µs ≥ target {target_us:.1f} µs. "
                f"Bottleneck: {bottleneck}."
            )
            suggestion = ""
        else:
            deficit_pct = (1.0 - actual / target_us) * 100.0 if target_us > 0 else 0.0
            severity = "below" if status == ValidationStatus.WARNING else "critically below"
            msg = (
                f"{qubit_id} T2={actual:.1f} µs is {severity} target {target_us:.1f} µs "
                f"({deficit_pct:.0f}% deficit). Bottleneck: {bottleneck}."
            )
            suggestion = _CHANNEL_SUGGESTIONS.get(
                bottleneck,
                f"Investigate {bottleneck} channel for {qubit_id}.",
            )

        return ValidationCheck(
            check_name=f"{qubit_id}_T2",
            status=status,
            target=target_us,
            actual=actual,
            unit="µs",
            message=msg,
            suggestion=suggestion,
        )

    @staticmethod
    def _threshold(actual: float, target: float) -> ValidationStatus:
        """Apply PASS / WARN / FAIL thresholding.

        PASS:    actual ≥ target
        WARNING: actual ≥ 50% of target
        FAIL:    actual < 50% of target
        """
        if actual >= target:
            return ValidationStatus.PASS
        if actual >= target * 0.5:
            return ValidationStatus.WARNING
        return ValidationStatus.FAIL
