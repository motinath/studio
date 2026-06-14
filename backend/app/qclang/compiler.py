"""
QCLang Compiler — transforms a validated AST into:
  1. Physical placement (qubit x/y coordinates) via NetworkX layout algorithms
  2. Frequency plan (qubit/resonator frequencies, EJ/EC, detunings)
  3. Qiskit Metal Python code
  4. GenerateResponse payload compatible with the frontend

This is the heart of the pipeline:
  QCLang (.qc) → AST → Compiler → GenerateResponse JSON
"""

from __future__ import annotations

import math
from typing import Any

import networkx as nx

from app.qclang.ast_nodes import ChipNode, Program

# ── Single source of truth for material parameters ────────────────────────────
from app.services.materials import MATERIALS, get_material


# ── Frequency planning ────────────────────────────────────────────────────────

def _compute_ec_from_geometry(pad_gap_um: float = 30.0) -> float:
    """Approximate EC (charging energy) in GHz from pad gap."""
    # Empirical fit: EC ≈ 0.3 GHz for 30 µm gap
    return 0.28 * (30.0 / pad_gap_um) ** 0.15


def _compute_ej_from_frequency(freq_ghz: float, ec_ghz: float) -> float:
    """Approximate EJ from target qubit frequency and EC using transmon formula:
    f_01 ≈ sqrt(8 * EJ * EC) - EC"""
    target = freq_ghz + ec_ghz
    return (target ** 2) / (8.0 * ec_ghz)


def _resonator_length_mm(freq_ghz: float, epsilon_eff: float) -> float:
    """Quarter-wave resonator length in mm."""
    c = 3e11  # mm/s speed of light
    return c / (4.0 * freq_ghz * 1e9 * math.sqrt(epsilon_eff)) * 1e3


def compute_frequency_plan(
    chip: ChipNode,
    target_freq_ghz: float = 5.0,
    substrate: str = "silicon",
    metal: str = "aluminum",
) -> dict[str, Any]:
    mat = get_material(substrate)
    epsilon_r = mat.get("epsilon_r", 11.45)

    # CPW effective dielectric constant (Schneider half-space approximation)
    cpw_w = mat.get("cpw_width_um", 10.0)
    cpw_g = mat.get("cpw_gap_um", 6.0)
    cpw_h = mat.get("substrate_thickness_um", 430.0)
    # Use the physics engine's accurate Schneider formula when available
    try:
        from app.services.physics.frequency_planner import cpw_effective_permittivity
        epsilon_eff = cpw_effective_permittivity(epsilon_r, cpw_w, cpw_g, cpw_h)
    except Exception:
        epsilon_eff = (epsilon_r + 1) / 2.0

    qubit_freqs: dict[str, float] = {}
    qubit_groups: dict[str, int] = {}
    ej: dict[str, float] = {}
    ec: dict[str, float] = {}
    res_freqs: dict[str, float] = {}
    res_lengths: dict[str, float] = {}
    detunings: dict[str, float] = {}
    warnings: list[str] = []

    num_q = len(chip.qubits)

    for i, q in enumerate(chip.qubits):
        # Alternate two frequency groups to avoid collisions (like IBM heavy-hex)
        group = i % 2
        qubit_groups[q.name] = group

        base = q.get("frequency", target_freq_ghz)
        if isinstance(base, (int, float)):
            base = float(base)
        else:
            base = target_freq_ghz

        # Stagger: group-0 slightly below target, group-1 slightly above
        stagger = (-1 if group == 0 else +1) * 0.1
        noise = (i * 0.013) % 0.06  # deterministic spread
        freq = base + stagger + noise
        qubit_freqs[q.name] = round(freq, 4)

        ec_val = _compute_ec_from_geometry()
        ej_val = _compute_ej_from_frequency(freq, ec_val)
        ec[q.name] = round(ec_val, 5)
        ej[q.name] = round(ej_val, 3)

    # Check frequency collisions (< 50 MHz separation)
    sorted_freqs = sorted(qubit_freqs.items(), key=lambda x: x[1])
    for (n1, f1), (n2, f2) in zip(sorted_freqs, sorted_freqs[1:]):
        if abs(f1 - f2) < 0.05:
            warnings.append(
                f"Frequency collision risk: {n1} ({f1:.3f} GHz) and {n2} ({f2:.3f} GHz) "
                f"are only {abs(f1-f2)*1000:.0f} MHz apart"
            )

    # Readout resonators
    for i, q in enumerate(chip.qubits):
        res_name = f"RO_{q.name}"
        # Readout resonator detuned ~1.5 GHz above qubit
        detuning = 1.5 + (i * 0.02) % 0.15
        rf = qubit_freqs[q.name] + detuning
        res_freqs[res_name] = round(rf, 4)
        res_lengths[res_name] = round(_resonator_length_mm(rf, epsilon_eff), 4)
        detunings[res_name] = round(detuning, 4)

    return {
        "epsilon_eff": round(epsilon_eff, 4),
        "qubit_frequencies_GHz": qubit_freqs,
        "qubit_groups": qubit_groups,
        "EJ_GHz": ej,
        "EC_GHz": ec,
        "resonator_frequencies_GHz": res_freqs,
        "resonator_lengths_mm": res_lengths,
        "detunings_GHz": detunings,
        "warnings": warnings,
        "substrate": substrate,
        "metal": metal,
    }


