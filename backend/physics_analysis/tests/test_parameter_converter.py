"""Tests for the ParameterConverter — C→EC, L→EL, Ic→EJ conversions."""

from __future__ import annotations

import pytest

from physics_engine.config import E_CHARGE, FF_TO_F, GHZ_TO_HZ, H_PLANCK, NH_TO_H, PHI0
from physics_engine.core.parameter_converter import ConvertedQubitParams, ParameterConverter
from physics_engine.models.design_spec import DesignSpec
from physics_engine.models.em_results import EMResults

import numpy as np


class TestCapacitanceToEC:
    """Test C → EC conversion."""

    def test_known_value(self) -> None:
        """65 fF should give EC ≈ 0.297 GHz."""
        converter = ParameterConverter()
        EC = converter.capacitance_to_EC(65.0)
        # Manual: e² / (2 * 65e-15) / h / 1e9
        expected = E_CHARGE**2 / (2.0 * 65.0 * FF_TO_F) / (H_PLANCK * GHZ_TO_HZ)
        assert EC == pytest.approx(expected, rel=1e-6)
        # Sanity: EC for typical transmon should be 0.1-0.5 GHz
        assert 0.1 < EC < 0.5

    def test_different_capacitances(self) -> None:
        converter = ParameterConverter()
        # Smaller C → larger EC
        ec_small = converter.capacitance_to_EC(30.0)
        ec_large = converter.capacitance_to_EC(100.0)
        assert ec_small > ec_large

    def test_zero_capacitance_raises(self) -> None:
        converter = ParameterConverter()
        with pytest.raises(ValueError):
            converter.capacitance_to_EC(0.0)


class TestInductanceToEL:
    """Test L → EL conversion."""

    def test_known_value(self) -> None:
        """300 nH should give EL ≈ 0.18 GHz (typical fluxonium)."""
        converter = ParameterConverter()
        EL = converter.inductance_to_EL(300.0)
        expected = (PHI0 / (2.0 * np.pi))**2 / (300.0 * NH_TO_H) / (H_PLANCK * GHZ_TO_HZ)
        assert EL == pytest.approx(expected, rel=1e-6)
        assert 0.05 < EL < 1.0  # typical range for fluxonium

    def test_zero_inductance_raises(self) -> None:
        converter = ParameterConverter()
        with pytest.raises(ValueError):
            converter.inductance_to_EL(0.0)


class TestCriticalCurrentToEJ:
    """Test Ic → EJ conversion."""

    def test_known_value(self) -> None:
        """30 nA should give EJ ≈ 9.9 GHz."""
        converter = ParameterConverter()
        EJ = converter.critical_current_to_EJ(30.0)
        # EJ = Φ₀ · Ic / (2π) / h  in GHz
        expected = PHI0 * 30.0e-9 / (2.0 * np.pi) / (H_PLANCK * GHZ_TO_HZ)
        assert EJ == pytest.approx(expected, rel=1e-6)
        assert 5 < EJ < 20  # reasonable range


class TestCouplingStrength:
    """Test coupling strength estimation."""

    def test_symmetric_coupling(self) -> None:
        converter = ParameterConverter()
        g = converter.compute_coupling_strength(
            C_coupling_fF=3.0,
            C_a_fF=65.0,
            C_b_fF=65.0,
            freq_a_ghz=5.0,
            freq_b_ghz=5.0,
        )
        # g should be in the range of a few MHz → ~0.001-0.2 GHz
        assert 0.001 < g < 0.2

    def test_zero_coupling_cap(self) -> None:
        converter = ParameterConverter()
        g = converter.compute_coupling_strength(
            C_coupling_fF=0.0,
            C_a_fF=65.0,
            C_b_fF=65.0,
            freq_a_ghz=5.0,
            freq_b_ghz=5.0,
        )
        assert g == pytest.approx(0.0)


class TestConvertAll:
    """Test full conversion pipeline."""

    def test_3_qubit_conversion(
        self, sample_em_results: EMResults, sample_design_spec: DesignSpec
    ) -> None:
        converter = ParameterConverter()
        results = converter.convert_all(sample_em_results, sample_design_spec)

        assert len(results) == 3

        # Q1: transmon
        q1 = results[0]
        assert q1.qubit_id == "Q1"
        assert q1.qubit_type.value == "transmon"
        assert q1.EC_ghz > 0
        assert q1.EJ_ghz == pytest.approx(20.0)
        assert q1.ej_ec_ratio > 20  # should be in transmon regime
        assert q1.EL_ghz is None  # not fluxonium

        # Q3: fluxonium
        q3 = results[2]
        assert q3.qubit_id == "Q3"
        assert q3.qubit_type.value == "fluxonium"
        assert q3.EL_ghz is not None and q3.EL_ghz > 0
        assert q3.flux_bias == pytest.approx(0.5)
