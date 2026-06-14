"""Tapeout router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Project, TapeoutPackage, User
from app.services.tapeout import generate_tapeout_package
import uuid

router = APIRouter(prefix="/api/tapeout", tags=["tapeout"])


class TapeoutRequest(BaseModel):
    project_id: str
    version_tag: str = "v1.0"
    fab_notes: str = ""


@router.post("/generate")
async def generate_tapeout(
    body: TapeoutRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    proj_result = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.owner_id == user.id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.design_payload:
        raise HTTPException(status_code=400, detail="Project has no compiled design")

    package = generate_tapeout_package(
        payload=project.design_payload,
        project_name=project.name,
        version=body.version_tag,
        fab_notes=body.fab_notes,
    )

    db_pkg = TapeoutPackage(
        id=str(uuid.uuid4()),
        project_id=body.project_id,
        version_tag=body.version_tag,
        gds_content=package.get("gds_content"),
        manifest=package.get("manifest", {}),
        fab_notes=body.fab_notes,
    )
    db.add(db_pkg)
    await db.flush()

    return {
        "id": db_pkg.id,
        "manifest": package["manifest"],
        "fab_spec": package["fab_spec"],
        "gds_preview": package["gds_content"][:500] + "..." if package.get("gds_content") else None,
    }


@router.get("/{package_id}/gds")
async def download_gds(
    package_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    result = await db.execute(select(TapeoutPackage).where(TapeoutPackage.id == package_id))
    pkg = result.scalar_one_or_none()
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")

    content = pkg.gds_content or "# Empty GDS"
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{package_id}.gds"'},
    )


@router.get("/project/{project_id}")
async def list_tapeouts(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    proj_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(TapeoutPackage)
        .where(TapeoutPackage.project_id == project_id)
        .order_by(TapeoutPackage.created_at.desc())
    )
    return [
        {
            "id": p.id,
            "version_tag": p.version_tag,
            "manifest": p.manifest,
            "created_at": p.created_at.isoformat(),
        }
        for p in result.scalars().all()
    ]
