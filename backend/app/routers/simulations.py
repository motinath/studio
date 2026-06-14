"""Simulation management router."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Project, Simulation, SimulationStatus, User
from app.services.physics import full_physics_analysis
import uuid

router = APIRouter(prefix="/api/simulations", tags=["simulations"])


class SimulationCreate(BaseModel):
    project_id: str
    solver: str = "eigenmode"
    config: dict = {}


def _sim_out(s: Simulation) -> dict:
    return {
        "id": s.id,
        "project_id": s.project_id,
        "solver": s.solver,
        "status": s.status.value,
        "config": s.config,
        "results": s.results,
        "error_message": s.error_message,
        "runtime_seconds": s.runtime_seconds,
        "memory_gb": s.memory_gb,
        "created_at": s.created_at.isoformat(),
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "finished_at": s.finished_at.isoformat() if s.finished_at else None,
    }


@router.get("")
async def list_simulations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    # Get all sims for user's projects
    proj_result = await db.execute(select(Project.id).where(Project.owner_id == user.id))
    project_ids = [r[0] for r in proj_result.all()]

    if not project_ids:
        return []

    result = await db.execute(
        select(Simulation)
        .where(Simulation.project_id.in_(project_ids))
        .order_by(Simulation.created_at.desc())
        .limit(50)
    )
    return [_sim_out(s) for s in result.scalars().all()]


@router.post("", status_code=201)
async def create_simulation(
    body: SimulationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    # Verify project ownership
    proj_result = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.owner_id == user.id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sim = Simulation(
        id=str(uuid.uuid4()),
        project_id=body.project_id,
        solver=body.solver,
        config=body.config,
    )
    db.add(sim)
    await db.flush()
    await db.refresh(sim)
    return _sim_out(sim)


@router.post("/{sim_id}/run")
async def run_simulation(
    sim_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Run a simulation analytically (physics engine).
    In production this would dispatch to Palace/scqubits workers.
    """
    # Verify ownership BEFORE mutating any state
    result = await db.execute(
        select(Simulation)
        .join(Project, Simulation.project_id == Project.id)
        .where(Simulation.id == sim_id, Project.owner_id == user.id)
    )
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    # Fetch the project (already verified ownership above)
    proj_result = await db.execute(
        select(Project).where(Project.id == sim.project_id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Run physics analysis
    sim.status = SimulationStatus.running
    sim.started_at = datetime.utcnow()
    await db.flush()

    try:
        payload = project.design_payload or {}
        physics_results = full_physics_analysis(payload)

        sim.results = physics_results
        sim.status = SimulationStatus.completed
        sim.finished_at = datetime.utcnow()
        sim.runtime_seconds = round(
            (sim.finished_at - sim.started_at).total_seconds(), 3
        )
        sim.memory_gb = 0.1
    except Exception as e:
        sim.status = SimulationStatus.failed
        sim.error_message = str(e)
        sim.finished_at = datetime.utcnow()

    return _sim_out(sim)


@router.get("/{sim_id}")
async def get_simulation(
    sim_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(select(Simulation).where(Simulation.id == sim_id))
    sim = result.scalar_one_or_none()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return _sim_out(sim)
