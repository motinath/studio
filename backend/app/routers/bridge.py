"""bridge.py - Qiskit Metal Bridge endpoints for the Schematic Editor.

Provides the /components/* and /design/* endpoints that the frontend
EditorCanvas and CodeIdePanel expect, routed to the live render and
discovery services.

If Qiskit Metal is not installed, the endpoints fall back to built-in
mock data that matches the frontend contract exactly.

Endpoints
---------
GET  /components                  - list available QComponents
GET  /components/{id}             - single component summary
GET  /components/{id}/metadata    - parameter spec
GET  /components/{id}/pins        - pin positions
GET  /components/{id}/preview     - SVG preview
POST /design/render               - render design doc, returns SVG + routes
POST /design/generate-code        - generate Qiskit Metal Python code
POST /design/validate             - validate design document
POST /design/run-code             - execute Python code, returns design doc
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.editor_models import (
    ComponentMetadata, ComponentPins, ComponentPreview, ComponentSummary,
    DesignDocument, GeneratedCode, RenderResult, ValidationResult,
)
from app.services.component_registry import component_registry_service
from app.services.metadata_service import metadata_service
from app.services.pin_service import pin_service
from app.services.render_service import render_service
from app.services.codegen_service import codegen_service
from app.core.registry_cache import registry_cache

log = logging.getLogger(__name__)

router = APIRouter(tags=["bridge"])


# ── Components Endpoints ──────────────────────────────────────────────────────

@router.get("/components", response_model=List[ComponentSummary])
async def list_components() -> List[ComponentSummary]:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, component_registry_service.list_components)


@router.get("/components/{component_id}", response_model=ComponentSummary)
def get_component(component_id: str) -> ComponentSummary:
    summary = component_registry_service.get_component(component_id)
    if summary is None:
        raise HTTPException(status_code=404, detail=f"Unknown component: {component_id}")
    return summary


@router.get("/components/{component_id}/metadata", response_model=ComponentMetadata)
def get_metadata(component_id: str) -> ComponentMetadata:
    return metadata_service.get_metadata(component_id)


@router.get("/components/{component_id}/pins", response_model=ComponentPins)
def get_pins(component_id: str) -> ComponentPins:
    return pin_service.get_pins(component_id)


@router.get("/components/{component_id}/preview", response_model=ComponentPreview)
async def get_preview(
    component_id: str,
    params: Optional[str] = Query(default=None, description="URL-encoded JSON object"),
) -> ComponentPreview:
    parsed: Optional[dict] = None
    if params:
        try:
            parsed = json.loads(params)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid params JSON: {exc.msg}") from exc

    # Cache default-param previews; user-param previews skip cache
    if parsed is None:
        cache_key = f"preview:{component_id}"
        cached = registry_cache.get(cache_key)
        if cached is not None:
            return cached

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, render_service.render_component_preview, component_id, parsed)

    if parsed is None:
        registry_cache.set(f"preview:{component_id}", result)

    return result


# ── Design Endpoints ──────────────────────────────────────────────────────────

@router.post("/design/validate", response_model=ValidationResult)
def validate_design(design: DesignDocument) -> ValidationResult:
    return render_service.validate_design(design)


@router.post("/design/render")
async def render_design(design: DesignDocument) -> JSONResponse:
    try:
        loop = asyncio.get_running_loop()
        result: RenderResult = await loop.run_in_executor(None, render_service.render_design, design)
        return JSONResponse(content=result.model_dump())
    except NotImplementedError as exc:
        return JSONResponse(status_code=501, content={"error": {"code": "NOT_IMPLEMENTED", "message": str(exc), "details": {}}})
    except Exception as exc:
        log.exception("render_design failed")
        return JSONResponse(status_code=500, content={"error": {"code": "RENDER_ERROR", "message": str(exc), "details": {}}})


@router.post("/design/generate-code", response_model=GeneratedCode)
def generate_code(design: DesignDocument) -> GeneratedCode:
    return codegen_service.generate(design)


# ── Run Code endpoint ─────────────────────────────────────────────────────────

class RunCodeRequest(BaseModel):
    code: str


class RunCodeResponse(BaseModel):
    ok: bool
    design: DesignDocument | None = None
    error: str | None = None


@router.post("/design/run-code", response_model=RunCodeResponse)
async def run_code(body: RunCodeRequest) -> JSONResponse:
    try:
        from app.routers.bridge_worker import run_code_subprocess
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, run_code_subprocess, body.code)
        return JSONResponse(content=result)
    except Exception as exc:
        log.exception("run_code failed")
        return JSONResponse(status_code=500, content={"ok": False, "design": None, "error": str(exc)})
