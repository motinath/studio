"""
Top-level quantum design intermediate representation (IR).

``QuantumDesign`` aggregates all physical models — chip, qubits, resonators,
and couplers — into a single cohesive object that flows through the
placement, routing, validation, and export stages of the pipeline.

The ``from_circuit_spec`` class method converts the compiler's AST
(``CircuitSpec``) into a fully populated ``QuantumDesign``.
"""

from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING, Any, Literal

from pydantic import BaseModel, Field, model_validator
from typing_extensions import Self

from app.services.metal_codegen.models.chip import QuantumChip
from app.services.metal_codegen.models.constraints import FabricationConstraints
from app.services.metal_codegen.models.coupler import Coupler
from app.services.metal_codegen.models.qubit import TransmonQubit
from app.services.metal_codegen.models.resonator import Resonator
from app.services.metal_codegen.utils.logging import get_logger

if TYPE_CHECKING:
    from app.services.metal_codegen.compiler.ast_nodes import CircuitSpec

logger = get_logger("models.design")

# Default anharmonicity applied when the AST doesn't specify one (MHz)
_DEFAULT_ANHARMONICITY_MHZ: float = -250.0

# Default readout resonator coupling strength (MHz)
_DEFAULT_COUPLING_STRENGTH_MHZ: float = 50.0

# Default qubit–qubit coupling strength (MHz)
_DEFAULT_QUBIT_COUPLING_MHZ: float = 10.0

# Default resonator detuning from qubit frequency (GHz)
_DEFAULT_RESONATOR_DETUNING_GHZ: float = 1.5


