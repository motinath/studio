"""Verification router."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Project, User, VerificationReport, VerificationStatus
from app.services.verification import run_verification
import uuid

router = APIRouter(prefix="/api/verification", tags=["verification"])


class VerifyRequest(BaseModel):
    project_id: str
    payload: dict | None = None  # if None, use project's design_payload


def _report_out(r: VerificationReport) -> dict:
    return {
        "id": r.id,
        "project_id": r.project_id,
        "status": r.status.value,
        "drc_passed": r.drc_passed,
        "violations": r.violations,
        "frequency_collisions": r.frequency_collisions,
        "crosstalk_warnings": r.crosstalk_warnings,
        "summary": r.summary,
        "created_at": r.created_at.isoformat(),
    }


@router.post("/run")
async def run_verification_endpoint(
    body: VerifyRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    proj_result = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.owner_id == user.id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    payload = body.payload or project.design_payload or {}
    if not payload:
        raise HTTPException(status_code=400, detail="No design payload to verify")

    report_data = run_verification(payload)

    status_map = {
        "passed": VerificationStatus.passed,
        "failed": VerificationStatus.failed,
        "warning": VerificationStatus.warning,
    }

    report = VerificationReport(
        id=str(uuid.uuid4()),
        project_id=body.project_id,
        status=status_map.get(report_data["status"], VerificationStatus.pending),
        drc_passed=report_data.get("drc_passed", False),
        violations=report_data.get("violations", []),
        frequency_collisions=report_data.get("frequency_collisions", []),
        crosstalk_warnings=report_data.get("crosstalk_warnings", []),
        summary=report_data.get("summary", {}),
    )
    db.add(report)
    await db.flush()

    return _report_out(report)


@router.get("/project/{project_id}")
async def get_project_reports(
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
        select(VerificationReport)
        .where(VerificationReport.project_id == project_id)
        .order_by(VerificationReport.created_at.desc())
    )
    return [_report_out(r) for r in result.scalars().all()]


@router.post("/check")
async def quick_check(payload: dict) -> dict[str, Any]:
    """Run verification on a raw payload without saving."""
    return run_verification(payload)
