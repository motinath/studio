import sys, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, ".")

# Step 1: Train and save
from app.services.physics.ml_intent import (
    _train_model, save_model, MODEL_PATH, TRAINING_CORPUS,
    text_to_features, CONFIDENCE_THRESHOLD, _TORCH_OK
)
import torch

print(f"[1] Torch: {torch.__version__}  |  Corpus: {len(TRAINING_CORPUS)} samples  |  Confidence gate: {CONFIDENCE_THRESHOLD}")
print("[2] Training (300 epochs)...")
model = _train_model(epochs=300)
save_model(model, MODEL_PATH)
print(f"[3] Saved: {MODEL_PATH}")

# Step 2: Training accuracy
model.eval()
correct = 0
for text, label in TRAINING_CORPUS:
    x = text_to_features(text)
    with torch.no_grad():
        pred = int(torch.argmax(model(x)).item())
    if pred == label:
        correct += 1
acc = correct / len(TRAINING_CORPUS) * 100
print(f"[4] Training accuracy: {correct}/{len(TRAINING_CORPUS)} = {acc:.1f}%")
print()

# Step 3: End-to-end inference
from app.services.physics.ml_intent import resolve_design_params

TESTS = [
    ("generate a 1 qubit chip",                1,  "grid"),
    ("build a 2 qubit bell pair",              2,  "line"),
    ("route a 3 qubit triangular ring",        3,  "ring"),
    ("synthesize a 4-qubit grid",              4,  "grid"),
    ("compile a 5 qubit star network hub",     5,  "star"),
    ("design a 6 qubit chip on silicon",       6,  "grid"),
    ("generate a heavy hex 7 qubit core",      7,  "heavy_hex"),
    ("build a 7q chip",                        7,  "heavy_hex"),
    ("make a five qubit star",                 5,  "star"),
    ("design 3q ring",                         3,  "ring"),
    ("build a 27 qubit heavy hex ibm chip",   27,  "heavy_hex"),
    ("design a 4 qubit linear chain",          4,  "line"),
]

print("[5] Inference tests:")
print(f"  {'Prompt':<46} {'Got':>3}Q {'Want':>4}Q  {'Topology':<12} {'Method':<12} {'Conf':>5}  Result")
print("  " + "-"*105)
total, passed = 0, 0
for prompt, want_n, want_topo in TESTS:
    n, req, topo, info = resolve_design_params(prompt)
    conf = info.get("confidence") or 0.0
    method = info.get("method", "?")
    ok_n = (n == want_n)
    ok_t = (topo == want_topo)
    ok = ok_n and ok_t
    flag = "PASS" if ok else f"FAIL (got n={n} topo={topo})"
    total += 1
    if ok:
        passed += 1
    print(f"  {prompt:<46} {n:>3}  {want_n:>4}  {topo:<12} {method:<12} {conf:>5.2f}  {flag}")

print()
print(f"[6] Result: {passed}/{total} tests passed")
if passed == total:
    print("ALL TESTS PASSED")
else:
    print("SOME TESTS FAILED - check topology/count mapping")
