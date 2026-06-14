"""
QChipLang Semantic Analyzer
Type checking, constraint validation, design rule checking (DRC),
and frequency collision detection for 50k+ qubit designs.
"""

import math
from typing import Any, Dict, List, Optional, Set, Tuple
from .ast_nodes import *


class SemanticError(Exception):
    pass


class DRCViolation:
    def __init__(self, rule: str, element: str, detail: str, severity: str = "ERROR"):
        self.rule = rule
        self.element = element
        self.detail = detail
        self.severity = severity

    def __str__(self):
        return f"[{self.severity}] DRC:{self.rule} on '{self.element}': {self.detail}"


class DesignMetrics:
    """Summary of key design parameters after analysis."""
    def __init__(self):
        self.total_qubits = 0
        self.total_resonators = 0
        self.total_couplers = 0
        self.total_tiles = 0
        self.chip_area_mm2 = 0.0
        self.frequency_bands: List[Tuple[float, float]] = []
        self.estimated_yield = 0.0
        self.routing_congestion = 0.0
        self.warnings: List[str] = []
        self.drc_violations: List[DRCViolation] = []

    def __str__(self):
        lines = [
            "=== QChipLang Design Metrics ===",
            f"  Total qubits      : {self.total_qubits:,}",
            f"  Total resonators  : {self.total_resonators:,}",
            f"  Total couplers    : {self.total_couplers:,}",
            f"  Total tiles       : {self.total_tiles:,}",
            f"  Chip area         : {self.chip_area_mm2:.2f} mm²",
            f"  Est. yield        : {self.estimated_yield:.1f}%",
            f"  DRC violations    : {len(self.drc_violations)}",
            f"  Warnings          : {len(self.warnings)}",
        ]
        if self.drc_violations:
            lines.append("\n--- DRC Violations ---")
            for v in self.drc_violations:
                lines.append(f"  {v}")
        if self.warnings:
            lines.append("\n--- Warnings ---")
            for w in self.warnings:
                lines.append(f"  WARN: {w}")
        return "\n".join(lines)


