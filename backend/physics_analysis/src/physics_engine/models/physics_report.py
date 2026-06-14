"""Pydantic models for the physics analysis report.

This is the OUTPUT contract to the DRC Verification Engine,
the Frontend UI, and the Signoff Report generator.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from physics_engine.models.enums import QubitType, ValidationStatus



# Per-qubit sub-models



class QubitInputParams(BaseModel):
    """Converted input parameters that were fed into scqubits."""

    EC_ghz: float = Field(description="Charging energy in GHz.")
    EJ_ghz: float = Field(description="Josephson energy in GHz.")
    EL_ghz: float | None = Field(
        default=None, description="Inductive energy in GHz (fluxonium only)."
    )
    EJ_EC_ratio: float = Field(description="EJ/EC ratio.")
    capacitance_fF: float = Field(description="Total island capacitance in fF.")
    flux_bias: float = Field(default=0.0, description="External flux in Φ₀.")


class QubitComputedProps(BaseModel):
    """Computed qubit properties from scqubits diagonalization."""

    frequency_ghz: float = Field(description="Qubit frequency f₀₁ in GHz.")
    anharmonicity_mhz: float = Field(description="Anharmonicity α in MHz.")
    f12_ghz: float = Field(description="1→2 transition frequency in GHz.")
    energy_levels_ghz: list[float] = Field(
        description="First N energy eigenvalues in GHz (relative to ground)."
    )
    transmon_regime: bool = Field(
        description="True if EJ/EC > 20 (valid transmon approximation)."
    )


class CoherenceChannelResult(BaseModel):
    """Result for a single noise channel."""

    channel: str = Field(description="Noise channel name (e.g., 't1_capacitive').")
    value_us: float = Field(
        description="Channel-specific T1 or Tφ in microseconds."
    )


class QubitCoherenceResult(BaseModel):
    """Complete coherence analysis for one qubit."""

    T1_effective_us: float = Field(description="Effective T1 in microseconds.")
    T2_effective_us: float = Field(description="Effective T2 in microseconds.")
    T1_channels: list[CoherenceChannelResult] = Field(
        description="Per-channel T1 contributions."
    )
    Tphi_channels: list[CoherenceChannelResult] = Field(
        description="Per-channel Tφ (pure dephasing) contributions."
    )
    dominant_T1_channel: str = Field(
        description="Name of the channel most limiting T1."
    )
    dominant_Tphi_channel: str = Field(
        description="Name of the channel most limiting Tφ."
    )


class QubitValidationDetail(BaseModel):
    """Validation result for a single target of a single qubit."""

    status: ValidationStatus
    target: float = Field(description="Target value.")
    actual: float = Field(description="Computed value.")
    tolerance: float | None = Field(
        default=None, description="Allowed tolerance (±)."
    )
    unit: str = Field(default="", description="Unit string for display.")


class QubitResult(BaseModel):
    """Complete physics result for one qubit."""

    qubit_id: str
    type: QubitType
    input_params: QubitInputParams
    computed: QubitComputedProps
    coherence: QubitCoherenceResult
    validation: dict[str, QubitValidationDetail] = Field(
        description="Validation results keyed by check name: "
        "'frequency', 'anharmonicity', 'T1', 'T2'."
    )



# Coupling sub-models



class CouplingValidationDetail(BaseModel):
    """Validation result for a coupling metric."""

    status: ValidationStatus
    target: float | None = Field(default=None)
    actual: float
    max_allowed: float | None = Field(default=None)
    unit: str = Field(default="")


class CouplingResult(BaseModel):
    """Physics result for a qubit-qubit coupling pair."""

    qubit_a: str
    qubit_b: str
    coupling_capacitance_fF: float = Field(
        description="Mutual capacitance from EM simulation in fF."
    )
    bare_coupling_mhz: float = Field(description="Bare coupling strength g in MHz.")
    dispersive_shift_khz: float = Field(
        description="Cross-resonance dispersive shift in kHz."
    )
    zz_coupling_khz: float = Field(description="Static ZZ coupling in kHz.")
    validation: dict[str, CouplingValidationDetail] = Field(
        default_factory=dict,
        description="Validation results: 'coupling_strength', 'zz_parasitic'.",
    )


# ---------------------------------------------------------------------------
# Readout sub-models
# ---------------------------------------------------------------------------


class ReadoutResult(BaseModel):
    """Dispersive readout analysis for a qubit-resonator pair."""

    resonator_id: str
    qubit_id: str
    resonator_frequency_ghz: float = Field(
        description="Dressed resonator frequency in GHz."
    )
    qubit_resonator_detuning_ghz: float = Field(
        description="Δ = ω_r - ω_q in GHz."
    )
    coupling_strength_mhz: float = Field(
        description="Qubit-resonator coupling g_qr in MHz."
    )
    dispersive_shift_mhz: float = Field(
        description="Dispersive shift χ in MHz."
    )
    purcell_T1_limit_us: float = Field(
        description="Purcell-limited T1 in microseconds."
    )
    critical_photon_number: float = Field(
        description="Critical photon number n_crit = Δ²/(4g²)."
    )


# ---------------------------------------------------------------------------
# Frequency collision analysis
# ---------------------------------------------------------------------------


class FrequencySpacingEntry(BaseModel):
    """Frequency spacing between a pair of elements."""

    pair: list[str] = Field(description="Pair of element IDs.")
    spacing_mhz: float = Field(description="Frequency spacing in MHz.")
    collision_type: str | None = Field(
        default=None,
        description="Type of collision if detected: 'direct', 'straddling', 'two_photon'.",
    )


class FrequencyCollisionAnalysis(BaseModel):
    """Analysis of frequency collisions across the chip."""

    status: ValidationStatus
    min_qubit_spacing_mhz: float = Field(
        description="Minimum frequency spacing between any two qubits in MHz."
    )
    collisions: list[FrequencySpacingEntry] = Field(
        default_factory=list,
        description="List of detected frequency collisions.",
    )
    all_spacings: list[FrequencySpacingEntry] = Field(
        default_factory=list,
        description="All pairwise frequency spacings for reference.",
    )



# Validation summary



class ValidationSummary(BaseModel):
    """Aggregate validation results across all checks."""

    total_checks: int
    passed: int
    warnings: int
    failures: int
    blocking: bool = Field(
        description="True if any check has FAIL status (design must be revised)."
    )
    suggestions: list[str] = Field(
        default_factory=list,
        description="Actionable suggestions for improving the design.",
    )



# Top-level report



class PhysicsReport(BaseModel):
    """Complete physics analysis report.

    This is the primary output of the Physics Analysis Engine.
    Consumed by the DRC Verification Engine, Frontend, and Signoff Report.

    Schema: silicofeller/physics_report/v1
    """

    analysis_id: str = Field(description="Unique analysis identifier.")
    timestamp: str = Field(description="ISO 8601 timestamp of analysis completion.")
    design_id: str = Field(description="Design identifier that was analyzed.")
    simulation_id: str = Field(
        description="Palace simulation identifier used as input."
    )
    engine_version: str = Field(description="Physics engine version.")

    overall_status: ValidationStatus = Field(
        description="Overall physics verdict: PASS, WARNING, or FAIL."
    )
    physics_score: float = Field(
        description="Overall physics score from 0.0 to 1.0.",
        ge=0.0,
        le=1.0,
    )

    qubit_results: list[QubitResult] = Field(
        description="Per-qubit analysis results."
    )
    coupling_results: list[CouplingResult] = Field(
        default_factory=list,
        description="Per-pair coupling analysis results.",
    )
    readout_results: list[ReadoutResult] = Field(
        default_factory=list,
        description="Per qubit-resonator readout analysis results.",
    )
    frequency_collision_analysis: FrequencyCollisionAnalysis = Field(
        description="Frequency collision detection results."
    )
    validation_summary: ValidationSummary = Field(
        description="Aggregate validation summary."
    )

    plots: dict[str, str] = Field(
        default_factory=dict,
        description="Mapping of plot name → file path for generated visualizations.",
    )
