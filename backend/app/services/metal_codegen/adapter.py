from __future__ import annotations

import re
from typing import Any

from app.services.metal_codegen.models.chip import QuantumChip
from app.services.metal_codegen.models.constraints import FabricationConstraints
from app.services.metal_codegen.models.coupler import Coupler
from app.services.metal_codegen.models.design import QuantumDesign, _assign_connection_pads
from app.services.metal_codegen.models.qubit import TransmonQubit
from app.services.metal_codegen.models.resonator import Resonator

QUBIT_TYPES = {"TransmonPocket", "TransmonCross"}
RESONATOR_TYPES = {"ResonatorCoilRect", "OpenToGround"}


def editor_state_to_design(
    *,
    components: list[dict[str, Any]],
    connections: list[dict[str, Any]],
    variables: dict[str, Any] | None = None,
) -> QuantumDesign:
    """Convert the drag/drop editor JSON into the Metal codegen IR."""
    variables = variables or {}
    component_by_id = {str(c.get("id")): c for c in components if c.get("id")}
    qubit_components = [c for c in components if c.get("type") in QUBIT_TYPES]
    resonator_components = [c for c in components if c.get("type") in RESONATOR_TYPES]

    chip_size = _clamp(_to_float(variables.get("chip_size"), 10.0), 3.0, 20.0)
    substrate = str(variables.get("substrate", "silicon")).lower()
    if substrate not in {"silicon", "sapphire"}:
        substrate = "silicon"

    constraints = FabricationConstraints.from_settings()
    chip = QuantumChip(
        name=_safe_name(str(variables.get("name", "editor_chip"))),
        width_mm=chip_size,
        height_mm=chip_size,
        substrate=substrate,  # type: ignore[arg-type]
        metal=str(variables.get("metal", "niobium")),
        constraints=constraints,
    )

    qubits: list[TransmonQubit] = []
    qubit_name_by_component_id: dict[str, str] = {}
    for index, comp in enumerate(qubit_components):
        params = _params(comp)
        name = _safe_name(str(comp.get("name") or f"Q{index}"))
        qubit_name_by_component_id[str(comp.get("id"))] = name
        frequency = _frequency_from_params(params, default=5.0 + index * 0.05, min_value=3.5, max_value=8.0)
        qubits.append(
            TransmonQubit(
                id=name,
                frequency_ghz=frequency,
                anharmonicity_mhz=_clamp(_to_float(params.get("anharmonicity_mhz"), -250.0), -400.0, -150.0),
                pos_x_mm=_to_float(comp.get("x"), 0.0),
                pos_y_mm=_to_float(comp.get("y"), 0.0),
                orientation_deg=_to_float(comp.get("orientation"), 0.0),
                pad_gap_um=_length_um(params.get("pad_gap"), 30.0),
                pad_width_um=_length_um(params.get("pad_width"), 275.0),
                pad_height_um=_length_um(params.get("pad_height"), 100.0),
            )
        )

    couplers: list[Coupler] = []
    seen_edges: set[tuple[str, str]] = set()
    coupling_mhz = _coupling_strength_mhz(variables.get("coupling_strength", 0.05))
    for index, conn in enumerate(connections):
        from_comp = component_by_id.get(str(conn.get("fromComp")))
        to_comp = component_by_id.get(str(conn.get("toComp")))
        if not from_comp or not to_comp:
            continue
        if from_comp.get("type") not in QUBIT_TYPES or to_comp.get("type") not in QUBIT_TYPES:
            continue
        source = qubit_name_by_component_id.get(str(from_comp.get("id")))
        target = qubit_name_by_component_id.get(str(to_comp.get("id")))
        if not source or not target or source == target:
            continue
        edge_key = tuple(sorted((source, target)))
        if edge_key in seen_edges:
            continue
        seen_edges.add(edge_key)
        couplers.append(
            Coupler(
                id=f"C{index}_{source}_{target}",
                source_qubit_id=source,
                target_qubit_id=target,
                strength_mhz=coupling_mhz,
                cpw_trace_width_um=constraints.cpw_trace_width_mm * 1000.0,
                cpw_gap_um=constraints.cpw_gap_mm * 1000.0,
            )
        )

    resonators: list[Resonator] = []
    for index, comp in enumerate(resonator_components):
        if not qubits:
            break
        params = _params(comp)
        target_qubit = _connected_qubit_name(comp, connections, component_by_id, qubit_name_by_component_id)
        if target_qubit is None:
            target_qubit = min(
                qubits,
                key=lambda q: (q.pos_x_mm - _to_float(comp.get("x"), 0.0)) ** 2
                + (q.pos_y_mm - _to_float(comp.get("y"), 0.0)) ** 2,
            ).id
        resonators.append(
            Resonator(
                id=_safe_name(str(comp.get("name") or f"R{index}")),
                frequency_ghz=_frequency_from_params(params, default=6.5 + index * 0.05, min_value=5.0, max_value=10.0),
                target_qubit_id=target_qubit,
                coupling_strength_mhz=_clamp(_to_float(params.get("coupling_strength_mhz"), 50.0), 1.0, 200.0),
                cpw_trace_width_um=_length_um(params.get("width"), constraints.cpw_trace_width_mm * 1000.0),
                cpw_gap_um=_length_um(params.get("gap"), constraints.cpw_gap_mm * 1000.0),
                pos_x_mm=_to_float(comp.get("x"), 0.0),
                pos_y_mm=_to_float(comp.get("y"), 0.0),
                orientation_deg=_to_float(comp.get("orientation"), 0.0),
            )
        )

    _assign_connection_pads(qubits, resonators, couplers)
    return QuantumDesign(
        chip=chip,
        qubits=qubits,
        resonators=resonators,
        couplers=couplers,
        status="routed",
        metadata={"source": "quantum-editor"},
    )