class SemanticAnalyzer:
    """
    Validates a parsed QChipLang AST:
      1. Type coercion and unit normalization
      2. Cross-reference resolution (coupler references qubit names, etc.)
      3. Design rule checking (DRC)
      4. Frequency collision detection
      5. Tile stitching consistency
      6. Yield / scalability estimates
    """

    def __init__(self, prog: Program):
        self.prog = prog
        self.metrics = DesignMetrics()
        self._qubit_registry: Dict[str, QubitDecl] = {}
        self._resonator_registry: Dict[str, ResonatorDecl] = {}
        self._coupler_registry: Dict[str, CouplerDecl] = {}
        self._design_rules: Dict[str, Any] = self._default_drc()

    def _default_drc(self) -> Dict[str, Any]:
        return {
            'min_gap': 4e-6,
            'min_trace_width': 4e-6,
            'qubit_exclusion_zone': 200e-6,
            'min_pad_gap': 20e-6,
            'collision_threshold': 20e6,
            'ground_plane_holes': True,
        }

    # ── Unit Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _to_hz(v: Any) -> Optional[float]:
        if isinstance(v, QValue):
            FREQ = {'Hz': 1, 'kHz': 1e3, 'MHz': 1e6, 'GHz': 1e9, 'THz': 1e12}
            return v.number * FREQ.get(v.unit, 1)
        return None

    @staticmethod
    def _to_m(v: Any) -> Optional[float]:
        if isinstance(v, QValue):
            LEN = {'nm': 1e-9, 'um': 1e-6, 'mm': 1e-3, 'cm': 1e-2}
            return v.number * LEN.get(v.unit, 1)
        return None

    # ── Registry Building ─────────────────────────────────────────────────────

    def _build_registries(self):
        for q in self.prog.qubits:
            if q.dims:
                count = 1
                for d in q.dims:
                    count *= d
                # Register as array entries
                self._qubit_registry[q.name] = q
                self.metrics.total_qubits += count
            else:
                self._qubit_registry[q.name] = q
                self.metrics.total_qubits += 1

        for r in self.prog.resonators:
            self._resonator_registry[r.name] = r
            self.metrics.total_resonators += 1

        for c in self.prog.couplers:
            self._coupler_registry[c.name] = c
            self.metrics.total_couplers += 1

        # Tile arrays
        for ta in self.prog.tile_arrays:
            count_attr = ta.attrs.get('count')
            tile_qubits = 4  # default per tile
            for t in self.prog.tiles:
                if t.name == ta.attrs.get('tile', ''):
                    tile_qubits = int(ta.attrs.get('qubits', 4))
            if isinstance(count_attr, QArray):
                n = 1
                for item in count_attr.items:
                    if isinstance(item, QValue):
                        n *= int(item.number)
                self.metrics.total_tiles += n
                self.metrics.total_qubits += n * tile_qubits
            self.metrics.total_tiles += 1

    # ── Chip-Level Checks ─────────────────────────────────────────────────────

    def _check_chip(self):
        chip = self.prog.chip
        if not chip:
            self.metrics.warnings.append("No 'chip' declaration found — metadata will be omitted")
            return

        declared = chip.attrs.get('qubit_count')
        if declared:
            declared_n = int(declared.number) if isinstance(declared, QValue) else int(declared)
            if self.metrics.total_qubits > 0 and abs(self.metrics.total_qubits - declared_n) > declared_n * 0.05:
                self.metrics.warnings.append(
                    f"Declared qubit_count={declared_n} but counted {self.metrics.total_qubits} from arrays/tiles"
                )

        # For 50k+ qubit designs, warn about yield
        n = max(self.metrics.total_qubits, declared_n if declared else 0)
        if n >= 10000:
            # Yield model: per-qubit yield ~ 99.9%, chip yield = 0.999^n
            per_qubit_yield = 0.9995
            chip_yield = per_qubit_yield ** n * 100
            self.metrics.estimated_yield = chip_yield
            if chip_yield < 1.0:
                self.metrics.warnings.append(
                    f"At {n:,} qubits with {per_qubit_yield*100:.3f}% per-qubit yield, "
                    f"chip-level yield ≈ {chip_yield:.3e}% — multi-die / chiplet architecture strongly recommended"
                )

    # ── Qubit Checks ──────────────────────────────────────────────────────────

    def _check_qubits(self):
        for q in self.prog.qubits:
            # Frequency in valid range
            freq = self._to_hz(q.attrs.get('frequency'))
            if freq and not (3e9 <= freq <= 8e9):
                self.metrics.warnings.append(
                    f"Qubit '{q.name}' frequency {freq/1e9:.2f} GHz outside typical 3–8 GHz range"
                )

            # Ej/Ec ratio — transmon regime requires Ej/Ec >> 1
            ej = self._to_hz(q.attrs.get('Ej'))
            ec = self._to_hz(q.attrs.get('Ec'))
            if ej and ec:
                ratio = ej / ec
                if q.attrs.get('type') == 'transmon' and ratio < 20:
                    self.metrics.warnings.append(
                        f"Qubit '{q.name}': Ej/Ec = {ratio:.1f} < 20, charge sensitivity risk for transmon"
                    )

            # Pad geometry DRC
            pad_gap = self._to_m(q.attrs.get('pad_gap'))
            if pad_gap and pad_gap < self._design_rules['min_pad_gap']:
                self.metrics.drc_violations.append(DRCViolation(
                    'MIN_PAD_GAP', q.name,
                    f"pad_gap={pad_gap*1e6:.1f}um < min {self._design_rules['min_pad_gap']*1e6:.1f}um"
                ))

    # ── Resonator Checks ─────────────────────────────────────────────────────

    def _check_resonators(self):
        for r in self.prog.resonators:
            freq = self._to_hz(r.attrs.get('frequency'))
            coupling_q = r.attrs.get('coupling_Q')

            # Resonator should be above qubit frequency
            if freq and freq < 5e9:
                self.metrics.warnings.append(
                    f"Resonator '{r.name}' at {freq/1e9:.2f} GHz may overlap qubit frequencies"
                )

            # Reference resolution: couples_to should name a known qubit
            couples_to = r.attrs.get('couples_to')
            if isinstance(couples_to, str) and couples_to not in self._qubit_registry:
                self.metrics.drc_violations.append(DRCViolation(
                    'UNRESOLVED_REF', r.name,
                    f"couples_to='{couples_to}' not found in qubit declarations", 'ERROR'
                ))

    # ── Coupler Checks ────────────────────────────────────────────────────────

    def _check_couplers(self):
        for c in self.prog.couplers:
            connects = c.attrs.get('connects')
            if isinstance(connects, QArray):
                for ref in connects.items:
                    if isinstance(ref, str) and ref not in self._qubit_registry:
                        self.metrics.drc_violations.append(DRCViolation(
                            'UNRESOLVED_REF', c.name,
                            f"connects references unknown qubit '{ref}'"
                        ))

            coupling = self._to_hz(c.attrs.get('coupling_strength'))
            if coupling and coupling > 50e6:
                self.metrics.warnings.append(
                    f"Coupler '{c.name}': coupling_strength={coupling/1e6:.0f} MHz is very strong — ZZ crosstalk risk"
                )

    # ── Frequency Collision Detection ─────────────────────────────────────────

    def _check_frequency_collisions(self):
        """
        For large arrays, frequency spread analysis using alternating patterns.
        Full pairwise is O(n²) — use histogram binning for 50k+ qubit scale.
        """
        freqs: List[float] = []
        for q in self.prog.qubits:
            freq_attr = q.attrs.get('frequency')
            if isinstance(freq_attr, QSweep):
                # Alternating: spread across range
                f0 = self._to_hz(freq_attr.start) or 4.8e9
                f1 = self._to_hz(freq_attr.end) or 5.2e9
                n = 1
                if q.dims:
                    n = 1
                    for d in q.dims:
                        n *= d
                # Generate alternating spread
                for i in range(min(n, 10000)):  # sample for large arrays
                    freqs.append(f0 if i % 2 == 0 else f1)
            elif isinstance(freq_attr, QValue):
                freqs.append(self._to_hz(freq_attr))

        threshold = self._design_rules['collision_threshold']
        freqs_sorted = sorted(freqs)
        collisions = 0
        for i in range(len(freqs_sorted) - 1):
            if freqs_sorted[i+1] - freqs_sorted[i] < threshold:
                collisions += 1

        if collisions > 0:
            self.metrics.drc_violations.append(DRCViolation(
                'FREQ_COLLISION', 'global',
                f"{collisions} qubit-pair frequency collisions within {threshold/1e6:.0f} MHz threshold",
                'WARNING'
            ))

    # ── Tile Array Checks ────────────────────────────────────────────────────

    def _check_tile_arrays(self):
        for ta in self.prog.tile_arrays:
            # Verify tile reference exists
            tile_ref = ta.attrs.get('tile')
            tile_found = any(t.name == tile_ref for t in self.prog.tiles)
            if tile_ref and not tile_found:
                self.metrics.drc_violations.append(DRCViolation(
                    'UNRESOLVED_REF', ta.name,
                    f"tile='{tile_ref}' not defined"
                ))

            # Area calculation
            pitch = ta.attrs.get('pitch')
            count = ta.attrs.get('count')
            if isinstance(pitch, QTuple) and isinstance(count, QArray):
                px = self._to_m(pitch.items[0])
                py = self._to_m(pitch.items[1]) if len(pitch.items) > 1 else px
                nx = int(count.items[0].number) if isinstance(count.items[0], QValue) else 1
                ny = int(count.items[1].number) if len(count.items) > 1 and isinstance(count.items[1], QValue) else 1
                if px and py:
                    area_m2 = (nx * px) * (ny * py)
                    self.metrics.chip_area_mm2 += area_m2 * 1e6  # m² → mm²

    # ── Design Rules Update ───────────────────────────────────────────────────

    def _load_design_rules(self):
        if not self.prog.design_rules:
            return
        rules = self.prog.design_rules.attrs
        for key, val in rules.items():
            if isinstance(val, QValue):
                si = val.to_si()
                self._design_rules[key] = si
            elif isinstance(val, bool):
                self._design_rules[key] = val

    # ── Process Stack Checks ─────────────────────────────────────────────────

    def _check_process_stack(self):
        if not self.prog.process_stack:
            return
        ps = self.prog.process_stack
        has_josephson = any(
            'josephson' in (l.attrs.get('material', '') or '').lower() or
            'al_alox' in (l.attrs.get('material', '') or '').lower()
            for l in ps.layers
        )
        if not has_josephson:
            self.metrics.warnings.append(
                "process_stack has no Josephson junction layer — qubits require Al/AlOx/Al or similar"
            )

    # ── Scalability Assessment ────────────────────────────────────────────────

    def _assess_scalability(self):
        n = self.metrics.total_qubits
        if n == 0:
            return

        # Control line congestion: ~1 feedline per 10 resonators
        n_feedlines = len(self.prog.feedlines)
        needed_feedlines = math.ceil(self.metrics.total_resonators / 10)
        if n_feedlines < needed_feedlines and self.metrics.total_resonators > 0:
            self.metrics.warnings.append(
                f"Only {n_feedlines} feedlines declared for {self.metrics.total_resonators} resonators; "
                f"recommend ≥ {needed_feedlines}"
            )

        # For 50k qubits: chiplet/multi-die is essentially mandatory
        if n >= 5000 and not self.prog.package:
            self.metrics.warnings.append(
                f"At {n:,} qubits, a 'package' block (flip-chip or multi-chiplet) is strongly recommended"
            )

        # Routing congestion heuristic
        n_connects = len(self.prog.connections)
        if n > 0:
            self.metrics.routing_congestion = min(n_connects / n * 100, 100.0)

    # ── Main Entry ────────────────────────────────────────────────────────────

    def analyze(self) -> DesignMetrics:
        self._load_design_rules()
        self._build_registries()
        self._check_chip()
        self._check_qubits()
        self._check_resonators()
        self._check_couplers()
        self._check_frequency_collisions()
        self._check_tile_arrays()
        self._check_process_stack()
        self._assess_scalability()
        return self.metrics


def analyze_qcl(prog: Program) -> DesignMetrics:
    return SemanticAnalyzer(prog).analyze()
