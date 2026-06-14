"""FastAPI application for the Silicofeller Physics Analysis Engine."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from physics_engine.api.routes import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    logger.info(" Silicofeller Physics Engine starting up...")
    yield
    logger.info(" Silicofeller Physics Engine shutting down.")


app = FastAPI(
    title="Silicofeller Physics Analysis Engine",
    description=(
        "Scqubits-based physics analysis for quantum chip design. "
        "Computes qubit frequencies, anharmonicity, T1/T2 coherence, "
        "multi-qubit coupling, and validates against design targets."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(router)