class QuantumDesign(BaseModel):
    """Top-level intermediate representation for a quantum chip design.

    Attributes:
        chip: Physical chip substrate and constraints.
        qubits: List of transmon qubit models.
        resonators: List of readout resonator models.
        couplers: List of qubit–qubit coupler models.
        status: Current pipeline stage.
        metadata: Arbitrary metadata dict (timestamps, provenance, etc.).
    """

    chip: QuantumChip = Field(
        ...,
        description="Physical chip substrate",
    )
    qubits: list[TransmonQubit] = Field(
        default_factory=list,
        description="Transmon qubits on this chip",
    )
    resonators: list[Resonator] = Field(
        default_factory=list,
        description="Readout resonators on this chip",
    )
    couplers: list[Coupler] = Field(
        default_factory=list,
        description="Qubit–qubit couplers on this chip",
    )
    status: Literal["parsed", "placed", "routed", "validated", "exported"] = Field(
        default="parsed",
        description="Current pipeline stage of this design",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary metadata (provenance, timestamps, etc.)",
    )

    # ── Validators ──────────────────────────────────────────────────────────

    @model_validator(mode="after")
    def _validate_unique_ids(self) -> Self:
        """Ensure all component IDs are unique across the design."""
        all_ids: list[str] = []
        for q in self.qubits:
            all_ids.append(q.id)
        for r in self.resonators:
            all_ids.append(r.id)
        for c in self.couplers:
            all_ids.append(c.id)

        seen: set[str] = set()
        duplicates: list[str] = []
        for cid in all_ids:
            if cid in seen:
                duplicates.append(cid)
            seen.add(cid)

        if duplicates:
            raise ValueError(
                f"Duplicate component IDs found: {duplicates}"
            )
        return self

    # ── Factory ─────────────────────────────────────────────────────────────

    @classmethod
    def from_circuit_spec(cls, spec: CircuitSpec) -> QuantumDesign:
        """Convert a parsed ``CircuitSpec`` AST into a ``QuantumDesign``.

        This method:
        1. Creates a ``QuantumChip`` with ``FabricationConstraints``.
        2. Creates ``TransmonQubit`` instances for each qubit in the AST,
           deriving Ej/Ec from frequency and anharmonicity.
        3. Creates ``Resonator`` instances for each readout resonator.
        4. Creates ``Coupler`` instances for each qubit–qubit coupling.
        5. Wires up ``connection_pads`` on each qubit based on its connected
           resonators and couplers.

        Args:
            spec: The parsed circuit specification from the compiler.

        Returns:
            A fully populated ``QuantumDesign`` in ``"parsed"`` status.
        """
        from app.services.metal_codegen.config import get_settings

        settings = get_settings()
        constraints = FabricationConstraints.from_settings()

        # ── Chip ────────────────────────────────────────────────────────
        chip_node = spec.chip
        chip_name = chip_node.name
        chip_width = chip_node.width_mm
        chip_height = chip_node.height_mm
        substrate = chip_node.substrate
        metal = (
            chip_node.layers[0].material
            if chip_node.layers
            else settings.chip.metal_layer
        )

        chip = QuantumChip(
            name=chip_name,
            width_mm=chip_width,
            height_mm=chip_height,
            substrate=substrate,  # type: ignore[arg-type]
            metal=metal,
            metal_thickness_nm=settings.chip.metal_thickness_nm,
            constraints=constraints,
        )

        # ── Qubits ─────────────────────────────────────────────────────
        qubits: list[TransmonQubit] = []
        for i, qdef in enumerate(spec.qubits):
            qubit_id = qdef.id
            frequency = qdef.frequency_ghz
            anharmonicity = qdef.anharmonicity_mhz
            junction_type = qdef.junction.type

            qubit = TransmonQubit(
                id=qubit_id,
                frequency_ghz=frequency,
                anharmonicity_mhz=anharmonicity,
                junction_type=junction_type,
                pocket_width_um=settings.placement.pocket_width_um,
                pocket_height_um=settings.placement.pocket_height_um,
                pad_width_um=settings.placement.pad_width_um,
                pad_height_um=settings.placement.pad_height_um,
                pad_gap_um=settings.placement.pad_gap_um,
            )
            qubits.append(qubit)

        qubit_ids = {q.id for q in qubits}

        # ── Resonators ─────────────────────────────────────────────────
        resonators: list[Resonator] = []
        for i, rdef in enumerate(spec.resonators):
            res_id = rdef.id
            target_qubit = rdef.target_qubit
            frequency = rdef.frequency_ghz

            # If no frequency specified, derive from qubit frequency + detuning
            if frequency is None:
                target_q = next(
                    (q for q in qubits if q.id == target_qubit), None
                )
                if target_q is not None:
                    frequency = target_q.frequency_ghz + _DEFAULT_RESONATOR_DETUNING_GHZ
                else:
                    frequency = 7.0  # safe fallback

            coupling = rdef.coupling_strength_mhz
            coupling_type = rdef.coupling_type

            res = Resonator(
                id=res_id,
                frequency_ghz=frequency,
                target_qubit_id=target_qubit,
                coupling_type=coupling_type,
                coupling_strength_mhz=coupling,
                cpw_trace_width_um=constraints.cpw_trace_width_mm * 1e3,
                cpw_gap_um=constraints.cpw_gap_mm * 1e3,
            )
            resonators.append(res)

        # ── Couplers ───────────────────────────────────────────────────
        couplers: list[Coupler] = []
        for cdef in spec.couplers:
            coupler_id = cdef.id
            source_id = cdef.source_qubit
            target_id = cdef.target_qubit
            strength = cdef.strength_mhz
            coupler_type = cdef.coupler_type

            coupler = Coupler(
                id=coupler_id,
                source_qubit_id=source_id,
                target_qubit_id=target_id,
                strength_mhz=strength,
                coupler_type=coupler_type,
                cpw_trace_width_um=constraints.cpw_trace_width_mm * 1e3,
                cpw_gap_um=constraints.cpw_gap_mm * 1e3,
            )
            couplers.append(coupler)

        # ── Wire up connection_pads on each qubit ──────────────────────
        _assign_connection_pads(qubits, resonators, couplers)

        design = cls(
            chip=chip,
            qubits=qubits,
            resonators=resonators,
            couplers=couplers,
            status="parsed",
            metadata={
                "source": "CircuitSpec",
                "spec_name": spec.chip.name,
            },
        )
        logger.info(
            "Created QuantumDesign from CircuitSpec: %d qubits, %d resonators, "
            "%d couplers",
            len(qubits), len(resonators), len(couplers),
        )
        return design

    # ── Lookup Methods ──────────────────────────────────────────────────────

    def get_qubit(self, qubit_id: str) -> TransmonQubit:
        """Look up a qubit by ID.

        Args:
            qubit_id: The unique qubit identifier.

        Returns:
            The matching ``TransmonQubit``.

        Raises:
            KeyError: If no qubit with the given ID exists.
        """
        for q in self.qubits:
            if q.id == qubit_id:
                return q
        raise KeyError(f"Qubit {qubit_id!r} not found in design")

    def get_resonator(self, resonator_id: str) -> Resonator:
        """Look up a resonator by ID.

        Args:
            resonator_id: The unique resonator identifier.

        Returns:
            The matching ``Resonator``.

        Raises:
            KeyError: If no resonator with the given ID exists.
        """
        for r in self.resonators:
            if r.id == resonator_id:
                return r
        raise KeyError(f"Resonator {resonator_id!r} not found in design")

    def get_coupler(self, coupler_id: str) -> Coupler:
        """Look up a coupler by ID.

        Args:
            coupler_id: The unique coupler identifier.

        Returns:
            The matching ``Coupler``.

        Raises:
            KeyError: If no coupler with the given ID exists.
        """
        for c in self.couplers:
            if c.id == coupler_id:
                return c
        raise KeyError(f"Coupler {coupler_id!r} not found in design")

    # ── Graph Properties ────────────────────────────────────────────────────

    @property
    def connectivity_graph(self) -> dict[str, list[str]]:
        """Qubit connectivity graph derived from couplers.

        Returns:
            Dict mapping each qubit ID to a list of qubit IDs it is
            directly coupled to.
        """
        graph: dict[str, list[str]] = defaultdict(list)
        for q in self.qubits:
            if q.id not in graph:
                graph[q.id] = []  # ensure every qubit appears
        for c in self.couplers:
            if c.target_qubit_id not in graph[c.source_qubit_id]:
                graph[c.source_qubit_id].append(c.target_qubit_id)
            if c.source_qubit_id not in graph[c.target_qubit_id]:
                graph[c.target_qubit_id].append(c.source_qubit_id)
        return dict(graph)

    @property
    def qubit_resonator_map(self) -> dict[str, list[str]]:
        """Map from qubit ID to the IDs of its readout resonators.

        Returns:
            Dict mapping each qubit ID to a list of resonator IDs
            associated with it.
        """
        qr_map: dict[str, list[str]] = {q.id: [] for q in self.qubits}
        for r in self.resonators:
            if r.target_qubit_id in qr_map:
                qr_map[r.target_qubit_id].append(r.id)
            else:
                # Resonator references a qubit not in the design
                logger.warning(
                    "Resonator %s references unknown qubit %s",
                    r.id, r.target_qubit_id,
                )
        return qr_map

    # ── Validation ──────────────────────────────────────────────────────────

    def validate_design(self) -> bool:
        """Run basic consistency checks on the design.

        Checks:
            - All resonator ``target_qubit_id`` references exist.
            - All coupler ``source_qubit_id`` and ``target_qubit_id`` exist.
            - No duplicate component IDs.
            - Qubit count does not exceed placement engine limit (5).

        Returns:
            ``True`` if all checks pass.

        Raises:
            ValueError: With a descriptive message if any check fails.
        """
        qubit_ids = {q.id for q in self.qubits}
        errors: list[str] = []

        # Check qubit count — metal_codegen supports large designs
        if len(self.qubits) > 256:
            errors.append(
                f"Design contains {len(self.qubits)} qubits; maximum supported is 256"
            )

        # Check resonator references
        for r in self.resonators:
            if r.target_qubit_id not in qubit_ids:
                errors.append(
                    f"Resonator {r.id!r} references unknown qubit {r.target_qubit_id!r}"
                )

        # Check coupler references
        for c in self.couplers:
            if c.source_qubit_id not in qubit_ids:
                errors.append(
                    f"Coupler {c.id!r} references unknown source qubit "
                    f"{c.source_qubit_id!r}"
                )
            if c.target_qubit_id not in qubit_ids:
                errors.append(
                    f"Coupler {c.id!r} references unknown target qubit "
                    f"{c.target_qubit_id!r}"
                )

        # Check for duplicate IDs (already enforced by model_validator, but
        # re-check for designs assembled programmatically after construction)
        all_ids = [q.id for q in self.qubits]
        all_ids += [r.id for r in self.resonators]
        all_ids += [c.id for c in self.couplers]
        if len(all_ids) != len(set(all_ids)):
            errors.append("Duplicate component IDs detected")

        if errors:
            msg = "Design validation failed:\n  • " + "\n  • ".join(errors)
            logger.error(msg)
            raise ValueError(msg)

        logger.info("Design validation passed")
        return True

    # ── Summary ─────────────────────────────────────────────────────────────

    def summary(self) -> str:
        """Return a human-readable summary of the design.

        Returns:
            Multi-line string describing the chip, qubits, resonators,
            couplers, and connectivity.
        """
        lines: list[str] = [
            f"═══ Quantum Design Summary ═══",
            f"Status: {self.status}",
            f"",
            f"── Chip ──",
            f"  Name:      {self.chip.name}",
            f"  Size:      {self.chip.width_mm} × {self.chip.height_mm} mm",
            f"  Substrate: {self.chip.substrate}",
            f"  Metal:     {self.chip.metal} ({self.chip.metal_thickness_nm} nm)",
            f"  Area:      {self.chip.area_mm2:.2f} mm²",
            f"",
            f"── Qubits ({len(self.qubits)}) ──",
        ]
        for q in self.qubits:
            lines.append(
                f"  {q.id}: f01={q.frequency_ghz:.3f} GHz, "
                f"α={q.anharmonicity_mhz:.1f} MHz, "
                f"Ej/Ec={q.ej_ec_ratio:.1f}, "
                f"pos=({q.pos_x_mm:.2f}, {q.pos_y_mm:.2f}) mm"
            )

        lines.append(f"")
        lines.append(f"── Resonators ({len(self.resonators)}) ──")
        for r in self.resonators:
            lines.append(
                f"  {r.id}: f={r.frequency_ghz:.3f} GHz, "
                f"L={r.physical_length_mm:.3f} mm, "
                f"qubit={r.target_qubit_id}"
            )

        lines.append(f"")
        lines.append(f"── Couplers ({len(self.couplers)}) ──")
        for c in self.couplers:
            lines.append(
                f"  {c.id}: {c.source_qubit_id}↔{c.target_qubit_id}, "
                f"J={c.strength_mhz:.1f} MHz ({c.coupler_type})"
            )

        lines.append(f"")
        lines.append(f"── Connectivity ──")
        graph = self.connectivity_graph
        for qid, neighbours in sorted(graph.items()):
            if neighbours:
                lines.append(f"  {qid} → {', '.join(sorted(neighbours))}")
            else:
                lines.append(f"  {qid} → (isolated)")

        return "\n".join(lines)

    # ── Display ─────────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"QuantumDesign(chip={self.chip.name!r}, "
            f"qubits={len(self.qubits)}, "
            f"resonators={len(self.resonators)}, "
            f"couplers={len(self.couplers)}, "
            f"status={self.status!r})"
        )


