"""Tests for Pydantic data models — serialization, validation, helpers."""

from __future__ import annotations

import json

import pytest

from physics_engine.models.design_spec import DesignSpec
from physics_engine.models.em_results import EMResults
from physics_engine.models.enums import QubitType, ValidationStatus


class TestEMResults:
    """Tests for EMResults model."""

    def test_construction(self, sample_em_results: EMResults) -> None:
        assert sample_em_results.simulation_id == "sim-3q-001"
        assert sample_em_results.electrostatic is not None

    def test_serialization_roundtrip(self, sample_em_results: EMResults) -> None:
        json_str = sample_em_results.model_dump_json()
        restored = EMResults.model_validate_json(json_str)
        assert restored.simulation_id == sample_em_results.simulation_id
        assert restored.electrostatic is not None
        cap = restored.get_capacitance_matrix()
        assert cap.size == 5

    def test_get_self_capacitance(self, sample_em_results: EMResults) -> None:
        cap = sample_em_results.get_capacitance_matrix()
        c_q1 = cap.get_self_capacitance("Q1_island")
        assert c_q1 == pytest.approx(65.2)

    def test_get_mutual_capacitance(self, sample_em_results: EMResults) -> None:
        cap = sample_em_results.get_capacitance_matrix()
        c_12 = cap.get_mutual_capacitance("Q1_island", "Q2_island")
        assert c_12 == pytest.approx(-2.3)

    def test_get_inductance(self, sample_em_results: EMResults) -> None:
        L = sample_em_results.get_inductance("L_Q3_superinductor")
        assert L == pytest.approx(300.0)
        assert sample_em_results.get_inductance("nonexistent") is None

    def test_get_eigenmode_for_junction(self, sample_em_results: EMResults) -> None:
        mode = sample_em_results.get_eigenmode_for_junction("JJ_Q1")
        assert mode is not None
        assert mode.epr["JJ_Q1"] > 0.9


class TestDesignSpec:
    """Tests for DesignSpec model."""

    def test_construction(self, sample_design_spec: DesignSpec) -> None:
        assert len(sample_design_spec.qubits) == 3
        assert sample_design_spec.qubits[0].qubit_id == "Q1"

    def test_get_qubit(self, sample_design_spec: DesignSpec) -> None:
        q2 = sample_design_spec.get_qubit("Q2")
        assert q2.type == QubitType.TRANSMON
        with pytest.raises(KeyError):
            sample_design_spec.get_qubit("Q99")

    def test_get_resonator_for_qubit(self, sample_design_spec: DesignSpec) -> None:
        r1 = sample_design_spec.get_resonator_for_qubit("Q1")
        assert r1 is not None
        assert r1.resonator_id == "R1"
        assert sample_design_spec.get_resonator_for_qubit("Q3") is None

    def test_get_coupler_for_pair(self, sample_design_spec: DesignSpec) -> None:
        c12 = sample_design_spec.get_coupler_for_pair("Q1", "Q2")
        assert c12 is not None
        assert c12.coupler_id == "C12"
        # Order shouldn't matter
        c12_rev = sample_design_spec.get_coupler_for_pair("Q2", "Q1")
        assert c12_rev is not None

    def test_qubit_terminal_defaults(self, sample_design_spec: DesignSpec) -> None:
        q1 = sample_design_spec.get_qubit("Q1")
        assert q1.terminal_id == "Q1_island"

    def test_max_5_qubits_validation(self) -> None:
        """DesignSpec should reject >5 qubits."""
        from physics_engine.models.design_spec import JunctionParams, QubitSpec, QubitTargets
        qubits = [
            QubitSpec(
                qubit_id=f"Q{i}",
                type=QubitType.TRANSMON,
                junction_params=JunctionParams(EJ_ghz=20.0),
                targets=QubitTargets(
                    frequency_ghz=5.0, anharmonicity_mhz=-250,
                ),
            )
            for i in range(6)
        ]
        with pytest.raises(Exception):  # Pydantic validation error
            DesignSpec(design_id="too-many", qubits=qubits)

    def test_serialization_roundtrip(self, sample_design_spec: DesignSpec) -> None:
        json_str = sample_design_spec.model_dump_json()
        restored = DesignSpec.model_validate_json(json_str)
        assert len(restored.qubits) == 3
        assert restored.get_qubit("Q3").type == QubitType.FLUXONIUM


class TestEnums:
    """Tests for enum types."""

    def test_qubit_type_values(self) -> None:
        assert QubitType.TRANSMON.value == "transmon"
        assert QubitType.FLUXONIUM.value == "fluxonium"

    def test_validation_status_values(self) -> None:
        assert ValidationStatus.PASS.value == "PASS"
        assert ValidationStatus.FAIL.value == "FAIL"
