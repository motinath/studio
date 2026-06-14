"""Data models (Pydantic v2) defining integration contracts.

These schemas define the exact JSON formats for:
- Input from Palace EM simulation (em_results.py)
- Input from QLang/Editor design spec (design_spec.py)
- Output physics report (physics_report.py)
"""

from physics_engine.models.enums import QubitType, ValidationStatus, NoiseChannelType
from physics_engine.models.em_results import (
    EMResults,
    CapacitanceMatrix,
    InductanceEntry,
    EigenmodeResult,
    EigenmodeSuite,
)
from physics_engine.models.design_spec import (
    DesignSpec,
    QubitSpec,
    JunctionParams,
    QubitTargets,
    ResonatorSpec,
    CouplerSpec,
    GlobalConstraints,
    NoiseEnvironment,
)
from physics_engine.models.physics_report import (
    PhysicsReport,
    QubitInputParams,
    QubitComputedProps,
    CoherenceChannelResult,
    QubitCoherenceResult,
    QubitValidationDetail,
    QubitResult,
    CouplingValidationDetail,
    CouplingResult,
    ReadoutResult,
    FrequencySpacingEntry,
    FrequencyCollisionAnalysis,
    ValidationSummary,
)

__all__ = [
    "QubitType",
    "ValidationStatus",
    "NoiseChannelType",
    "EMResults",
    "CapacitanceMatrix",
    "InductanceEntry",
    "EigenmodeResult",
    "EigenmodeSuite",
    "DesignSpec",
    "QubitSpec",
    "JunctionParams",
    "QubitTargets",
    "ResonatorSpec",
    "CouplerSpec",
    "GlobalConstraints",
    "NoiseEnvironment",
    "PhysicsReport",
    "QubitInputParams",
    "QubitComputedProps",
    "CoherenceChannelResult",
    "QubitCoherenceResult",
    "QubitValidationDetail",
    "QubitResult",
    "CouplingValidationDetail",
    "CouplingResult",
    "ReadoutResult",
    "FrequencySpacingEntry",
    "FrequencyCollisionAnalysis",
    "ValidationSummary",
]
