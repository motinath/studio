import sys
import os
import json
import inspect
import math
import logging
from types import ModuleType

# Setup logging to sys.stderr so it doesn't pollute sys.stdout (used for JSON IPC)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr
)
log = logging.getLogger("qiskit_metal_worker")

# Bulletproof PySide2 Mocking: Inject mocks if PySide2 is not present (e.g. Python 3.11+)
try:
    import PySide2
    log.info("Native PySide2 is available.")
except ImportError:
    log.info("Native PySide2 not found. Injecting mock modules for headless execution...")
    
    class QtMeta(type):
        def __getattr__(cls, name):
            if name and name[0].isupper():
                class SubMeta(type):
                    def __getattr__(self, sub_name):
                        return 0
                class Sub(metaclass=SubMeta):
                    pass
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
            
            class DummyClass:
                def __init__(self, *args, **kwargs): pass
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

# Headless environment configurations
os.environ["QISKIT_METAL_HEADLESS"] = "1"
os.environ["MPLBACKEND"] = "Agg"

try:
    import importlib
    import pkgutil
    import qiskit_metal.qlibrary as _qlibrary
    from qiskit_metal import designs as _designs
    from qiskit_metal.qlibrary.core import QComponent as _QComponent

    _CLASS_MAP: dict[str, type] = {}
    for _, modname, _ in pkgutil.walk_packages(path=_qlibrary.__path__, prefix=_qlibrary.__name__ + ".", onerror=lambda _: None):
        try:
            mod = importlib.import_module(modname)
        except Exception:
            continue
        for _, cls in inspect.getmembers(mod, inspect.isclass):
            if issubclass(cls, _QComponent) and cls is not _QComponent and cls.__module__ == modname:
                _CLASS_MAP[cls.__name__] = cls
    log.info(f"Loaded {len(_CLASS_MAP)} component classes successfully.")
except Exception as e:
    log.exception("Failed to initialize Qiskit Metal libraries inside worker.")
    sys.exit(1)


# ── Geometry & SVG Helpers ──────────────────────────────────────────────────

def _make_default_connection_pads(cls: type) -> dict:
    default_opts = getattr(cls, "default_options", {})
    if "_default_connection_pads" not in default_opts:
        return {}
    base = dict(default_opts["_default_connection_pads"])
    if "connector_location" in base:
        base.pop("connector_location", None)
        return {
            "readout": {**base, "connector_location": "0"},
            "bus_01":  {**base, "connector_location": "180"},
            "bus_02":  {**base, "connector_location": "90"},
        }
    if "loc_W" in base and "loc_H" in base:
        return {
            "a": {**base, "loc_W": "+1", "loc_H": "+1"},
            "b": {**base, "loc_W": "-1", "loc_H": "+1"},
            "c": {**base, "loc_W": "+1", "loc_H": "-1"},
            "d": {**base, "loc_W": "-1", "loc_H": "-1"},
        }
    return {name: dict(base) for name in ("a", "b", "c", "d")}


def _geom_to_svg(geom, color: str, scale: float, out: list) -> None:
    gtype = geom.geom_type
    if gtype == "Polygon":
        d = _poly_d(geom, scale)
        if d:
            out.append(f'<path d="{d}" fill="{color}" fill-opacity="0.85" stroke="none"/>')
    elif gtype in ("MultiPolygon", "GeometryCollection"):
        for g in geom.geoms:
            _geom_to_svg(g, color, scale, out)
    elif gtype == "LineString":
        coords = list(geom.coords)
        if len(coords) >= 2:
            pts = " ".join(f"{x*scale:.1f},{y*scale:.1f}" for x, y in coords)
            out.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="10" stroke-linecap="round"/>')
    elif gtype == "MultiLineString":
        for g in geom.geoms:
            _geom_to_svg(g, color, scale, out)


def _poly_d(poly, scale: float) -> str:
    if poly.is_empty:
        return ""
    def ring(coords):
        pts = [(x*scale, y*scale) for x, y in coords]
        if len(pts) < 2:
            return ""
        d = f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"
        for x, y in pts[1:]:
            d += f" L {x:.1f} {y:.1f}"
        return d + " Z"
    parts = [ring(poly.exterior.coords)]
    for interior in poly.interiors:
        parts.append(ring(interior.coords))
    return " ".join(p for p in parts if p)


