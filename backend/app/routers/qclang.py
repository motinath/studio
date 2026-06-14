"""QCLang editor endpoints — parse, validate, compile (both .qc and .qcl dialects)."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.auth import get_current_user
from app.database import get_db
from app.models import Project, QCLangFile, User
from app.qclang.ast_nodes import ast_to_dict
from app.qclang.compiler import compile_program
from app.qclang.lexer import LexerError
from app.qclang.parser import ParseError, parse
from app.qclang.validator import validate

router = APIRouter(prefix="/api/qclang", tags=["qclang"])

# ── Path to the full QChipLang compiler and its examples ─────────────────────
_QCLANG_FULL_DIR = Path(__file__).resolve().parent.parent / "qclang" / "full"
_QCLANG_EXAMPLES_DIR = _QCLANG_FULL_DIR / "examples"

# Pre-import full QChipLang compiler (graceful fallback)
_QCLFULL_AVAILABLE = False
_QCLFULL_ERR = ""
try:
    from app.qclang.full import Lexer as _FullLexer, LexError as _FullLexError
    from app.qclang.full import Parser as _FullParser, ParseError as _FullParseError, parse_qcl as _parse_qcl
    from app.qclang.full import analyze_qcl as _analyze_qcl
    from app.qclang.full import compile_qcl as _compile_qcl
    _QCLFULL_AVAILABLE = True
except Exception as _e:
    _QCLFULL_ERR = str(_e)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_qcl_dialect(source: str) -> bool:
    """
    Detect if source is the full QChipLang (.qcl) dialect
    (uses `chip Name { ... }` braces) vs the old .qc dialect (chip Name … end).
    """
    import re
    return bool(re.search(r"chip\s+\w+\s*\{", source))


def _compile_qcl_full(source: str, target: str) -> dict[str, Any]:
    """Compile .qcl source using the full QChipLang compiler."""
    if not _QCLFULL_AVAILABLE:
        return {
            "success": False,
            "errors": [{"severity": "error", "message": f"Full QChipLang compiler unavailable: {_QCLFULL_ERR}"}],
            "result": None,
        }
    try:
        tokens = _FullLexer(source).tokenize()
    except _FullLexError as e:
        return {"success": False, "errors": [{"severity": "error", "message": str(e)}], "result": None}

    try:
        prog = _FullParser(tokens).parse()
    except _FullParseError as e:
        return {"success": False, "errors": [{"severity": "error", "message": str(e)}], "result": None}

    metrics = _analyze_qcl(prog)

    try:
        code = _compile_qcl(prog, target=target)
    except Exception as e:
        return {"success": False, "errors": [{"severity": "error", "message": f"Codegen error: {e}"}], "result": None}

    return {
        "success": True,
        "errors": [],
        "result": {
            "code": code,
            "metrics": str(metrics),
            "target": target,
            "dialect": "qcl",
        },
    }


# ── Request models ────────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    source: str
    project_id: str | None = None


class CompileRequest(BaseModel):
    source: str
    target: str = "qiskit_metal"   # qiskit_metal | json_ir | spice
    target_freq_ghz: float = 5.0
    substrate: str = "silicon"
    metal: str = "aluminum"
    chip_size_mm: float = 10.0
    project_id: str | None = None


# ── Status ────────────────────────────────────────────────────────────────────

@router.get("/status")
async def qlang_status() -> dict[str, Any]:
    """Return QChipLang compiler availability and dialect support."""
    return {
        "qc_dialect": {
            "available": True,
            "description": "Simple .qc dialect (chip…end syntax)",
            "targets": ["qiskit_metal"],
        },
        "qcl_dialect": {
            "available": _QCLFULL_AVAILABLE,
            "description": "Full QChipLang .qcl dialect (chip{} braces, arrays, tiles, DRC blocks)",
            "targets": ["qiskit_metal", "json_ir", "spice"],
            "error": _QCLFULL_ERR if not _QCLFULL_AVAILABLE else None,
            "compiler_path": str(_QCLANG_FULL_DIR),
        },
    }


# ── Examples ──────────────────────────────────────────────────────────────────

@router.get("/examples")
async def get_examples() -> dict[str, Any]:
    """Return built-in .qcl example files."""
    examples = []
    if _QCLANG_EXAMPLES_DIR.is_dir():
        for fname in sorted(os.listdir(_QCLANG_EXAMPLES_DIR)):
            if fname.endswith((".qcl", ".qc")):
                fpath = _QCLANG_EXAMPLES_DIR / fname
                try:
                    source = fpath.read_text(encoding="utf-8")
                    examples.append({
                        "name": fpath.stem,
                        "filename": fname,
                        "dialect": "qcl" if fname.endswith(".qcl") else "qc",
                        "source": source,
                    })
                except OSError:
                    pass
    return {"examples": examples, "qcl_available": _QCLFULL_AVAILABLE}


# ── Parse ─────────────────────────────────────────────────────────────────────

@router.post("/parse")
async def parse_qclang(body: ParseRequest) -> dict[str, Any]:
    """Parse QCLang source and return AST + validation errors."""
    # Auto-detect dialect
    if _is_qcl_dialect(body.source) and _QCLFULL_AVAILABLE:
        # Use full parser — return simplified parse result
        try:
            tokens = _FullLexer(body.source).tokenize()
            prog = _FullParser(tokens).parse()
            metrics = _analyze_qcl(prog)
            chip = prog.chip
            return {
                "success": True,
                "errors": [],
                "dialect": "qcl",
                "ast": {"chip": chip.name if chip else None, "metrics": str(metrics)},
                "num_chips": 1 if chip else 0,
                "num_qubits": chip.attrs.get("qubit_count", "?") if chip else 0,
            }
        except Exception as e:
            return {"success": False, "errors": [{"severity": "error", "message": str(e)}], "dialect": "qcl", "ast": None}

    # .qc dialect
    errors: list[dict] = []
    try:
        program = parse(body.source)
    except LexerError as e:
        return {
            "success": False,
            "errors": [{"severity": "error", "message": str(e), "line": e.line, "col": e.col}],
            "dialect": "qc",
            "ast": None,
        }
    except ParseError as e:
        return {
            "success": False,
            "errors": [{"severity": "error", "message": str(e), "line": e.line, "col": e.col}],
            "dialect": "qc",
            "ast": None,
        }

    validation_errors = validate(program)
    for e in validation_errors:
        errors.append({"severity": e.severity, "message": e.message, "line": e.line})

    has_errors = any(e["severity"] == "error" for e in errors)
    return {
        "success": not has_errors,
        "errors": errors,
        "dialect": "qc",
        "ast": ast_to_dict(program),
        "num_chips": len(program.chips),
        "num_qubits": program.primary_chip.num_qubits if program.primary_chip else 0,
    }


# ── Compile ───────────────────────────────────────────────────────────────────

@router.post("/compile")
async def compile_qclang(body: CompileRequest) -> dict[str, Any]:
    """
    Parse, validate, and compile QCLang source.

    Auto-detects dialect:
      • .qcl (chip{} braces) → full QChipLang compiler → supports qiskit_metal | json_ir | spice
      • .qc  (chip…end)       → simple compiler → qiskit_metal only

    Returns GenerateResponse-compatible result.
    """
    # Validate target
    valid_targets = ["qiskit_metal", "json_ir", "spice"]
    if body.target not in valid_targets:
        return {
            "success": False,
            "errors": [{"severity": "error", "message": f"Invalid target '{body.target}'. Choose: {', '.join(valid_targets)}"}],
            "result": None,
        }

    # ── Full .qcl dialect ──
    if _is_qcl_dialect(body.source):
        result = _compile_qcl_full(body.source, body.target)
        if result["success"] and result["result"]:
            result["result"]["qclang_source"] = body.source
        return result

    # ── Simple .qc dialect ──
    if body.target in ("json_ir", "spice"):
        return {
            "success": False,
            "errors": [{"severity": "error", "message": f"Target '{body.target}' requires the full .qcl dialect. Use chip{{ }} syntax."}],
            "result": None,
        }

    try:
        program = parse(body.source)
    except (LexerError, ParseError) as e:
        return {"success": False, "errors": [{"severity": "error", "message": str(e)}], "result": None}

    validation_errors = validate(program)
    errors = [{"severity": e.severity, "message": e.message} for e in validation_errors]

    if any(e["severity"] == "error" for e in errors):
        return {"success": False, "errors": errors, "result": None}

    result = compile_program(
        program,
        target_freq_ghz=body.target_freq_ghz,
        substrate=body.substrate,
        metal=body.metal,
        chip_size_mm=body.chip_size_mm,
    )
    result["qclang_source"] = body.source

    return {
        "success": True,
        "errors": errors,
        "result": result,
    }


# ── Save ──────────────────────────────────────────────────────────────────────

@router.post("/save")
async def save_qclang(
    body: ParseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Parse + save a QCLang file to a project."""
    if not body.project_id:
        raise HTTPException(status_code=400, detail="project_id required")

    proj_result = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.owner_id == user.id)
    )
    if not proj_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    errors: list[dict] = []
    program = None
    ast_json = None

    if _is_qcl_dialect(body.source) and _QCLFULL_AVAILABLE:
        # .qcl dialect — parse with full compiler
        try:
            tokens = _FullLexer(body.source).tokenize()
            prog = _FullParser(tokens).parse()
            metrics = _analyze_qcl(prog)
            ast_json = {"dialect": "qcl", "metrics": str(metrics)}
        except Exception as e:
            errors.append({"severity": "error", "message": str(e)})
    else:
        # .qc dialect
        try:
            program = parse(body.source)
            validation_errors = validate(program)
            for e in validation_errors:
                errors.append({"severity": e.severity, "message": e.message})
            ast_json = ast_to_dict(program)
        except (LexerError, ParseError) as e:
            errors.append({"severity": "error", "message": str(e)})

    is_valid = not any(e["severity"] == "error" for e in errors)

    # Determine filename based on dialect
    dialect = "qcl" if _is_qcl_dialect(body.source) else "qc"
    filename = f"project.{dialect}"

    existing = await db.execute(
        select(QCLangFile).where(
            QCLangFile.project_id == body.project_id,
            QCLangFile.filename == filename,
        )
    )
    qc_file = existing.scalar_one_or_none()

    if qc_file:
        qc_file.content = body.source
        qc_file.ast_json = ast_json
        qc_file.is_valid = is_valid
        qc_file.errors = errors
    else:
        qc_file = QCLangFile(
            id=str(uuid.uuid4()),
            project_id=body.project_id,
            filename=filename,
            content=body.source,
            ast_json=ast_json,
            is_valid=is_valid,
            errors=errors,
        )
        db.add(qc_file)

    return {"saved": True, "is_valid": is_valid, "errors": errors, "dialect": dialect}


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/templates")
async def get_templates() -> list[dict[str, str]]:
    """Return built-in QCLang template snippets (both .qc and .qcl dialects)."""
    templates = [
        {
            "name": "5-Qubit Linear Chain",
            "description": "5 transmons in a linear chain with nearest-neighbor coupling",
            "dialect": "qc",
            "source": _TEMPLATE_CHAIN,
        },
        {
            "name": "9-Qubit Grid",
            "description": "3x3 grid of transmon qubits",
            "dialect": "qc",
            "source": _TEMPLATE_GRID,
        },
        {
            "name": "7-Qubit Heavy-Hex",
            "description": "Heavy-hexagonal lattice (IBM-style)",
            "dialect": "qc",
            "source": _TEMPLATE_HEAVY_HEX,
        },
    ]
    # Add .qcl examples if available
    if _QCLFULL_AVAILABLE and _QCLANG_EXAMPLES_DIR.is_dir():
        for fname in sorted(os.listdir(_QCLANG_EXAMPLES_DIR)):
            if fname.endswith(".qcl"):
                fpath = _QCLANG_EXAMPLES_DIR / fname
                try:
                    source = fpath.read_text(encoding="utf-8")
                    templates.append({
                        "name": fpath.stem.replace("_", " ").title(),
                        "description": f"Full QChipLang .qcl example — {fpath.stem}",
                        "dialect": "qcl",
                        "source": source,
                    })
                except OSError:
                    pass
    return templates


