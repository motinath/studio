"""
engine.py — ExportEngine: one-call export of all supported formats.
"""

from __future__ import annotations

from typing import Any

from app.exports.formats import (
    export_dxf,
    export_gds_ascii,
    export_json,
    export_pdf_report,
    export_qclang,
    export_svg,
)


class ExportEngine:
    """Exports a DesignGraph in all supported formats."""

    def __init__(
        self,
        graph,
        freq_plan:    dict[str, Any] | None = None,
        route_result: dict[str, Any] | None = None,
        drc_report:   dict[str, Any] | None = None,
        constraints:  dict[str, Any] | None = None,
    ) -> None:
        self.graph        = graph
        self.freq_plan    = freq_plan or {}
        self.route_result = route_result or {}
        self.drc_report   = drc_report or {}
        self.constraints  = constraints or {}

    def export_all(
        self,
        project_name: str = "QuantumChip",
        version: str = "v1.0",
    ) -> dict[str, Any]:
        """
        Generate all export formats.

        Returns a dict with keys:
          json, qclang, gds, svg, dxf, pdf_report
        """
        return {
            "json": export_json(
                self.graph,
                freq_plan    = self.freq_plan,
                route_result = self.route_result,
                drc_report   = self.drc_report,
                constraints  = self.constraints,
            ),
            "qclang": export_qclang(self.graph),
            "gds":    export_gds_ascii(self.graph, project_name, version),
            "svg":    export_svg(self.graph),
            "dxf":    export_dxf(self.graph),
            "pdf_report": export_pdf_report(
                self.graph,
                freq_plan    = self.freq_plan,
                drc_report   = self.drc_report,
                constraints  = self.constraints,
                project_name = project_name,
                version      = version,
            ),
        }

    def export(self, fmt: str, **kwargs) -> str:
        """Export a single format by name."""
        fmt = fmt.lower()
        if fmt == "json":
            return export_json(self.graph, self.freq_plan, self.route_result,
                               self.drc_report, self.constraints)
        if fmt == "qclang":
            return export_qclang(self.graph)
        if fmt == "gds":
            return export_gds_ascii(self.graph,
                                    kwargs.get("project_name", "QuantumChip"),
                                    kwargs.get("version", "v1.0"))
        if fmt == "svg":
            return export_svg(self.graph)
        if fmt == "dxf":
            return export_dxf(self.graph)
        if fmt in ("pdf", "pdf_report"):
            return export_pdf_report(self.graph, self.freq_plan, self.drc_report,
                                     self.constraints,
                                     kwargs.get("project_name", "QuantumChip"),
                                     kwargs.get("version", "v1.0"))
        raise ValueError(f"Unknown export format: {fmt!r}. "
                         f"Valid: json, qclang, gds, svg, dxf, pdf")