# ── Physical placement ────────────────────────────────────────────────────────

def compute_placement(chip: ChipNode, topology_hint: str = "auto") -> dict[str, Any]:
    """Use NetworkX graph layout to derive mm-scale qubit coordinates."""
    G = nx.Graph()

    for q in chip.qubits:
        G.add_node(q.name)

    for c in chip.couplers:
        G.add_edge(c.qubit_a, c.qubit_b)

    n = len(chip.qubits)
    if n == 0:
        return {"solver": "none", "qubits": []}

    # Choose layout algorithm
    if topology_hint in ("chain", "linear"):
        pos = {q.name: (i * 2.0, 0.0) for i, q in enumerate(chip.qubits)}
        solver = "linear"
    elif topology_hint == "ring":
        pos = {}
        for i, q in enumerate(chip.qubits):
            angle = 2 * math.pi * i / n
            pos[q.name] = (math.cos(angle) * 3.0, math.sin(angle) * 3.0)
        solver = "ring"
    elif G.number_of_edges() > 0:
        try:
            raw = nx.kamada_kawai_layout(G, scale=4.0)
            pos = raw
            solver = "kamada-kawai"
        except Exception:
            raw = nx.spring_layout(G, seed=42, k=2.0, scale=4.0)
            pos = raw
            solver = "spring"
    else:
        # No edges — grid layout
        cols = max(1, math.ceil(math.sqrt(n)))
        pos = {}
        for i, q in enumerate(chip.qubits):
            r, c = divmod(i, cols)
            pos[q.name] = (c * 2.0, -r * 2.0)
        solver = "grid"

    qubits = [
        {"name": name, "x": round(float(xy[0]), 4), "y": round(float(xy[1]), 4)}
        for name, xy in pos.items()
    ]
    # Build placement edges from the chip's coupler list so the frontend
    # canvas can draw coupling meanders without falling back to proximity.
    edges = [
        {
            "qubit_a": c.qubit_a,
            "pin_a": "a",
            "qubit_b": c.qubit_b,
            "pin_b": "b",
            "label": c.name,
        }
        for c in chip.couplers
    ]
    return {"solver": solver, "qubits": qubits, "edges": edges}


# ── DRC ───────────────────────────────────────────────────────────────────────

def run_drc(
    chip: ChipNode,
    placement: dict[str, Any],
    chip_size_mm: float = 10.0,
    min_spacing_mm: float = 0.4,
) -> dict[str, Any]:
    violations = []
    qubit_positions = {q["name"]: (q["x"], q["y"]) for q in placement.get("qubits", [])}

    names = list(qubit_positions.keys())
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            n1, n2 = names[i], names[j]
            x1, y1 = qubit_positions[n1]
            x2, y2 = qubit_positions[n2]
            dist = math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
            if dist < min_spacing_mm:
                violations.append({
                    "severity": "error",
                    "rule": "MIN_SPACING",
                    "message": f"{n1} and {n2} are {dist:.3f}mm apart (min {min_spacing_mm}mm)",
                })

    half = chip_size_mm / 2
    for name, (x, y) in qubit_positions.items():
        if abs(x) > half or abs(y) > half:
            violations.append({
                "severity": "warning",
                "rule": "OFF_CHIP",
                "message": f"{name} at ({x:.2f}, {y:.2f}) is outside the {chip_size_mm}mm chip",
            })

    return {
        "passed": not any(v["severity"] == "error" for v in violations),
        "violations": violations,
    }


