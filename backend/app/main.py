# Triggering reload...
"""
SILICOFELLER Quantum Studio — FastAPI Backend
=============================================

Startup order:
  1. Create DB tables (dev) or run Alembic migrations (prod)
  2. Mount all routers
  3. Add CORS middleware

Run:
  uvicorn app.main:app --reload --port 5000
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import auth, claude, generate, materials, projects, qclang, simulations, tapeout, verification, bridge
from app.routers import design  # V2 design pipeline

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    log.info("Starting Quantum Studio backend …")

    # Initialise database tables (dev; use Alembic in prod)
    try:
        await init_db()
        log.info("Database ready.")
    except Exception as e:
        log.warning(f"Database init skipped (will run without persistence): {e}")

    # Prewarm component registry, metadata, pins, and previews
    try:
        import threading
        def _prewarm_registry() -> None:
            try:
                from app.services.component_registry import component_registry_service
                from app.services.metadata_service import metadata_service
                from app.services.pin_service import pin_service
                from app.services.render_service import render_service, warmup_worker
                
                log.info("Pre-warming component registry ...")
                components = component_registry_service.list_components()
                log.info("Loaded %d component summaries from catalog cache.", len(components))
                
                # Warm up worker subprocess
                warmup_worker()
                
                # Pre-warm metadata and pins
                for c in components:
                    metadata_service.get_metadata(c.id)
                    pin_service.get_pins(c.id)
                log.info("Metadata and pin caches populated.")
                
                # Asynchronously pre-warm component previews to not block startup thread
                def _warm_previews():
                    log.info("Pre-warming component preview SVGs in background ...")
                    for c in components:
                        try:
                            # Triggers rendering through IPC worker and saves to registry_cache
                            # via the default-parameter preview caching mechanism
                            cache_key = f"preview:{c.id}"
                            from app.core.registry_cache import registry_cache
                            if registry_cache.get(cache_key) is None:
                                preview = render_service.render_component_preview(c.id)
                                registry_cache.set(cache_key, preview)
                        except Exception:
                            pass
                    log.info("Component previews cache warming complete.")
                
                threading.Thread(target=_warm_previews, daemon=True, name="previews-warmup").start()
                
            except Exception:
                log.exception("Registry pre-warm failed (non-fatal).")

        threading.Thread(target=_prewarm_registry, daemon=True, name="registry-prewarm").start()
    except Exception as exc:
        log.warning(f"Failed to start pre-warm thread (non-fatal): {exc}")

    yield
    log.info("Shutting down Quantum Studio backend.")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SILICOFELLER Quantum Studio API",
    description=(
        "AI-augmented quantum hardware EDA platform — V2. "
        "DesignGraph → Constraints → Placement → Routing → DRC → Qiskit Metal → Tapeout."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ── CORS ──────────────────────────────────────────────────────────────────────

# In development, allow ANY origin so preflight OPTIONS never returns 400.
# In production, lock down to the explicit allow-list from settings.
_cors_origins: list[str] = ["*"] if not settings.is_production else settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=settings.is_production,   # must be False when origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request timing middleware ─────────────────────────────────────────────────

@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - t0) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(elapsed)
    return response


# ── Global error handler ──────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.exception(f"Unhandled exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(generate.router)          # /health  /generate
app.include_router(generate.sub_router)      # /api/generate/frequency-plan|placement|drc|netlist|em-simulation
app.include_router(auth.router)              # /api/auth/...
app.include_router(projects.router)          # /api/projects/...
app.include_router(qclang.router)            # /api/qclang/...
app.include_router(simulations.router)       # /api/simulations/...
app.include_router(verification.router)      # /api/verification/...
app.include_router(tapeout.router)           # /api/tapeout/...
app.include_router(materials.router)         # /api/materials/...
app.include_router(claude.router)            # /api/claude/...
app.include_router(design.router)            # /api/design/... (V2 pipeline)
app.include_router(bridge.router)            # /components and /design (bridge router)


# ── Frequency plan (legacy frontend compat) ───────────────────────────────────

from fastapi import APIRouter
from pydantic import BaseModel

legacy = APIRouter(tags=["legacy"])


class FreqPlanRequest(BaseModel):
    num_qubits: int
    substrate: str = "silicon"
    metal: str = "aluminum"
    target_freq_ghz: float = 5.0


@legacy.post("/frequency-plan")
async def frequency_plan(body: FreqPlanRequest):
    from app.qclang.ast_nodes import QubitNode, ChipNode
    from app.qclang.compiler import compute_frequency_plan
    # Use 1-indexed names matching the rest of the pipeline
    qubits = [QubitNode(name=f"Q{i+1}", qubit_type="transmon") for i in range(body.num_qubits)]
    chip = ChipNode(name="Temp", qubits=qubits)
    return compute_frequency_plan(chip, body.target_freq_ghz, body.substrate, body.metal)


@legacy.post("/drc")
async def drc(body: dict):
    from app.services.verification import run_verification
    return run_verification(body)


@legacy.post("/netlist")
async def netlist(body: dict):
    from app.services.chip_generator import generate_chip
    prompt = f"{body.get('num_qubits', 5)} qubit {body.get('topology', 'grid')} chip"
    result = await generate_chip(prompt)
    return {"netlist": result.get("code", ""), "num_qubits": result.get("num_qubits")}


@legacy.post("/placement")
async def placement(body: dict):
    from app.qclang.ast_nodes import QubitNode, ChipNode
    from app.qclang.compiler import compute_placement
    n = body.get("num_qubits", 5)
    # Use 1-indexed names matching the rest of the pipeline
    qubits = [QubitNode(name=f"Q{i+1}", qubit_type="transmon") for i in range(n)]
    chip = ChipNode(name="Temp", qubits=qubits)
    return compute_placement(chip)


app.include_router(legacy)
