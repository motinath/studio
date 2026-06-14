"""Dependency injection for the API layer."""

from __future__ import annotations

from functools import lru_cache

from physics_engine.pipeline import PhysicsAnalysisPipeline


@lru_cache(maxsize=1)
def get_pipeline() -> PhysicsAnalysisPipeline:
    """Get or create the singleton PhysicsAnalysisPipeline instance."""
    return PhysicsAnalysisPipeline()
