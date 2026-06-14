"""Unit tests for MultiQubitAnalyzer — dressed states, coupling, and ZZ estimation."""

from __future__ import annotations

import sys
from unittest.mock import MagicMock

# Mock scqubits in sys.modules before importing multi_qubit
mock_scq = MagicMock()
sys.modules["scqubits"] = mock_scq

import pytest
from physics_engine.core.multi_qubit import MultiQubitAnalyzer, PairCouplingResult
from physics_engine.core.parameter_converter import ConvertedQubitParams
from physics_engine.core.single_qubit import SingleQubitAnalysisResult
from physics_engine.models.design_spec import CouplerSpec, ResonatorSpec
from physics_engine.models.enums import QubitType


class TestMultiQubitAnalyzer:
    """Tests for MultiQubitAnalyzer."""

    def test_find_mutual_capacitance(self) -> None:
        """Test lookup of mutual capacitances."""
        analyzer = MultiQubitAnalyzer()
        
        qa = ConvertedQubitParams(
            qubit_id="Q1",
            qubit_type=QubitType.TRANSMON,
            EC_ghz=0.3,
            EJ_ghz=20.0,
            coupling_caps={"Q2_island": 2.5, "R1": 4.5},
        )
        qb = ConvertedQubitParams(
            qubit_id="Q2",
            qubit_type=QubitType.TRANSMON,
            EC_ghz=0.3,
            EJ_ghz=20.0,
            coupling_caps={"Q1_island": 2.5},
        )
        qc = ConvertedQubitParams(
            qubit_id="Q3",
            qubit_type=QubitType.FLUXONIUM,
            EC_ghz=1.0,
            EJ_ghz=3.5,
            coupling_caps={},
        )

        # Direct match from qa's caps
        assert analyzer._find_mutual_capacitance(qa, qb) == pytest.approx(2.5)
        # Reverse check if qa doesn't have it but qb does
        qa_no_caps = ConvertedQubitParams(
            qubit_id="Q1",
            qubit_type=QubitType.TRANSMON,
            EC_ghz=0.3,
            EJ_ghz=20.0,
            coupling_caps={},
        )
        assert analyzer._find_mutual_capacitance(qa_no_caps, qb) == pytest.approx(2.5)
        # No coupling
        assert analyzer._find_mutual_capacitance(qa, qc) == pytest.approx(0.0)

    def test_estimate_zz(self) -> None:
        """Test ZZ coupling estimation."""
        analyzer = MultiQubitAnalyzer()
        
        # Test far-detuned regime
        zz = analyzer._estimate_zz(
            g_ghz=0.010,       # 10 MHz
            freq_a_ghz=5.0,
            freq_b_ghz=5.4,    # detuning = -0.4 GHz
            alpha_a_ghz=-0.25,
            alpha_b_ghz=-0.25,
        )
        # ZZ should be in the range of a few kHz (1e-6 GHz) and negative/positive depending on detuning sign
        assert zz != 0.0
        assert abs(zz) < 0.005

        # Near-resonance regime should return 0 (unreliable)
        zz_resonance = analyzer._estimate_zz(
            g_ghz=0.010,
            freq_a_ghz=5.0,
            freq_b_ghz=5.001,
            alpha_a_ghz=-0.25,
            alpha_b_ghz=-0.25,
        )
        assert zz_resonance == 0.0

    def test_analyze_method(self) -> None:
        """Test full analyze method with 2 qubits and a resonator."""
        analyzer = MultiQubitAnalyzer()

        qp_list = [
            ConvertedQubitParams(
                qubit_id="Q1",
                qubit_type=QubitType.TRANSMON,
                EC_ghz=0.3,
                EJ_ghz=20.0,
                capacitance_fF=65.0,
                coupling_caps={"Q2_island": 2.3, "R1": 4.5},
            ),
            ConvertedQubitParams(
                qubit_id="Q2",
                qubit_type=QubitType.TRANSMON,
                EC_ghz=0.3,
                EJ_ghz=22.0,
                capacitance_fF=65.0,
                coupling_caps={"Q1_island": 2.3},
            ),
        ]

        sq_list = [
            SingleQubitAnalysisResult(
                qubit_id="Q1",
                qubit_type=QubitType.TRANSMON,
                frequency_ghz=5.0,
                anharmonicity_ghz=-0.25,
                f12_ghz=4.75,
                energy_levels=[0.0, 5.0, 9.75],
                ej_ec_ratio=66.7,
                transmon_regime=True,
            ),
            SingleQubitAnalysisResult(
                qubit_id="Q2",
                qubit_type=QubitType.TRANSMON,
                frequency_ghz=5.4,
                anharmonicity_ghz=-0.26,
                f12_ghz=5.14,
                energy_levels=[0.0, 5.4, 10.54],
                ej_ec_ratio=73.3,
                transmon_regime=True,
            ),
        ]

        resonators = [
            ResonatorSpec(
                resonator_id="R1",
                type="readout",
                coupled_to="Q1",
                capacitance_terminal_id="R1",
                target_frequency_ghz=7.0,
                target_kappa_khz=500.0,
            )
        ]

        result = analyzer.analyze(
            qubit_params=qp_list,
            single_results=sq_list,
            resonator_specs=resonators,
        )

        assert "Q1" in result.dressed_frequencies
        assert "Q2" in result.dressed_frequencies
        assert len(result.coupling_results) == 1
        
        pair_res = result.coupling_results[0]
        assert pair_res.qubit_a == "Q1"
        assert pair_res.qubit_b == "Q2"
        assert pair_res.coupling_capacitance_fF == pytest.approx(2.3)
        assert pair_res.bare_coupling_ghz > 0.0
        assert pair_res.zz_coupling_ghz != 0.0

        assert "Q1" in result.readout_dispersive_shifts
        assert result.readout_dispersive_shifts["Q1"] != 0.0
