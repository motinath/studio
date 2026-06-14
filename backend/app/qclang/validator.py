"""
QCLang Validator — semantic checks on the AST.

Checks:
  - Qubit names are unique
  - Coupler references existing qubits
  - Readout / resonator references existing qubit
  - No self-coupling (c1 connect(q1, q1))
  - Qubit types are supported
"""

from __future__ import annotations

from dataclasses import dataclass

from app.qclang.ast_nodes import ChipNode, Program


SUPPORTED_QUBIT_TYPES = {"transmon", "fluxonium", "xmon", "gmon", "scqubit"}


@dataclass
class ValidationError:
    severity: str  # "error" | "warning"
    message: str
    line: int = 0


def validate(program: Program) -> list[ValidationError]:
    errors: list[ValidationError] = []

    for chip in program.chips:
        errors.extend(_validate_chip(chip))

    return errors


def _validate_chip(chip: ChipNode) -> list[ValidationError]:
    errors: list[ValidationError] = []
    qubit_names: set[str] = set()

    # 1. Unique qubit names
    for q in chip.qubits:
        if q.name in qubit_names:
            errors.append(ValidationError("error", f"Duplicate qubit name: {q.name!r}"))
        qubit_names.add(q.name)

    # 2. Qubit types
    for q in chip.qubits:
        if q.qubit_type not in SUPPORTED_QUBIT_TYPES:
            errors.append(ValidationError(
                "warning",
                f"Qubit {q.name!r} has unsupported type {q.qubit_type!r}. "
                f"Supported: {', '.join(sorted(SUPPORTED_QUBIT_TYPES))}"
            ))

    # 3. Couplers
    coupler_names: set[str] = set()
    for c in chip.couplers:
        if c.name in coupler_names:
            errors.append(ValidationError("error", f"Duplicate coupler name: {c.name!r}"))
        coupler_names.add(c.name)

        if c.qubit_a not in qubit_names:
            errors.append(ValidationError("error", f"Coupler {c.name!r} references unknown qubit {c.qubit_a!r}"))
        if c.qubit_b not in qubit_names:
            errors.append(ValidationError("error", f"Coupler {c.name!r} references unknown qubit {c.qubit_b!r}"))
        if c.qubit_a == c.qubit_b:
            errors.append(ValidationError("error", f"Coupler {c.name!r} connects a qubit to itself"))

    # 4. Readouts
    for r in chip.readouts:
        if r.target_qubit not in qubit_names:
            errors.append(ValidationError("error", f"Readout {r.name!r} references unknown qubit {r.target_qubit!r}"))

    # 5. Resonators
    for r in chip.resonators:
        if r.target_qubit not in qubit_names:
            errors.append(ValidationError("error", f"Resonator {r.name!r} references unknown qubit {r.target_qubit!r}"))

    return errors