# ── Job Handlers ─────────────────────────────────────────────────────────────

def handle_component_preview(job: dict) -> dict:
    component_id = job["component_id"]
    options = job.get("params", {})
    cls = _CLASS_MAP.get(component_id)
    if cls is None:
        return {"error": f"Unknown component: {component_id}"}

    design = _designs.DesignPlanar(enable_renderers=False)
    design.overwrite_enabled = True

    clean = {k: v for k, v in options.items() if k not in ("pos_x", "pos_y", "orientation") and not k.startswith("_")}
    clean["pos_x"] = "0mm"
    clean["pos_y"] = "0mm"
    if "connection_pads" not in clean:
        pc = _make_default_connection_pads(cls)
        if pc:
            clean["connection_pads"] = pc

    instance = cls(design, "preview", options=clean)
    design.rebuild()

    tables = design.qgeometry.tables
    if not any(len(gdf) > 0 for gdf in tables.values()):
        try:
            instance.rebuild()
        except Exception:
            pass

    MM = 1000.0
    COLORS = {"poly": "#5B9BD5", "path": "#2E5FA3", "junction": "#D4820A"}
    cid = instance.id
    bounds, paths = [], []

    for tname, gdf in tables.items():
        if gdf is None or len(gdf) == 0:
            continue
        color = COLORS.get(tname, "#5B9BD5")
        rows = gdf[gdf["component"] == cid] if "component" in gdf.columns else gdf
        for _, row in rows.iterrows():
            g = row.get("geometry")
            if g is None or g.is_empty:
                continue
            bounds.append(g.bounds)
            _geom_to_svg(g, color, MM, paths)

    if not paths or not bounds:
        return {"fragment": "", "vb": [-500, -500, 1000, 1000]}

    xmin = min(b[0] for b in bounds) * MM
    ymin = min(b[1] for b in bounds) * MM
    xmax = max(b[2] for b in bounds) * MM
    ymax = max(b[3] for b in bounds) * MM
    pad = max((xmax - xmin) * 0.1, (ymax - ymin) * 0.1, 20)
    return {"fragment": "\n".join(paths), "vb": [xmin-pad, ymin-pad, (xmax-xmin)+2*pad, (ymax-ymin)+2*pad]}


