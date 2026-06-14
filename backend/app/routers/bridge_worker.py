"""bridge_worker.py - Subprocess executor for running python chip designs."""
from __future__ import annotations

import logging
import subprocess
import sys
import json

log = logging.getLogger(__name__)


def run_code_subprocess(code: str) -> dict:
    try:
        # Invoke ourselves as a module in a clean subprocess using the current python executable.
        # This completely avoids Windows multiprocessing spawn re-import / reload lockup issues.
        proc = subprocess.Popen(
            [sys.executable, "-m", "app.routers.bridge_worker"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8"
        )
        stdout, stderr = proc.communicate(input=code, timeout=45)
        if proc.returncode != 0:
            return {
                "ok": False,
                "design": None,
                "error": f"Subprocess exited with code {proc.returncode}.\nStderr:\n{stderr}"
            }
        try:
            return json.loads(stdout)
        except json.JSONDecodeError:
            return {
                "ok": False,
                "design": None,
                "error": f"Failed to parse subprocess JSON output.\nStdout:\n{stdout}\nStderr:\n{stderr}"
            }
    except subprocess.TimeoutExpired:
        proc.kill()
        stdout, stderr = proc.communicate()
        return {
            "ok": False,
            "design": None,
            "error": f"Code execution timed out (45s).\nStderr:\n{stderr}"
        }
    except Exception as e:
        return {
            "ok": False,
            "design": None,
            "error": f"Failed to start code execution subprocess: {str(e)}"
        }


def run_code_in_env(code: str) -> dict:
    import os
    import sys
    from types import ModuleType
    os.environ["QISKIT_METAL_HEADLESS"] = "1"
    os.environ["MPLBACKEND"] = "Agg"

    # Mock gmsh and pyaedt to prevent ModuleNotFoundError when instantiating DesignPlanar
    class RecursiveMock(ModuleType):
        def __getattr__(self, name):
            return self
        def __call__(self, *args, **kwargs):
            return self

    sys.modules["gmsh"] = RecursiveMock("gmsh")
    sys.modules["pyaedt"] = RecursiveMock("pyaedt")

    # Bulletproof PySide2 Mocking: Inject mocks if PySide2 is not present (e.g. Python 3.11+)
    try:
        # pyrefly: ignore [missing-import]
        import PySide2
    except ImportError:
        # Universal Mock Element supporting all comparisons, operations, etc.
        class MockElement:
            def __init__(self, *args, **kwargs):
                pass
            def __getattr__(self, name):
                return MockElement(name)
            def __call__(self, *args, **kwargs):
                return MockElement()
            def __or__(self, other):
                return MockElement()
            def __ror__(self, other):
                return MockElement()
            def __and__(self, other):
                return MockElement()
            def __rand__(self, other):
                return MockElement()
            def __add__(self, other):
                return MockElement()
            def __radd__(self, other):
                return MockElement()
            def __sub__(self, other):
                return MockElement()
            def __rsub__(self, other):
                return MockElement()
            def __mul__(self, other):
                return MockElement()
            def __rmul__(self, other):
                return MockElement()
            def __truediv__(self, other):
                return MockElement()
            def __rtruediv__(self, other):
                return MockElement()
            def __floordiv__(self, other):
                return MockElement()
            def __rfloordiv__(self, other):
                return MockElement()
            def __int__(self):
                return 0
            def __float__(self):
                return 0.0
            def __index__(self):
                return 0
            def __str__(self):
                return "0"
            def __repr__(self):
                return "MockElement"
            
            # Comparison operators
            def __lt__(self, other): return False
            def __le__(self, other): return False
            def __gt__(self, other): return False
            def __ge__(self, other): return False
            def __eq__(self, other): return False
            def __ne__(self, other): return True

        class QtMeta(type):
            def __getattr__(cls, name):
                if name and name[0].isupper():
                    class SubMeta(type):
                        def __getattr__(self, sub_name):
                            return 0
                    class Sub(MockElement, metaclass=SubMeta):
                        def __init__(self, *args, **kwargs):
                            super().__init__(*args, **kwargs)
                    return Sub
                return 0

        class Qt(metaclass=QtMeta):
            AA_ShareOpenGLContexts = 1
            AA_EnableHighDpiScaling = 2
            AA_UseHighDpiPixmaps = 3

        class QCoreApplication:
            @staticmethod
            def instance(): return None
            @staticmethod
            def testAttribute(attr): return False
            @staticmethod
            def setAttribute(attr, val=True): pass

        class QVersionNumber:
            @staticmethod
            def segments(): return (5, 15, 2)

        class QLibraryInfo:
            @staticmethod
            def version(): return QVersionNumber()

        class Signal:
            def __init__(self, *args, **kwargs): pass
            def connect(self, slot): pass
            def emit(self, *args, **kwargs): pass

        def Slot(*args, **kwargs):
            return lambda f: f

        class DummyMeta(type):
            def __getattr__(cls, name):
                return MockElement(name)

        class MockModule(ModuleType):
            def __getattr__(self, name):
                full_name = self.__name__ + "." + name
                if full_name in sys.modules:
                    return sys.modules[full_name]
                
                if name == 'Qt': return Qt
                if name == 'QCoreApplication': return QCoreApplication
                if name == 'QVersionNumber': return QVersionNumber
                if name == 'QLibraryInfo': return QLibraryInfo
                if name == 'Signal': return Signal
                if name == 'Slot': return Slot
                
                # Dynamically create a new class inheriting from MockElement
                class DummyClass(MockElement, metaclass=DummyMeta):
                    def __init__(self, *args, **kwargs):
                        super().__init__(*args, **kwargs)
                    def __getattr__(self, name):
                        return MockElement(name)
                    def __call__(self, *args, **kwargs):
                        return self
                
                DummyClass.__name__ = name
                return DummyClass

        pyside2 = MockModule("PySide2")
        pyside2.__version__ = "5.15.2"
        sys.modules["PySide2"] = pyside2

        qtcore = MockModule("PySide2.QtCore")
        qtcore.__version__ = "5.15.2"
        sys.modules["PySide2.QtCore"] = qtcore
        setattr(pyside2, "QtCore", qtcore)

        qtgui = MockModule("PySide2.QtGui")
        qtgui.__version__ = "5.15.2"
        sys.modules["PySide2.QtGui"] = qtgui
        setattr(pyside2, "QtGui", qtgui)

        qtwidgets = MockModule("PySide2.QtWidgets")
        qtwidgets.__version__ = "5.15.2"
        sys.modules["PySide2.QtWidgets"] = qtwidgets
        setattr(pyside2, "QtWidgets", qtwidgets)

        shiboken2 = MockModule("PySide2.shiboken2")
        shiboken2.__version__ = "5.15.2"
        sys.modules["PySide2.shiboken2"] = shiboken2
        sys.modules["shiboken2"] = shiboken2
        setattr(pyside2, "shiboken2", shiboken2)

    try:
        import importlib
        import inspect
        import pkgutil
        from qiskit_metal import designs
        from qiskit_metal.qlibrary.core import QComponent, QRoute
        import qiskit_metal.qlibrary as qlibrary

        class_map: dict[str, type] = {}
        for _, modname, _ in pkgutil.walk_packages(path=qlibrary.__path__, prefix=qlibrary.__name__ + ".", onerror=lambda _: None):
            try:
                mod = importlib.import_module(modname)
            except Exception:
                continue
            for _, cls in inspect.getmembers(mod, inspect.isclass):
                if issubclass(cls, QComponent) and cls is not QComponent and cls.__module__ == modname:
                    class_map[cls.__name__] = cls

        design = designs.DesignPlanar(enable_renderers=False)
        design.overwrite_enabled = True

        import qiskit_metal as qm

        # Override MetalGUI at module level to make it a dummy mock
        class MockMetalGUI(MockElement):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)

        setattr(qm, "MetalGUI", MockMetalGUI)
        if hasattr(qm, "_gui") and hasattr(qm._gui, "main_window"):
            setattr(qm._gui.main_window, "MetalGUI", MockMetalGUI)

        namespace: dict = {
            "__builtins__": __builtins__,
            "design": design,
            "qiskit_metal": qm,
            "designs": designs,
            "MetalGUI": MockMetalGUI,
            **class_map
        }

        import io
        import contextlib

        stdout_capture = io.StringIO()
        with contextlib.redirect_stdout(stdout_capture):
            exec(compile(code, "<write_code>", "exec"), namespace)  # nosec

            # Retrieve the design object from namespace in case user's code re-instantiated it
            design = namespace.get("design", design)

            try:
                design.rebuild()
            except Exception:
                pass

        captured_out = stdout_capture.getvalue()
        if captured_out.strip():
            sys.stderr.write(f"--- Code Exec Stdout ---\n{captured_out}\n------------------------\n")
            sys.stderr.flush()

        placements: list[dict] = []
        placement_id_map: dict[str, str] = {}

        def parse_mm(val: object) -> float:
            s = str(val).strip()
            try:
                if s.endswith("mm"):  return float(s[:-2])
                if s.endswith("um"):  return float(s[:-2]) * 0.001
                return float(s)
            except (ValueError, TypeError):
                return 0.0

        for inst_name, comp in design.components.items():
            if comp is None or isinstance(comp, QRoute):
                continue
            pl_id = f"pl_{inst_name}"
            placement_id_map[inst_name] = pl_id
            opts = dict(getattr(comp, "options", {}))
            pos_x = parse_mm(opts.pop("pos_x", "0mm"))
            pos_y = parse_mm(opts.pop("pos_y", "0mm"))
            rotation = float(str(opts.pop("orientation", "0")).strip() or "0")
            placements.append({
                "id": pl_id, "componentId": comp.__class__.__name__, "name": inst_name,
                "x": round(pos_x, 4), "y": round(pos_y, 4), "rotation": rotation,
                "params": {k: str(v) for k, v in opts.items() if not k.startswith("_") and k not in ("connection_pads", "chip", "layer")},
            })

        connections: list[dict] = []
        for inst_name, comp in design.components.items():
            if not isinstance(comp, QRoute):
                continue
            opts = dict(getattr(comp, "options", {}))
            pin_inputs = opts.get("pin_inputs", {})
            start = dict(pin_inputs.get("start_pin", {}))
            end   = dict(pin_inputs.get("end_pin",   {}))
            src_name = str(start.get("component", ""))
            src_pin  = str(start.get("pin", ""))
            tgt_name = str(end.get("component", ""))
            tgt_pin  = str(end.get("pin", ""))
            if src_name not in placement_id_map or tgt_name not in placement_id_map:
                continue
            connections.append({
                "id": f"conn_{inst_name}",
                "from": {"placementId": placement_id_map[src_name], "pinName": src_pin},
                "to":   {"placementId": placement_id_map[tgt_name], "pinName": tgt_pin},
                "routeComponentId": comp.__class__.__name__,
                "routeOverrides": {},
            })

        return {"ok": True, "design": {"placements": placements, "connections": connections}, "error": None}

    except Exception:
        import traceback
        import sys
        err_msg = traceback.format_exc(limit=12)
        sys_path_msg = "\n\nWorker sys.path:\n" + "\n".join(sys.path)
        sys_exe_msg = f"\nWorker sys.executable: {sys.executable}\n"
        return {"ok": False, "design": None, "error": err_msg + sys_exe_msg + sys_path_msg}


if __name__ == "__main__":
    # When run as a main script / module, read user's code from stdin, run it, and write JSON to stdout.
    code_input = sys.stdin.read()
    result = run_code_in_env(code_input)
    sys.stdout.write(json.dumps(result))
    sys.stdout.flush()