# ── Qiskit Metal code generation ─────────────────────────────────────────────

class ValidationError(Exception):
    """Raised when the chip design validation checks fail."""
    pass


class ChipModel:
    def __init__(self, name: str, substrate: str, metal: str, size_mm: float = 10.0):
        self.name = name
        self.substrate = substrate
        self.metal = metal
        self.size_mm = size_mm
        self.qubits = {}       # name -> dict of properties
        self.couplers = {}     # name -> dict of properties
        self.resonators = {}   # name -> dict of properties
        self.feedlines = {}    # name -> dict of properties
        self.launchpads = {}   # name -> dict of properties
        self.connections = []  # list of dict(start_comp, start_pin, end_comp, end_pin)


def get_component_pins(class_name: str, options: dict) -> set[str]:
    # 1. Look up connection_pads if they exist
    if "connection_pads" in options:
        return set(options["connection_pads"].keys())
        
    # 2. Look up in catalog
    try:
        from app.services.component_registry import component_registry_service
        item = component_registry_service.get_catalog_item(class_name)
        if item and "pins" in item:
            pins = {p["name"] for p in item["pins"] if "name" in p}
            if pins:
                return pins
    except Exception:
        pass
            
    # 3. Standard fallback sets
    fallbacks = {
        "TransmonPocket": {"a", "b", "c", "d", "readout", "bus_0", "bus_1", "bus_2", "bus_3", "control"},
        "TransmonCross": {"readout", "bus_01", "bus_02", "bus_03", "control"},
        "CoupledLineTee": {"prime_start", "prime_end", "second_end"},
        "LaunchpadWirebond": {"tie"},
        "RouteMeander": {"start", "end"},
        "OpenToGround": {"open"},
    }
    return fallbacks.get(class_name, {"readout", "bus_0", "a", "b", "c", "d", "tie", "prime_start", "prime_end", "second_end", "control"})


