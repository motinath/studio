"""Smoke test for backend2+QLang integration."""
import sys, json
sys.path.insert(0, '.')

failures = []

def ok(msg): print(f"  [OK]   {msg}")
def fail(msg, e): print(f"  [FAIL] {msg}: {e}"); failures.append(msg)

print("\n=== Quantum Studio Integration Smoke Test ===\n")

# Test 1: Physics — FrequencyPlanner
try:
    from app.services.physics.frequency_planner import FrequencyPlanner
    fp = FrequencyPlanner(n=4, topology="grid").plan()
    ok(f"FrequencyPlanner: Q1={fp.qubits[0].freq_GHz} GHz, epsilon_eff={fp.epsilon_eff}")
except Exception as e:
    fail("FrequencyPlanner", e)

# Test 2: Physics — TopologyRouter
try:
    from app.services.physics.topology_router import place_qubits
    p = place_qubits(4, topology="grid")
    ok(f"TopologyRouter: {len(p.qubits)} qubits placed")
except Exception as e:
    fail("TopologyRouter", e)

# Test 3: Physics — DRC
try:
    from app.services.physics.drc import run_drc
    rpt = run_drc(p, fp)
    ok(f"DRC: passed={rpt.passed()}, errors={len(rpt.errors)}, warnings={len(rpt.warnings)}")
except Exception as e:
    fail("DRC", e)

# Test 4: ML Intent (torch may or may not be installed — both are valid)
try:
    from app.services.physics.ml_intent import _TORCH_OK, resolve_design_params
    n, req, topo, info = resolve_design_params("build a 4 qubit grid chip")
    if _TORCH_OK:
        ok(f"MLIntent(torch): n={n}, topology={topo}, method={info['method']}, confidence={info.get('confidence')}")
    else:
        ok(f"MLIntent(regex fallback — torch not installed): n={n}, topology={topo}, method={info['method']}")
except Exception as e:
    fail("ML intent", e)


# Test 5: Full QChipLang compiler — json_ir target
try:
    from app.qclang.full import parse_qcl, analyze_qcl, compile_qcl
    src = """chip TestChip {
    version: "1.0"
    qubit_type: transmon
}
qubit q0 { type: transmon  frequency: 5.0GHz  pad_gap: 30um }
qubit q1 { type: transmon  frequency: 4.9GHz  pad_gap: 30um }"""
    prog = parse_qcl(src)
    analyze_qcl(prog)
    code = compile_qcl(prog, target="json_ir")
    ir = json.loads(code)
    ok(f"QChipLang full compiler (json_ir): chip={ir['chip']['name']}, qubits={len(ir['qubits'])}")
except Exception as e:
    fail("QChipLang full (json_ir)", e)

# Test 6: Full QChipLang compiler — spice target
try:
    from app.qclang.full import parse_qcl, compile_qcl
    prog2 = parse_qcl(src)
    spice = compile_qcl(prog2, target="spice")
    ok(f"QChipLang full compiler (spice): {len(spice.splitlines())} lines")
except Exception as e:
    fail("QChipLang full (spice)", e)

# Test 7: chip_generator.generate_chip (async)
try:
    import asyncio
    from app.services.chip_generator import generate_chip
    result = asyncio.run(generate_chip("design a 5 qubit grid chip on silicon"))
    ok(f"chip_generator.generate_chip: label={result['label']}, engine={result['engine']}, drc_passed={result['drc'].get('passed')}")
except Exception as e:
    fail("chip_generator.generate_chip", e)

print()
if failures:
    print(f"=== RESULT: {len(failures)} FAILURES ===")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("=== ALL TESTS PASSED ===")
