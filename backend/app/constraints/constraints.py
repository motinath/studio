"""
constraints.py — Typed design constraint definitions.

DesignConstraints is the top-level spec the user (or AI) provides.
Every generator reads from this and stays within bounds.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Optional


@dataclass
class FabConstraints:
    """Fabrication process rules — minimum feature sizes, spacings, radii."""
    min_qubit_spacing_mm:  float = 0.6    # centre-to-centre
    min_cpw_width_um:      float = 5.0    # CPW centre conductor minimum
    min_cpw_gap_um:        float = 4.0    # CPW gap minimum
    min_bend_radius_um:    float = 50.0   # CPW bend radius (routing)
    min_resonator_gap_mm:  float = 0.1    # between adjacent resonator routes
    pocket_half_size_mm:   float = 0.33   # TransmonPocket half-width

    def to_dict(self) -> dict[str, Any]:
        return {
            "min_qubit_spacing_mm":  self.min_qubit_spacing_mm,
            "min_cpw_width_um":      self.min_cpw_width_um,
            "min_cpw_gap_um":        self.min_cpw_gap_um,
            "min_bend_radius_um":    self.min_bend_radius_um,
            "min_resonator_gap_mm":  self.min_resonator_gap_mm,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "FabConstraints":
        return cls(**{k: v for k, v in d.items() if hasattr(cls, k)})


@dataclass
class FreqConstraints:
    """Frequency allocation constraints."""
    qubit_freq_min_ghz:    float = 4.5    # lowest allowed qubit frequency
    qubit_freq_max_ghz:    float = 6.0    # highest allowed qubit frequency
    readout_freq_min_ghz:  float = 6.2    # readout band lower bound
    readout_freq_max_ghz:  float = 7.8    # readout band upper bound
    min_qubit_detuning_mhz: float = 100.0 # nearest-neighbour qubit separation
    min_readout_detuning_mhz: float = 50.0 # resonator-resonator separation
    min_dispersive_detuning_ghz: float = 1.0  # |f_r - f_q| minimum
    max_dispersive_detuning_ghz: float = 3.0  # |f_r - f_q| maximum
    target_freq_ghz:       float = 5.0    # centre of qubit band

    def to_dict(self) -> dict[str, Any]:
        return {
            "qubit_band_ghz":         [self.qubit_freq_min_ghz, self.qubit_freq_max_ghz],
            "readout_band_ghz":       [self.readout_freq_min_ghz, self.readout_freq_max_ghz],
            "min_qubit_detuning_mhz": self.min_qubit_detuning_mhz,
            "min_dispersive_detuning_ghz": self.min_dispersive_detuning_ghz,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "FreqConstraints":
        return cls(**{k: v for k, v in d.items() if hasattr(cls, k)})


@dataclass
class DesignConstraints:
    """
    Top-level design constraint specification.

    This is what a user or AI assistant provides.  The entire generation
    pipeline operates within these bounds.

    Example
    -------
        DesignConstraints(
            qubit_count = 20,
            chip_size_mm = 10.0,
            technology = "transmon",
            topology = "heavy_hex",
            substrate = "silicon",
            metal = "aluminum",
        )
    """
    qubit_count:    int   = 5
    chip_size_mm:   float = 10.0      # square chip; use chip_width/height for non-square
    chip_width_mm:  float = 0.0       # 0 → use chip_size_mm
    chip_height_mm: float = 0.0       # 0 → use chip_size_mm
    technology:     str   = "transmon"
    topology:       str   = "grid"
    substrate:      str   = "silicon"
    metal:          str   = "aluminum"
    scale:          float = 1.0       # placement scale factor

    fab: FabConstraints  = field(default_factory=FabConstraints)
    freq: FreqConstraints = field(default_factory=FreqConstraints)

    # Optional extras
    chip_name:     str            = "QuantumChip"
    notes:         str            = ""
    tags:          List[str]      = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.chip_width_mm == 0.0:
            self.chip_width_mm = self.chip_size_mm
        if self.chip_height_mm == 0.0:
            self.chip_height_mm = self.chip_size_mm

    def to_dict(self) -> dict[str, Any]:
        return {
            "qubit_count":    self.qubit_count,
            "chip_width_mm":  self.chip_width_mm,
            "chip_height_mm": self.chip_height_mm,
            "technology":     self.technology,
            "topology":       self.topology,
            "substrate":      self.substrate,
            "metal":          self.metal,
            "scale":          self.scale,
            "chip_name":      self.chip_name,
            "fab":            self.fab.to_dict(),
            "freq":           self.freq.to_dict(),
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "DesignConstraints":
        fab_d  = d.pop("fab",  {})
        freq_d = d.pop("freq", {})
        # map chip_size_mm shorthand
        if "chip_size_mm" in d and "chip_width_mm" not in d:
            d["chip_width_mm"]  = float(d["chip_size_mm"])
            d["chip_height_mm"] = float(d["chip_size_mm"])
        valid = {k: v for k, v in d.items() if k in cls.__dataclass_fields__}
        obj = cls(**valid)
        if fab_d:
            obj.fab  = FabConstraints.from_dict(fab_d)
        if freq_d:
            obj.freq = FreqConstraints.from_dict(freq_d)
        return obj

    @classmethod
    def from_prompt_params(cls, params: dict[str, Any]) -> "DesignConstraints":
        """Build constraints from chip_generator.parse_prompt() output."""
        return cls(
            qubit_count  = int(params.get("num_qubits", 5)),
            technology   = str(params.get("qubit_type", "transmon")),
            topology     = str(params.get("topology", "grid")),
            substrate    = str(params.get("substrate", "silicon")),
            metal        = str(params.get("metal", "aluminum")),
            scale        = float(params.get("scale", 1.0)),
            freq         = FreqConstraints(
                target_freq_ghz = float(params.get("target_freq_ghz", 5.0)),
            ),
        )
