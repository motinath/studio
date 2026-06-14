"""
Verification Engine V2 — runs all checks on a compiled design.

Checks (4 domains):
  1. Geometry    — qubit spacing, overlap, off-chip, resonator collision
  2. Frequency   — qubit collision, readout collision, dispersive detuning, Purcell
  3. Fabrication — CPW dimensions, bend radius, process compatibility
  4. Connectivity — disconnected qubit, missing resonator, broken feedline

Falls back to simple checks if V2 DRC modules unavailable.
"""

from __future__ import annotations

import math
from typing import Any


def run_verification(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Run full verification suite on a GenerateResponse payload.

    Tries V2 DRC engine first, falls back to V1 simple checks.
    Returns a verification report dict.
    """
    try:
        return _run_v2_drc(payload)
    except Exception:
        return _run_v1_fallback(payload)


# ─────────────────────────────────────────────────────────────────────────────
# V2 DRC (uses app.drc modules)
# ─────────────────────────────────────────────────────────────────────────────

def _run_v2_drc(payload: dict[str, Any]) -> dict[str, Any]:
    from app.drc.runner import run_drc_from_payload

    report = run_drc_from_payload(payload)
    full   = report.to_dict()

    fp         = payload.get("frequency_plan") or {}
    placement  = payload.get("placement") or {}
    qfreqs     = fp.get("qubit_frequencies_GHz", {})
    substrate  = fp.get("substrate", payload.get("material", {}).get("substrate", "silicon"))

    # Yield estimate
    n_errors   = len(report.errors)
    n_warnings = len(report.warnings)
    num_q      = len(qfreqs)
    base_yield = 0.98 if num_q <= 10 else (0.95 if num_q <= 50 else 0.90)
    yield_est  = max(0.3, base_yield - n_errors * 0.05 - n_warnings * 0.01)

    # Coherence estimate
    coherence = {
        "silicon":       {"T1_us": 100, "T2_us": 150},
        "sapphire":      {"T1_us": 300, "T2_us": 400},
        "silicon_nitride": {"T1_us": 50,  "T2_us": 80},
    }.get(substrate, {"T1_us": 100, "T2_us": 150})

    # Map violations to legacy format
    violations = []
    freq_collisions = []
    crosstalk_warnings = []

    for v in report.violations:
        entry = {
            "type":     v.domain,
            "severity": v.severity.lower(),
            "rule":     v.rule,
            "message":  v.message,
        }
        if v.domain == "frequency" and "COLLISION" in v.rule:
            freq_collisions.append(entry)
        elif v.domain == "geometry" and "SPACING" not in v.rule:
            crosstalk_warnings.append(entry)
        else:
            violations.append(entry)

    overall_status = (
        "failed"  if n_errors > 0
        else "warning" if n_warnings > 3
        else "passed"
    )

    return {
        "status":           overall_status,
        "drc_passed":       report.passed,
        "violations":       violations,
        "frequency_collisions": freq_collisions,
        "crosstalk_warnings":   crosstalk_warnings,
        "drc_v2":           full,
        "summary": {
            "total_issues":    len(report.violations),
            "critical":        n_errors,
            "major":           n_warnings,
            "minor":           0,
            "yield_estimate":  round(yield_est * 100, 1),
            "coherence_budget": coherence,
            "num_qubits":      num_q,
            "by_domain": {
                "geometry":     len(report.by_domain("geometry")),
                "frequency":    len(report.by_domain("frequency")),
                "fabrication":  len(report.by_domain("fabrication")),
                "connectivity": len(report.by_domain("connectivity")),
            },
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# V1 fallback (simple checks — used if V2 modules not yet available)
# ─────────────────────────────────────────────────────────────────────────────

def _run_v1_fallback(payload: dict[str, Any]) -> dict[str, Any]:
    violations: list[dict] = []
    freq_collisions: list[dict] = []
    crosstalk_warnings: list[dict] = []

    fp        = payload.get("frequency_plan") or {}
    placement = payload.get("placement") or {}
    drc       = payload.get("drc") or {}

    # DRC violations
    for v in drc.get("violations", []):
        violations.append({
            "type":     "drc",
            "severity": v.get("severity", "error"),
            "rule":     v.get("rule", "UNKNOWN"),
            "message":  v.get("message", ""),
        })

    # Frequency collisions
    qubit_freqs = fp.get("qubit_frequencies_GHz", {})
    res_freqs   = fp.get("resonator_frequencies_GHz", {})
    sorted_q    = sorted(qubit_freqs.items(), key=lambda x: x[1])
    for (n1, f1), (n2, f2) in zip(sorted_q, sorted_q[1:]):
        delta = abs(f1 - f2)
        if delta < 0.05:
            freq_collisions.append({
                "type": "frequency_collision", "severity": "error",
                "qubits": [n1, n2], "delta_mhz": round(delta * 1000, 2),
                "message": f"{n1} and {n2} collision — {delta*1000:.0f} MHz separation",
            })
        elif delta < 0.1:
            freq_collisions.append({
                "type": "frequency_collision", "severity": "warning",
                "qubits": [n1, n2], "delta_mhz": round(delta * 1000, 2),
                "message": f"{n1} and {n2} close — {delta*1000:.0f} MHz separation",
            })

    # Crosstalk (geometric)
    qubits = placement.get("qubits", [])
    for i in range(len(qubits)):
        for j in range(i + 1, len(qubits)):
            q1, q2 = qubits[i], qubits[j]
            dist = math.sqrt((q1["x"] - q2["x"]) ** 2 + (q1["y"] - q2["y"]) ** 2)
            if 0.4 < dist < 1.0:
                zz = round(0.1 * math.exp(-dist / 0.5), 4)
                crosstalk_warnings.append({
                    "type": "zz_crosstalk", "severity": "warning" if zz > 0.05 else "info",
                    "qubits": [q1.get("name","?"), q2.get("name","?")],
                    "distance_mm": round(dist, 3), "zz_estimate_mhz": zz,
                    "message": f"ZZ ~{zz:.3f} MHz between {q1.get('name','')} and {q2.get('name','')}",
                })

    num_q      = len(qubit_freqs)
    n_errors   = sum(1 for v in violations if v["severity"] == "error")
    n_freq_err = sum(1 for f in freq_collisions if f["severity"] == "error")
    total_err  = n_errors + n_freq_err
    base_yield = 0.98 if num_q <= 10 else (0.95 if num_q <= 50 else 0.90)
    yield_est  = max(0.3, base_yield - total_err * 0.05)
    substrate  = fp.get("substrate", "silicon")
    coherence  = {"silicon": {"T1_us": 100, "T2_us": 150},
                  "sapphire": {"T1_us": 300, "T2_us": 400}}.get(substrate, {"T1_us": 100, "T2_us": 150})
    all_issues = violations + freq_collisions + crosstalk_warnings
    n_crit     = sum(1 for i in all_issues if i["severity"] == "error")
    n_major    = sum(1 for i in all_issues if i["severity"] == "warning")
    status     = "failed" if n_crit > 0 else ("warning" if n_major > 3 else "passed")

    return {
        "status":               status,
        "drc_passed":           drc.get("passed", False),
        "violations":           violations,
        "frequency_collisions": freq_collisions,
        "crosstalk_warnings":   crosstalk_warnings,
        "summary": {
            "total_issues":    len(all_issues),
            "critical":        n_crit,
            "major":           n_major,
            "minor":           sum(1 for i in all_issues if i["severity"] == "info"),
            "yield_estimate":  round(yield_est * 100, 1),
            "coherence_budget": coherence,
            "num_qubits":      num_q,
        },
    }
