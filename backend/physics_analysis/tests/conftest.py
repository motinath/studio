"""Shared pytest fixtures for the Silicofeller Physics Engine test suite.

All fixtures provide physically-realistic values for superconducting qubit
systems. Capacitances, inductances, and frequencies are consistent with
real-world devices fabricated on Al-on-Si processes.
"""

from __future__ import annotations

import pytest

from physics_engine.models.em_results import (
    CapacitanceMatrix,
    EigenmodeResult,
    EigenmodeSuite,
    ElectrostaticResults,
    EMResults,
    InductanceEntry,
    MagnetostaticResults,
)
from physics_engine.models.design_spec import (
    CouplerSpec,
    DesignSpec,
    GlobalConstraints,
    JunctionParams,
    NoiseEnvironment,
    QubitSpec,
    QubitTargets,
    ResonatorSpec,
)
from physics_engine.models.enums import CouplerType, QubitType, ResonatorType


# ---------------------------------------------------------------------------
# 3-Qubit System Fixtures
# ---------------------------------------------------------------------------
# Q1: transmon, 5.0 GHz target
# Q2: transmon, 5.4 GHz target
# Q3: fluxonium, 1.2 GHz target
# R1: readout resonator for Q1 (7.0 GHz)
# R2: readout resonator for Q2 (7.4 GHz)


@pytest.fixture
def sample_em_results() -> EMResults:
    """EMResults for a 3-qubit + 2-resonator system.

    Capacitance matrix terminals: Q1_island, Q2_island, Q3_island, R1, R2
    Maxwell convention: diagonal = self-capacitance (positive),
    off-diagonal = mutual capacitance (negative).
    """
    cap_matrix = CapacitanceMatrix(
        units="fF",
        terminal_ids=["Q1_island", "Q2_island", "Q3_island", "R1", "R2"],
        matrix=[
            # Q1_island   Q2_island   Q3_island   R1         R2
            [ 65.2,       -2.3,       -0.8,       -4.5,      -0.3],   # Q1_island
            [ -2.3,        58.7,      -1.5,       -0.4,      -3.8],   # Q2_island
            [ -0.8,       -1.5,        72.1,      -0.2,      -0.1],   # Q3_island
            [ -4.5,       -0.4,       -0.2,       45.3,      -0.6],   # R1
            [ -0.3,       -3.8,       -0.1,       -0.6,      42.1],   # R2
        ],
    )

    inductance_data = [
        InductanceEntry(element_id="L_Q3_superinductor", inductance_nH=300.0),
    ]

    eigenmodes = EigenmodeSuite(
        modes=[
            # Mode 1: Q3 fluxonium mode (~1.2 GHz)
            EigenmodeResult(
                mode_index=1,
                frequency_ghz=1.18,
                quality_factor=1.2e6,
                epr={"JJ_Q3": 0.85, "JJ_Q1": 0.01, "JJ_Q2": 0.005},
            ),
            # Mode 2: Q1 transmon mode (~5.0 GHz)
            EigenmodeResult(
                mode_index=2,
                frequency_ghz=4.95,
                quality_factor=8.5e5,
                epr={"JJ_Q1": 0.92, "JJ_Q2": 0.02, "JJ_Q3": 0.01},
            ),
            # Mode 3: Q2 transmon mode (~5.4 GHz)
            EigenmodeResult(
                mode_index=3,
                frequency_ghz=5.38,
                quality_factor=9.0e5,
                epr={"JJ_Q2": 0.91, "JJ_Q1": 0.015, "JJ_Q3": 0.005},
            ),
            # Mode 4: R1 resonator mode (~7.0 GHz)
            EigenmodeResult(
                mode_index=4,
                frequency_ghz=7.02,
                quality_factor=3.0e4,
                epr={"JJ_Q1": 0.03, "JJ_Q2": 0.001, "JJ_Q3": 0.0},
            ),
            # Mode 5: R2 resonator mode (~7.4 GHz)
            EigenmodeResult(
                mode_index=5,
                frequency_ghz=7.41,
                quality_factor=2.8e4,
                epr={"JJ_Q2": 0.025, "JJ_Q1": 0.001, "JJ_Q3": 0.0},
            ),
        ]
    )

    return EMResults(
        simulation_id="sim-3q-001",
        timestamp="2026-06-01T12:00:00Z",
        design_id="design-3q-alpha",
        electrostatic=ElectrostaticResults(capacitance_matrix=cap_matrix),
        magnetostatic=MagnetostaticResults(inductance_data=inductance_data),
        eigenmode=eigenmodes,
    )


