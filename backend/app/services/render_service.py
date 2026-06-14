"""Decoupled Qiskit Metal rendering service using subprocess JSON IPC."""
from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Dict, Optional

from app.core.registry_cache import registry_cache
from app.core.editor_models import (
    ComponentPreview, DesignDocument, RenderResult, RouteRender,
    ValidationIssue, ValidationResult, ViewBox,
)

log = logging.getLogger(__name__)

WORKER_WARMUP_TIMEOUT = 60
COMPONENT_RENDER_TIMEOUT = 30
DESIGN_RENDER_TIMEOUT = 60


def _placeholder_svg(component_id: str) -> str:
    label = component_id[:12]
    return (f'<rect x="-280" y="-180" width="560" height="360" rx="20" fill="#1e3a5f" '
            f'fill-opacity="0.15" stroke="#5B9BD5" stroke-width="8"/>'
            f'<text x="0" y="8" text-anchor="middle" font-size="48" font-family="monospace" '
            f'fill="#5B9BD5" font-weight="bold">{label}</text>')


# ── Worker manager (singleton subprocess JSON IPC) ────────────────────────────

class _WorkerManager:
    def __init__(self) -> None:
        self._proc: Optional[subprocess.Popen] = None
        self._lock = threading.Lock()
        self._ready = False
        self._pending_jobs: Dict[str, dict] = {}
        self._jobs_lock = threading.Lock()
        self._reader_thread: Optional[threading.Thread] = None

    def _start(self) -> bool:
        # Determine Python executable to run the worker (default to current environment's Python)
        py_exe = os.getenv("METAL_WORKER_PYTHON") or sys.executable
        
        worker_script = Path(__file__).parent / "worker.py"
        log.info("Starting background Qiskit Metal worker subprocess with %s ...", py_exe)
        
        try:
            self._proc = subprocess.Popen(
                [py_exe, "-u", str(worker_script)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1, # Line buffered
            )
        except Exception as e:
            log.error("Failed to spawn Qiskit Metal worker subprocess: %s", e)
            return False

        # Asynchronously redirect stderr to python logs
        def _read_stderr():
            while self._proc and self._proc.poll() is None:
                try:
                    line = self._proc.stderr.readline()
                    if line:
                        log.info("Worker: %s", line.strip())
                except Exception:
                    break
        threading.Thread(target=_read_stderr, daemon=True, name="worker-stderr-reader").start()

        # Wait for the ready message on stdout
        try:
            ready_line = self._proc.stdout.readline()
            if not ready_line:
                log.error("Worker process stdout closed early.")
                return False
            
            ready_msg = json.loads(ready_line)
            if ready_msg.get("type") == "ready":
                log.info("Qiskit Metal worker online. %d component classes loaded.", ready_msg.get("classes", 0))
                self._ready = True
                
                # Start background stdout reader thread for subsequent responses
                self._reader_thread = threading.Thread(target=self._stdout_reader, daemon=True, name="worker-stdout-reader")
                self._reader_thread.start()
                return True
            log.error("Worker sent unexpected ready payload: %s", ready_msg)
            return False
        except Exception as exc:
            log.error("Timeout or exception waiting for worker ready state: %s", exc)
            return False

    def _stdout_reader(self) -> None:
        while self._proc and self._proc.poll() is None:
            try:
                line = self._proc.stdout.readline()
                if not line:
                    break
                
                msg = json.loads(line)
                job_id = msg.get("id")
                if job_id:
                    with self._jobs_lock:
                        self._pending_jobs[job_id] = msg
            except Exception as e:
                log.error("Error reading from worker stdout: %s", e)
                break

    def _ensure(self) -> bool:
        with self._lock:
            if self._proc is None or self._proc.poll() is not None or not self._ready:
                self._ready = False
                return self._start()
            return True

    def call(self, job: dict, timeout: int) -> dict:
        import uuid
        if not self._ensure():
            return {"error": "Render worker unavailable."}
        
        job_id = uuid.uuid4().hex
        job["id"] = job_id
        
        try:
            payload = json.dumps(job) + "\n"
            self._proc.stdin.write(payload)
            self._proc.stdin.flush()
        except Exception as e:
            log.error("Failed to write job to worker stdin: %s", e)
            self._ready = False
            return {"error": f"Failed to send job to worker: {e}"}

        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            with self._jobs_lock:
                if job_id in self._pending_jobs:
                    return self._pending_jobs.pop(job_id)
            
            if self._proc.poll() is not None:
                self._ready = False
                return {"error": "Render worker crashed during job execution."}
                
            time.sleep(0.02)
            
        return {"error": f"Render timed out after {timeout}s."}

    def stop(self) -> None:
        with self._lock:
            if self._proc and self._proc.poll() is None:
                try:
                    self._proc.stdin.write(json.dumps({"type": "stop"}) + "\n")
                    self._proc.stdin.flush()
                    self._proc.wait(timeout=2.0)
                except Exception:
                    self._proc.kill()
            self._ready = False


_manager = _WorkerManager()


def warmup_worker() -> None:
    _manager._ensure()



# ── RenderService ─────────────────────────────────────────────────────────────

class RenderService:

    def render_component_preview(self, component_id: str, params: Optional[Dict[str, object]] = None) -> ComponentPreview:
        from app.services.component_registry import component_registry_service
        summary = component_registry_service.get_component(component_id)
        if summary is None:
            log.warning("Preview requested for unknown component %s. Returning placeholder.", component_id)
            return ComponentPreview(id=component_id, svg=_placeholder_svg(component_id), viewBox=ViewBox(x=-300, y=-300, w=600, h=600), units="um")

        result = _manager.call({"type": "component_preview", "component_id": component_id, "module": summary.module, "params": params or {}}, timeout=COMPONENT_RENDER_TIMEOUT)

        if result.get("error"):
            log.warning("Preview failed for %s: %s", component_id, result["error"])
            return ComponentPreview(id=component_id, svg=_placeholder_svg(component_id), viewBox=ViewBox(x=-300, y=-300, w=600, h=600), units="um")

        svg = str(result.get("fragment", ""))
        raw = result.get("vb", [-500, -500, 1000, 1000])
        vb  = ViewBox(x=float(raw[0]), y=float(raw[1]), w=float(raw[2]), h=float(raw[3])) if isinstance(raw, list) and len(raw) == 4 else ViewBox(x=-500, y=-500, w=1000, h=1000)

        if not svg.strip():
            svg = _placeholder_svg(component_id)
            vb  = ViewBox(x=-300, y=-300, w=600, h=600)

        return ComponentPreview(id=component_id, svg=svg, viewBox=vb, units="um")

    def render_design(self, design: DesignDocument) -> RenderResult:
        if not design.placements:
            return RenderResult(svg="", viewBox=ViewBox(x=-4500, y=-3000, w=9000, h=6000), units="um", layers=[], routes=[])

        _EXCLUDE = frozenset({"connection_pads", "pos_x", "pos_y", "orientation", "chip", "layer"})
        placement_names = {p.id: p.name for p in design.placements}
        graph = {
            "components": [
                {"instanceName": p.name, "componentId": p.componentId,
                 "options": {k: str(v) for k, v in p.params.items() if k not in _EXCLUDE and not k.startswith("_")},
                 "position": {"x": p.x, "y": p.y}, "rotation": p.rotation}
                for p in design.placements
            ],
            "connections": [
                {"id": c.id,
                 "sourceComponentName": placement_names.get(c.from_.placementId, c.from_.placementId),
                 "sourcePinName": c.from_.pinName,
                 "targetComponentName": placement_names.get(c.to.placementId, c.to.placementId),
                 "targetPinName": c.to.pinName,
                 "routeComponentId": c.routeComponentId or "RouteMeander",
                 "routeOverrides": {k: str(v) for k, v in c.routeOverrides.items()}}
                for c in design.connections
            ],
        }

        result = _manager.call({"type": "full_design", "graph": graph}, timeout=DESIGN_RENDER_TIMEOUT)

        if result.get("error"):
            log.warning("Design render failed: %s", result["error"])
            return RenderResult(svg="", viewBox=ViewBox(x=-4500, y=-3000, w=9000, h=6000), units="um", layers=[], routes=[])

        svg = result.get("svg", "")
        raw = result.get("vb", [-4500, -3000, 9000, 6000])
        vb  = ViewBox(x=float(raw[0]), y=float(raw[1]), w=float(raw[2]), h=float(raw[3]))
        routes = [RouteRender(connectionId=cid, svg=s) for cid, s in result.get("routes", {}).items() if s]
        return RenderResult(svg=svg, viewBox=vb, units="um", layers=[], routes=routes)

    def validate_design(self, design: DesignDocument) -> ValidationResult:
        issues: list[ValidationIssue] = []
        ids = {p.id for p in design.placements}
        if not design.placements:
            issues.append(ValidationIssue(severity="warning", rule="non-empty", message="Design has no placements."))
        for c in design.connections:
            if c.from_.placementId not in ids:
                issues.append(ValidationIssue(severity="error", rule="dangling-from", message=f"Connection {c.id}: source '{c.from_.placementId}' does not exist."))
            if c.to.placementId not in ids:
                issues.append(ValidationIssue(severity="error", rule="dangling-to", message=f"Connection {c.id}: target '{c.to.placementId}' does not exist."))
            if c.from_.placementId == c.to.placementId:
                issues.append(ValidationIssue(severity="error", rule="no-self-loop", message=f"Connection {c.id} connects a component to itself."))
        return ValidationResult(valid=not any(i.severity == "error" for i in issues), issues=issues)


render_service = RenderService()
