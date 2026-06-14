"""
frequency_drc.py — Frequency domain DRC checks.

Checks
------
  QUBIT_COLLISION          — adjacent qubits < min_detuning_mhz apart
  GLOBAL_QUBIT_COLLISION   — any two qubits < 50 MHz (even non-adjacent)
  READOUT_COLLISION        — two readout resonators < min_readout_sep apart
  DISPERSIVE_LOW           — |f_r - f_q| below dispersive regime threshold
  DISPERSIVE_HIGH          — |f_r - f_q| too large (χ becomes small)
  PURCELL_RISK             — qubit-resonator detuning in Purcell-enhanced regime
  QUBIT_BAND_VIOLATION     — qubit frequency outside allowed band
  READOUT_BAND_VIOLATION   — resonator frequency outside readout band
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from app.drc.report import DRCViolation


class FrequencyDRC:
    """Frequency domain DRC checks."""

    def __init__(
        self,
        qubit_freqs:     Dict[str, float],   # name → GHz
        resonator_freqs: Dict[str, float],   # name → GHz, key = "RO_Q1" etc.
        qubit_resonator_map: Dict[str, str], # qubit_name → resonator_name
        coupling_graph:  Dict[str, List[str]], # qubit_name → [coupled qubit names]
        # Configurable thresholds
        min_qubit_detuning_mhz:   float = 100.0,
        min_global_detuning_mhz:  float = 50.0,
        min_readout_sep_mhz:      float = 50.0,
        min_dispersive_ghz:       float = 1.0,
        max_dispersive_ghz:       float = 3.0,
        purcell_risk_threshold_ghz: float = 0.5,
        qubit_band_ghz:  Tuple[float, float] = (4.5, 6.0),
        readout_band_ghz: Tuple[float, float] = (6.2, 7.8),
    ) -> None:
        self.qf   = qubit_freqs
        self.rf   = resonator_freqs
        self.qrm  = qubit_resonator_map
        self.cg   = coupling_graph
        self.min_q_det    = min_qubit_detuning_mhz / 1000.0
        self.min_g_det    = min_global_detuning_mhz / 1000.0
        self.min_r_sep    = min_readout_sep_mhz / 1000.0
        self.min_disp     = min_dispersive_ghz
        self.max_disp     = max_dispersive_ghz
        self.purcell_risk = purcell_risk_threshold_ghz
        self.qband        = qubit_band_ghz
        self.rband        = readout_band_ghz
        self._v: List[DRCViolation] = []

    def _add(self, rule, severity, message, components=None, measured=None, limit=None, units=""):
        self._v.append(DRCViolation(
            rule=rule, domain="frequency", severity=severity,
            message=message, components=components or [],
            measured=measured, limit=limit, units=units,
        ))

    def check_qubit_collision(self) -> None:
        """Adjacent (coupled) qubits that are too close in frequency."""
        names = list(self.qf.keys())
        for name, coupled in self.cg.items():
            fq = self.qf.get(name, 0.0)
            for nb in coupled:
                fn = self.qf.get(nb, 0.0)
                delta = abs(fq - fn)
                if delta < self.min_q_det:
                    self._add("QUBIT_COLLISION", "ERROR",
                              f"Adjacent qubits {name} ({fq:.4f} GHz) and "
                              f"{nb} ({fn:.4f} GHz) are only {delta*1000:.0f} MHz apart",
                              [name, nb], round(delta*1000,1), self.min_q_det*1000, " MHz")

    def check_global_qubit_collision(self) -> None:
        """Any two qubits < 50 MHz apart (even non-adjacent — crosstalk risk)."""
        names = list(self.qf.keys())
        for i, n1 in enumerate(names):
            for j, n2 in enumerate(names):
                if j <= i:
                    continue
                delta = abs(self.qf[n1] - self.qf[n2])
                if delta < self.min_g_det:
                    self._add("GLOBAL_QUBIT_COLLISION", "WARNING",
                              f"Qubits {n1} and {n2} are only {delta*1000:.0f} MHz apart "
                              f"(crosstalk risk even without direct coupling)",
                              [n1, n2], round(delta*1000,1), self.min_g_det*1000, " MHz")

    def check_readout_collision(self) -> None:
        """Two readout resonators too close in frequency."""
        rnames = sorted(self.rf.keys())
        for i, r1 in enumerate(rnames):
            for j, r2 in enumerate(rnames):
                if j <= i:
                    continue
                delta = abs(self.rf[r1] - self.rf[r2])
                if delta < self.min_r_sep:
                    self._add("READOUT_COLLISION", "ERROR",
                              f"Resonators {r1} ({self.rf[r1]:.4f} GHz) and "
                              f"{r2} ({self.rf[r2]:.4f} GHz) are only {delta*1000:.0f} MHz apart",
                              [r1, r2], round(delta*1000,1), self.min_r_sep*1000, " MHz")

    def check_dispersive_detuning(self) -> None:
        """Qubit-resonator dispersive detuning limits."""
        for qname, rname in self.qrm.items():
            fq = self.qf.get(qname)
            fr = self.rf.get(rname)
            if fq is None or fr is None:
                continue
            det = abs(fr - fq)
            if det < self.min_disp:
                self._add("DISPERSIVE_LOW", "ERROR",
                          f"{rname} detuning {det:.3f} GHz too small — "
                          f"not in dispersive regime (need ≥ {self.min_disp} GHz)",
                          [qname, rname], round(det,4), self.min_disp, " GHz")
            elif det > self.max_disp:
                self._add("DISPERSIVE_HIGH", "WARNING",
                          f"{rname} detuning {det:.3f} GHz very large — "
                          f"dispersive shift χ may be too small for readout",
                          [qname, rname], round(det,4), self.max_disp, " GHz")

    def check_purcell_risk(self) -> None:
        """
        Purcell effect risk: qubit too close to resonator in frequency.
        Purcell rate Γ_1 ∝ (g/Δ)² · κ — becomes significant when |Δ| < 0.5 GHz.
        """
        for qname, rname in self.qrm.items():
            fq = self.qf.get(qname)
            fr = self.rf.get(rname)
            if fq is None or fr is None:
                continue
            det = abs(fr - fq)
            if det < self.purcell_risk:
                self._add("PURCELL_RISK", "ERROR",
                          f"{qname}–{rname} detuning {det:.3f} GHz is in Purcell-enhanced regime "
                          f"(< {self.purcell_risk} GHz) — T1 will be Purcell-limited",
                          [qname, rname], round(det,4), self.purcell_risk, " GHz")

    def check_frequency_bands(self) -> None:
        """Qubits and resonators within allowed frequency bands."""
        for name, freq in self.qf.items():
            if freq < self.qband[0] or freq > self.qband[1]:
                self._add("QUBIT_BAND_VIOLATION", "WARNING",
                          f"{name} frequency {freq:.4f} GHz outside allowed band "
                          f"[{self.qband[0]}, {self.qband[1]}] GHz",
                          [name], round(freq,4), self.qband[1], " GHz")
        for name, freq in self.rf.items():
            if freq < self.rband[0] or freq > self.rband[1]:
                self._add("READOUT_BAND_VIOLATION", "WARNING",
                          f"{name} frequency {freq:.4f} GHz outside readout band "
                          f"[{self.rband[0]}, {self.rband[1]}] GHz",
                          [name], round(freq,4), self.rband[1], " GHz")

    def run(self) -> List[DRCViolation]:
        self._v = []
        self.check_qubit_collision()
        self.check_global_qubit_collision()
        self.check_readout_collision()
        self.check_dispersive_detuning()
        self.check_purcell_risk()
        self.check_frequency_bands()
        return list(self._v)
