"""
Tapeout Engine V2 — generates the final fabrication package.

Uses the V2 ExportEngine (GDS-II ASCII, SVG, DXF, QCLang, JSON, PDF).
Falls back to standalone generation if the export engine fails.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any


LAYER_MAP = {
    "base_metal":       1,
    "josephson_junction": 2,
    "dielectric":       3,
    "via":              4,
    "top_metal":        5,
    "ground_plane":     6,
    "probe_pads":       7,
    "dicing_line":      8,
}


def generate_tapeout_package(
    payload: dict[str, Any],
    project_name: str = "QuantumChip",
    version: str = "v1.0",
    fab_notes: str = "",
) -> dict[str, Any]:
    """
    Generate a complete tapeout package from a compiled design payload.

    Tries V2 ExportEngine first (richer output).
    Falls back to standalone GDS generation for legacy payloads.
    """
    placement = payload.get("placement", {})
    fp        = payload.get("frequency_plan", {})
    material  = payload.get("material", {})
    substrate = material.get("substrate", fp.get("substrate", "silicon"))
    metal     = material.get("metal",     fp.get("metal",     "aluminum"))
    num_qubits = payload.get("num_qubits", 0)
    topology   = payload.get("topology", "custom")

    # ── Try V2 export engine ──────────────────────────────────────────────────
    gds_content = None
    svg_content = None
    dxf_content = None
    qclang_src  = None

    try:
        from app.core.design_graph.graph import DesignGraph
        from app.core.design_graph.node import QubitNode, CouplerNode, ResonatorNode
        from app.exports.engine import ExportEngine

        g = DesignGraph(
            chip_name      = project_name,
            chip_width_mm  = float(payload.get("chip_size_mm", 10.0)),
            chip_height_mm = float(payload.get("chip_size_mm", 10.0)),
            substrate      = substrate,
            metal          = metal,
            topology       = topology,
        )
        for q in placement.get("qubits", []):
            name = q.get("name", "Q?")
            node = QubitNode(id=name, frequency_ghz=5.0)
            node.x_mm = float(q.get("x", q.get("x_mm", 0.0)))
            node.y_mm = float(q.get("y", q.get("y_mm", 0.0)))
            try:
                g.add_node(node)
            except ValueError:
                pass

        engine = ExportEngine(
            graph      = g,
            freq_plan  = fp,
            drc_report = payload.get("drc", {}),
        )
        exports     = engine.export_all(project_name=project_name, version=version)
        gds_content = exports.get("gds", "")
        svg_content = exports.get("svg", "")
        dxf_content = exports.get("dxf", "")
        qclang_src  = exports.get("qclang", "")

    except Exception:
        # Fallback GDS generation
        gds_content = _generate_gds_ascii(payload, project_name, version)

    fab_spec       = _generate_fab_spec(substrate, metal, num_qubits, topology)
    process_check  = _process_compatibility_check(substrate, metal)

    manifest = {
        "project":      project_name,
        "version":      version,
        "topology":     topology,
        "num_qubits":   num_qubits,
        "substrate":    substrate,
        "metal":        metal,
        "layer_map":    LAYER_MAP,
        "files": [
            f"{project_name}_{version}.gds",
            f"{project_name}_{version}.svg",
            f"{project_name}_{version}.dxf",
            f"{project_name}_{version}.qc",
            f"{project_name}_{version}_fab_spec.json",
            f"{project_name}_{version}_drc_report.txt",
            f"{project_name}_{version}_design_report.txt",
        ],
        "generated_at":   datetime.utcnow().isoformat(),
        "fab_notes":      fab_notes,
        "process_check":  process_check,
        "engine":         "quantum-studio-v2",
    }

    return {
        "manifest":    manifest,
        "gds_content": gds_content,
        "svg_content": svg_content,
        "dxf_content": dxf_content,
        "qclang_src":  qclang_src,
        "fab_spec":    fab_spec,
    }


def _generate_gds_ascii(
    payload: dict[str, Any],
    name: str,
    version: str,
) -> str:
    """Standalone GDS-II ASCII fallback."""
    placement = payload.get("placement", {})
    qubits    = placement.get("qubits", [])
    lines = [
        "HEADER 600", "BGNLIB",
        f"LIBNAME {name}_{version}.DB",
        "UNITS 0.001 1e-09", "",
        "BGNSTR", f"STRNAME {name}_TOP", "",
        "BOUNDARY", f"LAYER {LAYER_MAP['ground_plane']}",
        "DATATYPE 0", "XY 0 0 10000 0 10000 10000 0 10000 0 0", "ENDEL", "",
    ]
    for q in qubits:
        x    = int(q.get("x", q.get("x_mm", 0)) * 1000)
        y    = int(q.get("y", q.get("y_mm", 0)) * 1000)
        half = 330
        lines += [
            f"# {q.get('name','?')} @ ({q.get('x', q.get('x_mm', 0)):.3f}, "
            f"{q.get('y', q.get('y_mm', 0)):.3f}) mm",
            "BOUNDARY", f"LAYER {LAYER_MAP['base_metal']}",
            "DATATYPE 0",
            f"XY {x-half} {y-half} {x+half} {y-half} {x+half} {y+half} {x-half} {y+half} {x-half} {y-half}",
            "ENDEL", "",
            "BOUNDARY", f"LAYER {LAYER_MAP['josephson_junction']}",
            "DATATYPE 0",
            f"XY {x-20} {y-20} {x+20} {y-20} {x+20} {y+20} {x-20} {y+20} {x-20} {y-20}",
            "ENDEL", "",
        ]
    lines += ["ENDSTR", "", "ENDLIB"]
    return "\n".join(lines)


def _generate_fab_spec(
    substrate: str, metal: str, num_qubits: int, topology: str,
) -> dict[str, Any]:
    sub_specs = {
        "silicon":        {"spec": "HR float-zone Si, ρ > 10 kΩ·cm, <100>", "thickness_um": 500},
        "sapphire":       {"spec": "C-plane sapphire, 2-inch, EPI-polished",  "thickness_um": 430},
        "silicon_nitride":{"spec": "LPCVD stoichiometric Si₃N₄ on silicon",   "thickness_um": 200},
    }.get(substrate, {})

    met_specs = {
        "aluminum": {"deposition": "DC sputtering, 100 nm Al", "junction": "Manhattan double-angle"},
        "niobium":  {"deposition": "DC sputtering, 150 nm Nb", "junction": "Al Dolan bridge"},
        "tantalum": {"deposition": "DC sputtering, 200 nm α-Ta (anneal 450 °C)", "junction": "Al/Al₂O₃"},
        "nbtin":    {"deposition": "Reactive RF sputtering, 20 nm NbTiN",      "junction": "Al Manhattan"},
    }.get(metal, {})

    return {
        "design":     {"num_qubits": num_qubits, "topology": topology, "substrate": substrate, "metal": metal},
        "substrate":  sub_specs,
        "metal":      met_specs,
        "lithography": {
            "tool":       "E-beam (JEOL JBX-9300FS recommended)",
            "resist":     "PMMA A6 / MMA 8.5 EL11 bilayer",
            "developer":  "MIBK:IPA 1:3, 60 s @ −10 °C",
            "min_feature_um": 0.2,
        },
        "layers": [
            {"layer": 1, "name": "Base metal",       "material": metal,        "thickness_nm": 100},
            {"layer": 2, "name": "Josephson junction","material": "Al/Al₂O₃/Al","thickness_nm": 30},
            {"layer": 3, "name": "Dielectric (opt.)", "material": "SiO₂",       "thickness_nm": 200},
        ],
        "dicing": {"method": "Laser dicing (preferred)", "chip_size_mm": "7×7"},
    }


def _process_compatibility_check(substrate: str, metal: str) -> dict[str, Any]:
    compat: dict[str, Any] = {"compatible": True, "notes": [], "warnings": []}
    if substrate == "silicon" and metal == "tantalum":
        compat["warnings"].append("Ta on Si requires adhesion layer (5 nm Ti or TiN)")
    if substrate == "sapphire" and metal == "aluminum":
        compat["notes"].append("Al on sapphire: excellent T1 (> 200 µs reported)")
    if substrate == "sapphire" and metal == "niobium":
        compat["notes"].append("Nb on sapphire: consider annealing at 800 °C")
    if metal == "nbtin":
        compat["notes"].append("NbTiN: reactive RF sputtering at elevated temperature")
    return compat