# ── Built-in .qc templates ────────────────────────────────────────────────────

_TEMPLATE_CHAIN = """# 5-Qubit Linear Chain — nearest-neighbor transmon coupling
chip LinearChain5Q
  variable target_frequency = 5.0
  variable substrate = "silicon"
  variable metal = "aluminum"

  qubit Q1 type=transmon frequency=4.9
  qubit Q2 type=transmon frequency=5.1
  qubit Q3 type=transmon frequency=4.92
  qubit Q4 type=transmon frequency=5.08
  qubit Q5 type=transmon frequency=4.95

  coupler C1 connect(Q1,Q2)
  coupler C2 connect(Q2,Q3)
  coupler C3 connect(Q3,Q4)
  coupler C4 connect(Q4,Q5)

  readout RO_Q1 connect(Q1)
  readout RO_Q2 connect(Q2)
  readout RO_Q3 connect(Q3)
  readout RO_Q4 connect(Q4)
  readout RO_Q5 connect(Q5)
end"""

_TEMPLATE_GRID = """# 9-Qubit 3×3 Grid — all nearest-neighbor couplings
chip Grid3x3

  variable target_frequency = 5.0
  variable substrate = "sapphire"
  variable metal = "aluminum"

  qubit Q1 type=transmon frequency=4.9
  qubit Q2 type=transmon frequency=5.1
  qubit Q3 type=transmon frequency=4.92
  qubit Q4 type=transmon frequency=5.08
  qubit Q5 type=transmon frequency=4.95
  qubit Q6 type=transmon frequency=5.12
  qubit Q7 type=transmon frequency=4.88
  qubit Q8 type=transmon frequency=5.05
  qubit Q9 type=transmon frequency=4.97

  coupler C1  connect(Q1,Q2)
  coupler C2  connect(Q2,Q3)
  coupler C3  connect(Q4,Q5)
  coupler C4  connect(Q5,Q6)
  coupler C5  connect(Q7,Q8)
  coupler C6  connect(Q8,Q9)
  coupler C7  connect(Q1,Q4)
  coupler C8  connect(Q2,Q5)
  coupler C9  connect(Q3,Q6)
  coupler C10 connect(Q4,Q7)
  coupler C11 connect(Q5,Q8)
  coupler C12 connect(Q6,Q9)

  readout RO_Q1 connect(Q1)
  readout RO_Q2 connect(Q2)
  readout RO_Q3 connect(Q3)
  readout RO_Q4 connect(Q4)
  readout RO_Q5 connect(Q5)
  readout RO_Q6 connect(Q6)
  readout RO_Q7 connect(Q7)
  readout RO_Q8 connect(Q8)
  readout RO_Q9 connect(Q9)
end"""

