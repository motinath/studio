"""Coupling map network graph visualization."""

from __future__ import annotations

import logging
import os

import matplotlib.pyplot as plt
import numpy as np

from physics_engine.visualization.theme import SILICOFELLER_THEME, apply_theme, get_qubit_color

logger = logging.getLogger(__name__)

try:
    import networkx as nx
except ImportError:
    nx = None  # type: ignore[assignment]


def plot_coupling_map(
    coupling_results: list[dict],
    qubit_ids: list[str],
    output_dir: str = "output",
) -> str:
    """Generate qubit coupling network graph.

    Args:
        coupling_results: List of dicts with keys:
            qubit_a, qubit_b, bare_coupling_mhz, zz_coupling_khz.
        qubit_ids: All qubit IDs in the design.
        output_dir: Output directory.

    Returns:
        Path to the generated PNG file.
    """
    if nx is None:
        logger.error("networkx not installed — cannot generate coupling map.")
        return ""

    apply_theme()
    os.makedirs(output_dir, exist_ok=True)

    fig, ax = plt.subplots(figsize=(8, 8))
    fig.suptitle("Qubit Coupling Map", fontsize=16, fontweight="bold")

    G = nx.Graph()

    # Add nodes
    for i, qid in enumerate(qubit_ids):
        G.add_node(qid, color=get_qubit_color(i))

    # Add edges with coupling data
    for cr in coupling_results:
        qa = cr.get("qubit_a", "")
        qb = cr.get("qubit_b", "")
        g_mhz = cr.get("bare_coupling_mhz", 0)
        zz_khz = cr.get("zz_coupling_khz", 0)

        if qa in qubit_ids and qb in qubit_ids and g_mhz > 0.01:
            G.add_edge(qa, qb, g_mhz=g_mhz, zz_khz=zz_khz)

    # Layout
    if len(qubit_ids) <= 3:
        pos = nx.spring_layout(G, seed=42, k=2)
    else:
        pos = nx.circular_layout(G)

    # Draw nodes
    node_colors = [get_qubit_color(i) for i in range(len(qubit_ids))]
    nx.draw_networkx_nodes(
        G, pos, ax=ax, node_size=2000, node_color=node_colors,
        edgecolors="white", linewidths=2, alpha=0.9,
    )
    nx.draw_networkx_labels(
        G, pos, ax=ax, font_size=13, font_weight="bold",
        font_color=SILICOFELLER_THEME["background"],
    )

    # Draw edges — color by ZZ magnitude
    if G.edges():
        edges = list(G.edges(data=True))
        zz_vals = [abs(e[2].get("zz_khz", 0)) for e in edges]
        max_zz = max(zz_vals) if zz_vals else 1.0

        for (u, v, data) in edges:
            zz = abs(data.get("zz_khz", 0))
            g = data.get("g_mhz", 0)

            # Color: green (low ZZ) → red (high ZZ)
            ratio = min(zz / max(max_zz, 1), 1.0)
            color = _interpolate_color(
                SILICOFELLER_THEME["success"],
                SILICOFELLER_THEME["error"],
                ratio,
            )

            nx.draw_networkx_edges(
                G, pos, edgelist=[(u, v)], ax=ax,
                width=2 + 3 * (g / max(max(d.get("g_mhz", 1) for _, _, d in edges), 1)),
                edge_color=[color], alpha=0.8,
            )

            # Edge label
            mid_x = (pos[u][0] + pos[v][0]) / 2
            mid_y = (pos[u][1] + pos[v][1]) / 2
            label = f"g={g:.1f} MHz\nZZ={zz:.1f} kHz"
            ax.text(
                mid_x, mid_y, label, ha="center", va="center",
                fontsize=8, color=SILICOFELLER_THEME["text"],
                bbox=dict(boxstyle="round,pad=0.3", facecolor=SILICOFELLER_THEME["surface"],
                         edgecolor=SILICOFELLER_THEME["grid"], alpha=0.9),
            )

    ax.set_xlim(-1.5, 1.5)
    ax.set_ylim(-1.5, 1.5)
    ax.axis("off")

    plt.tight_layout()
    path = os.path.join(output_dir, "coupling_map.png")
    fig.savefig(path)
    plt.close(fig)
    logger.info("Saved coupling map → %s", path)
    return path


def _interpolate_color(hex_a: str, hex_b: str, t: float) -> str:
    """Linearly interpolate between two hex colors."""
    r1, g1, b1 = int(hex_a[1:3], 16), int(hex_a[3:5], 16), int(hex_a[5:7], 16)
    r2, g2, b2 = int(hex_b[1:3], 16), int(hex_b[3:5], 16), int(hex_b[5:7], 16)
    r = int(r1 + (r2 - r1) * t)
    g = int(g1 + (g2 - g1) * t)
    b = int(b1 + (b2 - b1) * t)
    return f"#{r:02x}{g:02x}{b:02x}"
