"""
Materials library router.
Returns substrate and metal options with their physical properties.
Single source of truth: app.services.materials.MATERIALS
"""

from __future__ import annotations

from fastapi import APIRouter

from app.services.materials import MATERIALS

router = APIRouter(prefix="/api/materials", tags=["materials"])


@router.get("")
async def list_materials() -> dict:
    """Return all materials organised by type."""
    substrates: dict = {}
    metals: dict = {}

    for key, props in MATERIALS.items():
        if "epsilon_r" in props:
            substrates[key] = {
                "key": key,
                "label": props.get("label", key),
                "description": props.get("description", ""),
                "epsilon_r": props.get("epsilon_r"),
                "loss_tangent": props.get("loss_tangent"),
                "substrate_thickness_um": props.get("substrate_thickness_um"),
                "cpw_width_um": props.get("cpw_width_um"),
                "cpw_gap_um": props.get("cpw_gap_um"),
            }
        elif "metal_type" in props:
            metals[key] = {
                "key": key,
                "label": props.get("label", key),
                "description": props.get("description", ""),
                "metal_type": props.get("metal_type"),
                "Tc_K": props.get("Tc_K"),
                "london_penetration_depth_nm": props.get("london_penetration_depth_nm"),
                "sheet_resistance_mOhm": props.get("sheet_resistance_mOhm"),
            }

    return {"substrates": substrates, "metals": metals}


@router.get("/substrates")
async def list_substrates() -> list[dict]:
    return [
        {
            "key": key,
            "label": props.get("label", key),
            "description": props.get("description", ""),
            "epsilon_r": props.get("epsilon_r"),
            "loss_tangent": props.get("loss_tangent"),
            "substrate_thickness_um": props.get("substrate_thickness_um"),
            "cpw_width_um": props.get("cpw_width_um"),
            "cpw_gap_um": props.get("cpw_gap_um"),
        }
        for key, props in MATERIALS.items()
        if "epsilon_r" in props
    ]


@router.get("/metals")
async def list_metals() -> list[dict]:
    return [
        {
            "key": key,
            "label": props.get("label", key),
            "description": props.get("description", ""),
            "Tc_K": props.get("Tc_K"),
            "london_penetration_depth_nm": props.get("london_penetration_depth_nm"),
            "sheet_resistance_mOhm": props.get("sheet_resistance_mOhm"),
        }
        for key, props in MATERIALS.items()
        if "metal_type" in props
    ]