def compile_chip_to_model(
    chip: ChipNode,
    placement: dict[str, Any],
    substrate: str = "silicon",
    metal: str = "aluminum",
    chip_size_mm: float = 10.0
) -> ChipModel:
    model = ChipModel(chip.name, substrate, metal, chip_size_mm)
    
    # ── 1. Component Classification & Qubit Import (Step 1) ─────────────────
    qubit_pos = {q["name"]: q for q in placement.get("qubits", [])}
    for q in chip.qubits:
        pos = qubit_pos.get(q.name, {"x": 0.0, "y": 0.0})
        qtype = q.qubit_type or "transmon"
        cls_name = "TransmonCross" if qtype in ("xmon", "gmon") else "TransmonPocket"
        
        freq = q.get("frequency", 5.0)
        
        model.qubits[q.name] = {
            "name": q.name,
            "type": qtype,
            "class_name": cls_name,
            "x": float(pos.get("x", pos.get("x_mm", 0.0))),
            "y": float(pos.get("y", pos.get("y_mm", 0.0))),
            "frequency_ghz": float(freq),
            "connection_pads": {}
        }

    # ── 2. Frequency Planning (Step 6) ──────────────────────────────────────
    adj = {q_name: [] for q_name in model.qubits}
    for c in chip.couplers:
        if c.qubit_a in adj and c.qubit_b in adj:
            adj[c.qubit_a].append(c.qubit_b)
            adj[c.qubit_b].append(c.qubit_a)
            
    assigned_freqs = {}
    for q_name in sorted(model.qubits.keys()):
        cand = 4.9
        while any(abs(assigned_freqs.get(nb, 0) - cand) < 0.2 for nb in adj[q_name]):
            cand = round(cand + 0.2, 2)
        assigned_freqs[q_name] = cand
        model.qubits[q_name]["frequency_ghz"] = cand

    # ── 3. Auto Coupler Insertion (Step 4) ──────────────────────────────────
    for ci, c in enumerate(chip.couplers):
        q1, q2 = c.qubit_a, c.qubit_b
        if q1 not in model.qubits or q2 not in model.qubits:
            continue
            
        c_name = f"CPW_{q1}_{q2}_coupler"
        pos_x = (model.qubits[q1]["x"] + model.qubits[q2]["x"]) / 2.0
        pos_y = (model.qubits[q1]["y"] + model.qubits[q2]["y"]) / 2.0
        
        model.couplers[c_name] = {
            "name": c_name,
            "class_name": "TransmonPocket",
            "x": pos_x,
            "y": pos_y,
            "pocket_width": "200um",
            "pocket_height": "200um",
            "pad_width": "60um",
            "pad_height": "30um",
            "pad_gap": "15um",
            "connection_pads": {
                "a": {"loc_W": -1, "loc_H": -1},
                "b": {"loc_W": 1, "loc_H": -1}
            }
        }
        
        q1_bus_idx = sum(1 for conn in model.connections if conn["start_comp"] == q1 or conn["end_comp"] == q1)
        q2_bus_idx = sum(1 for conn in model.connections if conn["start_comp"] == q2 or conn["end_comp"] == q2)
        
        q1_pin = f"bus_{q1_bus_idx}"
        q2_pin = f"bus_{q2_bus_idx}"
        
        model.qubits[q1]["connection_pads"][q1_pin] = {
            "loc_W": -1 if q1_bus_idx % 2 == 0 else 1,
            "loc_H": -1
        }
        model.qubits[q2]["connection_pads"][q2_pin] = {
            "loc_W": -1 if q2_bus_idx % 2 == 0 else 1,
            "loc_H": -1
        }
        
        model.connections.append({
            "start_comp": q1,
            "start_pin": q1_pin,
            "end_comp": c_name,
            "end_pin": "a"
        })
        model.connections.append({
            "start_comp": c_name,
            "start_pin": "b",
            "end_comp": q2,
            "end_pin": q2_pin
        })

    # ── 4. Auto Readout Resonator Insertion (Step 2) ─────────────────────────
    y_feedline = chip_size_mm / 2.0 - 1.5
    sorted_qubits = sorted(model.qubits.items(), key=lambda item: (item[1]["x"], item[1]["y"]))
    num_res = len(sorted_qubits)
    
    # Space out resonators along the feedline
    if num_res > 1:
        x_step = 6.0 / (num_res - 1)
        x_coords = [-3.0 + i * x_step for i in range(num_res)]
    else:
        x_coords = [0.0]
        
    for idx, (q_name, q_data) in enumerate(sorted_qubits):
        r_name = f"RO_{q_name}"
        r_freq = q_data["frequency_ghz"] + 1.5
        
        tee_name = f"{r_name}_tee"
        model.resonators[tee_name] = {
            "name": tee_name,
            "class_name": "CoupledLineTee",
            "x": x_coords[idx],
            "y": y_feedline,
            "frequency_ghz": r_freq,
        }
        
        q_data["connection_pads"]["readout"] = {
            "loc_W": 1,
            "loc_H": 1
        }
        
        model.connections.append({
            "start_comp": tee_name,
            "start_pin": "second_end",
            "end_comp": q_name,
            "end_pin": "readout"
        })

    # ── 5. Auto Control Line Insertion (Step 2) ──────────────────────────────
    # Space out control line launchpads along the bottom edge
    if num_res > 1:
        x_step_cl = 7.0 / (num_res - 1)
        cl_x_coords = [-3.5 + i * x_step_cl for i in range(num_res)]
    else:
        cl_x_coords = [0.0]
        
    for idx, (q_name, q_data) in enumerate(sorted_qubits):
        lp_cl_name = f"LP_CL_{q_name}"
        model.launchpads[lp_cl_name] = {
            "name": lp_cl_name,
            "class_name": "LaunchpadWirebond",
            "x": cl_x_coords[idx],
            "y": -chip_size_mm / 2.0 + 0.5
        }
        
        q_data["connection_pads"]["control"] = {
            "loc_W": -1,
            "loc_H": 1
        }
        
        model.connections.append({
            "start_comp": lp_cl_name,
            "start_pin": "tie",
            "end_comp": q_name,
            "end_pin": "control"
        })

    # ── 6. Auto Feedline Generation (Step 5) ─────────────────────────────────
    if model.resonators:
        lp_in_name = "LP_IN"
        lp_out_name = "LP_OUT"
        
        model.launchpads[lp_in_name] = {
            "name": lp_in_name,
            "class_name": "LaunchpadWirebond",
            "x": -chip_size_mm / 2.0 + 0.5,
            "y": y_feedline
        }
        model.launchpads[lp_out_name] = {
            "name": lp_out_name,
            "class_name": "LaunchpadWirebond",
            "x": chip_size_mm / 2.0 - 0.5,
            "y": y_feedline
        }
        
        sorted_tees = sorted(model.resonators.keys(), key=lambda t: model.resonators[t]["x"])
        
        prev_comp = lp_in_name
        prev_pin = "tie"
        
        for tee in sorted_tees:
            model.connections.append({
                "start_comp": prev_comp,
                "start_pin": prev_pin,
                "end_comp": tee,
                "end_pin": "prime_start"
            })
            prev_comp = tee
            prev_pin = "prime_end"
            
        model.connections.append({
            "start_comp": prev_comp,
            "start_pin": prev_pin,
            "end_comp": lp_out_name,
            "end_pin": "tie"
        })
        
    return model