@pytest.fixture
def sample_design_spec() -> DesignSpec:
    """DesignSpec matching the 3-qubit sample_em_results fixture."""
    return DesignSpec(
        design_id="design-3q-alpha",
        project_name="3-Qubit Test Chip",
        qubits=[
            QubitSpec(
                qubit_id="Q1",
                type=QubitType.TRANSMON,
                junction_params=JunctionParams(EJ_ghz=20.0, critical_current_nA=30.2),
                capacitance_terminal_id="Q1_island",
                junction_id="JJ_Q1",
                targets=QubitTargets(
                    frequency_ghz=5.0,
                    frequency_tolerance_ghz=0.15,
                    anharmonicity_mhz=-250.0,
                    anharmonicity_tolerance_mhz=30.0,
                    T1_min_us=50.0,
                    T2_min_us=30.0,
                ),
            ),
            QubitSpec(
                qubit_id="Q2",
                type=QubitType.TRANSMON,
                junction_params=JunctionParams(EJ_ghz=22.0, critical_current_nA=33.2),
                capacitance_terminal_id="Q2_island",
                junction_id="JJ_Q2",
                targets=QubitTargets(
                    frequency_ghz=5.4,
                    frequency_tolerance_ghz=0.15,
                    anharmonicity_mhz=-260.0,
                    anharmonicity_tolerance_mhz=30.0,
                    T1_min_us=50.0,
                    T2_min_us=30.0,
                ),
            ),
            QubitSpec(
                qubit_id="Q3",
                type=QubitType.FLUXONIUM,
                junction_params=JunctionParams(EJ_ghz=3.5, critical_current_nA=5.3),
                capacitance_terminal_id="Q3_island",
                junction_id="JJ_Q3",
                inductance_element_id="L_Q3_superinductor",
                flux_bias=0.5,
                targets=QubitTargets(
                    frequency_ghz=1.2,
                    frequency_tolerance_ghz=0.2,
                    anharmonicity_mhz=-800.0,
                    anharmonicity_tolerance_mhz=100.0,
                    T1_min_us=100.0,
                    T2_min_us=50.0,
                ),
            ),
        ],
        resonators=[
            ResonatorSpec(
                resonator_id="R1",
                type=ResonatorType.READOUT,
                coupled_to="Q1",
                capacitance_terminal_id="R1",
                target_frequency_ghz=7.0,
                target_kappa_khz=500.0,
            ),
            ResonatorSpec(
                resonator_id="R2",
                type=ResonatorType.READOUT,
                coupled_to="Q2",
                capacitance_terminal_id="R2",
                target_frequency_ghz=7.4,
                target_kappa_khz=500.0,
            ),
        ],
        couplers=[
            CouplerSpec(
                coupler_id="C12",
                type=CouplerType.CAPACITIVE,
                connects=["Q1", "Q2"],
                target_coupling_mhz=5.0,
                max_zz_khz=50.0,
            ),
        ],
        global_constraints=GlobalConstraints(
            min_qubit_frequency_spacing_mhz=100.0,
            max_crosstalk_db=-40.0,
            fabrication_process="standard_al_on_si",
        ),
        noise_environment=NoiseEnvironment(
            temperature_mK=15.0,
            Q_capacitive=1e6,
            Q_inductive=500e6,
            flux_noise_amplitude=1e-6,
            charge_noise_amplitude=1e-4,
            critical_current_noise_amplitude=1e-7,
            quasiparticle_density=1e-8,
        ),
    )


# ---------------------------------------------------------------------------
# 5-Qubit System Fixtures
# ---------------------------------------------------------------------------
# Q1–Q5: all transmons with frequencies 4.8, 5.0, 5.2, 5.4, 5.6 GHz
# R1–R5: readout resonators at 6.8, 7.0, 7.2, 7.4, 7.6 GHz
# Linear chain coupling: C12, C23, C34, C45


