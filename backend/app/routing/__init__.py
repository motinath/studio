"""
routing/ — Auto-routing engine for quantum chip CPW connections.

Modules
-------
cpw_router        — Routes qubit-to-qubit CPW couplers
resonator_router  — Routes readout resonators (meander paths)
feedline_router   — Routes the common feedline

Usage
-----
    from app.routing import route_design
    routes = route_design(graph, constraints)
"""

from app.routing.cpw_router import CPWRouter
from app.routing.resonator_router import ResonatorRouter
from app.routing.feedline_router import FeedlineRouter
from app.routing.result import RouteResult, RouteSegment
from app.routing.pipeline import route_design

__all__ = [
    "CPWRouter", "ResonatorRouter", "FeedlineRouter",
    "RouteResult", "RouteSegment", "route_design",
]
