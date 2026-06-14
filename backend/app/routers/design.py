"""
design.py — V2 Design Pipeline API Router

Endpoints
---------
POST /api/design/generate          — Full V2 constraint-driven pipeline
POST /api/design/generate-from-graph — Run pipeline from a graph JSON payload
POST /api/design/validate          — Structural graph validation only
POST /api/design/route             — Run routing only (placement must exist)
POST /api/design/drc               — Run advanced 4-domain DRC
POST /api/design/export            — Export design in a specific format
POST /api/design/export-all        — Export all formats at once
POST /api/design/frequency-plan    — Constraint-driven frequency planning
GET  /api/design/topologies        — List supported topologies with metadata
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import get_optional_user
from app.config import settings
from app.models import User

router = APIRouter(prefix="/api/design", tags=["design-v2"])

MAX_QUBITS = settings.max_qubits


# ── Request models ─────────────────────────────────────────────────────────────

class ConstraintsRequest(BaseModel):
    qubit_count:   int   = Field(5, ge=1, le=256)
    chip_size_mm:  float = Field(10.0, ge=1.0, le=100.0)
    chip_width_mm: float = Field(0.0, ge=0.0)
    chip_height_mm: float = Field(0.0, ge=0.0)
    technology:    str   = "transmon"
    topology:      str   = "grid"
    substrate:     str   = "silicon"
    metal:         str   = "aluminum"
    target_freq_ghz: float = Field(5.0, ge=1.0, le=12.0)
    scale:         float = Field(1.0, ge=0.1, le=5.0)
    chip_name:     str   = "QuantumChip"
    fab:           dict  = Field(default_factory=dict)
    freq:          dict  = Field(default_factory=dict)


class GraphDesignRequest(BaseModel):
    graph:       dict[str, Any]
    constraints: dict[str, Any] = Field(default_factory=dict)


class RouteRequest(BaseModel):
    placement:   dict[str, Any]
    constraints: dict[str, Any] = Field(default_factory=dict)


class DRCRequest(BaseModel):
    graph:       dict[str, Any]
    constraints: dict[str, Any] = Field(default_factory=dict)


class ExportRequest(BaseModel):
    graph:        dict[str, Any]
    format:       str = "json"           # json|qclang|gds|svg|dxf|pdf
    freq_plan:    dict[str, Any] = Field(default_factory=dict)
    drc_report:   dict[str, Any] = Field(default_factory=dict)
    constraints:  dict[str, Any] = Field(default_factory=dict)
    project_name: str = "QuantumChip"
    version:      str = "v1.0"


class ExportAllRequest(BaseModel):
    graph:        dict[str, Any]
    freq_plan:    dict[str, Any] = Field(default_factory=dict)
    route_result: dict[str, Any] = Field(default_factory=dict)
    drc_report:   dict[str, Any] = Field(default_factory=dict)
    constraints:  dict[str, Any] = Field(default_factory=dict)
    project_name: str = "QuantumChip"
    version:      str = "v1.0"


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_design(
    body: ConstraintsRequest,
    user: User | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """
    Full V2 constraint-driven design pipeline.

    Pipeline: Constraints → Graph → Validation → Frequency Plan
              → Placement → Routing → DRC → Qiskit Metal Code → Exports
    """
    try:
        from app.constraints.constraints import (
            DesignConstraints, FabConstraints, FreqConstraints,
        )
        from app.services.design_pipeline import run_design_pipeline

        n = min(body.qubit_count, MAX_QUBITS)
        constraints = DesignConstraints(
            qubit_count    = n,
            chip_size_mm   = body.chip_size_mm,
            chip_width_mm  = body.chip_width_mm or body.chip_size_mm,
            chip_height_mm = body.chip_height_mm or body.chip_size_mm,
            technology     = body.technology,
            topology       = body.topology,
            substrate      = body.substrate,
            metal          = body.metal,
            scale          = body.scale,
            chip_name      = body.chip_name,
            fab            = FabConstraints.from_dict(body.fab) if body.fab else FabConstraints(),
            freq           = FreqConstraints(
                target_freq_ghz = body.target_freq_ghz,
                **(body.freq or {}),
            ),
        )
        return await run_design_pipeline(constraints)

    except Exception as exc:
        return {"success": False, "error": str(exc)}


@router.post("/generate-from-graph")
async def generate_from_graph(
    body: GraphDesignRequest,
    user: User | None = Depends(get_optional_user),
) -> dict[str, Any]:
    """
    Run the V2 pipeline from an existing graph JSON
    (e.g. drawn in the schematic editor).
    """
    try:
        from app.services.design_pipeline import run_design_from_graph_json
        return await run_design_from_graph_json(body.graph, body.constraints)
    except Exception as exc:
        return {"success": False, "error": str(exc)}


@router.post("/validate")
async def validate_graph(body: GraphDesignRequest) -> dict[str, Any]:
    """Structural graph validation — fast, no physics computation."""
    try:
        from app.core.design_graph.serializer import dict_to_graph
        from app.core.design_graph.validator import GraphValidator

        graph  = dict_to_graph(body.graph)
        result = GraphValidator(graph).validate()
        return {
            "passed":   result.passed,
            "graph_stats": graph.stats(),
            **result.to_dict(),
        }
    except Exception as exc:
        return {"passed": False, "error": str(exc), "issues": []}


@router.post("/route")
async def route_placement(body: RouteRequest) -> dict[str, Any]:
    """
    Run routing on a placement dict (from /api/generate/placement).
    Returns coupler, resonator, and feedline route segments.
    """
    try:
        from app.routing.pipeline import route_from_placement_dict
        return route_from_placement_dict(body.placement, body.constraints)
    except Exception as exc:
        return {"error": str(exc), "warnings": [str(exc)]}


@router.post("/drc")
async def run_advanced_drc(body: DRCRequest) -> dict[str, Any]:
    """
    Run the advanced 4-domain DRC (geometry, frequency, fabrication, connectivity).
    """
    try:
        from app.constraints.constraints import DesignConstraints
        from app.core.design_graph.serializer import dict_to_graph
        from app.drc.runner import run_full_drc

        graph       = dict_to_graph(body.graph)
        constraints = DesignConstraints.from_dict(body.constraints)
        report      = run_full_drc(graph, constraints)
        return report.to_dict()
    except Exception as exc:
        return {"passed": False, "error": str(exc), "violations": []}


@router.post("/export")
async def export_design(body: ExportRequest) -> dict[str, Any]:
    """Export a design in a single format (json|qclang|gds|svg|dxf|pdf)."""
    try:
        from app.core.design_graph.serializer import dict_to_graph
        from app.exports.engine import ExportEngine

        graph  = dict_to_graph(body.graph)
        engine = ExportEngine(
            graph       = graph,
            freq_plan   = body.freq_plan,
            drc_report  = body.drc_report,
            constraints = body.constraints,
        )
        content = engine.export(
            body.format,
            project_name = body.project_name,
            version      = body.version,
        )
        return {
            "format":  body.format,
            "content": content,
            "length":  len(content),
        }
    except Exception as exc:
        return {"error": str(exc)}


@router.post("/export-all")
async def export_all_formats(body: ExportAllRequest) -> dict[str, Any]:
    """Export design in all formats simultaneously."""
    try:
        from app.core.design_graph.serializer import dict_to_graph
        from app.exports.engine import ExportEngine

        graph  = dict_to_graph(body.graph)
        engine = ExportEngine(
            graph         = graph,
            freq_plan     = body.freq_plan,
            route_result  = body.route_result,
            drc_report    = body.drc_report,
            constraints   = body.constraints,
        )
        exports = engine.export_all(
            project_name = body.project_name,
            version      = body.version,
        )
        return {
            "project_name": body.project_name,
            "version":      body.version,
            "formats":      list(exports.keys()),
            "exports":      exports,
        }
    except Exception as exc:
        return {"error": str(exc)}


@router.post("/frequency-plan")
async def frequency_plan_from_constraints(body: ConstraintsRequest) -> dict[str, Any]:
    """
    Constraint-driven frequency planning.
    Respects qubit_band, readout_band, and min-detuning constraints.
    """
    try:
        from app.constraints.constraints import DesignConstraints, FreqConstraints
        from app.services.materials import get_physics_substrate
        from app.services.physics.frequency_planner import FrequencyPlanner

        n    = min(body.qubit_count, MAX_QUBITS)
        sub  = get_physics_substrate(body.substrate)
        plan = FrequencyPlanner(
            n         = n,
            substrate = sub,
            topology  = body.topology,
        ).plan()

        return {
            "n":          n,
            "topology":   body.topology,
            "epsilon_eff": plan.epsilon_eff,
            "qubits":     {q.name: {
                "freq_GHz":   q.freq_GHz,
                "group":      q.group,
                "EJ_GHz":     q.EJ_GHz,
                "EC_GHz":     q.EC_GHz,
                "anharmonicity_GHz": q.anharmonicity_GHz,
            } for q in plan.qubits},
            "resonators": {r.name: {
                "freq_GHz":   r.freq_GHz,
                "length_mm":  r.length_mm,
                "detuning_GHz": r.detuning_GHz,
                "qubit":      r.qubit,
            } for r in plan.resonators},
            "warnings":   [w.message for w in plan.warnings],
        }
    except Exception as exc:
        return {"error": str(exc)}


@router.get("/topologies")
async def list_topologies() -> dict[str, Any]:
    """Return all supported chip topologies with metadata."""
    return {
        "topologies": [
            {
                "key":         "grid",
                "label":       "Grid",
                "description": "Square/rectangular lattice — basis for surface code",
                "ibm_name":    "Surface Code basis",
                "max_degree":  4,
                "best_for":    "Error correction, surface codes",
            },
            {
                "key":         "heavy_hex",
                "label":       "Heavy Hex",
                "description": "IBM heavy-hexagonal lattice — max degree 3",
                "ibm_name":    "Falcon / Eagle / Heron",
                "max_degree":  3,
                "best_for":    "Low crosstalk, scalable systems",
            },
            {
                "key":         "line",
                "label":       "Linear Chain",
                "description": "1D nearest-neighbour chain",
                "ibm_name":    "Test/research chips",
                "max_degree":  2,
                "best_for":    "Small devices, testing",
            },
            {
                "key":         "ring",
                "label":       "Ring",
                "description": "Closed-loop 1D topology",
                "ibm_name":    "Research",
                "max_degree":  2,
                "best_for":    "Periodic boundary condition experiments",
            },
            {
                "key":         "star",
                "label":       "Star",
                "description": "Hub-and-spoke — one central qubit connected to all others",
                "ibm_name":    "Research",
                "max_degree":  "N-1 (hub)",
                "best_for":    "Entanglement distribution",
            },
            {
                "key":         "all-to-all",
                "label":       "All-to-All",
                "description": "Every qubit coupled to every other qubit",
                "ibm_name":    "Not practical for > 5 qubits",
                "max_degree":  "N-1",
                "best_for":    "Small research chips, benchmarking",
            },
        ]
    }
