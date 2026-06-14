"""Single-qubit spectral analysis using scqubits.

Creates scqubits qubit objects (Transmon, TunableTransmon, Fluxonium) from
converted parameters and extracts key spectral properties: transition
frequencies, anharmonicity, and energy-level structure.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import scqubits as scq

from physics_engine.config import (
    EIGENVALUES_COUNT,
    FLUXONIUM_CUTOFF,
    MIN_EJ_EC_RATIO_TRANSMON,
    TRANSMON_NCUT,
)
from physics_engine.core.parameter_converter import ConvertedQubitParams
from physics_engine.models.enums import QubitType

logger = logging.getLogger(__name__)



# Result dataclass



@dataclass
class SingleQubitAnalysisResult:
    """Results from single-qubit spectral analysis.

    Attributes:
        qubit_id: Unique qubit identifier.
        qubit_type: The :class:`QubitType` enum value.
        frequency_ghz: 0→1 transition frequency in GHz.
        anharmonicity_ghz: Anharmonicity α = f₁₂ − f₀₁ in GHz (negative for
            transmons).
        f12_ghz: 1→2 transition frequency in GHz.
        energy_levels: First *N* energy eigenvalues in GHz relative to the
            ground state.
        ej_ec_ratio: E_J / E_C ratio.
        transmon_regime: ``True`` if EJ/EC > 20.
        scq_qubit_object: The underlying scqubits qubit instance (for
            downstream analysis such as noise or multi-qubit coupling).
    """

    qubit_id: str
    qubit_type: QubitType
    frequency_ghz: float = 0.0
    anharmonicity_ghz: float = 0.0
    f12_ghz: float = 0.0
    energy_levels: list[float] = field(default_factory=list)
    ej_ec_ratio: float = 0.0
    transmon_regime: bool = False
    scq_qubit_object: Any = None  # scqubits qubit instance



# Analyzer class



class SingleQubitAnalyzer:
    """Perform single-qubit spectral analysis via scqubits diagonalization.

    Usage::

        analyzer = SingleQubitAnalyzer()
        result = analyzer.analyze(converted_params)
    """

    # ----- qubit factory -----

    @staticmethod
    def create_qubit(params: ConvertedQubitParams) -> scq.Transmon | scq.TunableTransmon | scq.Fluxonium:
        """Instantiate a scqubits qubit object from converted parameters.

        Parameters:
            params: Converted qubit parameters.

        Returns:
            One of :class:`scq.Transmon`, :class:`scq.TunableTransmon`, or
            :class:`scq.Fluxonium`.

        Raises:
            ValueError: If qubit type is unsupported or missing required
                parameters (e.g. ``EL_ghz`` for fluxonium).
        """
        qtype = params.qubit_type

        if qtype == QubitType.TRANSMON:
            qubit = scq.Transmon(
                EJ=params.EJ_ghz,
                EC=params.EC_ghz,
                ng=0.0,
                ncut=TRANSMON_NCUT,
                truncated_dim=EIGENVALUES_COUNT,
            )
            logger.debug(
                "Created Transmon for '%s': EJ=%.4f, EC=%.4f",
                params.qubit_id,
                params.EJ_ghz,
                params.EC_ghz,
            )
            return qubit

        if qtype == QubitType.TUNABLE_TRANSMON:
            qubit = scq.TunableTransmon(
                EJmax=params.EJ_ghz,
                EC=params.EC_ghz,
                d=params.asymmetry,
                flux=params.flux_bias,
                ng=0.0,
                ncut=TRANSMON_NCUT,
                truncated_dim=EIGENVALUES_COUNT,
            )
            logger.debug(
                "Created TunableTransmon for '%s': EJmax=%.4f, EC=%.4f, d=%.3f, flux=%.3f",
                params.qubit_id,
                params.EJ_ghz,
                params.EC_ghz,
                params.asymmetry,
                params.flux_bias,
            )
            return qubit

        if qtype == QubitType.FLUXONIUM:
            if params.EL_ghz is None:
                raise ValueError(
                    f"Qubit '{params.qubit_id}': Fluxonium requires EL_ghz "
                    f"but none was computed. Check inductance data."
                )
            qubit = scq.Fluxonium(
                EJ=params.EJ_ghz,
                EC=params.EC_ghz,
                EL=params.EL_ghz,
                flux=params.flux_bias,
                cutoff=FLUXONIUM_CUTOFF,
                truncated_dim=EIGENVALUES_COUNT,
            )
            logger.debug(
                "Created Fluxonium for '%s': EJ=%.4f, EC=%.4f, EL=%.4f, flux=%.3f",
                params.qubit_id,
                params.EJ_ghz,
                params.EC_ghz,
                params.EL_ghz,
                params.flux_bias,
            )
            return qubit

        raise ValueError(f"Unsupported qubit type: {qtype}")

    # ----- single-qubit analysis -----

    def analyze(self, params: ConvertedQubitParams) -> SingleQubitAnalysisResult:
        """Run spectral analysis on a single qubit.

        Creates the scqubits object, diagonalizes the Hamiltonian, and
        extracts transition frequencies and anharmonicity.

        Parameters:
            params: Converted qubit parameters.

        Returns:
            :class:`SingleQubitAnalysisResult` with all computed properties.
        """
        logger.info("Analyzing qubit '%s' (type=%s)", params.qubit_id, params.qubit_type.value)

        qubit = self.create_qubit(params)

        # Eigenvalues relative to ground state (in GHz, since scqubits uses
        # the energy units of the input parameters).
        evals = qubit.eigenvals(evals_count=EIGENVALUES_COUNT)
        evals_relative = evals - evals[0]

        # Transition frequencies
        f01 = float(evals_relative[1])  # 0→1
        f12 = float(evals_relative[2] - evals_relative[1])  # 1→2
        anharmonicity = f12 - f01  # α = f12 - f01

        ej_ec = params.ej_ec_ratio
        transmon_regime = ej_ec >= MIN_EJ_EC_RATIO_TRANSMON

        result = SingleQubitAnalysisResult(
            qubit_id=params.qubit_id,
            qubit_type=params.qubit_type,
            frequency_ghz=f01,
            anharmonicity_ghz=anharmonicity,
            f12_ghz=f12,
            energy_levels=[float(e) for e in evals_relative[:EIGENVALUES_COUNT]],
            ej_ec_ratio=ej_ec,
            transmon_regime=transmon_regime,
            scq_qubit_object=qubit,
        )

        logger.info(
            "  → f01=%.4f GHz, α=%.1f MHz, EJ/EC=%.1f, transmon=%s",
            f01,
            anharmonicity * 1e3,
            ej_ec,
            transmon_regime,
        )
        return result

    # ----- batch analysis -----

    def analyze_all(
        self, all_params: list[ConvertedQubitParams]
    ) -> list[SingleQubitAnalysisResult]:
        """Analyze a list of qubits.

        Parameters:
            all_params: List of converted qubit parameter sets.

        Returns:
            Corresponding list of analysis results.
        """
        results: list[SingleQubitAnalysisResult] = []
        for params in all_params:
            try:
                result = self.analyze(params)
                results.append(result)
            except Exception:
                logger.exception(
                    "Failed to analyze qubit '%s'. Skipping.", params.qubit_id
                )
        return results

    # ----- parameter suggestion -----

    @staticmethod
    def suggest_params(
        target_freq_ghz: float,
        target_anharmonicity_mhz: float,
    ) -> tuple[float, float]:
        """Suggest EJ and EC for a desired transmon frequency and anharmonicity.

        Uses :meth:`scqubits.Transmon.find_EJ_EC` to reverse-engineer the
        Hamiltonian parameters from target observables.

        Parameters:
            target_freq_ghz: Desired 0→1 transition frequency in GHz.
            target_anharmonicity_mhz: Desired anharmonicity in MHz (provide
                as negative, e.g. ``-250``).

        Returns:
            Tuple ``(EJ_ghz, EC_ghz)``.
        """
        # scqubits expects anharmonicity in the same units as frequencies (GHz)
        target_anharmonicity_ghz = target_anharmonicity_mhz / 1e3

        logger.info(
            "Suggesting EJ/EC for f01=%.4f GHz, α=%.1f MHz",
            target_freq_ghz,
            target_anharmonicity_mhz,
        )

        try:
            EJ, EC = scq.Transmon.find_EJ_EC(
                E01=target_freq_ghz,
                anharmonicity=target_anharmonicity_ghz,
            )
            logger.info("  → Suggested EJ=%.4f GHz, EC=%.4f GHz", EJ, EC)
            return float(EJ), float(EC)
        except Exception:
            logger.exception("scqubits.Transmon.find_EJ_EC failed")
            raise
