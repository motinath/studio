"""
/generate, /health, and physics sub-endpoints.

New endpoints (all under /api):
  GET  /health                         — system health + ML status
  POST /generate                       — AI chip generation (upgraded pipeline)
  POST /generate/frequency-plan        — standalone frequency plan
  POST /generate/placement             — standalone physical placement
  POST /generate/drc                   — standalone DRC check
  POST /generate/netlist               — chip netlist (connectivity)
  POST /generate/em-simulation         — EM simulation parameters stub
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import get_optional_user
from app.config import settings
from app.models import User
from app.services.chip_generator import generate_chip

# Physics sub-modules (imported lazily inside handlers for graceful fallback)
router = APIRouter(tags=["generate"])

# Sub-router for the new physics endpoints — registered at /api/generate/*
sub_router = APIRouter(prefix="/api", tags=["physics"])

MAX_QUBITS = settings.max_qubits


# ── Request / Response models ─────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=2000)
    substrate: str | None = None
    metal: str | None = None


class FrequencyPlanRequest(BaseModel):
    n: int = Field(4, ge=1, le=50)
    topology: str = "grid"
    substrate: str | None = None


class PlacementRequest(BaseModel):
    n: int = Field(4, ge=1, le=50)
    topology: str = "grid"
    scale: float = Field(1.0, ge=0.1, le=5.0)


class DRCRequest(BaseModel):
    n: int = Field(4, ge=1, le=50)
    topology: str = "grid"
    scale: float = Field(1.0, ge=0.1, le=5.0)
    rules: dict | None = None


class NetlistRequest(BaseModel):
    n: int = Field(4, ge=1, le=50)
    topology: str = "grid"


class EMSimRequest(BaseModel):
    n: int = Field(4, ge=1, le=50)
    topology: str = "grid"
    backend: str = "hfss"


class MetalCodeRequest(BaseModel):
    components: list[dict[str, Any]]
    connections: list[dict[str, Any]]
    variables: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    version: str
    max_qubits: int
    qiskit_metal: str
    metal_version: str
    ml_intent: str
    gds_renderer: str
    pipeline: list[str]
    physics_engine: str


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health", response_model=HealthResponse)
async def health():
    # Check ML availability
    ml_status = "unavailable"
    try:
        from app.services.physics.ml_intent import _TORCH_OK, get_model
        if _TORCH_OK:
            get_model()
            ml_status = "ready (pytorch)"
        else:
            ml_status = "regex-only (torch not installed)"
    except Exception:
        ml_status = "regex-only"

    return HealthResponse(
        status="online",
        version="3.0.0",
        max_qubits=MAX_QUBITS,
        qiskit_metal="analytical-compiler",
        metal_version="3.0.0",
        ml_intent=ml_status,
        gds_renderer="not_installed",
        pipeline=[
            "ml_intent",
            "frequency_planner (Schneider CPW)",
            "topology_router (Kamada-Kawai)",
            "drc (7 rules)",
            "qclang-codegen",
        ],
        physics_engine="backend2-v2 (IBM-style)",
    )


# ── Main chip generation ──────────────────────────────────────────────────────

@router.post("/generate")
async def generate(
    body: GenerateRequest,
    user: User | None = Depends(get_optional_user),
) -> dict[str, Any]:
    result = await generate_chip(body.prompt, body.substrate, body.metal)
    return result



# Generate Qiskit Metal code from the drag/drop editor state

@sub_router.post("/generate/metal-code")
async def generate_metal_code(body: MetalCodeRequest) -> dict[str, Any]:
    """Generate runnable Qiskit Metal Python from Quantum Editor JSON."""
    from app.services.metal_codegen.adapter import editor_state_to_design
    from app.services.metal_codegen.metal_codegen import MetalCodeGenerator

    design = editor_state_to_design(
        components=body.components,
        connections=body.connections,
        variables=body.variables,
    )
    result = MetalCodeGenerator(design).generate()

    return {
        "success": True,
        "code": result.source_code,
        "warnings": result.warnings or [],
        "component_count": result.component_count,
    }

# ── Frequency plan ────────────────────────────────────────────────────────────

@sub_router.post("/generate/frequency-plan")
async def frequency_plan(body: FrequencyPlanRequest) -> dict[str, Any]:
    """
    Standalone IBM-style frequency planning.
    Returns qubit A/B groups, EJ/EC, resonator band 6.3–7.2 GHz, λ/4 lengths,
    collision warnings.
    """
    try:
        from app.services.materials import get_material, get_physics_substrate
        from app.services.physics.frequency_planner import FrequencyPlanner

        n = max(1, min(MAX_QUBITS, body.n))
        topology = body.topology

        physics_substrate = get_physics_substrate(body.substrate) if body.substrate else None

        planner = FrequencyPlanner(n=n, substrate=physics_substrate, topology=topology)
        freq_plan = planner.plan()

        return {
            "n": n,
            "topology": topology,
            "substrate": freq_plan.substrate,
            "epsilon_eff": freq_plan.epsilon_eff,
            "qubits": {q.name: q.freq_GHz for q in freq_plan.qubits},
            "qubit_groups": {q.name: q.group for q in freq_plan.qubits},
            "EJ_GHz": {q.name: q.EJ_GHz for q in freq_plan.qubits},
            "EC_GHz": {q.name: q.EC_GHz for q in freq_plan.qubits},
            "resonators": {r.name: r.freq_GHz for r in freq_plan.resonators},
            "resonator_lengths_mm": {r.name: r.length_mm for r in freq_plan.resonators},
            "detunings_GHz": {r.name: r.detuning_GHz for r in freq_plan.resonators},
            "warnings": [w.message for w in freq_plan.warnings],
        }
    except Exception as exc:
        return {"error": str(exc)}


# ── Physical placement ────────────────────────────────────────────────────────

@sub_router.post("/generate/placement")
async def placement(body: PlacementRequest) -> dict[str, Any]:
    """
    Graph-solver physical placement for a given topology.
    Uses Kamada-Kawai layout (falls back to deterministic grid).
    """
    try:
        from app.services.physics.topology_router import place_qubits, placement_to_dict

        n = max(1, min(MAX_QUBITS, body.n))
        result = place_qubits(n, topology=body.topology, scale=body.scale)
        pd = placement_to_dict(result)
        # Rename x_mm/y_mm → x/y for frontend compatibility
        for q in pd["qubits"]:
            if "x_mm" in q:
                q["x"] = q.pop("x_mm")
                q["y"] = q.pop("y_mm")
        return pd
    except Exception as exc:
        return {"error": str(exc)}


# ── DRC check ─────────────────────────────────────────────────────────────────

@sub_router.post("/generate/drc")
async def drc_check(body: DRCRequest) -> dict[str, Any]:
    """
    Run 7-rule DRC: spacing, CPW dimensions, frequency collision,
    resonator uniqueness, dispersive detuning, feedline clearance,
    geometry overlap pre-check.
    """
    try:
        from app.services.physics.frequency_planner import plan_chip
        from app.services.physics.topology_router import place_qubits
        from app.services.physics.drc import run_drc

        n = max(1, min(MAX_QUBITS, body.n))
        freq_plan = plan_chip(n)
        placement = place_qubits(n, topology=body.topology, scale=body.scale)
        report = run_drc(placement, freq_plan, body.rules)
        return {"n": n, "topology": body.topology, **report.to_dict()}
    except Exception as exc:
        return {"error": str(exc)}


# ── Netlist ───────────────────────────────────────────────────────────────────

@sub_router.post("/generate/netlist")
async def netlist(body: NetlistRequest) -> dict[str, Any]:
    """
    Build the chip connectivity netlist (qubits, resonators, coupling edges).
    """
    try:
        from app.services.physics.frequency_planner import plan_chip
        from app.services.physics.topology_router import place_qubits, placement_to_dict

        n = max(1, min(MAX_QUBITS, body.n))
        freq_plan = plan_chip(n)
        placement = place_qubits(n, topology=body.topology)
        pd = placement_to_dict(placement)

        return {
            "n": n,
            "topology": body.topology,
            "qubits": [
                {
                    "name": q.name,
                    "freq_GHz": q.freq_GHz,
                    "group": q.group,
                    "EJ_GHz": q.EJ_GHz,
                    "EC_GHz": q.EC_GHz,
                }
                for q in freq_plan.qubits
            ],
            "resonators": [
                {
                    "name": r.name,
                    "qubit": r.qubit,
                    "freq_GHz": r.freq_GHz,
                    "length_mm": r.length_mm,
                    "detuning_GHz": r.detuning_GHz,
                }
                for r in freq_plan.resonators
            ],
            "edges": pd.get("edges", []),
            "summary": {
                "total_qubits": n,
                "total_resonators": len(freq_plan.resonators),
                "total_edges": len(pd.get("edges", [])),
                "topology": body.topology,
                "solver": pd.get("solver", "deterministic"),
            },
        }
    except Exception as exc:
        return {"error": str(exc)}


# ── EM simulation stub ────────────────────────────────────────────────────────

@sub_router.post("/generate/em-simulation")
async def em_simulation(body: EMSimRequest) -> dict[str, Any]:
    """
    Phase 9 stub: EM simulation parameters.
    Returns simulation targets for HFSS / Sonnet / OpenEMS.
    Full integration requires Ansys HFSS or Sonnet licence + renderer.
    """
    try:
        from app.services.physics.frequency_planner import plan_chip
        from app.services.physics.topology_router import place_qubits

        n = max(1, min(MAX_QUBITS, body.n))
        freq_plan = plan_chip(n)
        placement = place_qubits(n, topology=body.topology)

        return {
            "backend": body.backend,
            "n_qubits": n,
            "topology": body.topology,
            "sim_ready": False,
            "note": "Full EM simulation requires Ansys HFSS or Sonnet licence + renderer",
            "resonator_targets": {
                r.name: {
                    "freq_GHz": r.freq_GHz,
                    "length_mm": r.length_mm,
                    "validate": ["Q_ext", "Q_int", "kappa", "chi"],
                }
                for r in freq_plan.resonators
            },
            "qubit_targets": {
                q.name: {
                    "freq_GHz": q.freq_GHz,
                    "EJ_GHz": q.EJ_GHz,
                    "validate": ["f_01", "anharmonicity", "T1", "T2"],
                }
                for q in freq_plan.qubits
            },
            "placement_summary": {
                "solver": "kamada_kawai" if placement.graph else "deterministic",
                "pitch_mm": placement.pitch_mm,
                "cols": placement.cols,
                "rows": placement.rows,
            },
        }
    except Exception as exc:
        return {"error": str(exc)}
