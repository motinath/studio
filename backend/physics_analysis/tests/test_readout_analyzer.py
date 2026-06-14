"""Unit tests for ReadoutAnalyzer — dispersive shift, Purcell limit, critical photons."""

from __future__ import annotations

import sys
from unittest.mock import MagicMock

# Mock scqubits in sys.modules before importing core modules
sys.modules["scqubits"] = MagicMock()

import pytest
from physics_engine.core.multi_qubit import MultiQubitAnalysisResult
from physics_engine.core.parameter_converter import ConvertedQubitParams
from physics_engine.core.readout_analyzer import ReadoutAnalyzer
from physics_engine.core.single_qubit import SingleQubitAnalysisResult
from physics_engine.models.design_spec import ResonatorSpec
from physics_engine.models.enums import QubitType


class TestReadoutAnalyzer:
    """Tests for ReadoutAnalyzer."""

    def test_estimate_dispersive_shift(self) -> None:
        """Test analytic estimation of dispersive shift chi."""
        analyzer = ReadoutAnalyzer()
        
        qp = ConvertedQubitParams(
            qubit_id="Q1",
            qubit_type=QubitType.TRANSMON,
            EC_ghz=0.3,
            EJ_ghz=20.0,
            capacitance_fF=65.0,
            coupling_caps={"R1": 4.5},
        )
        rspec = ResonatorSpec(
            resonator_id="R1",
            type="readout",
            coupled_to="Q1",
            capacitance_terminal_id="R1",
            target_frequency_ghz=7.0,
            target_kappa_khz=500.0,
        )

        chi = analyzer._estimate_dispersive_shift(
            detuning_ghz=2.0,            # 7.0 - 5.0
            anharmonicity_ghz=-0.25,
            qubit_params=qp,
            resonator_spec=rspec,
        )
        
        # chi should be non-zero and negative for transmon with negative detuning/anharmonicity
        assert chi < 0.0
        assert abs(chi) < 0.1  # should be reasonable frequency

        # Test zero coupling cap
        qp_no_coupling = ConvertedQubitParams(
            qubit_id="Q1",
            qubit_type=QubitType.TRANSMON,
            EC_ghz=0.3,
            EJ_ghz=20.0,
            coupling_caps={},
        )
        chi_zero = analyzer._estimate_dispersive_shift(
            detuning_ghz=2.0,
            anharmonicity_ghz=-0.25,
            qubit_params=qp_no_coupling,
            resonator_spec=rspec,
        )
        assert chi_zero == 0.0

    def test_analyze_method(self) -> None:
        """Test main analyze method for readout analyzer."""
        analyzer = ReadoutAnalyzer()

        # MultiQubit result with predefined readout dispersive shift
        multi_res = MultiQubitAnalysisResult(
            readout_dispersive_shifts={"Q1": -0.002}  # -2 MHz dispersive shift
        )

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
            )
        ]

        qp_list = [
            ConvertedQubitParams(
                qubit_id="Q1",
                qubit_type=QubitType.TRANSMON,
                EC_ghz=0.3,
                EJ_ghz=20.0,
                capacitance_fF=65.0,
                coupling_caps={"R1": 4.5},
            )
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

        results = analyzer.analyze(
            multi_result=multi_res,
            single_results=sq_list,
            qubit_params=qp_list,
            resonator_specs=resonators,
        )

        assert len(results) == 1
        res = results[0]
        assert res.resonator_id == "R1"
        assert res.qubit_id == "Q1"
        assert res.resonator_freq_ghz == pytest.approx(7.0)
        assert res.detuning_ghz == pytest.approx(2.0)
        assert res.dispersive_shift_mhz == pytest.approx(-2.0)
        assert res.coupling_mhz > 0.0
        assert res.purcell_t1_limit_us > 0.0
        assert res.critical_photon_number > 0.0
