"""V2 architecture integration test."""
import sys, asyncio
sys.path.insert(0, '.')

PASS, FAIL = [], []
def ok(m):  PASS.append(m); print(f"  PASS  {m}")
def fail(m, e): FAIL.append(m); print(f"  FAIL  {m}: {e}")

print("\n=== Quantum Studio V2 Integration Test ===\n")

# 1. Design Graph
try:
    from app.core.design_graph import (
        DesignGraph, QubitNode, CouplerNode, ResonatorNode,
        DesignEdge, EdgeKind, GraphValidator, graph_to_dict, dict_to_graph,
    )
    g = DesignGraph(chip_name="Test", topology="grid")
    q1 = QubitNode(id="Q1", frequency_ghz=4.9); q1.x_mm=0.0; q1.y_mm=0.0
    q2 = QubitNode(id="Q2", frequency_ghz=5.1); q2.x_mm=1.1; q2.y_mm=0.0
    c1 = CouplerNode(id="C1", qubit_a_id="Q1", qubit_b_id="Q2")
    r1 = ResonatorNode(id="RO_Q1", target_qubit_id="Q1", frequency_ghz=6.4)
    r2 = ResonatorNode(id="RO_Q2", target_qubit_id="Q2", frequency_ghz=6.6)
    for n in [q1, q2, c1, r1, r2]: g.add_node(n)
    g.add_edge(DesignEdge("Q1","C1",EdgeKind.COUPLING))
    g.add_edge(DesignEdge("C1","Q2",EdgeKind.COUPLING))
    g.add_edge(DesignEdge("Q1","RO_Q1",EdgeKind.READOUT))
    g.add_edge(DesignEdge("Q2","RO_Q2",EdgeKind.READOUT))
    assert g.node_count == 5
    assert g.edge_count == 4
    d = graph_to_dict(g)
    g2 = dict_to_graph(d)
    assert g2.node_count == 5
    ok(f"DesignGraph: {g}")
except Exception as e: fail("DesignGraph", e)

# 2. GraphValidator
try:
    result = GraphValidator(g).validate()
    assert result.passed, f"Unexpected errors: {[i.message for i in result.errors]}"
    ok(f"GraphValidator: passed={result.passed}, warnings={len(result.warnings)}")
except Exception as e: fail("GraphValidator", e)

# 3. Constraints
try:
    from app.constraints import DesignConstraints, build_graph_from_constraints
    c = DesignConstraints(qubit_count=4, topology="grid", substrate="silicon")
    g4 = build_graph_from_constraints(c)
    assert len(g4.qubits) == 4
    assert len(g4.resonators) == 4
    ok(f"Constraints + builder: {g4}")
except Exception as e: fail("Constraints", e)

# 4. V2 DRC
try:
    from app.constraints import DesignConstraints
    from app.constraints.builder import build_graph_from_constraints
    from app.drc import run_full_drc
    from app.services.physics.frequency_planner import FrequencyPlanner
    from app.services.physics.topology_router import place_qubits

    c  = DesignConstraints(qubit_count=4, topology="grid")
    g4 = build_graph_from_constraints(c)
    # Place qubits
    pr = place_qubits(4, "grid")
    for qp in pr.qubits:
        if g4.has_node(qp.name):
            nd = g4.get_node(qp.name); nd.x_mm=qp.x_mm; nd.y_mm=qp.y_mm
    # Assign frequencies
    fp = FrequencyPlanner(n=4, topology="grid").plan()
    for qs in fp.qubits:
        if g4.has_node(qs.name):
            nd = g4.get_node(qs.name); nd.frequency_ghz=qs.freq_GHz
    for rs in fp.resonators:
        if g4.has_node(rs.name):
            nd = g4.get_node(rs.name); nd.frequency_ghz=rs.freq_GHz; nd.length_mm=rs.length_mm
    report = run_full_drc(g4, c)
    ok(f"V2 DRC: passed={report.passed}, errors={len(report.errors)}, warnings={len(report.warnings)}")
except Exception as e: fail("V2 DRC", e)

# 5. Routing
try:
    from app.routing import route_design
    routes = route_design(g4, c)
    ok(f"Routing: {routes.routed_count} segments, {routes.total_length_mm:.2f} mm total")
except Exception as e: fail("Routing", e)

# 6. Exports
try:
    from app.exports import ExportEngine, export_qclang, export_svg, export_gds_ascii
    qcl = export_qclang(g4)
    svg = export_svg(g4)
    gds = export_gds_ascii(g4)
    assert "chip" in qcl and "qubit" in qcl
    assert "<svg" in svg
    assert "BGNLIB" in gds
    ok(f"Exports: qclang={len(qcl)}chars, svg={len(svg)}chars, gds={len(gds)}chars")
except Exception as e: fail("Exports", e)

# 7. Full V2 pipeline
try:
    from app.services.design_pipeline import run_design_pipeline
    from app.constraints import DesignConstraints
    c5 = DesignConstraints(qubit_count=5, topology="grid", substrate="silicon", metal="aluminum")
    result = asyncio.run(run_design_pipeline(c5))
    assert result.get("num_qubits") == 5
    assert result.get("engine") == "quantum-studio-v2-pipeline"
    assert "v2" in result
    ok(f"V2 pipeline: label={result.get('label')}, drc_passed={result.get('drc',{}).get('passed')}")
except Exception as e: fail("V2 pipeline", e)

# 8. FastAPI app imports (all routes)
try:
    from app.main import app
    routes = [r.path for r in app.routes]
    v2_routes = [r for r in routes if "/api/design/" in r]
    assert len(v2_routes) >= 6, f"Expected ≥6 V2 routes, got {v2_routes}"
    ok(f"FastAPI app: {len(routes)} total routes, {len(v2_routes)} V2 design routes")
except Exception as e: fail("FastAPI app", e)

print()
print("=" * 56)
print(f"  Results: {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print(f"  FAILURES: {', '.join(FAIL)}")
    sys.exit(1)
else:
    print("  ALL TESTS PASSED")
print("=" * 56)
