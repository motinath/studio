"""
exports/ — Multi-format export system for Quantum Studio V2.

Supported formats:
  JSON        — Full design graph + physics + routing as structured JSON
  QCLang (.qc) — QCLang source from design graph
  GDS-II ASCII — ASCII representation of GDS-II layout
  SVG         — Scalable vector graphics of chip layout
  DXF         — AutoCAD DXF (2D chip layout)
  PDF report  — Human-readable design summary (text-based)

Usage
-----
    from app.exports import ExportEngine
    engine = ExportEngine(graph, freq_plan_dict, route_result, constraints)
    pkg = engine.export_all(project_name="MyChip", version="v1.0")
"""

from app.exports.engine import ExportEngine
from app.exports.formats import (
    export_json,
    export_qclang,
    export_gds_ascii,
    export_svg,
    export_dxf,
    export_pdf_report,
)

__all__ = [
    "ExportEngine",
    "export_json",
    "export_qclang",
    "export_gds_ascii",
    "export_svg",
    "export_dxf",
    "export_pdf_report",
]
