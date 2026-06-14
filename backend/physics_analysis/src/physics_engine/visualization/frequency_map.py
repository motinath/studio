"""Frequency allocation map showing qubit and resonator frequencies on a number line."""

from __future__ import annotations

import logging
import os

import matplotlib.pyplot as plt
import numpy as np

from physics_engine.visualization.theme import SILICOFELLER_THEME, apply_theme, get_qubit_color

logger = logging.getLogger(__name__)


def plot_frequency_map(
    qubit_freqs: dict[str, float],
    resonator_freqs: dict[str, float] | None = None,
    min_spacing_mhz: float = 100.0,
    output_dir: str = "output",
) -> str:
    """Generate frequency allocation diagram.

    Shows all qubit and resonator frequencies on a horizontal number line
    with spacing annotations.

    Args:
        qubit_freqs: {qubit_id: frequency_ghz}.
        resonator_freqs: {resonator_id: frequency_ghz}.
        min_spacing_mhz: Minimum required qubit spacing.
        output_dir: Output directory.

    Returns:
        Path to generated PNG.
    """
    apply_theme()
    os.makedirs(output_dir, exist_ok=True)
    resonator_freqs = resonator_freqs or {}

    fig, ax = plt.subplots(figsize=(14, 5))
    fig.suptitle("Frequency Allocation Map", fontsize=16, fontweight="bold")

    all_freqs = list(qubit_freqs.values()) + list(resonator_freqs.values())
    if not all_freqs:
        plt.close(fig)
        return ""

    f_min = min(all_freqs) - 0.5
    f_max = max(all_freqs) + 0.5

    # Draw frequency axis
    ax.axhline(0.5, color=SILICOFELLER_THEME["grid"], linewidth=2, zorder=1)

    # Plot qubit frequencies (above the line)
    sorted_qubits = sorted(qubit_freqs.items(), key=lambda x: x[1])
    for idx, (qid, freq) in enumerate(sorted_qubits):
        color = get_qubit_color(idx)
        ax.plot(freq, 0.5, "o", color=color, markersize=18, markeredgecolor="white",
                markeredgewidth=2, zorder=5)
        ax.annotate(
            f"{qid}\n{freq:.3f} GHz",
            xy=(freq, 0.5), xytext=(freq, 0.85),
            ha="center", va="bottom", fontsize=9, fontweight="bold",
            color=color,
            arrowprops=dict(arrowstyle="-", color=color, lw=1, alpha=0.5),
        )

    # Plot resonator frequencies (below the line)
    sorted_resonators = sorted(resonator_freqs.items(), key=lambda x: x[1])
    for idx, (rid, freq) in enumerate(sorted_resonators):
        ax.plot(freq, 0.5, "s", color=SILICOFELLER_THEME["text_secondary"],
                markersize=14, markeredgecolor="white", markeredgewidth=1.5, zorder=4)
        ax.annotate(
            f"{rid}\n{freq:.3f} GHz",
            xy=(freq, 0.5), xytext=(freq, 0.15),
            ha="center", va="top", fontsize=8,
            color=SILICOFELLER_THEME["text_secondary"],
            arrowprops=dict(arrowstyle="-", color=SILICOFELLER_THEME["text_secondary"],
                           lw=1, alpha=0.5),
        )

    # Annotate spacings between adjacent qubits
    for i in range(len(sorted_qubits) - 1):
        id_a, f_a = sorted_qubits[i]
        id_b, f_b = sorted_qubits[i + 1]
        spacing_mhz = (f_b - f_a) * 1000
        mid = (f_a + f_b) / 2

        color = (SILICOFELLER_THEME["success"] if spacing_mhz >= min_spacing_mhz
                 else SILICOFELLER_THEME["error"])

        ax.annotate(
            "", xy=(f_b, 0.5), xytext=(f_a, 0.5),
            arrowprops=dict(arrowstyle="<->", color=color, lw=1.5),
        )
        ax.text(
            mid, 0.58, f"{spacing_mhz:.0f} MHz",
            ha="center", va="bottom", fontsize=8, fontweight="bold",
            color=color,
        )

    ax.set_xlim(f_min, f_max)
    ax.set_ylim(0, 1.1)
    ax.set_xlabel("Frequency (GHz)", fontsize=12)
    ax.set_yticks([])
    ax.grid(axis="y", visible=False)

    # Legend
    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], marker="o", color="w", markerfacecolor=get_qubit_color(0),
               markersize=10, label="Qubits"),
        Line2D([0], [0], marker="s", color="w",
               markerfacecolor=SILICOFELLER_THEME["text_secondary"],
               markersize=10, label="Resonators"),
    ]
    ax.legend(handles=legend_elements, loc="upper right", fontsize=9)

    plt.tight_layout()
    path = os.path.join(output_dir, "frequency_map.png")
    fig.savefig(path)
    plt.close(fig)
    logger.info("Saved frequency map → %s", path)
    return path
