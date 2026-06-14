"""
Qiskit Metal Python code generator.

Produces a complete, runnable ``.py`` script that builds a superconducting
quantum chip (≤5 qubits) using the standard Qiskit Metal component library:

- ``DesignPlanar`` chip substrate
- ``TransmonPocket`` qubits with readout and bus connection pads
- ``CoupledLineTee`` readout hangers
- ``RouteMeander`` readout resonators and qubit-qubit bus couplers
- ``LaunchpadWirebond`` feedline terminations
- Optional GDS export via ``QGDSRenderer``
"""

from __future__ import annotations

import textwrap
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.services.metal_codegen.config import get_settings
from app.services.metal_codegen.models.design import QuantumDesign
from app.services.metal_codegen.utils.logging import get_logger
from app.services.metal_codegen.utils.units import to_metal_um_str

logger = get_logger("export.metal_codegen")


@dataclass
class MetalCodegenResult:
    """Result of Metal code generation."""

    source_code: str
    output_path: Path | None = None
    component_count: int = 0
    warnings: list[str] | None = None

    def write(self, path: Path) -> Path:
        """Write generated source to disk."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self.source_code, encoding="utf-8")
        self.output_path = path
        logger.info("Metal script written to %s", path)
        return path


class MetalCodeGenerator:
    """Generate runnable Qiskit Metal Python from a placed ``QuantumDesign``.

    Example::

        gen = MetalCodeGenerator(design)
        result = gen.generate()
        result.write(Path("output/chip_design.py"))
    """

    def __init__(self, design: QuantumDesign, *, include_gui: bool = False) -> None:
        self.design = design
        self.include_gui = include_gui
        self.settings = get_settings()
        self._warnings: list[str] = []

    def generate(self) -> MetalCodegenResult:
        """Build the complete Metal Python script."""
        if len(self.design.qubits) > 256:
            self._warnings.append(
                f"Design has {len(self.design.qubits)} qubits; Qiskit Metal "
                "may be slow for very large designs (>50 qubits)."
            )
        if self.design.status not in ("placed", "routed", "validated", "exported"):
            self._warnings.append(
                f"Design status is '{self.design.status}'; run placement first "
                "for accurate positions."
            )

        lines: list[str] = []
        chip = self.design.chip
        meta = self.design.metadata

        lines.append(self._header(chip.name, meta))
        lines.append(self._imports())
        lines.append("")
        lines.append(self._setup_design(chip.width_mm, chip.height_mm))
        lines.append("")

        # ── Qubits ──────────────────────────────────────────────────────
        lines.append("# " + "─" * 60)
        lines.append("# Transmon Qubits (TransmonPocket)")
        lines.append("# " + "─" * 60)
        for qubit in self.design.qubits:
            lines.append(self._emit_qubit(qubit))
            lines.append("")

        # ── Readout: CoupledLineTee + RouteMeander ──────────────────────
        if self.design.resonators:
            lines.append("# " + "─" * 60)
            lines.append("# Readout Resonators (CoupledLineTee + RouteMeander)")
            lines.append("# " + "─" * 60)
            for res in self.design.resonators:
                lines.extend(self._emit_readout_chain(res))
                lines.append("")

        # ── Qubit-qubit bus couplers ────────────────────────────────────
        coupler_pads = self._compute_coupler_pad_map()
        if self.design.couplers:
            lines.append("# " + "─" * 60)
            lines.append("# Qubit-Qubit Bus Couplers (RouteMeander)")
            lines.append("# " + "─" * 60)
            for coupler in self.design.couplers:
                pads = coupler_pads.get(coupler.id)
                if pads:
                    lines.append(self._emit_bus_coupler(coupler, pads))
                    lines.append("")

        # ── Launchpads ──────────────────────────────────────────────────
        if self.design.resonators:
            lines.append("# " + "─" * 60)
            lines.append("# Feedline Launchpads (LaunchpadWirebond)")
            lines.append("# " + "─" * 60)
            for res in self.design.resonators:
                lines.extend(self._emit_launchpad(res))
                lines.append("")

        lines.append(self._rebuild_block())
        lines.append("")
        lines.append(self._gds_export_block(chip.name))
        lines.append("")
        lines.append(self._main_block())

        component_count = (
            len(self.design.qubits)
            + len(self.design.resonators) * 3  # tee + meander + launchpad
            + len(self.design.couplers)
        )

        return MetalCodegenResult(
            source_code="\n".join(lines),
            component_count=component_count,
            warnings=self._warnings,
        )

    # ── Emission helpers ──────────────────────────────────────────────────

    @staticmethod
    def _header(chip_name: str, meta: dict[str, Any]) -> str:
        return textwrap.dedent(f'''\
            #!/usr/bin/env python3
            """
            {chip_name} — Qiskit Metal chip design
            Auto-generated by Quantum Studio

            Qubits:   see design dict below
            Package:  quantum-metal (import: qiskit_metal)
            Run:      python {chip_name.replace(" ", "_").lower()}_metal.py
            """
            ''')

    @staticmethod
    def _imports() -> str:
        return textwrap.dedent('''\
            from __future__ import annotations

            # Qiskit Metal (package name: quantum-metal)
            from qiskit_metal import designs, Dict
            from qiskit_metal.qlibrary.qubits.transmon_pocket import TransmonPocket
            from qiskit_metal.qlibrary.couplers.coupled_line_tee import CoupledLineTee
            from qiskit_metal.qlibrary.tlines.meandered import RouteMeander
            from qiskit_metal.qlibrary.terminations.launchpad_wb import LaunchpadWirebond
            ''')

    @staticmethod
    def _setup_design(width_mm: float, height_mm: float) -> str:
        return textwrap.dedent(f'''\
            # ── Design setup ────────────────────────────────────────────────
            design = designs.DesignPlanar()
            design.overwrite_enabled = True
            design.chips.main.size.size_x = '{width_mm}mm'
            design.chips.main.size.size_y = '{height_mm}mm'
            ''')

    def _emit_qubit(self, qubit: Any) -> str:
        opts = qubit.metal_options()
        pads = opts.get("connection_pads", {})
        if not pads:
            pads = self._default_connection_pads(qubit.id)

        pad_lines = []
        for pad_name, pad_opts in pads.items():
            if "loc_W" not in pad_opts:
                pad_opts = dict(pad_opts)
                if pad_name.startswith("readout"):
                    pad_opts.update(loc_W=+1, loc_H=+1)
                elif pad_name.startswith("bus"):
                    idx = int(pad_name.split("_")[-1]) if "_" in pad_name else 0
                    pad_opts.update(loc_W=-1 if idx % 2 == 0 else +1, loc_H=-1)
            pad_lines.append(
                f"            {pad_name}=Dict({self._dict_literal(pad_opts)}),"
            )

        pads_block = "\n".join(pad_lines)
        return (
            f"{qubit.id} = TransmonPocket(\n"
            f"    design, '{qubit.id}',\n"
            f"    options=Dict(\n"
            f"        pos_x='{opts['pos_x']}',\n"
            f"        pos_y='{opts['pos_y']}',\n"
            f"        orientation='{opts.get('orientation', '0')}',\n"
            f"        pocket_width='{opts['pocket_width']}',\n"
            f"        pocket_height='{opts['pocket_height']}',\n"
            f"        pad_width='{opts['pad_width']}',\n"
            f"        pad_height='{opts['pad_height']}',\n"
            f"        pad_gap='{opts['pad_gap']}',\n"
            f"        connection_pads=Dict(\n"
            f"{pads_block}\n"
            f"        ),\n"
            f"    ),\n"
            f")"
        )

    def _emit_readout_chain(self, resonator: Any) -> list[str]:
        tee_name = f"{resonator.id}_tee"
        meander_name = f"{resonator.id}_meander"
        qubit_id = resonator.target_qubit_id
        length_mm = resonator.physical_length_mm
        trace = to_metal_um_str(resonator.cpw_trace_width_um)
        gap = to_metal_um_str(resonator.cpw_gap_um)
        fillet = to_metal_um_str(self.settings.fabrication.fillet_radius_um)

        tee = textwrap.dedent(f'''\
            {tee_name} = CoupledLineTee(
                design, '{tee_name}',
                options=Dict(
                    pos_x='{resonator.pos_x_mm}mm',
                    pos_y='{resonator.pos_y_mm}mm',
                    orientation='{resonator.orientation_deg}',
                    coupling_length='200um',
                    coupling_space='{gap}',
                    open_termination=False,
                ),
            )''')

        meander = textwrap.dedent(f'''\
            {meander_name} = RouteMeander(
                design, '{meander_name}',
                options=Dict(
                    total_length='{length_mm:.4f}mm',
                    trace_width='{trace}',
                    trace_gap='{gap}',
                    fillet='{fillet}',
                    pin_inputs=Dict(
                        start_pin=Dict(component='{tee_name}', pin='second_end'),
                        end_pin=Dict(component='{qubit_id}', pin='readout'),
                    ),
                    lead=Dict(start_straight='100um'),
                ),
            )''')
        return [tee, meander]

    def _emit_bus_coupler(self, coupler: Any, pads: dict[str, tuple[str, str]]) -> str:
        src_qubit, src_pad = pads["source"]
        tgt_qubit, tgt_pad = pads["target"]
        trace = to_metal_um_str(coupler.cpw_trace_width_um)
        gap = to_metal_um_str(coupler.cpw_gap_um)
        fillet = to_metal_um_str(self.settings.fabrication.fillet_radius_um)

        # Bus length ≈ distance between qubits (minimum 1 mm)
        try:
            src = self.design.get_qubit(src_qubit)
            tgt = self.design.get_qubit(tgt_qubit)
            dx = tgt.pos_x_mm - src.pos_x_mm
            dy = tgt.pos_y_mm - src.pos_y_mm
            dist = max(1.0, (dx * dx + dy * dy) ** 0.5)
        except KeyError:
            dist = 2.0  # safe default when qubit lookup fails

        bus_name = f"{coupler.id}_bus"
        return textwrap.dedent(f'''\
            {bus_name} = RouteMeander(
                design, '{bus_name}',
                options=Dict(
                    total_length='{dist:.3f}mm',
                    trace_width='{trace}',
                    trace_gap='{gap}',
                    fillet='{fillet}',
                    pin_inputs=Dict(
                        start_pin=Dict(component='{src_qubit}', pin='{src_pad}'),
                        end_pin=Dict(component='{tgt_qubit}', pin='{tgt_pad}'),
                    ),
                    lead=Dict(start_straight='100um'),
                ),
            )''')

    def _emit_launchpad(self, resonator: Any) -> list[str]:
        lp_name = f"{resonator.id}_LP"
        tee_name = f"{resonator.id}_tee"
        chip_half = self.design.chip.width_mm / 2.0
        # Place launchpad at chip edge, same y as tee
        edge_x = chip_half - 0.5
        route_name = f"{resonator.id}_feedline"

        lp = textwrap.dedent(f'''\
            {lp_name} = LaunchpadWirebond(
                design, '{lp_name}',
                options=Dict(
                    pos_x='{edge_x}mm',
                    pos_y='{resonator.pos_y_mm}mm',
                    orientation='0',
                ),
            )''')

        feedline = textwrap.dedent(f'''\
            {route_name} = RouteMeander(
                design, '{route_name}',
                options=Dict(
                    total_length='1.5mm',
                    trace_width='10um',
                    trace_gap='6um',
                    fillet='50um',
                    pin_inputs=Dict(
                        start_pin=Dict(component='{lp_name}', pin='tie'),
                        end_pin=Dict(component='{tee_name}', pin='prime_end'),
                    ),
                    lead=Dict(start_straight='100um'),
                ),
            )''')
        return [lp, feedline]

    @staticmethod
    def _rebuild_block() -> str:
        return textwrap.dedent('''\
            # ── Rebuild geometry ────────────────────────────────────────────
            design.rebuild()
            ''')

    @staticmethod
    def _gds_export_block(chip_name: str) -> str:
        safe = chip_name.replace(" ", "_").replace('"', "")
        return textwrap.dedent(f'''\
            def export_gds(output_path: str = "{safe}.gds") -> str:
                """Export GDS via Qiskit Metal QGDSRenderer (requires gdstk)."""
                try:
                    from qiskit_metal.renderers.renderer_gds.gds_renderer import QGDSRenderer
                    gds = QGDSRenderer(design)
                    gds.options["filename"] = output_path
                    gds.options["fabricate"] = False
                    gds.export_to_gds(output_path)
                    print(f"GDS exported: {{output_path}}")
                    return output_path
                except ImportError:
                    print("QGDSRenderer unavailable — install quantum-metal[gds] or gdstk")
                    return ""
            ''')

    @staticmethod
    def _main_block() -> str:
        return textwrap.dedent('''\
            if __name__ == "__main__":
                print(f"Chip design: {len(design.components)} components")
                for name in sorted(design.components.keys()):
                    print(f"  - {name}")
                export_gds()
            ''')

    # ── Pad mapping ───────────────────────────────────────────────────────

    def _compute_coupler_pad_map(self) -> dict[str, dict[str, tuple[str, str]]]:
        """Map coupler ID → {source: (qubit, pad), target: (qubit, pad)}."""
        bus_counters: dict[str, int] = defaultdict(int)
        result: dict[str, dict[str, tuple[str, str]]] = {}
        for coupler in self.design.couplers:
            pads: dict[str, tuple[str, str]] = {}
            for role, qid in [
                ("source", coupler.source_qubit_id),
                ("target", coupler.target_qubit_id),
            ]:
                idx = bus_counters[qid]
                pads[role] = (qid, f"bus_{idx}")
                bus_counters[qid] = idx + 1
            result[coupler.id] = pads
        return result

    @staticmethod
    def _default_connection_pads(qubit_id: str) -> dict[str, dict[str, Any]]:
        return {
            "readout": {
                "connector_type": "0",
                "loc_W": +1,
                "loc_H": +1,
                "pad_width": "80um",
                "pad_gap": "30um",
            },
            "bus_0": {
                "connector_type": "0",
                "loc_W": -1,
                "loc_H": -1,
                "pad_width": "80um",
                "pad_gap": "15um",
            },
        }

    @staticmethod
    def _dict_literal(d: dict[str, Any]) -> str:
        """Format a dict as Metal Dict() keyword arguments."""
        parts = []
        for k, v in d.items():
            if isinstance(v, str):
                parts.append(f"{k}='{v}'")
            else:
                parts.append(f"{k}={v}")
        return ", ".join(parts)

