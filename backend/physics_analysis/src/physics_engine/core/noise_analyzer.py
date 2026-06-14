"""Noise and coherence analysis using scqubits noise channels.

Computes T1 (relaxation) and T2 (dephasing) times by evaluating every
applicable noise channel for each qubit type and combining them via
Matthiessen's rule.

Combination formulae:
    1/T1_eff = Σ_k (1/T1_k)
    1/T2_eff = 1/(2·T1_eff) + Σ_k (1/Tφ_k)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from physics_engine.config import (
    DEFAULT_NOISE,
    MK_TO_K,
    NOISE_CHANNEL_PARAMS,
    T1_CHANNELS,
    TPHI_CHANNELS,
)
from physics_engine.models.design_spec import DesignSpec, NoiseEnvironment
from physics_engine.models.enums import QubitType

logger = logging.getLogger(__name__)



# Result dataclasses



@dataclass
class ChannelResult:
    """Result for a single noise channel.

    Attributes:
        channel_name: scqubits method name (e.g. ``'t1_capacitive'``).
        value_s: Channel-specific T1 or Tφ in **seconds**.
    """

    channel_name: str
    value_s: float


@dataclass
class NoiseAnalysisResult:
    """Complete noise/coherence analysis for one qubit.

    Attributes:
        qubit_id: Unique qubit identifier.
        T1_effective_s: Effective T1 in seconds.
        T2_effective_s: Effective T2 in seconds.
        t1_channels: Per-channel T1 contributions.
        tphi_channels: Per-channel Tφ contributions.
        dominant_t1: Name of the channel most limiting T1.
        dominant_tphi: Name of the channel most limiting Tφ.
    """

    qubit_id: str
    T1_effective_s: float = 0.0
    T2_effective_s: float = 0.0
    t1_channels: list[ChannelResult] = field(default_factory=list)
    tphi_channels: list[ChannelResult] = field(default_factory=list)
    dominant_t1: str = ""
    dominant_tphi: str = ""



# Analyzer class



class NoiseAnalyzer:
    """Compute T1/T2 coherence times with channel-by-channel breakdown.

    Each applicable noise channel is evaluated individually via the
    corresponding scqubits method (e.g. ``qubit.t1_capacitive(...)``),
    then combined using Matthiessen's rule.

    Usage::

        analyzer = NoiseAnalyzer()
        result = analyzer.analyze(scq_qubit, "Q1", QubitType.TRANSMON, noise_env)
    """

    @staticmethod
    def _build_channel_kwargs(
        channel_name: str,
        noise_env: NoiseEnvironment,
    ) -> dict[str, Any]:
        """Map NoiseEnvironment fields to scqubits channel keyword arguments.

        Uses the :data:`NOISE_CHANNEL_PARAMS` registry to determine which
        keyword arguments a channel method accepts and what
        :class:`NoiseEnvironment` attribute to pull the value from.

        Parameters:
            channel_name: scqubits method name.
            noise_env: User-specified noise environment.

        Returns:
            Dict of ``{kwarg_name: value}`` ready to be unpacked into the
            scqubits method call.
        """
        param_map = NOISE_CHANNEL_PARAMS.get(channel_name, {})
        kwargs: dict[str, Any] = {}

        # Map from the config's kwarg names → NoiseEnvironment attribute names
        env_field_map = {
            "temperature_K": noise_env.temperature_mK * MK_TO_K,
            "Q_capacitive": noise_env.Q_capacitive,
            "Q_inductive": noise_env.Q_inductive,
            "flux_noise_amplitude": noise_env.flux_noise_amplitude,
            "charge_noise_amplitude": noise_env.charge_noise_amplitude,
            "critical_current_noise_amplitude": noise_env.critical_current_noise_amplitude,
            "quasiparticle_density": noise_env.quasiparticle_density,
        }

        for kwarg_name, env_attr in param_map.items():
            if env_attr in env_field_map:
                kwargs[kwarg_name] = env_field_map[env_attr]
            else:
                logger.warning(
                    "Noise channel '%s': unknown environment attribute '%s'",
                    channel_name,
                    env_attr,
                )

        return kwargs

    @staticmethod
    def _noise_env_from_defaults() -> NoiseEnvironment:
        """Create a NoiseEnvironment from the built-in defaults."""
        return NoiseEnvironment(
            temperature_mK=DEFAULT_NOISE.temperature_K / MK_TO_K,
            Q_capacitive=DEFAULT_NOISE.Q_capacitive,
            Q_inductive=DEFAULT_NOISE.Q_inductive,
            flux_noise_amplitude=DEFAULT_NOISE.flux_noise_amplitude,
            charge_noise_amplitude=DEFAULT_NOISE.charge_noise_amplitude,
            critical_current_noise_amplitude=DEFAULT_NOISE.critical_current_noise_amplitude,
            quasiparticle_density=DEFAULT_NOISE.quasiparticle_density,
        )

    def analyze(
        self,
        scq_qubit: Any,
        qubit_id: str,
        qubit_type: QubitType,
        noise_env: NoiseEnvironment | None = None,
    ) -> NoiseAnalysisResult:
        """Analyse coherence for a single qubit.

        Parameters:
            scq_qubit: scqubits qubit instance (Transmon, TunableTransmon,
                or Fluxonium).
            qubit_id: Qubit identifier string.
            qubit_type: The :class:`QubitType` enum.
            noise_env: Noise environment parameters. Falls back to
                ``DEFAULT_NOISE`` if ``None``.

        Returns:
            :class:`NoiseAnalysisResult` with effective T1/T2 and
            per-channel breakdown.
        """
        if noise_env is None:
            noise_env = self._noise_env_from_defaults()

        qtype_key = qubit_type.value  # e.g. "transmon"
        logger.info(
            "Noise analysis for qubit '%s' (type=%s)", qubit_id, qtype_key
        )

        # ---- T1 channels ----
        t1_channels: list[ChannelResult] = []
        inv_t1_sum = 0.0
        t1_channel_names = T1_CHANNELS.get(qtype_key, [])

        for ch_name in t1_channel_names:
            method = getattr(scq_qubit, ch_name, None)
            if method is None:
                logger.warning(
                    "  scqubits method '%s' not found on %s – skipping",
                    ch_name,
                    type(scq_qubit).__name__,
                )
                continue
            try:
                kwargs = self._build_channel_kwargs(ch_name, noise_env)
                t1_val = float(method(**kwargs))
                if t1_val > 0.0 and np.isfinite(t1_val):
                    t1_channels.append(ChannelResult(channel_name=ch_name, value_s=t1_val))
                    inv_t1_sum += 1.0 / t1_val
                    logger.debug("  T1[%s] = %.2e s", ch_name, t1_val)
                else:
                    logger.warning(
                        "  T1[%s] returned non-positive or non-finite value (%.2e) – skipping",
                        ch_name,
                        t1_val,
                    )
            except Exception:
                logger.warning(
                    "  T1 channel '%s' raised exception – skipping",
                    ch_name,
                    exc_info=True,
                )

        # ---- Tφ channels ----
        tphi_channels: list[ChannelResult] = []
        inv_tphi_sum = 0.0
        tphi_channel_names = TPHI_CHANNELS.get(qtype_key, [])

        for ch_name in tphi_channel_names:
            method = getattr(scq_qubit, ch_name, None)
            if method is None:
                logger.warning(
                    "  scqubits method '%s' not found on %s – skipping",
                    ch_name,
                    type(scq_qubit).__name__,
                )
                continue
            try:
                kwargs = self._build_channel_kwargs(ch_name, noise_env)
                tphi_val = float(method(**kwargs))
                if tphi_val > 0.0 and np.isfinite(tphi_val):
                    tphi_channels.append(ChannelResult(channel_name=ch_name, value_s=tphi_val))
                    inv_tphi_sum += 1.0 / tphi_val
                    logger.debug("  Tφ[%s] = %.2e s", ch_name, tphi_val)
                else:
                    logger.warning(
                        "  Tφ[%s] returned non-positive or non-finite value (%.2e) – skipping",
                        ch_name,
                        tphi_val,
                    )
            except Exception:
                logger.warning(
                    "  Tφ channel '%s' raised exception – skipping",
                    ch_name,
                    exc_info=True,
                )

        # ---- Effective T1 ----
        if inv_t1_sum > 0.0:
            T1_eff = 1.0 / inv_t1_sum
        else:
            logger.warning("  No valid T1 channels for qubit '%s'", qubit_id)
            T1_eff = float("inf")

        # ---- Effective T2 ----
        # 1/T2 = 1/(2·T1) + Σ(1/Tφ_k)
        if T1_eff > 0.0 and np.isfinite(T1_eff):
            inv_t2 = 1.0 / (2.0 * T1_eff) + inv_tphi_sum
        else:
            inv_t2 = inv_tphi_sum

        if inv_t2 > 0.0:
            T2_eff = 1.0 / inv_t2
        else:
            logger.warning("  No valid T2 channels for qubit '%s'", qubit_id)
            T2_eff = float("inf")

        # ---- Dominant channels ----
        dominant_t1 = ""
        if t1_channels:
            dominant_t1 = min(t1_channels, key=lambda c: c.value_s).channel_name

        dominant_tphi = ""
        if tphi_channels:
            dominant_tphi = min(tphi_channels, key=lambda c: c.value_s).channel_name

        logger.info(
            "  → T1_eff=%.2e s, T2_eff=%.2e s, dominant T1='%s', dominant Tφ='%s'",
            T1_eff,
            T2_eff,
            dominant_t1,
            dominant_tphi,
        )

        return NoiseAnalysisResult(
            qubit_id=qubit_id,
            T1_effective_s=T1_eff,
            T2_effective_s=T2_eff,
            t1_channels=t1_channels,
            tphi_channels=tphi_channels,
            dominant_t1=dominant_t1,
            dominant_tphi=dominant_tphi,
        )

    def analyze_all(
        self,
        qubit_results: list[Any],
        design_spec: DesignSpec,
    ) -> list[NoiseAnalysisResult]:
        """Analyze coherence for all qubits.

        Parameters:
            qubit_results: List of objects that have ``qubit_id``,
                ``qubit_type``, and ``scq_qubit_object`` attributes
                (i.e., :class:`SingleQubitAnalysisResult` instances).
            design_spec: Design specification (provides the noise
                environment).

        Returns:
            One :class:`NoiseAnalysisResult` per qubit.
        """
        noise_env = design_spec.noise_environment
        results: list[NoiseAnalysisResult] = []

        for qr in qubit_results:
            try:
                result = self.analyze(
                    scq_qubit=qr.scq_qubit_object,
                    qubit_id=qr.qubit_id,
                    qubit_type=qr.qubit_type,
                    noise_env=noise_env,
                )
                results.append(result)
            except Exception:
                logger.exception(
                    "Noise analysis failed for qubit '%s'. Skipping.",
                    qr.qubit_id,
                )

        return results
