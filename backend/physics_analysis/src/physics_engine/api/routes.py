"""API routes for the Physics Analysis Engine."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from physics_engine.api.dependencies import get_pipeline
from physics_engine.models.design_spec import DesignSpec
from physics_engine.models.em_results import EMResults
from physics_engine.models.physics_report import PhysicsReport
from physics_engine.pipeline import PhysicsAnalysisPipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["physics"])



# Request / Response models



class AnalyzeRequest(BaseModel):
    """Request body for the full analysis endpoint."""
    em_results: EMResults
    design_spec: DesignSpec


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str = "0.1.0"


class SuggestParamsRequest(BaseModel):
    """Request to reverse-engineer EJ/EC from targets."""
    target_frequency_ghz: float
    target_anharmonicity_mhz: float


class SuggestParamsResponse(BaseModel):
    """Suggested EJ and EC values."""
    EJ_ghz: float
    EC_ghz: float
    EJ_EC_ratio: float



# Endpoints



@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse()


@router.post("/analyze", response_model=PhysicsReport)
async def run_analysis(
    request: AnalyzeRequest,
    pipeline: PhysicsAnalysisPipeline = Depends(get_pipeline),
) -> PhysicsReport:
    """Run the complete physics analysis pipeline.

    Accepts Palace EM simulation results and a design specification,
    returns a complete physics report with validation.
    """
    try:
        report = pipeline.run(
            em_results=request.em_results,
            design_spec=request.design_spec,
        )
        return report
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@router.post("/suggest-params", response_model=SuggestParamsResponse)
async def suggest_params(request: SuggestParamsRequest) -> SuggestParamsResponse:
    """Reverse-engineer EJ and EC from target frequency and anharmonicity.

    Uses scqubits.Transmon.find_EJ_EC() to find parameters matching targets.
    """
    try:
        import scqubits as scq
        EJ, EC = scq.Transmon.find_EJ_EC(
            E01=request.target_frequency_ghz,
            anharmonicity=request.target_anharmonicity_mhz / 1000.0,
        )
        return SuggestParamsResponse(
            EJ_ghz=EJ,
            EC_ghz=EC,
            EJ_EC_ratio=EJ / EC if EC > 0 else 0,
        )
    except ImportError:
        raise HTTPException(status_code=503, detail="scqubits not installed")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Parameter suggestion failed: {exc}")


@router.get("/schemas/{name}")
async def get_schema(name: str) -> dict:
    """Return JSON schema for integration contracts.

    Available schemas: em_results, design_spec, physics_report
    """
    schemas = {
        "em_results": EMResults.model_json_schema(),
        "design_spec": DesignSpec.model_json_schema(),
        "physics_report": PhysicsReport.model_json_schema(),
    }
    if name not in schemas:
        raise HTTPException(
            status_code=404,
            detail=f"Schema '{name}' not found. Available: {list(schemas.keys())}",
        )
    return schemas[name]
