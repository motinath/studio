"""report.py — DRC violation and report data structures (V2)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Optional


@dataclass
class DRCViolation:
    rule:       str
    domain:     str          # geometry | frequency | fabrication | connectivity
    severity:   str          # ERROR | WARNING | INFO
    message:    str
    components: List[str] = field(default_factory=list)
    measured:   Optional[float] = None
    limit:      Optional[float] = None
    units:      str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "rule":       self.rule,
            "domain":     self.domain,
            "severity":   self.severity,
            "message":    self.message,
            "components": self.components,
            "measured":   self.measured,
            "limit":      self.limit,
            "units":      self.units,
        }

    def __str__(self) -> str:
        loc = f" [{', '.join(self.components)}]" if self.components else ""
        val = (f"  measured={self.measured:.4f}{self.units}"
               f"  limit={self.limit:.4f}{self.units}" if self.measured is not None else "")
        return f"[{self.severity}] {self.domain}.{self.rule}{loc}: {self.message}{val}"


@dataclass
class DRCReport:
    violations: List[DRCViolation] = field(default_factory=list)

    @property
    def errors(self) -> List[DRCViolation]:
        return [v for v in self.violations if v.severity == "ERROR"]

    @property
    def warnings(self) -> List[DRCViolation]:
        return [v for v in self.violations if v.severity == "WARNING"]

    @property
    def passed(self) -> bool:
        return len(self.errors) == 0

    def by_domain(self, domain: str) -> List[DRCViolation]:
        return [v for v in self.violations if v.domain == domain]

    def to_dict(self) -> dict[str, Any]:
        return {
            "passed":   self.passed,
            "errors":   len(self.errors),
            "warnings": len(self.warnings),
            "total":    len(self.violations),
            "by_domain": {
                "geometry":     [v.to_dict() for v in self.by_domain("geometry")],
                "frequency":    [v.to_dict() for v in self.by_domain("frequency")],
                "fabrication":  [v.to_dict() for v in self.by_domain("fabrication")],
                "connectivity": [v.to_dict() for v in self.by_domain("connectivity")],
            },
            "violations": [v.to_dict() for v in self.violations],
        }

    def summary(self) -> dict[str, Any]:
        return {
            "passed":         self.passed,
            "total_errors":   len(self.errors),
            "total_warnings": len(self.warnings),
            "geometry_errors":     len(self.by_domain("geometry")),
            "frequency_errors":    len(self.by_domain("frequency")),
            "fabrication_errors":  len(self.by_domain("fabrication")),
            "connectivity_errors": len(self.by_domain("connectivity")),
        }