def validate_model(model: ChipModel):
    # 1. Compatibility checker / Catalog check
    try:
        from app.services.component_registry import component_registry_service
    except ImportError:
        component_registry_service = None
        
    comps = {}
    for q_name, q_data in model.qubits.items():
        comps[q_name] = (q_data["class_name"], q_data)
    for c_name, c_data in model.couplers.items():
        comps[c_name] = (c_data["class_name"], c_data)
    for r_name, r_data in model.resonators.items():
        comps[r_name] = (r_data["class_name"], r_data)
    for l_name, l_data in model.launchpads.items():
        comps[l_name] = (l_data["class_name"], l_data)
        
    for name, (cls_name, data) in comps.items():
        if component_registry_service:
            item = component_registry_service.get_catalog_item(cls_name)
            if item is None:
                supported = {"TransmonPocket", "TransmonCross", "CoupledLineTee", "LaunchpadWirebond", "RouteMeander", "OpenToGround"}
                if cls_name not in supported:
                    raise ValidationError(f"Component type '{cls_name}' is not supported in the component catalog.")

    # 2. Dynamic Pin Validation (Step 3)
    for conn in model.connections:
        sc = conn["start_comp"]
        sp = conn["start_pin"]
        ec = conn["end_comp"]
        ep = conn["end_pin"]
        
        for c_name, pin in [(sc, sp), (ec, ep)]:
            if c_name not in comps:
                raise ValidationError(f"Connection references undefined component '{c_name}'")
            cls_name, data = comps[c_name]
            available_pins = get_component_pins(cls_name, data)
            if pin not in available_pins:
                raise ValidationError(f"Pin '{pin}' does not exist on component '{c_name}' of type '{cls_name}'. Available pins: {list(available_pins)}")

    # 3. Connectivity: No floating qubits (Step 7)
    if len(model.qubits) > 1:
        qubit_coupler_conns = {q: 0 for q in model.qubits}
        for conn in model.connections:
            sc = conn["start_comp"]
            ec = conn["end_comp"]
            if sc in model.qubits and ec in model.couplers:
                qubit_coupler_conns[sc] += 1
            elif ec in model.qubits and sc in model.couplers:
                qubit_coupler_conns[ec] += 1
        for q_name, num in qubit_coupler_conns.items():
            if num == 0:
                raise ValidationError(f"Qubit '{q_name}' is floating (has no coupler connections)")

    # 4. Frequency: No collisions (Step 7)
    coupler_qubits = {}
    for conn in model.connections:
        sc = conn["start_comp"]
        ec = conn["end_comp"]
        if sc in model.couplers and ec in model.qubits:
            coupler_qubits.setdefault(sc, []).append(ec)
        elif ec in model.couplers and sc in model.qubits:
            coupler_qubits.setdefault(ec, []).append(sc)
            
    for c_name, qs in coupler_qubits.items():
        if len(qs) == 2:
            q1, q2 = qs[0], qs[1]
            f1 = model.qubits[q1]["frequency_ghz"]
            f2 = model.qubits[q2]["frequency_ghz"]
            if abs(f1 - f2) < 0.2:
                raise ValidationError(
                    f"Frequency collision between neighboring qubits '{q1}' ({f1} GHz) and "
                    f"'{q2}' ({f2} GHz): difference is {abs(f1-f2)*1000:.0f} MHz (must be >= 200 MHz)"
                )

    # 5. Spacing rules (Step 7)
    q_names = list(model.qubits.keys())
    for i in range(len(q_names)):
        for j in range(i + 1, len(q_names)):
            q1, q2 = q_names[i], q_names[j]
            x1, y1 = model.qubits[q1]["x"], model.qubits[q1]["y"]
            x2, y2 = model.qubits[q2]["x"], model.qubits[q2]["y"]
            dist = math.sqrt((x1 - x2)**2 + (y1 - y2)**2)
            if dist < 0.4:
                raise ValidationError(f"Qubits '{q1}' and '{q2}' are too close ({dist:.3f} mm, min 0.4 mm)")


