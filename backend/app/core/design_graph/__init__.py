"""
design_graph — typed graph layer that is the single source of truth for every
chip design in Quantum Studio V2.

Public API
----------
from app.core.design_graph import DesignGraph, NodeKind
from app.core.design_graph.node import (
    QubitNode, CouplerNode, ResonatorNode, FeedlineNode, LaunchpadNode,
)
from app.core.design_graph.edge import DesignEdge, EdgeKind
from app.core.design_graph.validator import GraphValidator
from app.core.design_graph.serializer import graph_to_dict, dict_to_graph
"""

from app.core.design_graph.graph import DesignGraph
from app.core.design_graph.node import (
    NodeKind,
    DesignNode,
    QubitNode,
    CouplerNode,
    ResonatorNode,
    FeedlineNode,
    LaunchpadNode,
)
from app.core.design_graph.edge import DesignEdge, EdgeKind
from app.core.design_graph.validator import GraphValidator
from app.core.design_graph.serializer import graph_to_dict, dict_to_graph

__all__ = [
    "DesignGraph",
    "NodeKind",
    "DesignNode",
    "QubitNode",
    "CouplerNode",
    "ResonatorNode",
    "FeedlineNode",
    "LaunchpadNode",
    "DesignEdge",
    "EdgeKind",
    "GraphValidator",
    "graph_to_dict",
    "dict_to_graph",
]
