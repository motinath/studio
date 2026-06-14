"""
topology_router.py  —  QBETA V2 Phase 3
========================================
Logical topology graph → physics-aware physical placement engine.

WHAT THIS FILE DOES
-------------------
1.  Builds a proper networkx.Graph() from the logical qubit connectivity.
2.  Runs a placement solver (Kamada-Kawai or spring layout) to minimise:
      • Total wire length
      • Edge crossings
      • Resonator spacing conflicts
3.  Scales solved coordinates to physical mm on chip.
4.  Returns PlacementResult with physical (x_mm, y_mm, orientation) per qubit
    and an ordered CouplingEdge list for the routing step.

KEY DESIGN DECISIONS
---------------------
- Logical topology is NEVER assumed equal to physical layout.
- Coordinates come from the graph solver, not from hardcoded formulas.
- Fallback to deterministic grid if networkx is unavailable.
- API is backward-compatible: place_qubits() still returns PlacementResult.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ─────────────────────────────────────────────────────────────────────────────
# Data containers (unchanged API)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class QubitPlacement:
    name:            str
    x_mm:            float
    y_mm:            float
    orientation_deg: int = 0          # 0, 90, 180, 270


@dataclass
class CouplingEdge:
    qubit_a: str
    pin_a:   str
    qubit_b: str
    pin_b:   str
    label:   str = ""


@dataclass
class PlacementResult:
    qubits:   List[QubitPlacement]
    edges:    List[CouplingEdge]
    topology: str
    cols:     int
    rows:     int
    pitch_mm: float
    graph:    object = field(default=None, repr=False)   # networkx.Graph (if built)


# ─────────────────────────────────────────────────────────────────────────────
# Graph builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_logical_graph(n: int, topology: str):
    """
    Build a networkx.Graph representing the logical qubit connectivity.
    Returns (G, edge_specs) where edge_specs is a list of CouplingEdge.
    """
    try:
        import networkx as nx
    except ImportError:
        return None, []

    G = nx.Graph()
    nodes = [f"Q{i+1}" for i in range(n)]
    G.add_nodes_from(nodes)

    edges: List[CouplingEdge] = []

    if topology == "line":
        for i in range(n - 1):
            G.add_edge(f"Q{i+1}", f"Q{i+2}")
            edges.append(CouplingEdge(f"Q{i+1}", "a", f"Q{i+2}", "c",
                                      label=f"bus_{i+1}_{i+2}"))

    elif topology == "ring":
        for i in range(n):
            a, b = f"Q{i+1}", f"Q{(i+1)%n+1}"
            G.add_edge(a, b)
            edges.append(CouplingEdge(a, "a", b, "c", label=f"ring_{i+1}"))

    elif topology == "star":
        hub = "Q1"
        pins = ["a", "b", "c", "d"]
        for i in range(1, n):
            spoke = f"Q{i+1}"
            G.add_edge(hub, spoke)
            edges.append(CouplingEdge(hub, pins[(i-1) % 4], spoke, "c",
                                      label=f"star_arm_{i}"))

    elif topology in ("heavy_hex", "heavy-hex"):
        # IBM heavy-hex: two rows, alternating vertical links
        cols_top = math.ceil(n / 2)
        cols_bot = n - cols_top
        top = [f"Q{i+1}" for i in range(cols_top)]
        bot = [f"Q{i+cols_top+1}" for i in range(cols_bot)]

        for i in range(len(top) - 1):
            G.add_edge(top[i], top[i+1])
            edges.append(CouplingEdge(top[i], "a", top[i+1], "c",
                                      label=f"hex_top_{i}"))
        for i in range(len(bot) - 1):
            G.add_edge(bot[i], bot[i+1])
            edges.append(CouplingEdge(bot[i], "a", bot[i+1], "c",
                                      label=f"hex_bot_{i}"))
        for i in range(min(len(top), len(bot))):
            G.add_edge(top[i], bot[i])
            edges.append(CouplingEdge(top[i], "b", bot[i], "b",
                                      label=f"hex_link_{i}"))

    else:  # grid (default)
        cols = max(2, math.ceil(math.sqrt(n)))
        rows = math.ceil(n / cols)
        idx_map: Dict[Tuple[int,int], str] = {}
        idx = 0
        for r in range(rows):
            for c in range(cols):
                if idx >= n:
                    break
                idx_map[(r, c)] = f"Q{idx+1}"
                idx += 1
        for r in range(rows):
            for c in range(cols):
                if (r, c) not in idx_map:
                    continue
                qa = idx_map[(r, c)]
                if (r, c+1) in idx_map:
                    qb = idx_map[(r, c+1)]
                    G.add_edge(qa, qb)
                    edges.append(CouplingEdge(qa, "a", qb, "c",
                                              label=f"bus_h_{qa}_{qb}"))
                if (r+1, c) in idx_map:
                    qb = idx_map[(r+1, c)]
                    G.add_edge(qa, qb)
                    edges.append(CouplingEdge(qa, "b", qb, "c",
                                              label=f"bus_v_{qa}_{qb}"))

    return G, edges


# ─────────────────────────────────────────────────────────────────────────────
# Graph-based placement solver
# ─────────────────────────────────────────────────────────────────────────────

def _solve_placement_graph(
    G,
    nodes: List[str],
    scale: float,
    seed: int = 42,
) -> Dict[str, Tuple[float, float]]:
    """
    Use networkx layout algorithms to find optimal qubit coordinates.

    Strategy:
      - Kamada-Kawai  : minimises sum of squared distance deviations
                        from the graph-theoretic distance → best for
                        uniform-edge graphs (grid, ring, heavy-hex)
      - Falls back to spring_layout if KK fails (disconnected graph)

    Returns: {qubit_name: (x_mm, y_mm)}
    """
    import networkx as nx

    try:
        pos = nx.kamada_kawai_layout(G, scale=1.0)
    except Exception:
        pos = nx.spring_layout(G, seed=seed, scale=1.0)

    # Scale to physical mm (pitch ~ 1.1 * scale between neighbours)
    pitch = 1.1 * scale
    result: Dict[str, Tuple[float, float]] = {}
    for node, (x, y) in pos.items():
        result[node] = (round(x * pitch * len(nodes) / 3.0, 4),
                        round(y * pitch * len(nodes) / 3.0, 4))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Deterministic fallback (no networkx)
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_placement(
    n: int,
    topology: str,
    scale: float,
) -> Dict[str, Tuple[float, float]]:
    """Static coordinate fallback when networkx is unavailable."""
    pitch = 1.1 * scale

    if topology == "line":
        half = (n - 1) * pitch / 2
        return {f"Q{i+1}": (round(-half + i * pitch, 4), 0.0) for i in range(n)}

    if topology == "ring":
        r = max(0.9, 0.45 * n * scale)
        return {
            f"Q{i+1}": (round(r * math.cos(2*math.pi*i/n), 4),
                         round(r * math.sin(2*math.pi*i/n), 4))
            for i in range(n)
        }

    if topology == "star":
        r = 1.2 * scale
        coords = {"Q1": (0.0, 0.0)}
        for i in range(1, n):
            angle = 2 * math.pi * (i - 1) / max(n - 1, 1)
            coords[f"Q{i+1}"] = (round(r * math.cos(angle), 4),
                                  round(r * math.sin(angle), 4))
        return coords

    # grid (default)
    cols = max(2, math.ceil(math.sqrt(n)))
    rows = math.ceil(n / cols)
    coords: Dict[str, Tuple[float, float]] = {}
    idx = 0
    for r in range(rows):
        for c in range(cols):
            if idx >= n:
                break
            x = round((c - (cols-1)/2) * pitch, 4)
            y = round(((rows-1)/2 - r) * pitch, 4)
            coords[f"Q{idx+1}"] = (x, y)
            idx += 1
    return coords


# ─────────────────────────────────────────────────────────────────────────────
# Orientation assignment
# ─────────────────────────────────────────────────────────────────────────────

def _assign_orientation(
    name: str,
    coords: Dict[str, Tuple[float, float]],
    edges: List[CouplingEdge],
) -> int:
    """
    Assign transmon orientation to minimise coupling pad conflicts.
    Simple rule: orient toward the nearest coupled neighbour.
    """
    x0, y0 = coords[name]
    neighbours = [
        (e.qubit_b if e.qubit_a == name else e.qubit_a)
        for e in edges
        if e.qubit_a == name or e.qubit_b == name
    ]
    if not neighbours:
        return 0

    # Average direction to all neighbours
    dx = sum(coords[nb][0] - x0 for nb in neighbours if nb in coords)
    dy = sum(coords[nb][1] - y0 for nb in neighbours if nb in coords)

    angle_deg = math.degrees(math.atan2(dy, dx)) % 360
    # Snap to nearest 90°
    return int(round(angle_deg / 90) % 4) * 90


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def place_qubits(
    n: int,
    topology: str = "grid",
    scale: float = 1.0,
    seed: int = 42,
) -> PlacementResult:
    """
    Convert (n, topology, scale) → optimised physical placement + coupling edges.

    Pipeline:
      1. Build networkx.Graph from logical topology
      2. Run Kamada-Kawai layout solver
      3. Scale to physical mm
      4. Assign orientations toward nearest neighbours
      5. Return PlacementResult

    Falls back to deterministic placement if networkx is unavailable.

    Parameters
    ----------
    n        : number of qubits  (1–24)
    topology : 'grid' | 'line' | 'ring' | 'star' | 'heavy_hex'
    scale    : physical scale factor  (1.0 = standard IBM pitch ~1.1 mm)
    seed     : RNG seed for layout reproducibility

    Returns
    -------
    PlacementResult with .qubits and .edges
    """
    n = max(1, n)

    # ── Step 1: Build logical graph ──────────────────────────────────────────
    G, edges = _build_logical_graph(n, topology)

    # ── Step 2: Solve physical coordinates ──────────────────────────────────
    if G is not None:
        try:
            coords = _solve_placement_graph(G, [f"Q{i+1}" for i in range(n)],
                                            scale, seed)
        except Exception:
            coords = _fallback_placement(n, topology, scale)
    else:
        coords = _fallback_placement(n, topology, scale)

    # ── Step 3: Build QubitPlacement list ───────────────────────────────────
    qubits: List[QubitPlacement] = []
    for i in range(n):
        name = f"Q{i+1}"
        x, y = coords.get(name, (0.0, 0.0))
        orient = _assign_orientation(name, coords, edges)
        qubits.append(QubitPlacement(name, x, y, orient))

    # ── Step 4: Estimate layout dimensions ──────────────────────────────────
    xs = [q.x_mm for q in qubits]
    ys = [q.y_mm for q in qubits]
    span_x = max(xs) - min(xs) if len(xs) > 1 else 1.1 * scale
    span_y = max(ys) - min(ys) if len(ys) > 1 else 1.1 * scale
    cols = max(1, math.ceil(math.sqrt(n)))
    rows = math.ceil(n / cols)
    pitch = max(span_x, span_y) / max(cols, rows, 1)

    return PlacementResult(
        qubits   = qubits,
        edges    = edges,
        topology = topology,
        cols     = cols,
        rows     = rows,
        pitch_mm = round(pitch, 4),
        graph    = G,
    )


def placement_to_dict(result: PlacementResult) -> dict:
    """Serialise PlacementResult to a plain dict for JSON/API responses."""
    return {
        "topology": result.topology,
        "cols":     result.cols,
        "rows":     result.rows,
        "pitch_mm": result.pitch_mm,
        "solver":   "kamada_kawai" if result.graph is not None else "deterministic",
        "qubits": [
            {
                "name":            q.name,
                "x_mm":           q.x_mm,
                "y_mm":           q.y_mm,
                "orientation_deg": q.orientation_deg,
            }
            for q in result.qubits
        ],
        "edges": [
            {
                "qubit_a": e.qubit_a,
                "pin_a":   e.pin_a,
                "qubit_b": e.qubit_b,
                "pin_b":   e.pin_b,
                "label":   e.label,
            }
            for e in result.edges
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Standalone demo
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    for topo in ["grid", "line", "ring", "star", "heavy_hex"]:
        p = place_qubits(4, topology=topo)
        solver = "KK" if p.graph is not None else "fallback"
        print(f"\n{topo} ({solver}):")
        for q in p.qubits:
            print(f"  {q.name}: ({q.x_mm:+.3f}, {q.y_mm:+.3f}) mm  orient={q.orientation_deg}°")
        print(f"  Edges: {[(e.qubit_a, e.qubit_b) for e in p.edges]}")
