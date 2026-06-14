"""Coherence breakdown bar charts showing T1/T2 channel contributions."""

from __future__ import annotations

import logging
import os

import matplotlib.pyplot as plt
import numpy as np

from physics_engine.visualization.theme import (
    SILICOFELLER_THEME,
    apply_theme,
    get_channel_color,
    get_qubit_color,
)

logger = logging.getLogger(__name__)


def plot_coherence_breakdown(
    coherence_data: list[dict],
    target_t1_us: float = 50.0,
    target_t2_us: float = 30.0,
    output_dir: str = "output",
) -> str:
    """Generate coherence breakdown bar chart.

    Args:
        coherence_data: List of dicts with keys:
            qubit_id, T1_effective_us, T2_effective_us,
            t1_channels: [{channel, value_us}], tphi_channels: [{channel, value_us}]
        target_t1_us: Target T1 for reference line.
        target_t2_us: Target T2 for reference line.
        output_dir: Output directory.

    Returns:
        Path to the generated PNG file.
    """
    apply_theme()
    os.makedirs(output_dir, exist_ok=True)

    n_qubits = len(coherence_data)
    fig, (ax_t1, ax_t2) = plt.subplots(1, 2, figsize=(14, max(4, 1.5 * n_qubits)))
    fig.suptitle("Coherence Analysis", fontsize=16, fontweight="bold")

    qubit_ids = [cd.get("qubit_id", f"Q{i+1}") for i, cd in enumerate(coherence_data)]
    y_pos = np.arange(n_qubits)

    # --- T1 breakdown ---
    ax_t1.set_title("T₁ Channel Breakdown", fontsize=13)

    for idx, cd in enumerate(coherence_data):
        t1_eff = cd.get("T1_effective_us", 0)
        channels = cd.get("t1_channels", [])

        # Plot individual channels as thin bars
        for ch_idx, ch in enumerate(channels):
            ch_name = ch.get("channel", "")
            ch_val = ch.get("value_us", 0)
            short_name = ch_name.replace("t1_", "").replace("_", " ")
            ax_t1.barh(
                idx + 0.1 * ch_idx - 0.15,
                min(ch_val, 2000),  # cap for visibility
                height=0.12,
                color=get_channel_color(ch_idx),
                alpha=0.7,
                label=short_name if idx == 0 else "",
            )

        # Effective T1 marker
        ax_t1.plot(
            t1_eff, idx, "D", color=get_qubit_color(idx),
            markersize=10, markeredgecolor="white", markeredgewidth=1.5,
            zorder=10,
        )

    # Target line
    ax_t1.axvline(target_t1_us, color=SILICOFELLER_THEME["warning"],
                  linestyle="--", linewidth=1.5, alpha=0.8, label=f"Target ({target_t1_us} µs)")
    ax_t1.set_yticks(y_pos)
    ax_t1.set_yticklabels(qubit_ids)
    ax_t1.set_xlabel("T₁ (µs)")
    ax_t1.legend(fontsize=7, loc="lower right")

    # --- T2 summary ---
    ax_t2.set_title("T₂ Effective", fontsize=13)

    t2_vals = [cd.get("T2_effective_us", 0) for cd in coherence_data]
    colors = [
        SILICOFELLER_THEME["success"] if v >= target_t2_us
        else SILICOFELLER_THEME["warning"] if v >= target_t2_us * 0.5
        else SILICOFELLER_THEME["error"]
        for v in t2_vals
    ]

    bars = ax_t2.barh(y_pos, t2_vals, height=0.5, color=colors, alpha=0.8, edgecolor="white", linewidth=0.5)
    ax_t2.axvline(target_t2_us, color=SILICOFELLER_THEME["warning"],
                  linestyle="--", linewidth=1.5, alpha=0.8, label=f"Target ({target_t2_us} µs)")

    for i, (bar, val) in enumerate(zip(bars, t2_vals)):
        ax_t2.text(val + 1, i, f"{val:.0f} µs", va="center", fontsize=9,
                   color=SILICOFELLER_THEME["text"])

    ax_t2.set_yticks(y_pos)
    ax_t2.set_yticklabels(qubit_ids)
    ax_t2.set_xlabel("T₂ (µs)")
    ax_t2.legend(fontsize=8)

    plt.tight_layout()
    path = os.path.join(output_dir, "coherence_breakdown.png")
    fig.savefig(path)
    plt.close(fig)
    logger.info("Saved coherence breakdown → %s", path)
    return path