_TEMPLATE_HEAVY_HEX = """# 7-Qubit Heavy-Hex — IBM-style topology (Falcon/Hummingbird variant)
chip HeavyHex7Q

  variable target_frequency = 5.0
  variable substrate = "silicon"
  variable metal = "niobium"

  qubit Q1 type=transmon frequency=4.9
  qubit Q2 type=transmon frequency=5.1
  qubit Q3 type=transmon frequency=4.92
  qubit Q4 type=transmon frequency=5.08
  qubit Q5 type=transmon frequency=4.95
  qubit Q6 type=transmon frequency=5.12
  qubit Q7 type=transmon frequency=4.88

  coupler C1 connect(Q1,Q2)
  coupler C2 connect(Q2,Q3)
  coupler C3 connect(Q3,Q4)
  coupler C4 connect(Q4,Q5)
  coupler C5 connect(Q5,Q6)
  coupler C6 connect(Q6,Q7)
  coupler C7 connect(Q1,Q4)
  coupler C8 connect(Q4,Q7)

  readout RO_Q1 connect(Q1)
  readout RO_Q2 connect(Q2)
  readout RO_Q3 connect(Q3)
  readout RO_Q4 connect(Q4)
  readout RO_Q5 connect(Q5)
  readout RO_Q6 connect(Q6)
  readout RO_Q7 connect(Q7)
end"""
