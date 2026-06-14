"""Parameter sweep engine for sensitivity analysis.

Sweeps qubit parameters (EJ, flux, EC) and recomputes physics to
understand design sensitivity to fabrication variation.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import numpy as np

from physics_engine.config import EIGENVALUES_COUNT, FLUXONIUM_CUTOFF, TRANSMON_NCUT
from physics_engine.core.parameter_converter import ConvertedQubitParams
from physics_engine.models.enums import QubitType

logger = logging.getLogger(__name__)

try:
    import scqubits as scq
except ImportError:
    scq = None  # type: ignore[assignment]


@dataclass
class SweepResult:
    """Result of a parameter sweep."""

    qubit_id: str
    param_name: str
    param_values: list[float] = field(default_factory=list)
    frequencies_ghz: list[float] = field(default_factory=list)
    anharmonicities_ghz: list[float] = field(default_factory=list)
    t1_values_us: list[float] | None = None
    t2_values_us: list[float] | None = None


class ParameterSweepEngine:
    """Sweep parameters to study design sensitivity."""

    def sweep_ej(
        self,
        params: ConvertedQubitParams,
        ej_values: list[float] | np.ndarray,
    ) -> SweepResult:
        """Sweep Josephson energy and compute freq + anharmonicity.

        Args:
            params: Base qubit parameters.
            ej_values: List of EJ values to sweep (GHz).

        Returns:
            SweepResult with frequencies and anharmonicities at each EJ.
        """
        if scq is None:
            raise ImportError("scqubits is required for parameter sweeps.")

        result = SweepResult(
            qubit_id=params.qubit_id,
            param_name="EJ_ghz",
            param_values=list(ej_values),
        )

        for ej in ej_values:
            try:
                qubit = self._create_qubit(params, EJ_override=ej)
                evals = qubit.eigenvals(evals_count=4)
                f01 = float(evals[1] - evals[0])
                f12 = float(evals[2] - evals[1])
                alpha = f12 - f01
                result.frequencies_ghz.append(f01)
                result.anharmonicities_ghz.append(alpha)
            except Exception as exc:
                logger.warning("EJ sweep failed at EJ=%.2f: %s", ej, exc)
                result.frequencies_ghz.append(float('nan'))
                result.anharmonicities_ghz.append(float('nan'))

        return result

    def sweep_flux(
        self,
        params: ConvertedQubitParams,
        flux_values: list[float] | np.ndarray,
    ) -> SweepResult:
        """Sweep external flux and compute freq + anharmonicity.

        Primarily useful for tunable transmons and fluxonium.

        Args:
            params: Base qubit parameters.
            flux_values: List of flux values to sweep (in Φ₀).

        Returns:
            SweepResult with frequencies and anharmonicities at each flux.
        """
        if scq is None:
            raise ImportError("scqubits is required for parameter sweeps.")

        if params.qubit_type == QubitType.TRANSMON:
            logger.warning(
                "Flux sweep on fixed-frequency transmon '%s' has no effect.",
                params.qubit_id,
            )

        result = SweepResult(
            qubit_id=params.qubit_id,
            param_name="flux",
            param_values=list(flux_values),
        )

        for flux in flux_values:
            try:
                qubit = self._create_qubit(params, flux_override=flux)
                evals = qubit.eigenvals(evals_count=4)
                f01 = float(evals[1] - evals[0])
                f12 = float(evals[2] - evals[1])
                alpha = f12 - f01
                result.frequencies_ghz.append(f01)
                result.anharmonicities_ghz.append(alpha)
            except Exception as exc:
                logger.warning("Flux sweep failed at flux=%.3f: %s", flux, exc)
                result.frequencies_ghz.append(float('nan'))
                result.anharmonicities_ghz.append(float('nan'))

        return result

    def sweep_single_qubit(
        self,
        params: ConvertedQubitParams,
        param_name: str,
        param_values: list[float] | np.ndarray,
    ) -> SweepResult:
        """Generic single-parameter sweep.

        Args:
            params: Base qubit parameters.
            param_name: Parameter to sweep ('EJ_ghz', 'EC_ghz', 'flux', 'EL_ghz').
            param_values: Values to sweep over.

        Returns:
            SweepResult with computed properties at each value.
        """
        dispatch = {
            "EJ_ghz": self.sweep_ej,
            "flux": self.sweep_flux,
        }

        if param_name in dispatch:
            return dispatch[param_name](params, param_values)

        # Generic: modify the param and recompute
        if scq is None:
            raise ImportError("scqubits is required for parameter sweeps.")

        result = SweepResult(
            qubit_id=params.qubit_id,
            param_name=param_name,
            param_values=list(param_values),
        )

        for val in param_values:
            try:
                override = {param_name: val}
                qubit = self._create_qubit(params, **override)
                evals = qubit.eigenvals(evals_count=4)
                f01 = float(evals[1] - evals[0])
                f12 = float(evals[2] - evals[1])
                alpha = f12 - f01
                result.frequencies_ghz.append(f01)
                result.anharmonicities_ghz.append(alpha)
            except Exception as exc:
                logger.warning("Sweep %s=%.4f failed: %s", param_name, val, exc)
                result.frequencies_ghz.append(float('nan'))
                result.anharmonicities_ghz.append(float('nan'))

        return result

   
    # Internal helpers
   

    @staticmethod
    def _create_qubit(
        params: ConvertedQubitParams,
        EJ_override: float | None = None,
        EC_override: float | None = None,
        flux_override: float | None = None,
        EL_override: float | None = None,
        **kwargs: float,
    ) -> object:
        """Create a scqubits qubit object with optional parameter overrides."""
        EJ = EJ_override if EJ_override is not None else kwargs.get("EJ_ghz", params.EJ_ghz)
        EC = EC_override if EC_override is not None else kwargs.get("EC_ghz", params.EC_ghz)
        flux = flux_override if flux_override is not None else params.flux_bias

        if params.qubit_type == QubitType.TRANSMON:
            return scq.Transmon(EJ=EJ, EC=EC, ng=0.0, ncut=TRANSMON_NCUT)

        elif params.qubit_type == QubitType.TUNABLE_TRANSMON:
            return scq.TunableTransmon(
                EJmax=EJ,
                EC=EC,
                d=params.asymmetry,
                flux=flux,
                ng=0.0,
                ncut=TRANSMON_NCUT,
            )

        elif params.qubit_type == QubitType.FLUXONIUM:
            EL = EL_override if EL_override is not None else kwargs.get("EL_ghz", params.EL_ghz)
            if EL is None:
                raise ValueError(f"EL required for fluxonium qubit '{params.qubit_id}'.")
            return scq.Fluxonium(
                EJ=EJ, EC=EC, EL=EL, flux=flux, cutoff=FLUXONIUM_CUTOFF,
            )

        raise ValueError(f"Unsupported qubit type: {params.qubit_type}")
