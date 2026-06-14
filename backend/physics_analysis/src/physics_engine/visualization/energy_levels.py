"""Energy level diagrams for all qubits in the design."""

from __future__ import annotations

import logging
import os
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

from physics_engine.visualization.theme import SILICOFELLER_THEME, apply_theme, get_qubit_color

logger = logging.getLogger(__name__)


def plot_energy_levels(
    qubit_results: list[dict],
    output_dir: str = "output",
) -> str:
    """Generate side-by-side energy level ladder diagram.

    Args:
        qubit_results: List of dicts with keys: qubit_id, energy_levels_ghz,
            frequency_ghz, anharmonicity_ghz (or matching dataclass attributes).
        output_dir: Directory to save the plot.

    Returns:
        Path to the generated PNG file.
    """
    apply_theme()
    os.makedirs(output_dir, exist_ok=True)

    n_qubits = len(qubit_results)
    fig, axes = plt.subplots(1, n_qubits, figsize=(3.5 * n_qubits, 7), sharey=False)
    if n_qubits == 1:
        axes = [axes]

    fig.suptitle("Energy Level Diagrams", fontsize=16, fontweight="bold", y=0.98)

    for idx, qr in enumerate(qubit_results):
        ax = axes[idx]
        qid = qr.get("qubit_id", f"Q{idx+1}") if isinstance(qr, dict) else qr.qubit_id
        levels = qr.get("energy_levels_ghz", []) if isinstance(qr, dict) else qr.energy_levels_ghz
        freq = qr.get("frequency_ghz", 0) if isinstance(qr, dict) else qr.frequency_ghz
        alpha = qr.get("anharmonicity_ghz", 0) if isinstance(qr, dict) else qr.anharmonicity_ghz

        color = get_qubit_color(idx)
        max_levels = min(len(levels), 5)

        for i in range(max_levels):
            energy = levels[i]
            ax.hlines(
                energy, 0.2, 0.8, colors=color, linewidth=2.5, zorder=5
            )
            ax.text(
                0.85, energy, f"|{i}⟩",
                va="center", ha="left", fontsize=10, color=SILICOFELLER_THEME["text"],
            )

        # Annotate f01
        if max_levels >= 2:
            mid = (levels[0] + levels[1]) / 2
            ax.annotate(
                "", xy=(0.5, levels[1]), xytext=(0.5, levels[0]),
                arrowprops=dict(arrowstyle="<->", color=SILICOFELLER_THEME["success"], lw=1.5),
            )
            ax.text(
                0.15, mid, f"f₀₁={freq:.3f}\nGHz",
                va="center", ha="right", fontsize=8,
                color=SILICOFELLER_THEME["success"], fontweight="bold",
            )

        # Annotate anharmonicity
        if max_levels >= 3:
            f12 = levels[2] - levels[1]
            mid12 = (levels[1] + levels[2]) / 2
            ax.text(
                0.15, mid12, f"α={alpha*1000:.0f}\nMHz",
                va="center", ha="right", fontsize=8,
                color=SILICOFELLER_THEME["warning"],
            )

        ax.set_title(qid, fontsize=13, fontweight="bold", color=color)
        ax.set_xlim(0, 1.2)
        ax.set_ylabel("Energy (GHz)" if idx == 0 else "")
        ax.set_xticks([])
        ax.grid(axis="x", visible=False)

    plt.tight_layout()
    path = os.path.join(output_dir, "energy_levels.png")
    fig.savefig(path)
    plt.close(fig)
    logger.info("Saved energy level diagram → %s", path)
    return path
