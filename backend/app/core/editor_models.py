"""Pydantic schemas describing components, parameters, pins, and previews.

Mirrors frontend types and routes.
"""
from __future__ import annotations

from typing import Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

# ── Component Registry Schemas ────────────────────────────────────────────────

ComponentCategory = Literal[
    "qubits",
    "resonators",
    "couplers",
    "routes",
    "launchpads",
    "ground",
    "terminations",
    "other",
]

ParameterType = Literal["length", "string", "number", "bool", "enum"]
PinDirection = Literal["in", "out", "io"]


class ComponentSummary(BaseModel):
    id: str
    name: str
    module: str
    category: ComponentCategory
    description: Optional[str] = None


class ParameterSpec(BaseModel):
    name: str
    type: ParameterType
    unit: Optional[str] = None
    default: str
    description: Optional[str] = None
    options: Optional[List[str]] = None


class ComponentMetadata(BaseModel):
    id: str
    parameters: List[ParameterSpec] = Field(default_factory=list)
    supportedRouteComponents: Optional[List[str]] = None


class PinHint(BaseModel):
    x: float
    y: float
    angle: float


class PinSpec(BaseModel):
    name: str
    direction: PinDirection
    hint: PinHint


class ComponentPins(BaseModel):
    id: str
    pins: List[PinSpec] = Field(default_factory=list)


class ViewBox(BaseModel):
    x: float
    y: float
    w: float
    h: float


class ComponentPreview(BaseModel):
    id: str
    svg: str
    viewBox: ViewBox
    units: Literal["um", "mm"] = "um"


# ── Design Document Schemas ───────────────────────────────────────────────────

ParamValue = Union[str, float, int]


class Placement(BaseModel):
    id: str
    componentId: str
    name: str
    x: float
    y: float
    rotation: float = 0.0
    params: Dict[str, ParamValue] = Field(default_factory=dict)


class PinRef(BaseModel):
    placementId: str
    pinName: str


class Connection(BaseModel):
    id: str
    from_: PinRef = Field(alias="from")
    to: PinRef
    routeComponentId: Optional[str] = None
    routeOverrides: Dict[str, ParamValue] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class DesignDocument(BaseModel):
    placements: List[Placement] = Field(default_factory=list)
    connections: List[Connection] = Field(default_factory=list)


# ── Response Schemas ──────────────────────────────────────────────────────────

class ValidationIssue(BaseModel):
    severity: Literal["error", "warning", "info"]
    rule: str
    message: str


class ValidationResult(BaseModel):
    valid: bool
    issues: List[ValidationIssue] = Field(default_factory=list)


class GeneratedCode(BaseModel):
    language: Literal["python"] = "python"
    filename: str = "design.py"
    code: str


class LayerRender(BaseModel):
    name: str
    svg: str


class RouteRender(BaseModel):
    connectionId: str
    svg: str


class RenderResult(BaseModel):
    svg: str
    viewBox: ViewBox
    units: Literal["um", "mm"] = "um"
    layers: List[LayerRender] = Field(default_factory=list)
    routes: List[RouteRender] = Field(default_factory=list)
