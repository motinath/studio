"""Silicofeller dark theme for matplotlib visualizations."""

from __future__ import annotations

import matplotlib as mpl
import matplotlib.pyplot as plt

# --------------------------------------------------------------------------- #
# Color palette
# --------------------------------------------------------------------------- #

SILICOFELLER_THEME = {
    "background": "#1a1a2e",
    "surface": "#16213e",
    "primary": "#0f3460",
    "accent": "#e94560",
    "text": "#eeeeee",
    "text_secondary": "#a0a0b0",
    "grid": "#2a2a4a",
    "success": "#4ecca3",
    "warning": "#ffc93c",
    "error": "#e94560",
    "qubit_colors": [
        "#00d2ff",  # cyan
        "#ff6b6b",  # coral
        "#54e346",  # green
        "#ffd93d",  # gold
        "#c084fc",  # purple
    ],
    "channel_colors": [
        "#00d2ff",
        "#ff6b6b",
        "#54e346",
        "#ffd93d",
        "#c084fc",
        "#ff9ff3",
        "#48dbfb",
        "#ff9f43",
    ],
}


def get_qubit_color(index: int) -> str:
    """Get a color for qubit at the given index (wraps around)."""
    colors = SILICOFELLER_THEME["qubit_colors"]
    return colors[index % len(colors)]


def get_channel_color(index: int) -> str:
    """Get a color for a noise channel at the given index."""
    colors = SILICOFELLER_THEME["channel_colors"]
    return colors[index % len(colors)]


def apply_theme() -> None:
    """Apply the Silicofeller dark theme to matplotlib globally."""
    theme = SILICOFELLER_THEME

    mpl.rcParams.update({
        # Figure
        "figure.facecolor": theme["background"],
        "figure.edgecolor": theme["background"],
        "figure.figsize": (12, 7),
        "figure.dpi": 150,
        # Axes
        "axes.facecolor": theme["surface"],
        "axes.edgecolor": theme["grid"],
        "axes.labelcolor": theme["text"],
        "axes.titlesize": 14,
        "axes.titleweight": "bold",
        "axes.labelsize": 11,
        "axes.grid": True,
        "axes.spines.top": False,
        "axes.spines.right": False,
        # Grid
        "grid.color": theme["grid"],
        "grid.alpha": 0.3,
        "grid.linewidth": 0.5,
        # Text / tick
        "text.color": theme["text"],
        "xtick.color": theme["text_secondary"],
        "ytick.color": theme["text_secondary"],
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        # Legend
        "legend.facecolor": theme["surface"],
        "legend.edgecolor": theme["grid"],
        "legend.fontsize": 9,
        # Font
        "font.family": "sans-serif",
        "font.sans-serif": ["Inter", "Roboto", "DejaVu Sans"],
        "font.size": 10,
        # Savefig
        "savefig.facecolor": theme["background"],
        "savefig.edgecolor": theme["background"],
        "savefig.bbox": "tight",
        "savefig.pad_inches": 0.3,
    })