def handle_full_design(job: dict) -> dict:
    graph = job["graph"]
    design = _designs.DesignPlanar(enable_renderers=False)
    design.overwrite_enabled = True

    _EXCLUDE = frozenset({"connection_pads", "pos_x", "pos_y", "orientation", "chip", "layer"})
    inst_id_map: dict[str, int] = {}

    for comp in graph["components"]:
        cls = _CLASS_MAP.get(comp["componentId"])
        if cls is None:
            log.warning("Unknown component in design: %s", comp["componentId"])
            continue
        try:
            from qiskit_metal.qlibrary.core.qroute import QRoute
            if issubclass(cls, QRoute):
                log.warning("Skipping route class %s in components list", comp["componentId"])
                continue
        except Exception as exc:
            log.warning("Failed subclass check for QRoute on %s: %s", comp["componentId"], exc)
        opts = {k: v for k, v in comp.get("options", {}).items() if k not in _EXCLUDE}
        pos = comp.get("position", {})
        opts["pos_x"] = f"{pos.get('x', 0)}mm"
        opts["pos_y"] = f"{pos.get('y', 0)}mm"
        if comp.get("rotation"):
            opts["orientation"] = str(comp["rotation"])
        ep = opts.get("connection_pads")
        if not isinstance(ep, dict) or not ep or any(not isinstance(v, dict) for v in ep.values()):
            pc = _make_default_connection_pads(cls)
            if pc:
                opts["connection_pads"] = pc
            else:
                opts.pop("connection_pads", None)
        try:
            inst = cls(design, comp["instanceName"], options=opts)
            inst_id_map[comp["instanceName"]] = inst.id
        except Exception as exc:
            log.warning("Could not place %s: %s", comp["instanceName"], exc)

    route_id_map: dict[str, int] = {}
    for conn in graph["connections"]:
        route_cls = _CLASS_MAP.get(conn["routeComponentId"])
        if route_cls is None:
            log.warning("Unknown route component: %s", conn["routeComponentId"])
            continue
        opts = dict(conn.get("routeOverrides", {}))
        opts["pin_inputs"] = {
            "start_pin": {"component": conn["sourceComponentName"], "pin": conn["sourcePinName"]},
            "end_pin":   {"component": conn["targetComponentName"], "pin": conn["targetPinName"]},
        }
        rname = f"route_{conn['id'][:8]}"
        try:
            ri = route_cls(design, rname, options=opts)
            route_id_map[conn["id"]] = ri.id
        except Exception as exc:
            log.warning("Could not create route %s: %s", conn["id"], exc)

    try:
        design.rebuild()
    except Exception as exc:
        log.warning("Design rebuild failed: %s", exc)

    MM = 1000.0
    COLORS = {"poly": "#5B9BD5", "path": "#3a7abf", "junction": "#D4820A"}
    RCOLS  = {"poly": "#2E5FA3", "path": "#2E5FA3"}
    tables = design.qgeometry.tables
    bounds: list = []
    comp_svg: list[str] = []
    route_svgs: dict[str, list[str]] = {cid: [] for cid in route_id_map}

    for tname, gdf in tables.items():
        if gdf is None or len(gdf) == 0:
            continue
        color  = COLORS.get(tname, "#5B9BD5")
        rcolor = RCOLS.get(tname, "#2E5FA3")
        for _, row in gdf.iterrows():
            g = row.get("geometry")
            if g is None or g.is_empty:
                continue
            cnum = row.get("component")
            bounds.append(g.bounds)
            matched = next((cid for cid, rid in route_id_map.items() if cnum == rid), None)
            if matched is not None:
                _geom_to_svg(g, rcolor, MM, route_svgs[matched])
            else:
                _geom_to_svg(g, color, MM, comp_svg)

    if not bounds:
        return {"svg": "", "vb": [-4500, -3000, 9000, 6000], "routes": {}}

    xmin = min(b[0] for b in bounds) * MM
    ymin = min(b[1] for b in bounds) * MM
    xmax = max(b[2] for b in bounds) * MM
    ymax = max(b[3] for b in bounds) * MM
    pad = max((xmax - xmin) * 0.08, (ymax - ymin) * 0.08, 200)

    return {
        "svg": "\n".join(comp_svg),
        "vb":  [xmin-pad, ymin-pad, (xmax-xmin)+2*pad, (ymax-ymin)+2*pad],
        "routes": {cid: "\n".join(svgs) for cid, svgs in route_svgs.items()},
    }


# ── IPC Main Loop ────────────────────────────────────────────────────────────

def main():
    log.info("Qiskit Metal JSON IPC worker initialized. Listening on stdin...")
    
    # Notify parent process that we are loaded and ready
    print(json.dumps({"type": "ready", "classes": len(_CLASS_MAP)}))
    sys.stdout.flush()

    for line in sys.stdin:
        if not line.strip():
            continue
        
        try:
            job = json.loads(line)
        except Exception as e:
            log.error(f"Malformed JSON message: {e}")
            continue

        job_id = job.get("id", "")
        jtype = job.get("type")

        if jtype == "stop":
            log.info("Received stop request. Terminating.")
            break

        log.info(f"Processing job {job_id} of type {jtype}...")
        try:
            if jtype == "component_preview":
                res = handle_component_preview(job)
            elif jtype == "full_design":
                res = handle_full_design(job)
            else:
                res = {"error": f"Unknown job type: {jtype}"}
        except Exception:
            import traceback
            res = {"error": traceback.format_exc(limit=8)}

        res["id"] = job_id
        
        # Output result to parent process
        print(json.dumps(res))
        sys.stdout.flush()

if __name__ == "__main__":
    main()
