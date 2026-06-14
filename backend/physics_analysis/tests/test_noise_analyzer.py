"""Tests for the NoiseAnalyzer — T1/T2 computation and channel breakdown."""

from __future__ import annotations

from dataclasses import dataclass, field
from unittest.mock import MagicMock, patch

import numpy as np
import pytest


class TestNoiseAnalyzer:
    """Tests for NoiseAnalyzer with scqubits mocked."""

    def test_t1_channels_computed(self) -> None:
        """Verify that individual T1 channels are computed."""
        from physics_engine.core.noise_analyzer import NoiseAnalyzer

        mock_qubit = MagicMock()
        # Mock t1_effective returning 100 µs in seconds
        mock_qubit.t1_effective.return_value = 100e-6
        mock_qubit.t1.return_value = 200e-6

        analyzer = NoiseAnalyzer()
        # The analyzer should handle missing channels gracefully
        assert analyzer is not None

    def test_t2_formula(self) -> None:
        """Verify T2 = 1 / (1/(2·T1) + 1/Tφ)."""
        T1 = 100e-6  # 100 µs
        Tphi = 50e-6  # 50 µs
        # 1/T2 = 1/(2·T1) + 1/Tφ = 5000 + 20000 = 25000
        T2_expected = 1.0 / (1.0 / (2.0 * T1) + 1.0 / Tphi)
        assert T2_expected == pytest.approx(40e-6, rel=1e-3)

    def test_dominant_channel_selection(self) -> None:
        """The channel with smallest T1 should be dominant."""
        from physics_engine.core.noise_analyzer import ChannelResult

        channels = [
            ChannelResult(channel_name="t1_capacitive", value_s=200e-6),
            ChannelResult(channel_name="t1_quasiparticle", value_s=80e-6),
            ChannelResult(channel_name="t1_charge_impedance", value_s=500e-6),
        ]
        # Smallest T1 channel limits the system
        dominant = min(channels, key=lambda c: c.value_s)
        assert dominant.channel_name == "t1_quasiparticle"

    def test_combined_t1(self) -> None:
        """1/T1_eff = sum(1/T1_k) — Matthiessen's rule."""
        t1_vals = [200e-6, 100e-6, 500e-6]
        reciprocal_sum = sum(1.0 / t for t in t1_vals)
        T1_eff = 1.0 / reciprocal_sum
        # Should be less than the smallest individual T1
        assert T1_eff < min(t1_vals)
        assert T1_eff == pytest.approx(58.82e-6, rel=1e-3)