def generate_qiskit_code(chip: ChipNode, placement: dict[str, Any], material: str = "aluminum") -> str:
    # Build ChipModel and validate
    model = compile_chip_to_model(chip, placement, metal=material, chip_size_mm=10.0)
    validate_model(model)
    
    lines = [
        "# ── SILICOFELLER Quantum Studio — QCLang-compiled Qiskit Metal script ──",
        f"# Chip: {model.name}",
        f"# Qubits: {len(model.qubits)}",
        "",
        "from qiskit_metal import designs, Dict",
        "from qiskit_metal.qlibrary.qubits.transmon_pocket import TransmonPocket",
        "from qiskit_metal.qlibrary.qubits.transmon_cross import TransmonCross",
        "from qiskit_metal.qlibrary.couplers.coupled_line_tee import CoupledLineTee",
        "from qiskit_metal.qlibrary.terminations.launchpad_wb import LaunchpadWirebond",
        "from qiskit_metal.qlibrary.tlines.meandered import RouteMeander",
        "",
        "design = designs.DesignPlanar()",
        "design.overwrite_enabled = True",
        f"design.chips.main.size['size_x'] = '{model.size_mm}mm'",
        f"design.chips.main.size['size_y'] = '{model.size_mm}mm'",
        "",
    ]
    
    # Qubits
    lines.append("# ── Qubits ──────────────────────────────────────────────────────")
    for q_name, q_data in model.qubits.items():
        cls = q_data["class_name"]
        lines.append(f"{q_name} = {cls}(design, '{q_name}', options=dict(")
        lines.append(f"    pos_x='{q_data['x']:.3f}mm',")
        lines.append(f"    pos_y='{q_data['y']:.3f}mm',")
        lines.append( "    orientation='0',")
        lines.append( "    pad_width='455um',")
        lines.append( "    pad_height='90um',")
        lines.append( "    pad_gap='30um',")
        lines.append( "    pocket_width='650um',")
        lines.append( "    pocket_height='650um',")
        
        if q_data["connection_pads"]:
            lines.append("    connection_pads=dict(")
            for pad_name, pad_opts in q_data["connection_pads"].items():
                loc_W = pad_opts.get("loc_W", 1)
                loc_H = pad_opts.get("loc_H", 1)
                lines.append(f"        {pad_name}=dict(loc_W={loc_W}, loc_H={loc_H}, pad_width='80um', pad_gap='30um'),")
            lines.append("    )")
        lines.append("))")
        lines.append("")
        
    # Couplers
    lines.append("# ── Couplers ────────────────────────────────────────────────────")
    for c_name, c_data in model.couplers.items():
        cls = c_data["class_name"]
        lines.append(f"{c_name} = {cls}(design, '{c_name}', options=dict(")
        lines.append(f"    pos_x='{c_data['x']:.3f}mm',")
        lines.append(f"    pos_y='{c_data['y']:.3f}mm',")
        lines.append( "    orientation='0',")
        lines.append(f"    pocket_width='{c_data['pocket_width']}',")
        lines.append(f"    pocket_height='{c_data['pocket_height']}',")
        lines.append(f"    pad_width='{c_data['pad_width']}',")
        lines.append(f"    pad_height='{c_data['pad_height']}',")
        lines.append(f"    pad_gap='{c_data['pad_gap']}',")
        if "connection_pads" in c_data and c_data["connection_pads"]:
            lines.append("    connection_pads=dict(")
            for pad_name, pad_opts in c_data["connection_pads"].items():
                loc_W = pad_opts.get("loc_W", 1)
                loc_H = pad_opts.get("loc_H", 1)
                lines.append(f"        {pad_name}=dict(loc_W={loc_W}, loc_H={loc_H}, pad_width='40um', pad_gap='10um'),")
            lines.append("    )")
        lines.append("))")
        lines.append("")

    # Resonators
    lines.append("# ── Resonators (Tees) ───────────────────────────────────────────")
    for r_name, r_data in model.resonators.items():
        cls = r_data["class_name"]
        lines.append(f"{r_name} = {cls}(design, '{r_name}', options=dict(")
        lines.append(f"    pos_x='{r_data['x']:.3f}mm',")
        lines.append(f"    pos_y='{r_data['y']:.3f}mm',")
        lines.append( "    orientation='0',")
        lines.append( "    coupling_length='200um',")
        lines.append( "    coupling_space='6um',")
        lines.append("))")
        lines.append("")

    # Launchpads
    lines.append("# ── Launchpads ──────────────────────────────────────────────────")
    for l_name, l_data in model.launchpads.items():
        cls = l_data["class_name"]
        lines.append(f"{l_name} = {cls}(design, '{l_name}', options=dict(")
        lines.append(f"    pos_x='{l_data['x']:.3f}mm',")
        lines.append(f"    pos_y='{l_data['y']:.3f}mm',")
        lines.append( "    orientation='0',")
        lines.append("))")
        lines.append("")

    # Connections
    lines.append("# ── Connections (Routes) ────────────────────────────────────────")
    for ri, conn in enumerate(model.connections):
        route_name = f"route_{ri+1}"
        lines.append(f"{route_name} = RouteMeander(design, 'CPW_Route_{ri+1}', options=dict(")
        lines.append( "    pin_inputs=dict(")
        lines.append(f"        start_pin=dict(component='{conn['start_comp']}', pin='{conn['start_pin']}'),")
        lines.append(f"        end_pin=dict(component='{conn['end_comp']}', pin='{conn['end_pin']}'),")
        lines.append( "    ),")
        lines.append( "    fillet='90um',")
        lines.append( "    total_length='7.8mm',")
        lines.append( "    lead=dict(start_straight='100um', end_straight='100um'),")
        lines.append("))")
        lines.append("")

    lines.extend([
        "design.rebuild()",
        f"print('Chip compiled — {len(model.qubits)} qubits, {len(model.connections)} route segments')",
    ])
    return "\n".join(lines)


