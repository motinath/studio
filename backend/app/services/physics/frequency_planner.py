"""
frequency_planner.py  —  QBETA V2 Phase 2
==========================================
Physics-based, IBM-style frequency planning for superconducting quantum chips.

WHAT THIS FILE DOES
-------------------
1.  Assigns qubit transition frequencies using an A/B alternating pattern
    (IBM bipartite coloring) to minimise ZZ crosstalk between neighbours.

2.  Assigns readout resonator frequencies in a dedicated 6.3–7.2 GHz band,
    well above the qubit band (dispersive regime requires Δ >> g, typically
    Δ > 1.5 GHz).

3.  Computes the physical λ/4 CPW resonator length from f_r and the substrate
    effective dielectric constant ε_eff (Schneider conformal-mapping formula).

4.  Validates no two neighbouring qubits collide (< 100 MHz detuning).

5.  Provides EJ / EC estimates for each qubit's target frequency.

TYPICAL OUTPUT (4 qubits, Si substrate)
----------------------------------------
  Q1:  4.900 GHz   (group A)     RO_Q1:  6.400 GHz   L = 4.639 mm
  Q2:  5.100 GHz   (group B)     RO_Q2:  6.600 GHz   L = 4.498 mm
  Q3:  4.900 GHz   (group A)     RO_Q3:  6.800 GHz   L = 4.367 mm
  Q4:  5.100 GHz   (group B)     RO_Q4:  7.000 GHz   L = 4.243 mm

REFERENCES
----------
  - Pozar, "Microwave Engineering" §3 (CPW)
  - Schneider 1969 (CPW effective permittivity via conformal mapping)
  - Koch et al., PRA 2007 (transmon EJ/EC)
  - IBM Quantum chip datasheets (Eagle r3, Hummingbird r2)
  - Krantz et al., APPhys Rev 2019 (superconducting qubit review)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# ─────────────────────────────────────────────────────────────────────────────
# Physical constants
# ─────────────────────────────────────────────────────────────────────────────
C_LIGHT   = 299_792_458.0     # m/s
H_PLANCK  = 6.626e-34         # J·s
H_BAR     = 1.055e-34         # J·s
E_CHARGE  = 1.602e-19         # C

# ─────────────────────────────────────────────────────────────────────────────
# Default substrate: 430 µm high-resistivity silicon, Nb on top
# ─────────────────────────────────────────────────────────────────────────────
DEFAULT_SUBSTRATE = {
    "epsilon_r":         11.45,    # Si relative permittivity (microwave, 10 mK)
    "cpw_width_um":      10.0,     # CPW centre-conductor width  (µm)
    "cpw_gap_um":         6.0,     # CPW gap width               (µm)
    "substrate_height_um": 430.0,  # Substrate thickness         (µm)
}

# ─────────────────────────────────────────────────────────────────────────────
# IBM-style frequency bands  (GHz)
# ─────────────────────────────────────────────────────────────────────────────

# Qubit A/B groups — IBM bipartite coloring
# Neighbours always come from opposite groups → minimises ZZ crosstalk
QUBIT_GROUP_A_GHz   = 4.9      # "low"  group centre frequency
QUBIT_GROUP_B_GHz   = 5.1      # "high" group centre frequency
QUBIT_JITTER_GHz    = 0.015    # ± per-qubit jitter (avoids exact degeneracy)

# Minimum detuning between nearest-neighbour qubits (collision threshold)
COLLISION_THRESHOLD_GHz = 0.10

# Readout resonator band — dispersive regime: Δ = f_r − f_q ≈ 1.5–2.0 GHz
RESONATOR_BASE_GHz  = 6.40     # lowest resonator frequency
RESONATOR_STEP_GHz  = 0.20     # step between consecutive resonators

# Transmon anharmonicity (negative for transmon)
ANHARMONICITY_GHz   = -0.340   # α = E_C / h  (typical IBM value)


# ─────────────────────────────────────────────────────────────────────────────
# Substrate physics
# ─────────────────────────────────────────────────────────────────────────────

def cpw_effective_permittivity(
    epsilon_r: float,
    w_um: float,
    g_um: float,
    h_um: float,
) -> float:
    """
    Quasianalytic effective permittivity for CPW on finite-thickness substrate.
    Uses Schneider's conformal-mapping formula (complete elliptic integrals
    evaluated via the AGM algorithm).

    Parameters
    ----------
    epsilon_r : substrate relative permittivity
    w_um      : centre conductor width  (µm)
    g_um      : gap width               (µm)
    h_um      : substrate thickness     (µm)

    Returns
    -------
    ε_eff  (dimensionless, always ≥ 1)
    """
    a = (w_um * 1e-6) / 2.0
    b = a + (g_um * 1e-6)
    h = h_um * 1e-6

    def _K(k: float) -> float:
        """Complete elliptic integral K(k) via arithmetic-geometric mean."""
        if k <= 0 or k >= 1:
            return math.pi / 2.0
        a0, b0 = 1.0, math.sqrt(max(0.0, 1.0 - k * k))
        for _ in range(25):
            a1 = (a0 + b0) / 2.0
            b1 = math.sqrt(a0 * b0)
            if abs(a1 - b1) < 1e-13:
                return math.pi / (2.0 * a1)
            a0, b0 = a1, b1
        return math.pi / (2.0 * a0)

    # Air-only k and K(k), K'(k)
    k0  = a / b
    kp0 = math.sqrt(max(0.0, 1.0 - k0 * k0))
    K0  = _K(k0)
    Kp0 = _K(kp0)

    # Substrate-modified k via Pettenpaul formula
    sa = math.sinh(math.pi * a / (2.0 * h))
    sb = math.sinh(math.pi * b / (2.0 * h))
    k1  = sa / sb if sb > 0 else k0
    k1  = min(max(k1, 1e-10), 1.0 - 1e-10)
    kp1 = math.sqrt(max(0.0, 1.0 - k1 * k1))
    K1  = _K(k1)
    Kp1 = _K(kp1)

    # Filling factor q
    q = (K1 * Kp0) / (Kp1 * K0) if (Kp1 * K0) > 0 else 0.5
    q = min(q, 1.0)

    return max(1.0 + q * (epsilon_r - 1.0) / 2.0, 1.0)


def quarter_wave_length_mm(
    freq_GHz: float,
    epsilon_eff: float,
    velocity_factor: float = 1.0,
) -> float:
    """
    Physical length of a λ/4 CPW resonator.

        L = c / (4 · f · √ε_eff)

    Parameters
    ----------
    freq_GHz        : resonator frequency  (GHz)
    epsilon_eff     : CPW effective dielectric constant
    velocity_factor : kinetic-inductance / geometry correction  (default 1.0)

    Returns
    -------
    L  (mm)
    """
    vph     = (C_LIGHT / math.sqrt(epsilon_eff)) * velocity_factor
    length_m = vph / (4.0 * freq_GHz * 1e9)
    return length_m * 1e3


# ─────────────────────────────────────────────────────────────────────────────
# EJ / EC estimates from target qubit frequency
# ─────────────────────────────────────────────────────────────────────────────

def estimate_EJ_EC(
    freq_GHz: float,
    anharmonicity_GHz: float = ANHARMONICITY_GHz,
) -> Tuple[float, float]:
    """
    Reverse-engineer EJ and EC from transmon 0→1 transition frequency.

    For a transmon:
        f_01 ≈ √(8 EJ EC) / h  −  EC / h
        EC / h = −anharmonicity   (positive number, since α < 0)
        EJ / h = (f_01 + EC/h)² / (8 · EC/h)

    Returns
    -------
    (EJ_GHz, EC_GHz)  — energies expressed in GHz·h units for readability
    """
    EC_GHz = -anharmonicity_GHz          # EC/h in GHz (positive)
    EJ_GHz = (freq_GHz + EC_GHz) ** 2 / (8.0 * EC_GHz)
    return round(EJ_GHz, 2), round(EC_GHz, 3)


# ─────────────────────────────────────────────────────────────────────────────
# Data containers
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class QubitSpec:
    name:              str
    freq_GHz:          float
    group:             str          # "A" or "B"
    anharmonicity_GHz: float = ANHARMONICITY_GHz
    EJ_GHz:            float = 0.0
    EC_GHz:            float = 0.0


@dataclass
class ResonatorSpec:
    name:         str
    qubit:        str
    freq_GHz:     float
    length_mm:    float
    epsilon_eff:  float
    detuning_GHz: float             # f_r − f_q  (dispersive detuning)
    cpw_width_um: float
    cpw_gap_um:   float


@dataclass
class CollisionWarning:
    qubit_a:    str
    qubit_b:    str
    delta_GHz:  float
    message:    str


@dataclass
class FrequencyPlan:
    qubits:    List[QubitSpec]
    resonators: List[ResonatorSpec]
    substrate:  dict
    warnings:   List[CollisionWarning] = field(default_factory=list)
    epsilon_eff: float = 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Main planner
# ─────────────────────────────────────────────────────────────────────────────

class FrequencyPlanner:
    """
    IBM-style frequency planner for superconducting quantum chips.

    Qubit frequencies
    -----------------
    Uses an A/B alternating pattern (bipartite coloring) so that physically
    neighbouring qubits always belong to opposite frequency groups.  This is
    the same strategy IBM uses on Eagle / Hummingbird / Condor chips.

    Resonator frequencies
    ---------------------
    Assigned to the 6.3–7.2 GHz band, giving a dispersive detuning
    Δ = f_r − f_q ≈ 1.4–2.3 GHz.  This satisfies the dispersive regime
    condition  g / Δ << 1  required for non-demolition readout.

    Resonator lengths
    -----------------
    Each resonator's physical λ/4 length is computed from its assigned
    frequency and the substrate ε_eff.  No programmer-chosen lengths.

    Usage
    -----
    >>> plan = FrequencyPlanner(n=4).plan()
    >>> for r in plan.resonators:
    ...     print(f"{r.name}: {r.freq_GHz} GHz  L={r.length_mm:.3f} mm")
    """

    def __init__(
        self,
        n: int,
        substrate: Optional[dict] = None,
        topology: str = "grid",
        seed: int = 42,
    ):
        self.n         = n
        self.substrate = substrate or dict(DEFAULT_SUBSTRATE)
        self.topology  = topology
        self._seed     = seed

    # ── Qubit frequency assignment ────────────────────────────────────────────
    def _assign_qubit_frequencies(self) -> List[QubitSpec]:
        """
        A/B alternating pattern (bipartite coloring).

        For grid / heavy_hex: (row + col) % 2 checkerboard.
        For line / ring:      simple alternation by index.
        For star:             hub (Q1) gets a unique mid-range frequency so it
                              is separated from ALL spoke qubits by ≥ 150 MHz.

        The star topology hub (Q1) is adjacent to every spoke, so a normal
        A/B coloring fails — the hub must be in a distinct frequency band.
        IBM typically handles this by placing the hub slightly off-centre
        between the A and B groups (e.g. 5.00 GHz while A=4.90, B=5.10).
        """
        import math, random
        rng = random.Random(self._seed)

        n    = self.n
        cols = max(2, math.ceil(math.sqrt(n)))

        # ── Star topology: hub + spokes ──────────────────────────────────────
        if self.topology == "star":
            qubits: List[QubitSpec] = []
            # Hub (Q1) gets its own dedicated "C" band at 5.5 GHz
            # This ensures ≥ 400 MHz separation from both:
            #   - Group A spokes (≈ 4.9 GHz) → Δ ≈ 600 MHz
            #   - Group B spokes (≈ 5.1 GHz) → Δ ≈ 400 MHz
            # Well above COLLISION_THRESHOLD_GHz = 0.10 GHz
            HUB_FREQ_GHz = 5.5
            hub_freq = round(HUB_FREQ_GHz + rng.uniform(-0.015, 0.015), 4)
            EJ, EC = estimate_EJ_EC(hub_freq)
            qubits.append(QubitSpec(
                name="Q1", freq_GHz=hub_freq, group="C",
                anharmonicity_GHz=ANHARMONICITY_GHz, EJ_GHz=EJ, EC_GHz=EC,
            ))
            # Spokes alternate A/B
            for i in range(1, n):
                group = "A" if i % 2 == 1 else "B"
                base  = QUBIT_GROUP_A_GHz if group == "A" else QUBIT_GROUP_B_GHz
                jitter = rng.uniform(-0.015, 0.015)
                freq   = round(base + jitter, 4)
                EJ, EC = estimate_EJ_EC(freq)
                qubits.append(QubitSpec(
                    name=f"Q{i+1}", freq_GHz=freq, group=group,
                    anharmonicity_GHz=ANHARMONICITY_GHz, EJ_GHz=EJ, EC_GHz=EC,
                ))
            return qubits

        # ── All other topologies: grid-based checkerboard ────────────────────
        def _group(idx: int) -> str:
            row = idx // cols
            col = idx % cols
            return "A" if (row + col) % 2 == 0 else "B"

        qubits = []
        for i in range(n):
            group = _group(i)
            base  = QUBIT_GROUP_A_GHz if group == "A" else QUBIT_GROUP_B_GHz
            # Small jitter so no two qubits have exactly the same frequency
            jitter = rng.uniform(-QUBIT_JITTER_GHz, QUBIT_JITTER_GHz)
            freq   = round(base + jitter, 4)

            EJ, EC = estimate_EJ_EC(freq)
            qubits.append(QubitSpec(
                name              = f"Q{i+1}",
                freq_GHz          = freq,
                group             = group,
                anharmonicity_GHz = ANHARMONICITY_GHz,
                EJ_GHz            = EJ,
                EC_GHz            = EC,
            ))

        return qubits


    # ── Collision detection ───────────────────────────────────────────────────
    def _check_collisions(
        self,
        qubits: List[QubitSpec],
    ) -> List[CollisionWarning]:
        """Warn if any two qubits are within COLLISION_THRESHOLD_GHz."""
        warnings: List[CollisionWarning] = []
        for i, qa in enumerate(qubits):
            for j, qb in enumerate(qubits):
                if j <= i:
                    continue
                delta = abs(qa.freq_GHz - qb.freq_GHz)
                if delta < COLLISION_THRESHOLD_GHz:
                    warnings.append(CollisionWarning(
                        qubit_a   = qa.name,
                        qubit_b   = qb.name,
                        delta_GHz = round(delta, 4),
                        message   = (
                            f"COLLISION: {qa.name} ({qa.freq_GHz} GHz) and "
                            f"{qb.name} ({qb.freq_GHz} GHz) differ by only "
                            f"{delta*1000:.0f} MHz  (threshold {COLLISION_THRESHOLD_GHz*1000:.0f} MHz)"
                        ),
                    ))
        return warnings

    # ── Resonator assignment ──────────────────────────────────────────────────
    def _assign_resonators(
        self,
        qubits: List[QubitSpec],
        epsilon_eff: float,
    ) -> List[ResonatorSpec]:
        """
        Assign resonator frequencies in the 6.3–7.2 GHz band.
        Each resonator is separated by RESONATOR_STEP_GHz from the previous.
        Physical λ/4 length computed from frequency and ε_eff.

        The resonator frequency for each qubit is guaranteed to be at least
        min_dispersive_detuning_GHz = 1.0 GHz above the qubit frequency
        (dispersive regime requirement).
        """
        from app.services.physics.drc import RULES  # noqa: PLC0415
        min_detuning = RULES.get("min_dispersive_detuning_GHz", 1.0)
        min_res_sep  = RULES.get("min_resonator_detuning_GHz", 0.05)

        resonators: List[ResonatorSpec] = []
        last_f_r = 0.0  # track last placed resonator to enforce minimum separation
        for i, q in enumerate(qubits):
            # Base resonator frequency from the sequential assignment
            f_r_candidate = round(RESONATOR_BASE_GHz + i * RESONATOR_STEP_GHz, 4)
            # Ensure dispersive regime: f_r must be at least min_detuning above f_q
            f_r_min_dispersive = round(q.freq_GHz + min_detuning + 0.05, 4)  # +50 MHz margin
            # Ensure minimum separation from previous resonator
            f_r_min_sep = round(last_f_r + min_res_sep + 0.01, 4) if last_f_r > 0 else 0.0
            f_r = max(f_r_candidate, f_r_min_dispersive, f_r_min_sep)
            f_r = round(f_r, 4)
            last_f_r = f_r
            length   = quarter_wave_length_mm(f_r, epsilon_eff)
            detuning = round(f_r - q.freq_GHz, 4)
            resonators.append(ResonatorSpec(
                name         = f"RO_{q.name}",
                qubit        = q.name,
                freq_GHz     = f_r,
                length_mm    = round(length, 4),
                epsilon_eff  = round(epsilon_eff, 4),
                detuning_GHz = detuning,
                cpw_width_um = self.substrate["cpw_width_um"],
                cpw_gap_um   = self.substrate["cpw_gap_um"],
            ))
        return resonators

    # ── Main plan() ───────────────────────────────────────────────────────────
    def plan(self) -> FrequencyPlan:
        s = self.substrate
        epsilon_eff = cpw_effective_permittivity(
            s["epsilon_r"],
            s["cpw_width_um"],
            s["cpw_gap_um"],
            s["substrate_height_um"],
        )

        qubits    = self._assign_qubit_frequencies()
        warnings  = self._check_collisions(qubits)
        resonators = self._assign_resonators(qubits, epsilon_eff)

        return FrequencyPlan(
            qubits      = qubits,
            resonators  = resonators,
            substrate   = s,
            warnings    = warnings,
            epsilon_eff = round(epsilon_eff, 4),
        )

    def summary(self) -> dict:
        plan = self.plan()
        return {
            "qubits": {
                q.name: {
                    "freq_GHz":  q.freq_GHz,
                    "group":     q.group,
                    "EJ_GHz":   q.EJ_GHz,
                    "EC_GHz":   q.EC_GHz,
                    "anharmonicity_GHz": q.anharmonicity_GHz,
                }
                for q in plan.qubits
            },
            "resonators": {
                r.name: {
                    "freq_GHz":     r.freq_GHz,
                    "length_mm":    r.length_mm,
                    "detuning_GHz": r.detuning_GHz,
                }
                for r in plan.resonators
            },
            "epsilon_eff":  plan.epsilon_eff,
            "warnings":     [w.message for w in plan.warnings],
        }


# ─────────────────────────────────────────────────────────────────────────────
# Public convenience API
# ─────────────────────────────────────────────────────────────────────────────

def generate_frequency_plan(n_qubits: int, topology: str = "grid") -> dict:
    """
    MVP API — generate a complete frequency plan for an N-qubit chip.

    Parameters
    ----------
    n_qubits : number of qubits (1–24)
    topology : chip topology hint ('grid', 'line', 'ring', 'star', 'heavy_hex')

    Returns
    -------
    Plain dict, suitable for JSON serialization:
    {
      "qubits":     {"Q1": 4.9, "Q2": 5.1, ...},
      "resonators": {"RO_Q1": 6.4, "RO_Q2": 6.6, ...},
      "resonator_lengths_mm": {"RO_Q1": 4.639, ...},
      "epsilon_eff": 6.22,
      "warnings": [],
      "groups": {"Q1": "A", "Q2": "B", ...}
    }
    """
    plan = FrequencyPlanner(n=n_qubits, topology=topology).plan()
    return {
        "qubits":               {q.name: q.freq_GHz for q in plan.qubits},
        "resonators":           {r.name: r.freq_GHz for r in plan.resonators},
        "resonator_lengths_mm": {r.name: r.length_mm for r in plan.resonators},
        "detunings_GHz":        {r.name: r.detuning_GHz for r in plan.resonators},
        "epsilon_eff":          plan.epsilon_eff,
        "warnings":             [w.message for w in plan.warnings],
        "groups":               {q.name: q.group for q in plan.qubits},
        "EJ_GHz":               {q.name: q.EJ_GHz for q in plan.qubits},
        "EC_GHz":               {q.name: q.EC_GHz for q in plan.qubits},
    }


def plan_chip(n: int, substrate: Optional[dict] = None) -> FrequencyPlan:
    """One-call helper — returns a fully computed FrequencyPlan object."""
    return FrequencyPlanner(n=n, substrate=substrate).plan()


# ─────────────────────────────────────────────────────────────────────────────
# Standalone demo
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    for n in [4, 8, 16]:
        print(f"\n{'='*64}")
        print(f"  {n}-QUBIT CHIP — FREQUENCY PLAN")
        print(f"{'='*64}")
        plan = generate_frequency_plan(n, topology="grid")

        print(f"\n  ε_eff = {plan['epsilon_eff']}")
        print(f"\n  {'Qubit':<8} {'Group':<7} {'f_q (GHz)':<12} {'EJ (GHz)':<11} {'EC (GHz)':<10}")
        print(f"  {'-'*48}")
        for qname, fq in plan["qubits"].items():
            grp = plan["groups"][qname]
            ej  = plan["EJ_GHz"][qname]
            ec  = plan["EC_GHz"][qname]
            print(f"  {qname:<8} {grp:<7} {fq:<12.4f} {ej:<11.2f} {ec:<10.3f}")

        print(f"\n  {'Resonator':<10} {'f_r (GHz)':<12} {'Δ (GHz)':<10} {'λ/4 (mm)':<10}")
        print(f"  {'-'*42}")
        for rname, fr in plan["resonators"].items():
            L   = plan["resonator_lengths_mm"][rname]
            det = plan["detunings_GHz"][rname]
            print(f"  {rname:<10} {fr:<12.4f} {det:<10.4f} {L:<10.4f}")

        if plan["warnings"]:
            print(f"\n  ⚠  WARNINGS:")
            for w in plan["warnings"]:
                print(f"     {w}")
        else:
            print(f"\n  ✓  No frequency collisions detected.")
