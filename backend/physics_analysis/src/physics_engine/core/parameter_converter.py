"""Convert Palace EM simulation results into scqubits qubit parameters.

This module bridges the gap between raw EM simulation outputs (capacitance
matrices, inductances, junction critical currents) and the abstract Hamiltonian
parameters (EC, EJ, EL) that scqubits requires.

Key conversion formulas:
    EC = e² / (2·C) / h  →  expressed in GHz
    EJ = Φ₀·Ic / (2π)  / h  →  expressed in GHz
    EL = (Φ₀/(2π))² / (L) / h  →  expressed in GHz
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

import numpy as np

from physics_engine.config import (
    E_CHARGE,
    FF_TO_F,
    GHZ_TO_HZ,
    H_PLANCK,
    HBAR,
    NA_TO_A,
    NH_TO_H,
    PHI0,
)
from physics_engine.models.design_spec import DesignSpec, QubitSpec
from physics_engine.models.em_results import EMResults
from physics_engine.models.enums import QubitType

logger = logging.getLogger(__name__)



# Internal data class for converted parameters



@dataclass
class ConvertedQubitParams:
    """Converted qubit parameters ready for scqubits consumption.

    All energies are in GHz.

    Attributes:
        qubit_id: Unique qubit identifier (e.g. ``'Q1'``).
        qubit_type: The :class:`QubitType` enum value.
        EC_ghz: Charging energy *E_C* in GHz.
        EJ_ghz: Josephson energy *E_J* in GHz.
        EL_ghz: Inductive energy *E_L* in GHz (only for fluxonium; ``None``
            for transmon variants).
        ej_ec_ratio: Ratio *E_J / E_C*.
        capacitance_fF: Total self-capacitance of the qubit island in fF.
        flux_bias: External magnetic flux bias in units of Φ₀.
        asymmetry: SQUID asymmetry parameter *d* for tunable transmons.
        coupling_caps: Mutual capacitance to other terminals, keyed by
            terminal ID, in fF.
    """

    qubit_id: str
    qubit_type: QubitType
    EC_ghz: float
    EJ_ghz: float
    EL_ghz: float | None = None
    ej_ec_ratio: float = 0.0
    capacitance_fF: float = 0.0
    flux_bias: float = 0.0
    asymmetry: float = 0.0
    coupling_caps: dict[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.EC_ghz > 0.0:
            self.ej_ec_ratio = self.EJ_ghz / self.EC_ghz



# Converter class



class ParameterConverter:
    """Convert Palace EM results + design spec into scqubits parameters.

    This class is stateless – every method is a pure function of its inputs.
    It is exposed as a class rather than a module-level collection of functions
    to allow future dependency injection (e.g. alternate constant sets).
    """

    # ----- individual conversion helpers -----

    @staticmethod
    def capacitance_to_EC(capacitance_fF: float) -> float:
        """Compute charging energy E_C from capacitance.

        .. math::

            E_C = \\frac{e^2}{2C} \\cdot \\frac{1}{h}

        Parameters:
            capacitance_fF: Total capacitance in femtofarads.

        Returns:
            Charging energy in **GHz**.
        """
        C_farads = capacitance_fF * FF_TO_F
        if C_farads <= 0.0:
            raise ValueError(
                f"Capacitance must be positive, got {capacitance_fF} fF"
            )
        EC_joules = E_CHARGE**2 / (2.0 * C_farads)
        EC_ghz = EC_joules / (H_PLANCK * GHZ_TO_HZ)
        return EC_ghz

    @staticmethod
    def inductance_to_EL(inductance_nH: float) -> float:
        """Compute inductive energy E_L from inductance.

        .. math::

            E_L = \\frac{\\Phi_0^2}{(2\\pi)^2 L} \\cdot \\frac{1}{h}

        Parameters:
            inductance_nH: Inductance in nanohenries.

        Returns:
            Inductive energy in **GHz**.
        """
        L_henries = inductance_nH * NH_TO_H
        if L_henries <= 0.0:
            raise ValueError(
                f"Inductance must be positive, got {inductance_nH} nH"
            )
        EL_joules = (PHI0 / (2.0 * np.pi)) ** 2 / L_henries
        EL_ghz = EL_joules / (H_PLANCK * GHZ_TO_HZ)
        return EL_ghz

    @staticmethod
    def critical_current_to_EJ(Ic_nA: float) -> float:
        """Compute Josephson energy E_J from junction critical current.

        .. math::

            E_J = \\frac{\\Phi_0 I_c}{2\\pi} \\cdot \\frac{1}{h}

        Parameters:
            Ic_nA: Critical current in nanoamps.

        Returns:
            Josephson energy in **GHz**.
        """
        Ic_amps = Ic_nA * NA_TO_A
        if Ic_amps <= 0.0:
            raise ValueError(
                f"Critical current must be positive, got {Ic_nA} nA"
            )
        EJ_joules = PHI0 * Ic_amps / (2.0 * np.pi)
        EJ_ghz = EJ_joules / (H_PLANCK * GHZ_TO_HZ)
        return EJ_ghz

    @staticmethod
    def compute_coupling_strength(
        C_coupling_fF: float,
        C_a_fF: float,
        C_b_fF: float,
        freq_a_ghz: float,
        freq_b_ghz: float,
    ) -> float:
        """Compute capacitive coupling strength *g* between two qubits.

        Uses the standard formula for capacitive coupling in the transmon
        regime:

        .. math::

            g = \\frac{C_c}{2} \\sqrt{\\frac{\\omega_a \\omega_b}{C_a C_b}}

        Where the coupling capacitance :math:`C_c` is the (absolute value of
        the) mutual capacitance from the Palace capacitance matrix.

        Parameters:
            C_coupling_fF: Mutual capacitance between islands in fF
                (sign is ignored – Maxwell-convention negatives are handled).
            C_a_fF: Self-capacitance of qubit A island in fF.
            C_b_fF: Self-capacitance of qubit B island in fF.
            freq_a_ghz: Frequency of qubit A in GHz.
            freq_b_ghz: Frequency of qubit B in GHz.

        Returns:
            Coupling strength *g* in **GHz**.
        """
        C_c = abs(C_coupling_fF) * FF_TO_F
        C_a = C_a_fF * FF_TO_F
        C_b = C_b_fF * FF_TO_F
        omega_a = 2.0 * np.pi * freq_a_ghz * GHZ_TO_HZ
        omega_b = 2.0 * np.pi * freq_b_ghz * GHZ_TO_HZ

        if C_a <= 0 or C_b <= 0:
            raise ValueError("Self-capacitances must be positive.")

        g_rad_per_s = (C_c / 2.0) * np.sqrt(omega_a * omega_b / (C_a * C_b))
        g_ghz = g_rad_per_s / (2.0 * np.pi * GHZ_TO_HZ)
        return g_ghz

    # ----- resolve EJ for a single qubit -----

    def _resolve_EJ(self, qubit_spec: QubitSpec) -> float:
        """Determine E_J for a qubit from design spec.

        If ``EJ_ghz`` is specified directly, use it.  Otherwise compute
        from ``critical_current_nA``.

        Raises:
            ValueError: If neither EJ_ghz nor critical_current_nA is provided.
        """
        jp = qubit_spec.junction_params
        if jp.EJ_ghz is not None:
            return jp.EJ_ghz
        if jp.critical_current_nA is not None:
            return self.critical_current_to_EJ(jp.critical_current_nA)
        raise ValueError(
            f"Qubit '{qubit_spec.qubit_id}': Either EJ_ghz or "
            f"critical_current_nA must be provided in junction_params."
        )

    # ----- bulk conversion -----

    def convert_all(
        self,
        em_results: EMResults,
        design_spec: DesignSpec,
    ) -> list[ConvertedQubitParams]:
        """Convert EM results + design spec → list of qubit parameter sets.

        For each qubit in the design spec:

        1.  Look up the qubit island's self-capacitance from the Palace
            capacitance matrix → compute **E_C**.
        2.  Resolve **E_J** from the design spec (directly or via I_c).
        3.  For fluxonium, look up the super-inductor inductance → compute
            **E_L**.
        4.  Collect mutual capacitances to all other terminals.

        Parameters:
            em_results: Palace EM simulation results.
            design_spec: Chip design specification.

        Returns:
            One :class:`ConvertedQubitParams` per qubit in ``design_spec``.
        """
        cap_matrix = em_results.get_capacitance_matrix()
        results: list[ConvertedQubitParams] = []

        for qubit_spec in design_spec.qubits:
            qid = qubit_spec.qubit_id
            terminal = qubit_spec.terminal_id
            logger.info("Converting parameters for qubit '%s' (terminal=%s)", qid, terminal)

            # --- Capacitance → EC ---
            try:
                self_cap_fF = cap_matrix.get_self_capacitance(terminal)
            except ValueError:
                logger.error(
                    "Terminal '%s' for qubit '%s' not found in capacitance matrix. "
                    "Available terminals: %s",
                    terminal,
                    qid,
                    cap_matrix.terminal_ids,
                )
                raise

            EC_ghz = self.capacitance_to_EC(self_cap_fF)
            logger.debug("  EC = %.4f GHz  (C = %.2f fF)", EC_ghz, self_cap_fF)

            # --- Josephson energy ---
            EJ_ghz = self._resolve_EJ(qubit_spec)
            logger.debug("  EJ = %.4f GHz", EJ_ghz)

            # --- Inductive energy (fluxonium only) ---
            EL_ghz: float | None = None
            if qubit_spec.type == QubitType.FLUXONIUM:
                inductance_id = qubit_spec.resolved_inductance_id
                inductance_nH = em_results.get_inductance(inductance_id)
                if inductance_nH is None:
                    logger.warning(
                        "Inductance element '%s' for fluxonium qubit '%s' not "
                        "found in magnetostatic results. EL will not be set.",
                        inductance_id,
                        qid,
                    )
                else:
                    EL_ghz = self.inductance_to_EL(inductance_nH)
                    logger.debug("  EL = %.4f GHz  (L = %.2f nH)", EL_ghz, inductance_nH)

            # --- Mutual capacitances to other terminals ---
            coupling_caps: dict[str, float] = {}
            for other_terminal in cap_matrix.terminal_ids:
                if other_terminal == terminal:
                    continue
                try:
                    mutual = cap_matrix.get_mutual_capacitance(terminal, other_terminal)
                    coupling_caps[other_terminal] = mutual
                except (ValueError, IndexError):
                    pass  # terminal not found – skip silently

            params = ConvertedQubitParams(
                qubit_id=qid,
                qubit_type=qubit_spec.type,
                EC_ghz=EC_ghz,
                EJ_ghz=EJ_ghz,
                EL_ghz=EL_ghz,
                capacitance_fF=self_cap_fF,
                flux_bias=qubit_spec.flux_bias,
                asymmetry=qubit_spec.asymmetry,
                coupling_caps=coupling_caps,
            )
            logger.info(
                "  → EJ/EC = %.1f  (regime: %s)",
                params.ej_ec_ratio,
                "transmon" if params.ej_ec_ratio > 20 else "charge-sensitive",
            )
            results.append(params)

        return results