@pytest.fixture
def sample_5q_em_results() -> EMResults:
    """EMResults for a 5-qubit transmon linear chain."""
    terminal_ids = [
        "Q1_island", "Q2_island", "Q3_island", "Q4_island", "Q5_island",
        "R1", "R2", "R3", "R4", "R5",
    ]

    # Build a 10x10 capacitance matrix
    # Self-capacitances for qubits: ~60-70 fF, resonators: ~40-45 fF
    # Nearest-neighbor mutual: -2 to -3 fF, next-nearest: -0.3 to -0.5 fF
    # Qubit-resonator coupling: -3 to -5 fF
    self_caps = [62.5, 65.2, 58.7, 61.3, 67.8, 43.2, 45.3, 41.8, 44.1, 42.5]

    matrix = [[0.0] * 10 for _ in range(10)]

    # Set self-capacitances (diagonal)
    for i in range(10):
        matrix[i][i] = self_caps[i]

    # Qubit-qubit mutual caps (nearest-neighbor in linear chain)
    nn_pairs = [(0, 1), (1, 2), (2, 3), (3, 4)]
    nn_caps = [-2.5, -2.8, -2.3, -2.6]
    for (i, j), c in zip(nn_pairs, nn_caps):
        matrix[i][j] = c
        matrix[j][i] = c

    # Next-nearest-neighbor qubit mutual caps
    nnn_pairs = [(0, 2), (1, 3), (2, 4)]
    nnn_caps = [-0.4, -0.35, -0.3]
    for (i, j), c in zip(nnn_pairs, nnn_caps):
        matrix[i][j] = c
        matrix[j][i] = c

    # Qubit-resonator coupling caps (each qubit to its resonator)
    qr_pairs = [(0, 5), (1, 6), (2, 7), (3, 8), (4, 9)]
    qr_caps = [-4.2, -4.5, -3.8, -4.1, -4.3]
    for (i, j), c in zip(qr_pairs, qr_caps):
        matrix[i][j] = c
        matrix[j][i] = c

    cap_matrix = CapacitanceMatrix(
        units="fF",
        terminal_ids=terminal_ids,
        matrix=matrix,
    )

    eigenmode_freqs = [4.82, 5.03, 5.18, 5.42, 5.58, 6.82, 7.01, 7.22, 7.38, 7.61]
    quality_factors = [8.0e5, 8.5e5, 9.0e5, 8.8e5, 8.2e5,
                       3.0e4, 3.2e4, 2.9e4, 3.1e4, 3.0e4]
    junction_ids = ["JJ_Q1", "JJ_Q2", "JJ_Q3", "JJ_Q4", "JJ_Q5"]

    modes = []
    for m_idx in range(10):
        epr = {}
        for j_idx, jid in enumerate(junction_ids):
            if m_idx < 5:  # qubit modes
                if m_idx == j_idx:
                    epr[jid] = 0.90 + 0.02 * (j_idx % 2)
                elif abs(m_idx - j_idx) == 1:
                    epr[jid] = 0.015
                else:
                    epr[jid] = 0.002
            else:  # resonator modes
                r_idx = m_idx - 5
                if r_idx == j_idx:
                    epr[jid] = 0.03
                else:
                    epr[jid] = 0.001

        modes.append(
            EigenmodeResult(
                mode_index=m_idx + 1,
                frequency_ghz=eigenmode_freqs[m_idx],
                quality_factor=quality_factors[m_idx],
                epr=epr,
            )
        )

    return EMResults(
        simulation_id="sim-5q-001",
        timestamp="2026-06-01T14:00:00Z",
        design_id="design-5q-chain",
        electrostatic=ElectrostaticResults(capacitance_matrix=cap_matrix),
        magnetostatic=MagnetostaticResults(inductance_data=[]),
        eigenmode=EigenmodeSuite(modes=modes),
    )


@pytest.fixture
def sample_5q_design_spec() -> DesignSpec:
    """DesignSpec for a 5-qubit transmon linear chain."""
    target_freqs = [4.8, 5.0, 5.2, 5.4, 5.6]
    anharmonicities = [-240.0, -250.0, -255.0, -260.0, -245.0]
    ej_values = [18.0, 20.0, 21.5, 22.0, 19.5]
    ic_values = [27.2, 30.2, 32.5, 33.2, 29.5]

    qubits = []
    for i in range(5):
        qid = f"Q{i+1}"
        qubits.append(
            QubitSpec(
                qubit_id=qid,
                type=QubitType.TRANSMON,
                junction_params=JunctionParams(
                    EJ_ghz=ej_values[i],
                    critical_current_nA=ic_values[i],
                ),
                capacitance_terminal_id=f"{qid}_island",
                junction_id=f"JJ_{qid}",
                targets=QubitTargets(
                    frequency_ghz=target_freqs[i],
                    frequency_tolerance_ghz=0.15,
                    anharmonicity_mhz=anharmonicities[i],
                    anharmonicity_tolerance_mhz=30.0,
                    T1_min_us=50.0,
                    T2_min_us=30.0,
                ),
            )
        )

    resonators = [
        ResonatorSpec(
            resonator_id=f"R{i+1}",
            type=ResonatorType.READOUT,
            coupled_to=f"Q{i+1}",
            capacitance_terminal_id=f"R{i+1}",
            target_frequency_ghz=6.8 + 0.2 * i,
            target_kappa_khz=500.0,
        )
        for i in range(5)
    ]

    couplers = [
        CouplerSpec(
            coupler_id=f"C{i+1}{i+2}",
            type=CouplerType.CAPACITIVE,
            connects=[f"Q{i+1}", f"Q{i+2}"],
            target_coupling_mhz=5.0,
            max_zz_khz=50.0,
        )
        for i in range(4)
    ]

    return DesignSpec(
        design_id="design-5q-chain",
        project_name="5-Qubit Linear Chain",
        qubits=qubits,
        resonators=resonators,
        couplers=couplers,
        global_constraints=GlobalConstraints(
            min_qubit_frequency_spacing_mhz=100.0,
            max_crosstalk_db=-40.0,
            fabrication_process="standard_al_on_si",
        ),
        noise_environment=NoiseEnvironment(
            temperature_mK=15.0,
            Q_capacitive=1e6,
            Q_inductive=500e6,
        ),
    )
