"""Pydantic models for quantum chip design specification.

This is the INPUT contract from the QLang compiler / Editor frontend.
Defines what the user wants: qubit targets, coupling requirements,
noise environment, and global constraints.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from physics_engine.models.enums import CouplerType, QubitType, ResonatorType


class JunctionParams(BaseModel):
    """Josephson junction parameters.

    At least one of EJ_ghz or critical_current_nA must be provided.
    If only critical_current is given, EJ is computed from it.
    """

    EJ_ghz: float | None = Field(
        default=None,
        description="Josephson energy in GHz. Directly specified or computed from Ic.",
        gt=0,
    )
    critical_current_nA: float | None = Field(
        default=None,
        description="Junction critical current in nanoamps. Used to compute EJ if EJ_ghz is not given.",
        gt=0,
    )
    junction_area_um2: float | None = Field(
        default=None,
        description="Junction area in µm². Informational — used for yield estimation.",
        gt=0,
    )


class QubitTargets(BaseModel):
    """Design targets for a single qubit. Used for validation."""

    frequency_ghz: float = Field(description="Target qubit frequency f₀₁ in GHz.", gt=0)
    frequency_tolerance_ghz: float = Field(
        default=0.15,
        description="Acceptable deviation from target frequency in GHz (±).",
        gt=0,
    )
    anharmonicity_mhz: float = Field(
        description="Target anharmonicity α in MHz. Negative for transmon (e.g., -250).",
    )
    anharmonicity_tolerance_mhz: float = Field(
        default=30.0,
        description="Acceptable deviation from target anharmonicity in MHz (±).",
        gt=0,
    )
    T1_min_us: float = Field(
        default=50.0,
        description="Minimum acceptable T1 relaxation time in microseconds.",
        gt=0,
    )
    T2_min_us: float = Field(
        default=30.0,
        description="Minimum acceptable T2 dephasing time in microseconds.",
        gt=0,
    )


class QubitSpec(BaseModel):
    """Specification for a single qubit in the design."""

    qubit_id: str = Field(description="Unique qubit identifier (e.g., 'Q1').")
    type: QubitType = Field(description="Qubit type.")
    junction_params: JunctionParams = Field(
        description="Josephson junction parameters."
    )
    capacitance_terminal_id: str | None = Field(
        default=None,
        description="Terminal ID in the Palace capacitance matrix corresponding to this qubit's island. "
        "If None, defaults to '{qubit_id}_island'.",
    )
    junction_id: str | None = Field(
        default=None,
        description="Junction ID in eigenmode EPR data. If None, defaults to 'JJ_{qubit_id}'.",
    )
    inductance_element_id: str | None = Field(
        default=None,
        description="Inductance element ID for fluxonium. If None, defaults to 'L_{qubit_id}_superinductor'.",
    )
    flux_bias: float = Field(
        default=0.0,
        description="External flux bias in units of Φ₀. 0.5 = half flux quantum (sweet spot for fluxonium).",
    )
    asymmetry: float = Field(
        default=0.0,
        description="SQUID asymmetry parameter d for tunable transmon. 0 = symmetric.",
        ge=0.0,
        le=1.0,
    )
    targets: QubitTargets = Field(description="Design targets for this qubit.")

    @property
    def terminal_id(self) -> str:
        """Resolved terminal ID for capacitance matrix lookup."""
        return self.capacitance_terminal_id or f"{self.qubit_id}_island"

    @property
    def resolved_junction_id(self) -> str:
        """Resolved junction ID for eigenmode EPR lookup."""
        return self.junction_id or f"JJ_{self.qubit_id}"

    @property
    def resolved_inductance_id(self) -> str:
        """Resolved inductance element ID."""
        return self.inductance_element_id or f"L_{self.qubit_id}_superinductor"


class ResonatorSpec(BaseModel):
    """Specification for a resonator (readout or bus)."""

    resonator_id: str = Field(description="Unique resonator identifier (e.g., 'R1').")
    type: ResonatorType = Field(
        default=ResonatorType.READOUT, description="Resonator type."
    )
    coupled_to: str = Field(
        description="ID of the qubit this resonator is coupled to."
    )
    capacitance_terminal_id: str | None = Field(
        default=None,
        description="Terminal ID in capacitance matrix. Defaults to resonator_id.",
    )
    target_frequency_ghz: float = Field(
        description="Target resonator frequency in GHz.", gt=0
    )
    target_kappa_khz: float = Field(
        default=500.0,
        description="Target linewidth (κ) in kHz for readout.",
        gt=0,
    )

    @property
    def terminal_id(self) -> str:
        """Resolved terminal ID for capacitance matrix lookup."""
        return self.capacitance_terminal_id or self.resonator_id


class CouplerSpec(BaseModel):
    """Specification for qubit-qubit coupling."""

    coupler_id: str = Field(description="Unique coupler identifier (e.g., 'C12').")
    type: CouplerType = Field(
        default=CouplerType.CAPACITIVE, description="Coupling mechanism type."
    )
    connects: list[str] = Field(
        description="Pair of qubit IDs this coupler connects. E.g., ['Q1', 'Q2'].",
        min_length=2,
        max_length=2,
    )
    target_coupling_mhz: float = Field(
        description="Target coupling strength (g) in MHz.", gt=0
    )
    max_zz_khz: float = Field(
        default=50.0,
        description="Maximum acceptable static ZZ coupling in kHz.",
        gt=0,
    )


class GlobalConstraints(BaseModel):
    """Global design constraints applied across all qubits."""

    min_qubit_frequency_spacing_mhz: float = Field(
        default=100.0,
        description="Minimum frequency spacing between any two qubits in MHz.",
        gt=0,
    )
    max_crosstalk_db: float = Field(
        default=-40.0,
        description="Maximum acceptable crosstalk in dB.",
    )
    fabrication_process: str = Field(
        default="standard_al_on_si",
        description="Fabrication process identifier. Affects default noise parameters.",
    )


class NoiseEnvironment(BaseModel):
    """Noise environment parameters for coherence estimation.

    These can be customized per foundry/process or left as defaults
    representing a typical dilution refrigerator environment.
    """

    temperature_mK: float = Field(
        default=15.0,
        description="Operating temperature in millikelvin.",
        gt=0,
    )
    Q_capacitive: float = Field(
        default=1e6,
        description="Capacitor quality factor (inverse dielectric loss tangent).",
        gt=0,
    )
    Q_inductive: float = Field(
        default=500e6,
        description="Inductor quality factor.",
        gt=0,
    )
    flux_noise_amplitude: float = Field(
        default=1e-6,
        description="1/f flux noise amplitude in units of Φ₀.",
        gt=0,
    )
    charge_noise_amplitude: float = Field(
        default=1e-4,
        description="1/f charge noise amplitude (dimensionless).",
        gt=0,
    )
    critical_current_noise_amplitude: float = Field(
        default=1e-7,
        description="1/f critical current noise amplitude.",
        gt=0,
    )
    quasiparticle_density: float = Field(
        default=1e-8,
        description="Normalized quasiparticle density x_qp.",
        gt=0,
    )


class DesignSpec(BaseModel):
    """Top-level design specification.

    This is the complete input from the QLang compiler or Editor frontend.
    It defines what the user wants to build and the targets to validate against.

    Schema: silicofeller/design_spec/v1
    """

    design_id: str = Field(description="Unique design identifier.")
    project_name: str = Field(default="", description="Human-readable project name.")
    qubits: list[QubitSpec] = Field(
        description="List of qubit specifications (up to 5).",
        min_length=1,
        max_length=5,
    )
    resonators: list[ResonatorSpec] = Field(
        default_factory=list,
        description="List of resonator specifications.",
    )
    couplers: list[CouplerSpec] = Field(
        default_factory=list,
        description="List of coupler specifications.",
    )
    global_constraints: GlobalConstraints = Field(
        default_factory=GlobalConstraints,
        description="Global design constraints.",
    )
    noise_environment: NoiseEnvironment = Field(
        default_factory=NoiseEnvironment,
        description="Noise environment for coherence estimation.",
    )

    def get_qubit(self, qubit_id: str) -> QubitSpec:
        """Look up a qubit specification by ID."""
        for q in self.qubits:
            if q.qubit_id == qubit_id:
                return q
        raise KeyError(f"Qubit '{qubit_id}' not found in design spec.")

    def get_resonator(self, resonator_id: str) -> ResonatorSpec:
        """Look up a resonator specification by ID."""
        for r in self.resonators:
            if r.resonator_id == resonator_id:
                return r
        raise KeyError(f"Resonator '{resonator_id}' not found in design spec.")

    def get_resonator_for_qubit(self, qubit_id: str) -> ResonatorSpec | None:
        """Find the readout resonator coupled to a specific qubit."""
        for r in self.resonators:
            if r.coupled_to == qubit_id:
                return r
        return None

    def get_coupler_for_pair(self, qubit_a: str, qubit_b: str) -> CouplerSpec | None:
        """Find the coupler connecting two qubits (order-independent)."""
        pair = {qubit_a, qubit_b}
        for c in self.couplers:
            if set(c.connects) == pair:
                return c
        return None
