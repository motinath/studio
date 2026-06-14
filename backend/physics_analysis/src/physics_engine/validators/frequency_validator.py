"""Frequency validation and collision detection for qubit/resonator layouts.

Checks qubit frequencies against design targets, enforces minimum spacing,
and detects frequency collisions (direct, straddling, two-photon, qubit-resonator).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from itertools import combinations

from physics_engine.config import FREQUENCY_COLLISION_TYPES
from physics_engine.models.design_spec import DesignSpec, QubitSpec, ResonatorSpec
from physics_engine.models.enums import ValidationStatus
from physics_engine.models.physics_report import (
    FrequencyCollisionAnalysis,
    FrequencySpacingEntry,
    QubitResult,
    QubitValidationDetail,
)

logger = logging.getLogger(__name__)


@dataclass
class ValidationCheck:
    """Result of a single validation check."""

    check_name: str
    status: ValidationStatus
    target: float
    actual: float
    tolerance: float | None = None
    unit: str = ""
    message: str = ""
    suggestion: str = ""


class FrequencyValidator:
    """Validates qubit/resonator frequencies and detects frequency collisions.

    Collision types detected:
    - **direct**: f_i ≈ f_j — two qubits at the same frequency
    - **straddling**: f_i + f_j ≈ 2·f_k — three-qubit straddling condition
    - **two_photon**: 2·f_i ≈ f_r — two-photon resonance with a resonator
    - **qubit_resonator**: f_q ≈ f_r — qubit-resonator frequency collision
    """

    def validate_qubit_frequencies(
        self,
        single_results: list[QubitResult],
        design_spec: DesignSpec,
    ) -> list[ValidationCheck]:
        """Validate each qubit's frequency and anharmonicity against design targets.

        Args:
            single_results: Computed qubit results with frequency and anharmonicity.
            design_spec: Design specification containing targets.

        Returns:
            List of ValidationCheck results for all qubits (frequency + anharmonicity).
        """
        checks: list[ValidationCheck] = []

        for qr in single_results:
            try:
                spec = design_spec.get_qubit(qr.qubit_id)
            except KeyError:
                logger.warning("No design spec found for qubit %s, skipping", qr.qubit_id)
                continue

            # --- Frequency check ---
            freq_check = self._check_frequency(qr, spec)
            checks.append(freq_check)

            # --- Anharmonicity check ---
            anharm_check = self._check_anharmonicity(qr, spec)
            checks.append(anharm_check)

        return checks

    def detect_collisions(
        self,
        qubit_freqs: dict[str, float],
        resonator_freqs: dict[str, float],
        min_spacing_mhz: float,
    ) -> FrequencyCollisionAnalysis:
        """Detect frequency collisions across all qubits and resonators.

        Args:
            qubit_freqs: Mapping of qubit_id → frequency in GHz.
            resonator_freqs: Mapping of resonator_id → frequency in GHz.
            min_spacing_mhz: Minimum acceptable qubit-qubit spacing in MHz.

        Returns:
            FrequencyCollisionAnalysis with all detected collisions and spacings.
        """
        collisions: list[FrequencySpacingEntry] = []
        all_spacings: list[FrequencySpacingEntry] = []
        min_qubit_spacing = float("inf")

        qubit_ids = list(qubit_freqs.keys())
        resonator_ids = list(resonator_freqs.keys())

        # --- Direct qubit-qubit collisions ---
        for qa, qb in combinations(qubit_ids, 2):
            spacing_ghz = abs(qubit_freqs[qa] - qubit_freqs[qb])
            spacing_mhz = spacing_ghz * 1000.0
            min_qubit_spacing = min(min_qubit_spacing, spacing_mhz)

            entry = FrequencySpacingEntry(
                pair=[qa, qb],
                spacing_mhz=round(spacing_mhz, 3),
                collision_type="direct" if spacing_mhz < min_spacing_mhz else None,
            )
            all_spacings.append(entry)
            if entry.collision_type:
                collisions.append(entry)
                logger.warning(
                    "Direct collision: %s (%.3f GHz) ↔ %s (%.3f GHz), spacing=%.1f MHz < %.1f MHz",
                    qa, qubit_freqs[qa], qb, qubit_freqs[qb], spacing_mhz, min_spacing_mhz,
                )

        # --- Straddling condition: f_i + f_j ≈ 2·f_k ---
        for qi, qj, qk in _triplet_permutations(qubit_ids):
            sum_ij = qubit_freqs[qi] + qubit_freqs[qj]
            two_fk = 2.0 * qubit_freqs[qk]
            straddling_mhz = abs(sum_ij - two_fk) * 1000.0

            if straddling_mhz < min_spacing_mhz:
                entry = FrequencySpacingEntry(
                    pair=[qi, qj, qk],
                    spacing_mhz=round(straddling_mhz, 3),
                    collision_type="straddling",
                )
                collisions.append(entry)
                logger.warning(
                    "Straddling collision: f(%s)+f(%s) ≈ 2·f(%s), residual=%.1f MHz",
                    qi, qj, qk, straddling_mhz,
                )

        # --- Two-photon: 2·f_i ≈ f_r ---
        for qi in qubit_ids:
            for ri in resonator_ids:
                two_fq = 2.0 * qubit_freqs[qi]
                fr = resonator_freqs[ri]
                residual_mhz = abs(two_fq - fr) * 1000.0

                if residual_mhz < min_spacing_mhz:
                    entry = FrequencySpacingEntry(
                        pair=[qi, ri],
                        spacing_mhz=round(residual_mhz, 3),
                        collision_type="two_photon",
                    )
                    collisions.append(entry)
                    logger.warning(
                        "Two-photon collision: 2·f(%s)=%.3f GHz ≈ f(%s)=%.3f GHz",
                        qi, two_fq, ri, fr,
                    )

        # --- Qubit-resonator collision: f_q ≈ f_r ---
        for qi in qubit_ids:
            for ri in resonator_ids:
                spacing_mhz = abs(qubit_freqs[qi] - resonator_freqs[ri]) * 1000.0

                if spacing_mhz < min_spacing_mhz:
                    entry = FrequencySpacingEntry(
                        pair=[qi, ri],
                        spacing_mhz=round(spacing_mhz, 3),
                        collision_type="qubit_resonator",
                    )
                    collisions.append(entry)
                    logger.warning(
                        "Qubit-resonator collision: f(%s)=%.3f GHz ≈ f(%s)=%.3f GHz",
                        qi, qubit_freqs[qi], ri, resonator_freqs[ri],
                    )

        # Handle case with fewer than 2 qubits
        if min_qubit_spacing == float("inf"):
            min_qubit_spacing = 0.0

        overall_status = (
            ValidationStatus.FAIL if collisions
            else ValidationStatus.PASS
        )

        return FrequencyCollisionAnalysis(
            status=overall_status,
            min_qubit_spacing_mhz=round(min_qubit_spacing, 3),
            collisions=collisions,
            all_spacings=all_spacings,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _check_frequency(self, qr: QubitResult, spec: QubitSpec) -> ValidationCheck:
        """Check qubit frequency against target ± tolerance."""
        target = spec.targets.frequency_ghz
        actual = qr.computed.frequency_ghz
        tol = spec.targets.frequency_tolerance_ghz
        deviation = abs(actual - target)

        if deviation <= tol:
            status = ValidationStatus.PASS
            msg = f"{qr.qubit_id} frequency {actual:.4f} GHz within ±{tol} GHz of target {target:.4f} GHz"
            suggestion = ""
        elif deviation <= tol * 2:
            status = ValidationStatus.WARNING
            msg = f"{qr.qubit_id} frequency {actual:.4f} GHz deviates {deviation:.4f} GHz from target {target:.4f} GHz (within 2× tolerance)"
            suggestion = f"Consider adjusting EJ to shift {qr.qubit_id} frequency closer to {target:.3f} GHz."
        else:
            status = ValidationStatus.FAIL
            direction = "increase" if actual < target else "decrease"
            msg = f"{qr.qubit_id} frequency {actual:.4f} GHz deviates {deviation:.4f} GHz from target {target:.4f} GHz — exceeds tolerance"
            suggestion = f"{direction.capitalize()} EJ for {qr.qubit_id} to {direction} frequency toward {target:.3f} GHz."

        return ValidationCheck(
            check_name=f"{qr.qubit_id}_frequency",
            status=status,
            target=target,
            actual=actual,
            tolerance=tol,
            unit="GHz",
            message=msg,
            suggestion=suggestion,
        )

    def _check_anharmonicity(self, qr: QubitResult, spec: QubitSpec) -> ValidationCheck:
        """Check qubit anharmonicity against target ± tolerance."""
        target = spec.targets.anharmonicity_mhz
        actual = qr.computed.anharmonicity_mhz
        tol = spec.targets.anharmonicity_tolerance_mhz
        deviation = abs(actual - target)

        if deviation <= tol:
            status = ValidationStatus.PASS
            msg = f"{qr.qubit_id} anharmonicity {actual:.1f} MHz within ±{tol} MHz of target {target:.1f} MHz"
            suggestion = ""
        elif deviation <= tol * 2:
            status = ValidationStatus.WARNING
            msg = f"{qr.qubit_id} anharmonicity {actual:.1f} MHz deviates {deviation:.1f} MHz from target {target:.1f} MHz"
            suggestion = f"Adjust EJ/EC ratio for {qr.qubit_id} to tune anharmonicity."
        else:
            status = ValidationStatus.FAIL
            msg = f"{qr.qubit_id} anharmonicity {actual:.1f} MHz far from target {target:.1f} MHz"
            suggestion = f"Redesign {qr.qubit_id} capacitor geometry to change EC and adjust anharmonicity."

        return ValidationCheck(
            check_name=f"{qr.qubit_id}_anharmonicity",
            status=status,
            target=target,
            actual=actual,
            tolerance=tol,
            unit="MHz",
            message=msg,
            suggestion=suggestion,
        )


def _triplet_permutations(ids: list[str]) -> list[tuple[str, str, str]]:
    """Generate all unique (i, j, k) triplets where k ∉ {i, j} for straddling checks.

    For each pair (i, j), we check every other qubit k.
    """
    result: list[tuple[str, str, str]] = []
    for qi, qj in combinations(ids, 2):
        for qk in ids:
            if qk != qi and qk != qj:
                result.append((qi, qj, qk))
    return result
