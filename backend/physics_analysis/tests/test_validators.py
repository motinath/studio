"""Tests for physics validators: frequency, coherence, coupling, collision."""

from __future__ import annotations

import pytest

from physics_engine.models.enums import ValidationStatus


class TestFrequencyValidator:
    """Tests for FrequencyValidator — collision detection."""

    def test_direct_collision_detected(self) -> None:
        from physics_engine.validators.frequency_validator import FrequencyValidator

        validator = FrequencyValidator()
        qubit_freqs = {"Q1": 5.0, "Q2": 5.02}  # 20 MHz apart
        result = validator.detect_collisions(
            qubit_freqs=qubit_freqs,
            resonator_freqs={},
            min_spacing_mhz=100.0,
        )
        assert result.status == ValidationStatus.FAIL
        assert len(result.collisions) > 0

    def test_no_collision_with_spacing(self) -> None:
        from physics_engine.validators.frequency_validator import FrequencyValidator

        validator = FrequencyValidator()
        qubit_freqs = {"Q1": 5.0, "Q2": 5.4}  # 400 MHz apart
        result = validator.detect_collisions(
            qubit_freqs=qubit_freqs,
            resonator_freqs={},
            min_spacing_mhz=100.0,
        )
        assert result.status == ValidationStatus.PASS

    def test_two_photon_collision(self) -> None:
        from physics_engine.validators.frequency_validator import FrequencyValidator

        validator = FrequencyValidator()
        # 2 * 3.5 GHz = 7.0 GHz — resonator collision
        qubit_freqs = {"Q1": 3.5}
        resonator_freqs = {"R1": 7.0}
        result = validator.detect_collisions(
            qubit_freqs=qubit_freqs,
            resonator_freqs=resonator_freqs,
            min_spacing_mhz=100.0,
        )
        two_photon = [c for c in result.collisions if c.collision_type == "two_photon"]
        assert len(two_photon) > 0


class TestCoherenceValidator:
    """Tests for CoherenceValidator thresholding logic."""

    def test_threshold_pass(self) -> None:
        from physics_engine.validators.coherence_validator import CoherenceValidator

        validator = CoherenceValidator()
        # T1 >= target → PASS
        status = validator._threshold(80.0, 50.0)
        assert status == ValidationStatus.PASS

    def test_threshold_warning(self) -> None:
        from physics_engine.validators.coherence_validator import CoherenceValidator

        validator = CoherenceValidator()
        # 50% ≤ T1 < target → WARNING
        status = validator._threshold(30.0, 50.0)
        assert status == ValidationStatus.WARNING

    def test_threshold_fail(self) -> None:
        from physics_engine.validators.coherence_validator import CoherenceValidator

        validator = CoherenceValidator()
        # T1 < 50% target → FAIL
        status = validator._threshold(10.0, 50.0)
        assert status == ValidationStatus.FAIL


class TestCouplingValidator:
    """Tests for CouplingValidator using CouplingResult objects."""

    def test_zz_within_limit_passes(self) -> None:
        from physics_engine.validators.coupling_validator import CouplingValidator
        from physics_engine.models.physics_report import CouplingResult
        from physics_engine.models.design_spec import CouplerSpec
        from physics_engine.models.enums import CouplerType

        validator = CouplingValidator()
        results = [CouplingResult(
            qubit_a="Q1", qubit_b="Q2",
            coupling_capacitance_fF=3.0,
            bare_coupling_mhz=5.0,
            dispersive_shift_khz=0.0,
            zz_coupling_khz=20.0,
        )]
        specs = [CouplerSpec(
            coupler_id="C12", type=CouplerType.CAPACITIVE,
            connects=["Q1", "Q2"],
            target_coupling_mhz=5.0, max_zz_khz=50.0,
        )]
        checks = validator.validate(results, specs)
        zz_checks = [c for c in checks if "zz" in c.check_name.lower()]
        assert all(c.status == ValidationStatus.PASS for c in zz_checks)

    def test_zz_exceeding_limit_warns_or_fails(self) -> None:
        from physics_engine.validators.coupling_validator import CouplingValidator
        from physics_engine.models.physics_report import CouplingResult
        from physics_engine.models.design_spec import CouplerSpec
        from physics_engine.models.enums import CouplerType

        validator = CouplingValidator()
        results = [CouplingResult(
            qubit_a="Q1", qubit_b="Q2",
            coupling_capacitance_fF=3.0,
            bare_coupling_mhz=5.0,
            dispersive_shift_khz=0.0,
            zz_coupling_khz=80.0,  # exceeds 50 kHz limit
        )]
        specs = [CouplerSpec(
            coupler_id="C12", type=CouplerType.CAPACITIVE,
            connects=["Q1", "Q2"],
            target_coupling_mhz=5.0, max_zz_khz=50.0,
        )]
        checks = validator.validate(results, specs)
        zz_checks = [c for c in checks if "zz" in c.check_name.lower()]
        assert any(c.status in (ValidationStatus.FAIL, ValidationStatus.WARNING) for c in zz_checks)
