"""
graph.py — DesignGraph: the single source of truth for a quantum chip design.

Every component is a node; every physical connection is an edge.
All V2 subsystems (placement, routing, frequency planning, DRC, codegen)
consume a DesignGraph rather than ad-hoc dicts.

Usage
-----
    g = DesignGraph(chip_name="MyChip", chip_width_mm=10.0, chip_height_mm=10.0)
    q1 = QubitNode(id="Q1", frequency_ghz=4.9)
    q2 = QubitNode(id="Q2", frequency_ghz=5.1)
    c1 = CouplerNode(id="C1", qubit_a_id="Q1", qubit_b_id="Q2")
    g.add_node(q1); g.add_node(q2); g.add_node(c1)
    g.add_edge(DesignEdge("Q1", "C1", EdgeKind.COUPLING, pin_source="a", pin_target="in"))
    g.add_edge(DesignEdge("C1", "Q2", EdgeKind.COUPLING, pin_source="out", pin_target="b"))
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Iterator, List, Optional

from app.core.design_graph.node import (
    DesignNode, NodeKind,
    QubitNode, CouplerNode, ResonatorNode, FeedlineNode, LaunchpadNode,
)
from app.core.design_graph.edge import DesignEdge, EdgeKind


@dataclass
class DesignGraph:
    """Immutable-friendly graph of quantum chip design components.

    Attributes
    ----------
    chip_name       : human-readable chip identifier
    chip_width_mm   : die width in mm
    chip_height_mm  : die height in mm
    substrate       : substrate material key (silicon / sapphire / silicon_nitride)
    metal           : metal layer key (aluminum / niobium / tantalum / nbtin)
    topology        : logical topology hint (grid / heavy_hex / line / ring / star)
    """

    chip_name:      str  = "QuantumChip"
    chip_width_mm:  float = 10.0
    chip_height_mm: float = 10.0
    substrate:      str  = "silicon"
    metal:          str  = "aluminum"
    topology:       str  = "grid"

    _nodes: Dict[str, DesignNode] = field(default_factory=dict, init=False, repr=False)
    _edges: List[DesignEdge]      = field(default_factory=list,  init=False, repr=False)
    _adj:   Dict[str, List[str]]  = field(default_factory=dict,  init=False, repr=False)

    # ── Node operations ──────────────────────────────────────────────────────

    def add_node(self, node: DesignNode) -> None:
        if node.id in self._nodes:
            raise ValueError(f"Node '{node.id}' already exists in the graph")
        self._nodes[node.id] = node
        self._adj.setdefault(node.id, [])

    def get_node(self, node_id: str) -> DesignNode:
        try:
            return self._nodes[node_id]
        except KeyError:
            raise KeyError(f"Node '{node_id}' not found in design graph")

    def remove_node(self, node_id: str) -> None:
        self._nodes.pop(node_id, None)
        self._adj.pop(node_id, None)
        self._edges = [e for e in self._edges
                       if e.source_id != node_id and e.target_id != node_id]
        for adj in self._adj.values():
            if node_id in adj:
                adj.remove(node_id)

    def has_node(self, node_id: str) -> bool:
        return node_id in self._nodes

    # ── Typed node accessors ─────────────────────────────────────────────────

    @property
    def qubits(self) -> List[QubitNode]:
        return [n for n in self._nodes.values() if n.kind == NodeKind.QUBIT]  # type: ignore[return-value]

    @property
    def couplers(self) -> List[CouplerNode]:
        return [n for n in self._nodes.values() if n.kind == NodeKind.COUPLER]  # type: ignore[return-value]

    @property
    def resonators(self) -> List[ResonatorNode]:
        return [n for n in self._nodes.values() if n.kind == NodeKind.RESONATOR]  # type: ignore[return-value]

    @property
    def feedlines(self) -> List[FeedlineNode]:
        return [n for n in self._nodes.values() if n.kind == NodeKind.FEEDLINE]  # type: ignore[return-value]

    @property
    def launchpads(self) -> List[LaunchpadNode]:
        return [n for n in self._nodes.values() if n.kind == NodeKind.LAUNCHPAD]  # type: ignore[return-value]
    @property
    def nodes(self) -> Iterable[DesignNode]:
        return self._nodes.values()

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    # ── Edge operations ──────────────────────────────────────────────────────

    def add_edge(self, edge: DesignEdge) -> None:
        if not self.has_node(edge.source_id):
            raise ValueError(f"Edge source '{edge.source_id}' not in graph")
        if not self.has_node(edge.target_id):
            raise ValueError(f"Edge target '{edge.target_id}' not in graph")
        # Avoid exact duplicate edges
        if not any(e.source_id == edge.source_id and
                   e.target_id == edge.target_id and
                   e.kind == edge.kind for e in self._edges):
            self._edges.append(edge)
            self._adj[edge.source_id].append(edge.target_id)
            self._adj[edge.target_id].append(edge.source_id)

    def remove_edge(self, source_id: str, target_id: str) -> None:
        self._edges = [
            e for e in self._edges
            if not (e.source_id == source_id and e.target_id == target_id)
        ]

    def get_edges(self, node_id: str | None = None, kind: EdgeKind | None = None) -> List[DesignEdge]:
        result = self._edges
        if node_id is not None:
            result = [e for e in result
                      if e.source_id == node_id or e.target_id == node_id]
        if kind is not None:
            result = [e for e in result if e.kind == kind]
        return result

    @property
    def edges(self) -> List[DesignEdge]:
        return list(self._edges)

    @property
    def edge_count(self) -> int:
        return len(self._edges)

    # ── Graph queries ────────────────────────────────────────────────────────

    def neighbors(self, node_id: str) -> List[str]:
        """Return IDs of nodes directly connected to node_id."""
        return list(self._adj.get(node_id, []))

    def coupled_qubits(self, qubit_id: str) -> List[str]:
        """Return IDs of qubits directly coupled to the given qubit."""
        result: List[str] = []
        for edge in self._edges:
            if edge.kind != EdgeKind.COUPLING:
                continue
            # coupling path: qubit ↔ coupler ↔ qubit
            if edge.source_id == qubit_id or edge.target_id == qubit_id:
                other = edge.target_id if edge.source_id == qubit_id else edge.source_id
                node = self._nodes.get(other)
                if node and node.kind == NodeKind.QUBIT:
                    result.append(other)
                elif node and node.kind == NodeKind.COUPLER:
                    # Traverse through coupler to the other qubit
                    for e2 in self._edges:
                        if e2.kind == EdgeKind.COUPLING and (
                            e2.source_id == other or e2.target_id == other
                        ):
                            q = e2.target_id if e2.source_id == other else e2.source_id
                            q_node = self._nodes.get(q)
                            if q != qubit_id and q_node is not None and \
                               q_node.kind == NodeKind.QUBIT:
                                result.append(q)
        return list(set(result))

    def is_connected(self) -> bool:
        """Check if all nodes are reachable from the first node (BFS)."""
        if not self._nodes:
            return True
        start = next(iter(self._nodes))
        visited: set[str] = set()
        queue = [start]
        while queue:
            node = queue.pop(0)
            if node in visited:
                continue
            visited.add(node)
            queue.extend(n for n in self._adj.get(node, []) if n not in visited)
        return len(visited) == len(self._nodes)

    def connectivity_matrix(self) -> dict[str, list[str]]:
        """Return adjacency dict for all qubit nodes."""
        qids = {q.id for q in self.qubits}
        return {
            qid: [nb for nb in self.coupled_qubits(qid) if nb in qids]
            for qid in qids
        }

    # ── Statistics ───────────────────────────────────────────────────────────

    def stats(self) -> dict[str, Any]:
        return {
            "chip_name":    self.chip_name,
            "chip_size_mm": f"{self.chip_width_mm}×{self.chip_height_mm}",
            "substrate":    self.substrate,
            "metal":        self.metal,
            "topology":     self.topology,
            "qubits":       len(self.qubits),
            "couplers":     len(self.couplers),
            "resonators":   len(self.resonators),
            "feedlines":    len(self.feedlines),
            "launchpads":   len(self.launchpads),
            "edges":        self.edge_count,
            "connected":    self.is_connected(),
        }

    def __repr__(self) -> str:
        s = self.stats()
        return (
            f"DesignGraph(chip={s['chip_name']!r}, "
            f"qubits={s['qubits']}, couplers={s['couplers']}, "
            f"resonators={s['resonators']}, topology={s['topology']!r})"
        )
