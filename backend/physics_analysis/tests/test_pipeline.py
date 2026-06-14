"""Integration tests for the full physics analysis pipeline."""

from __future__ import annotations

from unittest.mock import patch, MagicMock

import numpy as np
import pytest

from physics_engine.models.design_spec import DesignSpec
from physics_engine.models.em_results import EMResults


@pytest.mark.integration
class TestFullPipeline:
    """Integration tests for PhysicsAnalysisPipeline."""

    @patch("physics_engine.core.single_qubit.scq")
    def test_3_qubit_pipeline(
        self,
        mock_sq_scq: MagicMock,
        sample_em_results: EMResults,
        sample_design_spec: DesignSpec,
        tmp_path,
    ) -> None:
        """Run full pipeline with 3-qubit sample data."""
        # Mock scqubits objects
        mock_qubit = MagicMock()
        mock_qubit.eigenvals.return_value = np.array([0.0, 5.0, 9.7, 14.1, 18.2])
        mock_sq_scq.Transmon.return_value = mock_qubit
        mock_sq_scq.Fluxonium.return_value = mock_qubit
        mock_sq_scq.TunableTransmon.return_value = mock_qubit

        # Mock noise methods
        mock_qubit.t1_effective.return_value = 100e-6
        mock_qubit.t1.return_value = 200e-6
        mock_qubit.tphi_1_over_f.return_value = 150e-6

        from physics_engine.pipeline import PhysicsAnalysisPipeline

        pipeline = PhysicsAnalysisPipeline()
        report = pipeline.run(
            sample_em_results,
            sample_design_spec,
            output_dir=str(tmp_path),
        )

        # Verify report structure
        assert report.design_id == "design-3q-alpha"
        assert len(report.qubit_results) == 3
        assert report.validation_summary is not None
        assert 0.0 <= report.physics_score <= 1.0
        assert report.analysis_id.startswith("phys_")

    @patch("physics_engine.core.single_qubit.scq")
    def test_5_qubit_pipeline(
        self,
        mock_sq_scq: MagicMock,
        sample_5q_em_results: EMResults,
        sample_5q_design_spec: DesignSpec,
        tmp_path,
    ) -> None:
        """Run full pipeline with 5-qubit data."""
        mock_qubit = MagicMock()
        mock_qubit.eigenvals.return_value = np.array([0.0, 5.0, 9.7, 14.1, 18.2])
        mock_sq_scq.Transmon.return_value = mock_qubit

        mock_qubit.t1_effective.return_value = 100e-6
        mock_qubit.t1.return_value = 200e-6
        mock_qubit.tphi_1_over_f.return_value = 150e-6

        from physics_engine.pipeline import PhysicsAnalysisPipeline

        pipeline = PhysicsAnalysisPipeline()
        report = pipeline.run(
            sample_5q_em_results,
            sample_5q_design_spec,
            output_dir=str(tmp_path),
        )

        assert len(report.qubit_results) == 5
        assert report.design_id == "design-5q-chain"