# ── Main compile entry point ──────────────────────────────────────────────────

def compile_program(
    program: Program,
    target_freq_ghz: float = 5.0,
    substrate: str = "silicon",
    metal: str = "aluminum",
    chip_size_mm: float = 10.0,
) -> dict[str, Any]:
    """
    Compile a parsed QCLang Program into a GenerateResponse-compatible dict.
    """
    chip = program.primary_chip
    if chip is None:
        return {"error": "No chip defined in program"}

    # Derive topology from coupler graph structure
    topology = _detect_topology(chip)

    freq_plan = compute_frequency_plan(chip, target_freq_ghz, substrate, metal)
    placement = compute_placement(chip, topology)
    drc = run_drc(chip, placement, chip_size_mm)
    
    try:
        code = generate_qiskit_code(chip, placement, metal)
    except ValidationError as e:
        code = f"# Validation failed:\n# {e}\n"
        drc["passed"] = False
        drc["violations"].append({
            "severity": "error",
            "rule": "COMPATIBILITY",
            "message": str(e),
        })

    return {
        "label": f"{chip.name} · {chip.num_qubits}Q",
        "num_qubits": chip.num_qubits,
        "topology": topology,
        "engine": "qclang-compiler",
        "interpretation": (
            f"QCLang-compiled {chip.num_qubits}-qubit {chip.name} chip on {substrate}/{metal}. "
            f"Frequencies: {target_freq_ghz:.2f} GHz target. "
            f"DRC: {'PASS' if drc['passed'] else 'FAIL'}."
        ),
        "drc": drc,
        "frequency_plan": freq_plan,
        "placement": placement,
        "code": code,
        "qclang_source": None,
        "material": {"substrate": substrate, "metal": metal},
    }


def _detect_topology(chip: ChipNode) -> str:
    if not chip.couplers:
        return "isolated"

    n = chip.num_qubits
    edges = [(c.qubit_a, c.qubit_b) for c in chip.couplers]
    G = nx.Graph()
    G.add_nodes_from([q.name for q in chip.qubits])
    G.add_edges_from(edges)

    avg_deg = sum(dict(G.degree()).values()) / max(n, 1)

    if avg_deg <= 1.1:
        return "chain"
    elif avg_deg <= 2.1:
        if all(d == 2 for _, d in G.degree()) and nx.is_connected(G):
            return "ring"
        return "chain"
    elif avg_deg <= 2.5:
        return "heavy-hex"
    elif avg_deg <= 4.1:
        return "grid"
    else:
        return "all-to-all"