def _params(component: dict[str, Any]) -> dict[str, Any]:
    params = component.get("params")
    return params if isinstance(params, dict) else {}


def _connected_qubit_name(
    component: dict[str, Any],
    connections: list[dict[str, Any]],
    component_by_id: dict[str, dict[str, Any]],
    qubit_name_by_component_id: dict[str, str],
) -> str | None:
    component_id = str(component.get("id"))
    for conn in connections:
        other_id: str | None = None
        if str(conn.get("fromComp")) == component_id:
            other_id = str(conn.get("toComp"))
        elif str(conn.get("toComp")) == component_id:
            other_id = str(conn.get("fromComp"))
        if other_id and component_by_id.get(other_id, {}).get("type") in QUBIT_TYPES:
            return qubit_name_by_component_id.get(other_id)
    return None


def _safe_name(value: str) -> str:
    safe = re.sub(r"\W+", "_", value).strip("_")
    if not safe:
        return "component"
    if safe[0].isdigit():
        return f"C_{safe}"
    return safe


def _to_float(value: Any, default: float) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        match = re.search(r"-?\d+(?:\.\d+)?", value)
        if match:
            return float(match.group(0))
    return default


def _length_um(value: Any, default_um: float) -> float:
    if isinstance(value, str):
        number = _to_float(value, default_um)
        lowered = value.lower()
        if "mm" in lowered:
            return number * 1000.0
        return number
    return _to_float(value, default_um)


def _frequency_from_params(
    params: dict[str, Any],
    *,
    default: float,
    min_value: float,
    max_value: float,
) -> float:
    for key in ("frequency_ghz", "frequency", "freq", "resonance_frequency"):
        if key in params:
            return _clamp(_to_float(params[key], default), min_value, max_value)
    return _clamp(default, min_value, max_value)


def _coupling_strength_mhz(value: Any) -> float:
    raw = _to_float(value, 0.05)
    if raw <= 1.0:
        raw *= 1000.0
    return _clamp(raw, 0.5, 50.0)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))