# ── Helper: assign connection_pads ──────────────────────────────────────────


def _assign_connection_pads(
    qubits: list[TransmonQubit],
    resonators: list[Resonator],
    couplers: list[Coupler],
) -> None:
    """Assign ``connection_pads`` to each qubit based on its connections.

    Each resonator gets a dedicated readout pad; each coupler endpoint gets
    a bus pad.  Pad names follow Qiskit Metal TransmonPocket conventions
    (``"readout"``, ``"bus_0"``, ``"bus_1"``, etc.).

    Args:
        qubits: Mutable list of qubits (modified in-place).
        resonators: Resonators referencing these qubits.
        couplers: Couplers referencing these qubits.
    """
    qubit_map = {q.id: q for q in qubits}

    # Assign readout pads
    for res in resonators:
        q = qubit_map.get(res.target_qubit_id)
        if q is None:
            continue
        pad_name = "readout"
        # If already has a readout pad, number them
        if pad_name in q.connection_pads:
            idx = 1
            while f"readout_{idx}" in q.connection_pads:
                idx += 1
            pad_name = f"readout_{idx}"
        q.connection_pads[pad_name] = {
            "connector_type": "0",
            "loc_W": +1,
            "loc_H": +1,
            "pad_width": "80um",
            "pad_gap": "30um",
        }

    # Assign bus (coupler) pads
    bus_counters: dict[str, int] = defaultdict(int)
    for coup in couplers:
        for qid in (coup.source_qubit_id, coup.target_qubit_id):
            q = qubit_map.get(qid)
            if q is None:
                continue
            idx = bus_counters[qid]
            pad_name = f"bus_{idx}"
            q.connection_pads[pad_name] = {
                "connector_type": "0",
                "loc_W": -1 if idx % 2 == 0 else +1,
                "loc_H": -1,
                "pad_width": "80um",
                "pad_gap": "15um",
            }
            bus_counters[qid] = idx + 1
