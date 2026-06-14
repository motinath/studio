"""Coupling strength and parasitic ZZ validation.

Checks computed coupling metrics against design targets
for each qubit-qubit coupler specification.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from physics_engine.models.design_spec import CouplerSpec
from physics_engine.models.enums import ValidationStatus
from physics_engine.models.physics_report import (
    CouplingResult,
    CouplingValidationDetail,
)

logger = logging.getLogger(__name__)


@dataclass
class ValidationCheck:
    """Result of a single coupling validation check."""

    check_name: str
    status: ValidationStatus
    target: float | None
    actual: float
    tolerance: float | None = None
    max_allowed: float | None = None
    unit: str = ""
    message: str = ""
    suggestion: str = ""


class CouplingValidator:
    """Validates coupling strength and static ZZ coupling for qubit pairs.

    For each coupler specification, checks:
    - Coupling strength *g* against the target (±20% tolerance).
    - Static ZZ coupling against the maximum allowed value.
    """

    # Default tolerance for coupling strength (fraction of target)
    COUPLING_TOLERANCE_FRAC: float = 0.20

    def validate(
        self,
        coupling_results: list[CouplingResult],
        coupler_specs: list[CouplerSpec],
    ) -> list[ValidationCheck]:
        """Validate all coupling results against their specifications.

        Args:
            coupling_results: Computed coupling metrics for qubit pairs.
            coupler_specs: Design specifications for each coupler.

        Returns:
            List of ValidationCheck results covering coupling strength and ZZ.
        """
        checks: list[ValidationCheck] = []

        # Build lookup: frozenset({qa, qb}) → CouplerSpec
        spec_lookup: dict[frozenset[str], CouplerSpec] = {}
        for cs in coupler_specs:
            key = frozenset(cs.connects)
            spec_lookup[key] = cs

        for cr in coupling_results:
            pair_key = frozenset({cr.qubit_a, cr.qubit_b})
            spec = spec_lookup.get(pair_key)

            if spec is None:
                logger.info(
                    "No coupler spec for pair (%s, %s), skipping validation",
                    cr.qubit_a, cr.qubit_b,
                )
                continue

            pair_label = f"{cr.qubit_a}-{cr.qubit_b}"

            # --- Coupling strength check ---
            g_check = self._check_coupling_strength(pair_label, cr, spec)
            checks.append(g_check)

            # --- ZZ parasitic check ---
            zz_check = self._check_zz(pair_label, cr, spec)
            checks.append(zz_check)

        return checks

    def get_coupling_validation_details(
        self,
        coupling_results: list[CouplingResult],
        coupler_specs: list[CouplerSpec],
    ) -> list[CouplingResult]:
        """Return coupling results with validation fields populated.

        Creates new CouplingResult instances with filled-in validation dicts.

        Args:
            coupling_results: Raw coupling results.
            coupler_specs: Coupler design specifications.

        Returns:
            List of CouplingResult with validation details attached.
        """
        spec_lookup: dict[frozenset[str], CouplerSpec] = {}
        for cs in coupler_specs:
            spec_lookup[frozenset(cs.connects)] = cs

        validated: list[CouplingResult] = []

        for cr in coupling_results:
            pair_key = frozenset({cr.qubit_a, cr.qubit_b})
            spec = spec_lookup.get(pair_key)

            validation: dict[str, CouplingValidationDetail] = {}

            if spec is not None:
                # Coupling strength
                g_target = spec.target_coupling_mhz
                g_actual = cr.bare_coupling_mhz
                g_tol = g_target * self.COUPLING_TOLERANCE_FRAC
                g_dev = abs(g_actual - g_target)

                if g_dev <= g_tol:
                    g_status = ValidationStatus.PASS
                elif g_dev <= g_tol * 2:
                    g_status = ValidationStatus.WARNING
                else:
                    g_status = ValidationStatus.FAIL

                validation["coupling_strength"] = CouplingValidationDetail(
                    status=g_status,
                    target=g_target,
                    actual=g_actual,
                    unit="MHz",
                )

                # ZZ parasitic
                zz_actual = abs(cr.zz_coupling_khz)
                zz_max = spec.max_zz_khz
                if zz_actual <= zz_max:
                    zz_status = ValidationStatus.PASS
                elif zz_actual <= zz_max * 1.5:
                    zz_status = ValidationStatus.WARNING
                else:
                    zz_status = ValidationStatus.FAIL

                validation["zz_parasitic"] = CouplingValidationDetail(
                    status=zz_status,
                    actual=zz_actual,
                    max_allowed=zz_max,
                    unit="kHz",
                )

            validated.append(
                CouplingResult(
                    qubit_a=cr.qubit_a,
                    qubit_b=cr.qubit_b,
                    coupling_capacitance_fF=cr.coupling_capacitance_fF,
                    bare_coupling_mhz=cr.bare_coupling_mhz,
                    dispersive_shift_khz=cr.dispersive_shift_khz,
                    zz_coupling_khz=cr.zz_coupling_khz,
                    validation=validation,
                )
            )

        return validated

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _check_coupling_strength(
        self,
        pair_label: str,
        cr: CouplingResult,
        spec: CouplerSpec,
    ) -> ValidationCheck:
        """Check coupling strength g against target ± tolerance."""
        target = spec.target_coupling_mhz
        actual = cr.bare_coupling_mhz
        tol = target * self.COUPLING_TOLERANCE_FRAC
        deviation = abs(actual - target)

        if deviation <= tol:
            status = ValidationStatus.PASS
            msg = f"{pair_label} coupling g={actual:.2f} MHz within ±{self.COUPLING_TOLERANCE_FRAC*100:.0f}% of target {target:.2f} MHz"
            suggestion = ""
        elif deviation <= tol * 2:
            status = ValidationStatus.WARNING
            msg = f"{pair_label} coupling g={actual:.2f} MHz deviates from target {target:.2f} MHz by {deviation:.2f} MHz"
            suggestion = f"Adjust coupling capacitance for {pair_label} to fine-tune g."
        else:
            status = ValidationStatus.FAIL
            direction = "increase" if actual < target else "decrease"
            msg = f"{pair_label} coupling g={actual:.2f} MHz far from target {target:.2f} MHz"
            suggestion = f"{direction.capitalize()} mutual capacitance between {pair_label} to {direction} coupling strength."

        return ValidationCheck(
            check_name=f"{pair_label}_coupling_strength",
            status=status,
            target=target,
            actual=actual,
            tolerance=tol,
            unit="MHz",
            message=msg,
            suggestion=suggestion,
        )

    def _check_zz(
        self,
        pair_label: str,
        cr: CouplingResult,
        spec: CouplerSpec,
    ) -> ValidationCheck:
        """Check static ZZ coupling against maximum allowed."""
        actual = abs(cr.zz_coupling_khz)
        max_allowed = spec.max_zz_khz

        if actual <= max_allowed:
            status = ValidationStatus.PASS
            msg = f"{pair_label} ZZ={actual:.1f} kHz ≤ max {max_allowed:.1f} kHz"
            suggestion = ""
        elif actual <= max_allowed * 1.5:
            status = ValidationStatus.WARNING
            msg = f"{pair_label} ZZ={actual:.1f} kHz exceeds max {max_allowed:.1f} kHz by {actual - max_allowed:.1f} kHz"
            suggestion = f"Increase detuning between {pair_label} qubits or reduce coupling capacitance."
        else:
            status = ValidationStatus.FAIL
            msg = f"{pair_label} ZZ={actual:.1f} kHz significantly exceeds max {max_allowed:.1f} kHz"
            suggestion = f"Redesign {pair_label} coupling: increase frequency detuning or add a coupler for ZZ cancellation."

        return ValidationCheck(
            check_name=f"{pair_label}_zz_parasitic",
            status=status,
            target=None,
            actual=actual,
            max_allowed=max_allowed,
            unit="kHz",
            message=msg,
            suggestion=suggestion,
        )
