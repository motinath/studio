"""Projects CRUD router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Project, ProjectStatus, User, Version
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/projects", tags=["projects"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    topology: str = "custom"
    num_qubits: int = 0
    target_frequency_ghz: float = 5.0
    substrate_material: str = "silicon"
    metal_layer: str = "aluminum"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    topology: str | None = None
    num_qubits: int | None = None
    target_frequency_ghz: float | None = None
    substrate_material: str | None = None
    metal_layer: str | None = None
    status: ProjectStatus | None = None
    design_payload: dict | None = None


def _project_out(p: Project) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "description": p.description,
        "topology": p.topology,
        "num_qubits": p.num_qubits,
        "target_frequency_ghz": p.target_frequency_ghz,
        "status": p.status.value,
        "substrate_material": p.substrate_material,
        "metal_layer": p.metal_layer,
        "has_design": p.design_payload is not None,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
        "owner_id": p.owner_id,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
async def list_projects(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    result = await db.execute(
        select(Project).where(Project.owner_id == user.id).order_by(Project.updated_at.desc())
    )
    return [_project_out(p) for p in result.scalars().all()]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    project = Project(
        id=str(uuid.uuid4()),
        owner_id=user.id,
        name=body.name,
        description=body.description,
        topology=body.topology,
        num_qubits=body.num_qubits,
        target_frequency_ghz=body.target_frequency_ghz,
        substrate_material=body.substrate_material,
        metal_layer=body.metal_layer,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return _project_out(project)


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    out = _project_out(project)
    out["design_payload"] = project.design_payload
    return out


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    project.updated_at = datetime.utcnow()

    return _project_out(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)


@router.post("/{project_id}/save-design")
async def save_design(
    project_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Save a GenerateResponse payload to a project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.design_payload = body
    project.num_qubits = body.get("num_qubits", project.num_qubits)
    project.topology = body.get("topology", project.topology)
    project.updated_at = datetime.utcnow()

    return {"saved": True}


@router.post("/{project_id}/versions")
async def create_version(
    project_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    version = Version(
        id=str(uuid.uuid4()),
        project_id=project_id,
        tag=body.get("tag", "v0.1"),
        message=body.get("message", ""),
        snapshot=project.design_payload or {},
    )
    db.add(version)
    await db.flush()

    return {
        "id": version.id,
        "tag": version.tag,
        "message": version.message,
        "created_at": version.created_at.isoformat(),
    }


@router.get("/{project_id}/versions")
async def list_versions(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    # Verify ownership
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Version).where(Version.project_id == project_id).order_by(Version.created_at.desc())
    )
    return [
        {"id": v.id, "tag": v.tag, "message": v.message, "created_at": v.created_at.isoformat()}
        for v in result.scalars().all()
    ]
