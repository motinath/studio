"""Tests for single-qubit analysis (mocks scqubits for CI)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from physics_engine.core.parameter_converter import ConvertedQubitParams
from physics_engine.models.enums import QubitType


class TestSingleQubitAnalyzer:
    """Tests for SingleQubitAnalyzer with scqubits mocked."""

    @pytest.fixture
    def transmon_params(self) -> ConvertedQubitParams:
        return ConvertedQubitParams(
            qubit_id="Q1",
            qubit_type=QubitType.TRANSMON,
            EC_ghz=0.3,
            EJ_ghz=20.0,
            capacitance_fF=65.0,
        )

    @pytest.fixture
    def fluxonium_params(self) -> ConvertedQubitParams:
        return ConvertedQubitParams(
            qubit_id="Q3",
            qubit_type=QubitType.FLUXONIUM,
            EC_ghz=1.0,
            EJ_ghz=3.5,
            EL_ghz=0.5,
            flux_bias=0.5,
        )

    def test_transmon_regime_check(self, transmon_params: ConvertedQubitParams) -> None:
        """EJ/EC > 20 should be detected as transmon regime."""
        assert transmon_params.ej_ec_ratio > 20

    def test_transmon_frequency_estimate(self, transmon_params: ConvertedQubitParams) -> None:
        """Transmon frequency should be approximately sqrt(8·EJ·EC) - EC."""
        EJ, EC = transmon_params.EJ_ghz, transmon_params.EC_ghz
        f_approx = np.sqrt(8 * EJ * EC) - EC
        # For EJ=20, EC=0.3: f ≈ sqrt(48) - 0.3 ≈ 6.63 GHz
        assert 4.0 < f_approx < 8.0

    @patch("physics_engine.core.single_qubit.scq")
    def test_analyze_creates_transmon(
        self, mock_scq: MagicMock, transmon_params: ConvertedQubitParams
    ) -> None:
        """Analyze should create a Transmon object with correct params."""
        from physics_engine.core.single_qubit import SingleQubitAnalyzer

        mock_qubit = MagicMock()
        mock_qubit.eigenvals.return_value = np.array([0.0, 5.0, 9.7, 14.1])
        mock_scq.Transmon.return_value = mock_qubit

        analyzer = SingleQubitAnalyzer()
        result = analyzer.analyze(transmon_params)

        mock_scq.Transmon.assert_called_once()
        call_kwargs = mock_scq.Transmon.call_args
        assert call_kwargs.kwargs.get("EJ") == pytest.approx(20.0) or \
               (call_kwargs.args and call_kwargs.args[0] == pytest.approx(20.0)) or \
               call_kwargs[1].get("EJ") == pytest.approx(20.0)

        assert result.qubit_id == "Q1"
        assert result.frequency_ghz == pytest.approx(5.0)
        assert result.anharmonicity_ghz == pytest.approx(-0.3)  # (9.7-5.0)-(5.0-0.0) = -0.3

    @patch("physics_engine.core.single_qubit.scq")
    def test_analyze_fluxonium(
        self, mock_scq: MagicMock, fluxonium_params: ConvertedQubitParams
    ) -> None:
        """Analyze should create a Fluxonium object for fluxonium type."""
        from physics_engine.core.single_qubit import SingleQubitAnalyzer

        mock_qubit = MagicMock()
        mock_qubit.eigenvals.return_value = np.array([0.0, 1.2, 4.5, 7.0])
        mock_scq.Fluxonium.return_value = mock_qubit

        analyzer = SingleQubitAnalyzer()
        result = analyzer.analyze(fluxonium_params)

        mock_scq.Fluxonium.assert_called_once()
        assert result.qubit_id == "Q3"
        assert result.frequency_ghz == pytest.approx(1.2)
