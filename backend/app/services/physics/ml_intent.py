"""
Quantum chip intent classifier — v2 (overhauled from ML_model notebook).

Neural network reads natural-language prompts and predicts:
  - Number of qubits (1–7) for layout generation
  - Suggested topology (grid, star, line, ring, heavy_hex, …)

Uses a 24-dim bag-of-words feature space + a regularised feedforward net.

v2 fixes vs original:
  - 350+ training samples (was 14) to eliminate overfitting
  - 24-dim feature vocabulary (was 8) covers real-world phrasings
  - Deeper model with Dropout 0.3 for generalisation
  - Confidence gate (55%): low-confidence ML defers to regex
  - Correct qubit shorthand detection: "5q", "5Q", "Q5", etc.
  - Topology defaults fixed per class (ring for 3Q, heavy_hex for 7Q)
"""
import re
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    _TORCH_OK = True
except ImportError:
    torch = None  # type: ignore
    nn = None     # type: ignore
    optim = None  # type: ignore
    _TORCH_OK = False

# ── Configuration ─────────────────────────────────────────────────────────────

ML_QUBIT_MIN = 1
ML_QUBIT_MAX = 7
CONFIDENCE_THRESHOLD = 0.55   # Below this → fall back to regex

# ── Feature vocabulary (24-dim) ───────────────────────────────────────────────
# Index 0 = bias-like "chip/qubit/quantum" presence
# Indices 1–7 = number strength for each qubit count
# Indices 8–23 = topology and context features

KEYWORD_VOCAB: Dict[str, int] = {
    # ── Slot 0: generic quantum/chip indicators ──────────────────────────────
    "quantum": 0, "chip": 0, "processor": 0, "qubit": 0, "qpu": 0,
    "superconducting": 0, "transmon": 0, "xmon": 0, "fluxonium": 0,

    # ── Slots 1–7: numeral/word for qubit count 1–7 ─────────────────────────
    "1": 1, "one": 1, "single": 1, "solo": 1, "mono": 1,
    "2": 2, "two": 2, "pair": 2, "double": 2, "dual": 2,
    "3": 3, "three": 3, "tri": 3, "triple": 3, "triad": 3,
    "4": 4, "four": 4, "quad": 4, "quartet": 4,
    "5": 5, "five": 5, "penta": 5, "quint": 5,
    "6": 6, "six": 6, "hex": 6, "hexagonal": 6, "hexa": 6,
    "7": 7, "seven": 7, "sept": 7,

    # ── Slot 8: grid / 2D layout indicators ─────────────────────────────────
    "grid": 8, "square": 8, "lattice": 8, "matrix": 8, "2x2": 8,
    "rectangular": 8, "planar": 8, "crossbar": 8,

    # ── Slot 9: line / chain indicators ─────────────────────────────────────
    "line": 9, "chain": 9, "linear": 9, "string": 9, "sequential": 9,
    "1d": 9, "array": 9, "bell": 9, "entangle": 9,

    # ── Slot 10: ring / loop indicators ─────────────────────────────────────
    "ring": 10, "loop": 10, "circular": 10, "cycle": 10, "closed": 10,

    # ── Slot 11: star / hub-and-spoke indicators ─────────────────────────────
    "star": 11, "hub": 11, "spoke": 11, "radial": 11, "central": 11,

    # ── Slot 12: heavy-hex / IBM-style indicators ────────────────────────────
    "heavy": 12, "heavyhex": 12, "ibm": 12, "falcon": 12,
    "hummingbird": 12, "eagle": 12, "condor": 12,

    # ── Slot 13: design/synthesis action verbs ───────────────────────────────
    "design": 13, "generate": 13, "create": 13, "make": 13,
    "build": 13, "synthesize": 13, "compile": 13, "route": 13,
    "layout": 13, "initialize": 13, "construct": 13, "produce": 13,

    # ── Slot 14: simulation / analysis indicators ─────────────────────────────
    "simulate": 14, "analyze": 14, "analysis": 14, "frequency": 14,
    "fidelity": 14, "coherence": 14, "drc": 14, "verify": 14,

    # ── Slot 15: silicon substrate ────────────────────────────────────────────
    "silicon": 15, "si": 15,

    # ── Slot 16: sapphire substrate ───────────────────────────────────────────
    "sapphire": 16, "al2o3": 16,

    # ── Slot 17: aluminum metallization ──────────────────────────────────────
    "aluminum": 17, "aluminium": 17,

    # ── Slot 18: niobium / tantalum / high-coherence metals ──────────────────
    "niobium": 18, "tantalum": 18, "nbtin": 18, "nb": 18, "ta": 18,

    # ── Slot 19: small / compact / simple keywords ────────────────────────────
    "simple": 19, "basic": 19, "small": 19, "compact": 19, "minimal": 19,
    "test": 19, "demo": 19, "prototype": 19, "example": 19,

    # ── Slot 20: large / complex / production keywords ────────────────────────
    "large": 20, "complex": 20, "production": 20, "advanced": 20,
    "tapeout": 20, "fabrication": 20, "wafer": 20,

    # ── Slot 21: triangular / 3-node specific ────────────────────────────────
    "triangular": 21, "triangle": 21, "trident": 21,

    # ── Slot 22: surface-code / error-correction ──────────────────────────────
    "surface": 22, "error": 22, "correction": 22, "logical": 22,
    "code": 22, "stabilizer": 22,

    # ── Slot 23: architecture-specific numbers ────────────────────────────────
    "setup": 23, "configuration": 23, "architecture": 23, "topology": 23,
    "system": 23, "device": 23, "hardware": 23, "platform": 23,
}

FEATURE_DIM = 24   # Must match max(KEYWORD_VOCAB.values()) + 1

# ── ML class index → default topology ────────────────────────────────────────
CLASS_TOPOLOGY = {
    0: "grid",      # 1Q — single qubit, grid is fine
    1: "line",      # 2Q — Bell pair / linear coupling is natural
    2: "ring",      # 3Q — triangular ring (3-node cycle)
    3: "grid",      # 4Q — 2×2 grid
    4: "star",      # 5Q — star with central hub
    5: "grid",      # 6Q — 2×3 grid
    6: "heavy_hex", # 7Q — IBM heavy-hex style
}

MODEL_DIR  = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "intent_model.pt"

# ── Word-to-number table ──────────────────────────────────────────────────────
WORD_TO_NUM = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20, "twenty-four": 24,
}

_model: Optional[Any] = None


# ── Model definition ──────────────────────────────────────────────────────────

class QuantumIntentModel:
    """Placeholder when torch is not installed."""


if _TORCH_OK:
    class QuantumIntentModel(nn.Module):  # type: ignore[no-redef]
        """
        24 → 64 → 32 → 7 classifier with Dropout regularisation.
        Maps prompt bag-of-words features to qubit-count class 0–6 (= 1–7 qubits).
        """

        def __init__(self):
            super().__init__()
            self.network = nn.Sequential(
                nn.Linear(FEATURE_DIM, 64),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(64, 32),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(32, 7),
            )

        def forward(self, x: "torch.Tensor") -> "torch.Tensor":
            return self.network(x)


# ── Feature extraction ────────────────────────────────────────────────────────

def text_to_features(text: str) -> "torch.Tensor":
    if not _TORCH_OK:
        raise ImportError("torch is required for ML intent classification")
    features = [0.0] * FEATURE_DIM
    for word in re.findall(r"\w+", text.lower()):
        if word in KEYWORD_VOCAB:
            features[KEYWORD_VOCAB[word]] = 1.0
    return torch.FloatTensor(features)


# ── Expanded training corpus (350+ samples, 50 per class) ────────────────────

TRAINING_CORPUS = [
    # ── Class 0: 1 qubit ──────────────────────────────────────────────────────
    ("create a single qubit chip", 0),
    ("build 1 qubit processor", 0),
    ("design a one qubit quantum device", 0),
    ("generate a single transmon qubit", 0),
    ("make a 1 qubit test device on silicon", 0),
    ("initialize one qubit system", 0),
    ("compile a solo qubit", 0),
    ("route a single qubit test chip", 0),
    ("synthesize a 1q chip", 0),
    ("produce a mono qubit layout", 0),
    ("build a basic 1-qubit device", 0),
    ("design a minimal 1 qubit prototype", 0),
    ("create a demo with one qubit", 0),
    ("make simple single qubit circuit", 0),
    ("generate 1 qubit system on sapphire", 0),
    ("one qubit transmon design on silicon", 0),
    ("single qubit processor with aluminum", 0),
    ("build 1q compact chip", 0),
    ("synthesize a solo transmon", 0),
    ("create simple one qubit layout", 0),
    ("initialize a 1q quantum system", 0),
    ("route a single qubit design", 0),
    ("design mono qubit chip", 0),
    ("compile 1-qubit hardware", 0),
    ("generate a one qubit demo chip", 0),
    ("make basic one qubit test", 0),
    ("build a small single qubit device", 0),
    ("produce a 1 qubit quantum prototype", 0),
    ("design solo qubit processor", 0),
    ("create minimal one qubit design", 0),
    ("generate single qubit transmon layout", 0),
    ("synthesize 1-qubit chip on silicon", 0),
    ("build a one qubit system", 0),
    ("design a single quantum bit", 0),
    ("make a 1-qubit processor", 0),
    ("route single qubit chip with readout", 0),
    ("compile a one qubit demo", 0),
    ("create 1q prototype chip", 0),
    ("initialize single qubit transmon device", 0),
    ("build minimal single qubit layout", 0),
    ("produce a one qubit qpu", 0),
    ("design a 1 qubit silicon chip", 0),
    ("generate a basic single qubit system", 0),
    ("synthesize simple 1 qubit processor", 0),
    ("make one qubit hardware design", 0),
    ("create a compact 1q chip", 0),
    ("build single qubit test processor", 0),
    ("design 1 qubit platform", 0),
    ("compile single qubit chip layout", 0),
    ("route a 1-qubit device", 0),

    # ── Class 1: 2 qubits ─────────────────────────────────────────────────────
    ("design a 2 qubit layout with standard coupling", 1),
    ("make a pair of qubits", 1),
    ("build two qubit bell state chip", 1),
    ("generate a 2q chip", 1),
    ("create a pair qubit system", 1),
    ("synthesize a 2-qubit processor", 1),
    ("route a two qubit chain", 1),
    ("compile a dual qubit device", 1),
    ("design two transmon qubits", 1),
    ("make a 2 qubit line topology", 1),
    ("build a 2q entangling gate chip", 1),
    ("initialize a 2-qubit linear chip", 1),
    ("create a two qubit test device", 1),
    ("generate two qubit silicon processor", 1),
    ("design a pair of qubits on sapphire", 1),
    ("build 2-qubit chain with capacitive coupling", 1),
    ("produce two qubit system", 1),
    ("synthesize dual qubit chip", 1),
    ("make 2q linear chip on silicon", 1),
    ("compile 2 qubit device for bell state", 1),
    ("design a two-qubit quantum device", 1),
    ("generate a dual qubit processor", 1),
    ("build a pair of transmons", 1),
    ("create a 2 qubit entangled chip", 1),
    ("route a 2q simple processor", 1),
    ("initialize two qubit hardware", 1),
    ("design 2q prototype", 1),
    ("make a two-qubit quantum system", 1),
    ("produce a 2-qubit chip layout", 1),
    ("synthesize a double qubit chip", 1),
    ("build a 2 qubit test system", 1),
    ("create pair of transmon qubits", 1),
    ("design two qubit device for testing", 1),
    ("generate 2 qubit chip with aluminum", 1),
    ("make a 2-qubit qpu", 1),
    ("compile a two qubit processor", 1),
    ("route 2 qubit linear chip", 1),
    ("build two qubit quantum device", 1),
    ("initialize dual transmon chip", 1),
    ("design a 2-qubit layout", 1),
    ("produce two qubit demo chip", 1),
    ("synthesize 2q chip design", 1),
    ("create a simple 2-qubit processor", 1),
    ("generate two qubit system on silicon", 1),
    ("make basic 2 qubit layout", 1),
    ("build a two qubit chain", 1),
    ("design a 2 qubit pair", 1),
    ("compile 2-qubit hardware", 1),
    ("route a double qubit chip", 1),
    ("create 2 qubit minimal chip", 1),

    # ── Class 2: 3 qubits ─────────────────────────────────────────────────────
    ("route a 3 qubit triangular architecture", 2),
    ("generate a three qubit setup", 2),
    ("build a 3 qubit ring topology", 2),
    ("design a three qubit chip", 2),
    ("make a 3q ring layout", 2),
    ("create a triangular three qubit processor", 2),
    ("synthesize a 3-qubit loop", 2),
    ("compile a three qubit system", 2),
    ("route a triple qubit design", 2),
    ("initialize a 3 qubit ring network", 2),
    ("build three qubit chip on silicon", 2),
    ("design a 3q circular topology", 2),
    ("create a tri-qubit device", 2),
    ("generate 3 qubit triangular setup", 2),
    ("make three qubit ring circuit", 2),
    ("produce a 3-qubit quantum chip", 2),
    ("synthesize three qubit triangle", 2),
    ("build 3q chip with ring coupling", 2),
    ("design triple transmon layout", 2),
    ("compile three qubit chip on silicon", 2),
    ("create a 3 qubit processor", 2),
    ("generate a three-qubit ring layout", 2),
    ("route a 3-qubit triangle chip", 2),
    ("build a triad of qubits", 2),
    ("design 3 qubit loop", 2),
    ("initialize three qubit chip", 2),
    ("make a 3 qubit circular design", 2),
    ("produce three transmon qubits in a ring", 2),
    ("synthesize 3q ring processor", 2),
    ("create three qubit triangular chip", 2),
    ("build a 3q closed loop chip", 2),
    ("design a three-qubit quantum device", 2),
    ("generate triple qubit layout", 2),
    ("compile a 3-qubit ring", 2),
    ("route three qubit chip", 2),
    ("build 3 qubit system on sapphire", 2),
    ("create a small 3-qubit chip", 2),
    ("make three qubit quantum processor", 2),
    ("design a 3q triangular layout", 2),
    ("synthesize three qubit chip design", 2),
    ("generate a 3 qubit demo chip", 2),
    ("build three qubit device", 2),
    ("create a 3-qubit ring processor", 2),
    ("design triple qubit system", 2),
    ("route a 3q triangular chip", 2),
    ("compile three qubit transmon", 2),
    ("produce a 3-qubit triangular chip", 2),
    ("make a tri qubit ring device", 2),
    ("initialize a 3 qubit loop", 2),
    ("build a three qubit layout", 2),

    # ── Class 3: 4 qubits ─────────────────────────────────────────────────────
    ("synthesize a 4-qubit grid configuration", 3),
    ("build a four qubit processor", 3),
    ("design a 4 qubit grid layout", 3),
    ("create four qubit chip on silicon", 3),
    ("generate a 4q grid processor", 3),
    ("make a 2x2 four qubit chip", 3),
    ("route a 4-qubit square layout", 3),
    ("compile four transmon chip", 3),
    ("initialize a 4 qubit system", 3),
    ("design a quad qubit grid", 3),
    ("build 4 qubit grid on silicon", 3),
    ("create a 4-qubit square lattice chip", 3),
    ("generate four qubit processor", 3),
    ("synthesize 4q chip with grid topology", 3),
    ("make a quad qubit quantum device", 3),
    ("produce a 4 qubit chip", 3),
    ("compile a four qubit system", 3),
    ("route a 4q lattice chip", 3),
    ("build four qubit quantum processor", 3),
    ("design a 4-qubit grid chip", 3),
    ("create a 4 qubit grid on silicon", 3),
    ("generate a quad qubit layout", 3),
    ("make 4 qubit chip design", 3),
    ("synthesize a four qubit grid", 3),
    ("build a 4q device", 3),
    ("design four qubit chip", 3),
    ("route four transmon qubits", 3),
    ("compile 4 qubit square chip", 3),
    ("initialize four qubit processor", 3),
    ("produce a 4-qubit quantum chip", 3),
    ("build a simple 4 qubit grid", 3),
    ("design a four-qubit chip", 3),
    ("create a 4q processor", 3),
    ("generate 4 qubit silicon chip", 3),
    ("make a four qubit qpu", 3),
    ("route a 4-qubit device", 3),
    ("synthesize four qubit hardware", 3),
    ("compile a 4-qubit layout", 3),
    ("build four qubit system", 3),
    ("design a 4 qubit prototype", 3),
    ("create four qubit quantum device", 3),
    ("generate a 4q grid device", 3),
    ("make a small four qubit chip", 3),
    ("produce four qubit system", 3),
    ("build 4-qubit transmon grid", 3),
    ("design a quad qubit chip", 3),
    ("synthesize a 4q lattice", 3),
    ("compile four qubit chip on silicon", 3),
    ("route a quad transmon device", 3),
    ("initialize a 4 qubit grid chip", 3),

    # ── Class 4: 5 qubits ─────────────────────────────────────────────────────
    ("compile a 5 qubit star network hub", 4),
    ("design five qubits on silicon", 4),
    ("build a 5 qubit star layout", 4),
    ("generate a 5q star chip", 4),
    ("create five qubit quantum processor", 4),
    ("synthesize a 5-qubit hub-spoke", 4),
    ("route a 5 qubit star topology", 4),
    ("make five transmon qubits", 4),
    ("initialize a 5 qubit chip", 4),
    ("design a penta qubit star", 4),
    ("build five qubit chip on silicon", 4),
    ("create a 5 qubit star processor", 4),
    ("generate five qubit star network", 4),
    ("synthesize 5q chip with star coupling", 4),
    ("make a quint qubit chip", 4),
    ("produce a 5 qubit device", 4),
    ("compile a five qubit system", 4),
    ("route a 5q star layout", 4),
    ("build five qubit quantum processor", 4),
    ("design a 5-qubit star chip", 4),
    ("create a five qubit star on silicon", 4),
    ("generate a 5 qubit layout", 4),
    ("make 5 qubit chip design", 4),
    ("synthesize a five qubit device", 4),
    ("build a 5q star device", 4),
    ("design five qubit chip", 4),
    ("route five transmon qubits", 4),
    ("compile 5 qubit star chip", 4),
    ("initialize five qubit processor", 4),
    ("produce a 5-qubit quantum chip", 4),
    ("build a simple 5 qubit star", 4),
    ("design a five-qubit chip", 4),
    ("create a 5q processor", 4),
    ("generate 5 qubit silicon chip", 4),
    ("make a five qubit qpu", 4),
    ("route a 5-qubit star device", 4),
    ("synthesize five qubit hardware", 4),
    ("compile a 5-qubit layout", 4),
    ("build five qubit system", 4),
    ("design a 5 qubit prototype", 4),
    ("create five qubit quantum device", 4),
    ("generate a 5q star device", 4),
    ("make a medium five qubit chip", 4),
    ("produce five qubit system", 4),
    ("build 5-qubit transmon star", 4),
    ("design a quint qubit chip", 4),
    ("synthesize a 5q star layout", 4),
    ("compile five qubit chip on silicon", 4),
    ("route a penta transmon device", 4),
    ("initialize a 5 qubit star chip", 4),

    # ── Class 5: 6 qubits ─────────────────────────────────────────────────────
    ("initialize a 6 qubit hexagonal processor", 5),
    ("route a six qubit system", 5),
    ("build a 6 qubit grid layout", 5),
    ("design six qubits on silicon", 5),
    ("generate a 6q grid chip", 5),
    ("create six qubit quantum processor", 5),
    ("synthesize a 6-qubit chip", 5),
    ("route a 6 qubit grid topology", 5),
    ("make six transmon qubits", 5),
    ("initialize a 6 qubit chip", 5),
    ("design a hex qubit grid", 5),
    ("build six qubit chip on silicon", 5),
    ("create a 6 qubit grid processor", 5),
    ("generate six qubit grid network", 5),
    ("synthesize 6q chip with grid coupling", 5),
    ("make a six qubit chip", 5),
    ("produce a 6 qubit device", 5),
    ("compile a six qubit system", 5),
    ("route a 6q grid layout", 5),
    ("build six qubit quantum processor", 5),
    ("design a 6-qubit grid chip", 5),
    ("create a six qubit grid on silicon", 5),
    ("generate a 6 qubit layout", 5),
    ("make 6 qubit chip design", 5),
    ("synthesize a six qubit device", 5),
    ("build a 6q device", 5),
    ("design six qubit chip", 5),
    ("route six transmon qubits", 5),
    ("compile 6 qubit hexagonal chip", 5),
    ("initialize six qubit processor", 5),
    ("produce a 6-qubit quantum chip", 5),
    ("build a simple 6 qubit grid", 5),
    ("design a six-qubit chip", 5),
    ("create a 6q processor", 5),
    ("generate 6 qubit silicon chip", 5),
    ("make a six qubit qpu", 5),
    ("route a 6-qubit device", 5),
    ("synthesize six qubit hardware", 5),
    ("compile a 6-qubit layout", 5),
    ("build six qubit system", 5),
    ("design a 6 qubit prototype", 5),
    ("create six qubit quantum device", 5),
    ("generate a 6q grid device", 5),
    ("make a medium six qubit chip", 5),
    ("produce six qubit system", 5),
    ("build 6-qubit transmon grid", 5),
    ("design a hexa qubit chip", 5),
    ("synthesize a 6q grid layout", 5),
    ("compile six qubit chip on silicon", 5),
    ("route a hex transmon device", 5),
    ("initialize a 6 qubit grid chip", 5),

    # ── Class 6: 7 qubits ─────────────────────────────────────────────────────
    ("generate a heavy hex 7 qubit core topology", 6),
    ("compile a seven qubit quantum chip", 6),
    ("build a 7 qubit heavy-hex chip", 6),
    ("design seven qubits on silicon", 6),
    ("generate a 7q heavy hex chip", 6),
    ("create seven qubit quantum processor", 6),
    ("synthesize a 7-qubit processor", 6),
    ("route a 7 qubit heavy hex topology", 6),
    ("make seven transmon qubits", 6),
    ("initialize a 7 qubit chip", 6),
    ("design a seven qubit heavy hex", 6),
    ("build seven qubit chip on silicon", 6),
    ("create a 7 qubit heavy-hex processor", 6),
    ("generate seven qubit IBM style chip", 6),
    ("synthesize 7q heavy hex chip", 6),
    ("make a seven qubit chip", 6),
    ("produce a 7 qubit device", 6),
    ("compile a seven qubit heavy hex system", 6),
    ("route a 7q heavy_hex layout", 6),
    ("build seven qubit quantum processor", 6),
    ("design a 7-qubit heavy hex chip", 6),
    ("create a seven qubit chip on silicon", 6),
    ("generate a 7 qubit layout", 6),
    ("make 7 qubit chip design", 6),
    ("synthesize a seven qubit device", 6),
    ("build a 7q device", 6),
    ("design seven qubit chip", 6),
    ("route seven transmon qubits heavy hex", 6),
    ("compile 7 qubit IBM chip", 6),
    ("initialize seven qubit processor", 6),
    ("produce a 7-qubit quantum chip", 6),
    ("build a 7 qubit heavy hex design", 6),
    ("design a seven-qubit chip", 6),
    ("create a 7q processor", 6),
    ("generate 7 qubit silicon chip", 6),
    ("make a seven qubit qpu", 6),
    ("route a 7-qubit device", 6),
    ("synthesize seven qubit hardware", 6),
    ("compile a 7-qubit layout", 6),
    ("build seven qubit system", 6),
    ("design a 7 qubit prototype", 6),
    ("create seven qubit quantum device heavy hex", 6),
    ("generate a 7q heavy hex device", 6),
    ("make a small seven qubit chip", 6),
    ("produce seven qubit system", 6),
    ("build 7-qubit transmon heavy hex", 6),
    ("design a sept qubit chip", 6),
    ("synthesize a 7q heavy hex layout", 6),
    ("compile seven qubit chip on silicon", 6),
    ("route a seven transmon heavy hex device", 6),
    ("initialize a 7 qubit heavy hex chip", 6),
]


# ── Model training ────────────────────────────────────────────────────────────

def _train_model(epochs: int = 300) -> QuantumIntentModel:
    if not _TORCH_OK:
        raise ImportError("torch is required for ML model training")
    torch.manual_seed(42)
    model = QuantumIntentModel()
    optimizer = optim.Adam(model.parameters(), lr=0.003, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()

    model.train()
    for epoch in range(epochs):
        total_loss = 0.0
        for text, label in TRAINING_CORPUS:
            optimizer.zero_grad()
            x = text_to_features(text)
            y = torch.LongTensor([label])
            out = model(x).unsqueeze(0)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

    model.eval()
    return model


def save_model(model: QuantumIntentModel, path: Path = MODEL_PATH) -> None:
    if not _TORCH_OK:
        raise ImportError("torch is required")
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": model.state_dict(), "version": 2}, path)


def load_model(path: Path = MODEL_PATH) -> QuantumIntentModel:
    if not _TORCH_OK:
        raise ImportError("torch is required for ML intent model")
    model = QuantumIntentModel()
    if path.is_file():
        try:
            checkpoint = torch.load(path, map_location="cpu", weights_only=True)
        except TypeError:
            checkpoint = torch.load(path, map_location="cpu")
        # If model was trained with old architecture (version < 2), retrain
        if checkpoint.get("version", 1) < 2:
            model = _train_model()
            save_model(model, path)
        else:
            model.load_state_dict(checkpoint["state_dict"])
    else:
        model = _train_model()
        save_model(model, path)
    model.eval()
    return model


def get_model() -> QuantumIntentModel:
    if not _TORCH_OK:
        raise ImportError("torch is required for ML intent classification")
    global _model
    if _model is None:
        _model = load_model()
    return _model


# ── Inference ─────────────────────────────────────────────────────────────────

def predict_intent(prompt: str) -> Dict[str, Any]:
    """
    Run ML inference on user prompt.
    Returns qubits (1–7), topology hint, confidence, and class index.
    Returns confidence=0 if below CONFIDENCE_THRESHOLD (caller should use regex).
    Raises ImportError if torch is not installed.
    """
    if not _TORCH_OK:
        raise ImportError("torch is required for ML intent classification")
    model = get_model()
    features = text_to_features(prompt)

    with torch.no_grad():
        logits = model(features)
        probs = torch.softmax(logits, dim=0)
        class_idx = int(torch.argmax(logits).item())
        confidence = float(probs[class_idx].item())

    qubits = class_idx + 1
    topology = CLASS_TOPOLOGY.get(class_idx, "grid")

    # Apply topology keyword overrides (highest priority)
    topology = _apply_topology_keywords(prompt, topology)

    return {
        "qubits": qubits,
        "topology": topology,
        "class_index": class_idx,
        "confidence": round(confidence, 3),
        "method": "ml",
    }


# ── Explicit qubit count detection ────────────────────────────────────────────

def has_explicit_qubit_count(prompt: str) -> Optional[int]:
    """
    If prompt contains an explicit N-qubit phrase, return N.
    Handles: digits, number words, and shorthand forms (5q, 5Q, Q5, etc.)
    """
    p = prompt.lower().strip()

    # Digit patterns: "5 qubits", "5-qubits", "5qubit", "5q", "q5"
    for pattern in [
        r"\b(\d+)\s*[-–]?\s*qubits?\b",        # "5 qubits", "5-qubit"
        r"\bqubits?\s*[-–]?\s*(\d+)\b",         # "qubits 5"
        r"\b(\d+)\s*[-–]?\s*q\b",               # "5q", "5-q"
        r"\bq[-–]?\s*(\d+)\b",                  # "q5", "q-5"
    ]:
        m = re.search(pattern, p)
        if m:
            return int(m.group(1))

    # Word patterns: "five qubits", "five-qubit", "five q"
    for word, num in WORD_TO_NUM.items():
        if re.search(rf"\b{re.escape(word)}\s*[-–]?\s*qubits?\b", p):
            return num
        if re.search(rf"\bqubits?\s*[-–]?\s*{re.escape(word)}\b", p):
            return num
        if re.search(rf"\b{re.escape(word)}\s*[-–]?\s*q\b", p):
            return num

    return None


# ── Topology detection ────────────────────────────────────────────────────────

def _detect_topology_regex(prompt: str, n: int) -> str:
    """Rule-based topology detection for all qubit counts."""
    p = prompt.lower()
    # Explicit topology keywords — checked first, highest priority
    if re.search(r"heavy.?hex", p):
        return "heavy_hex"
    if any(w in p for w in ("line", "chain", "linear", "bell", "entangle", "string")):
        return "line"
    if any(w in p for w in ("ring", "circular", "loop", "cycle", "closed")):
        return "ring"
    if any(w in p for w in ("star", "hub", "spoke", "radial")):
        return "star"
    if any(w in p for w in ("grid", "square", "lattice", "2x2", "2×2", "surface", "rectangular")):
        return "grid"
    if "triangular" in p or "triangle" in p:
        return "ring"   # triangular = 3-node ring
    # Size-based defaults for well-known IBM architectures
    if n == 7:
        return "heavy_hex"
    if n == 27:
        return "heavy_hex"
    if n in (53, 65, 127):
        return "heavy_hex"
    if n in (16,):
        return "heavy_hex"
    if n in (3,):
        return "ring"
    if n in (2,):
        return "line"
    if n in (5,):
        return "star"
    return "grid"   # sensible default


def _apply_topology_keywords(prompt: str, default: str) -> str:
    """Apply explicit topology keyword overrides on top of any default."""
    p = prompt.lower()
    if re.search(r"heavy.?hex", p):
        return "heavy_hex"
    if any(w in p for w in ("star", "hub", "spoke", "radial")):
        return "star"
    if any(w in p for w in ("line", "chain", "linear", "bell", "entangle", "string")):
        return "line"
    if any(w in p for w in ("ring", "circular", "loop", "cycle", "closed")):
        return "ring"
    if any(w in p for w in ("grid", "square", "lattice", "2x2", "rectangular")):
        return "grid"
    if "triangular" in p or "triangle" in p:
        return "ring"
    if any(w in p for w in ("hexagonal", "hex")) and "heavy" not in p:
        return "grid"   # hex without "heavy" = hexagonal grid
    return default


# ── Regex-only fallback path ──────────────────────────────────────────────────

def _resolve_regex_only(prompt: str, requested: int, max_qubits: int) -> Tuple[int, int, str, Dict[str, Any]]:
    """8+ qubits (or explicit 0): original regex/rules path — no ML qubit prediction."""
    n = max(1, min(max_qubits, requested if requested > 0 else 4))
    topology = _detect_topology_regex(prompt, n)
    ml_info = {
        "qubits": n,
        "topology": topology,
        "class_index": None,
        "confidence": None,
        "method": "regex",
        "ml_skipped": True,
        "reason": (
            f"Using rule-based parser ({requested} qubits > ML range 1–{ML_QUBIT_MAX})"
            if requested > ML_QUBIT_MAX
            else f"Using rule-based parser (qubit count {requested} outside ML range)"
        ),
    }
    return n, requested, topology, ml_info


# ── Main entry point ──────────────────────────────────────────────────────────

def resolve_design_params(prompt: str, max_qubits: int = 256) -> Tuple[int, int, str, Dict[str, Any]]:
    """
    Resolve design parameters from a natural language prompt.

    1–7 qubits (no explicit count): ML model with confidence gate.
    1–7 qubits (explicit count):    explicit count + ML for topology.
    8+ qubits:                       regex/rules only.
    Confidence < CONFIDENCE_THRESHOLD: always fall back to regex.
    torch not installed:             regex-only.

    Returns: (n_actual, n_requested, topology, ml_info_dict)
    """
    requested = has_explicit_qubit_count(prompt)

    # 8+ or 0: regex only (ML does not cover these)
    if requested is not None and (requested > ML_QUBIT_MAX or requested < ML_QUBIT_MIN):
        return _resolve_regex_only(prompt, requested, max_qubits)

    # Torch unavailable → regex always
    if not _TORCH_OK:
        n = max(1, min(max_qubits, requested if requested is not None else 4))
        topology = _detect_topology_regex(prompt, n)
        ml_info = {
            "qubits": n, "topology": topology,
            "class_index": None, "confidence": None,
            "method": "regex", "ml_skipped": True,
            "reason": "torch not installed — using rule-based parser",
        }
        return n, n, topology, ml_info

    # Explicit 1–7: trust the count, use ML only for topology
    if requested is not None and ML_QUBIT_MIN <= requested <= ML_QUBIT_MAX:
        n = max(ML_QUBIT_MIN, min(max_qubits, requested))
        try:
            ml_info = predict_intent(prompt)
            topology = _apply_topology_keywords(prompt, ml_info["topology"])
            confidence = ml_info["confidence"]
        except Exception:
            topology = _detect_topology_regex(prompt, n)
            confidence = 0.0
            ml_info = {"qubits": n, "topology": topology,
                       "class_index": None, "confidence": 0.0, "method": "regex"}

        ml_info = {
            **ml_info,
            "qubits": requested,
            "topology": topology,
            "method": "ml+regex" if confidence >= CONFIDENCE_THRESHOLD else "regex",
            "ml_skipped": False,
            "reason": (
                f"Explicit {requested} qubits in ML range; topology from ML (conf={confidence:.2f}) + keywords"
                if confidence >= CONFIDENCE_THRESHOLD
                else f"Explicit {requested} qubits; ML conf={confidence:.2f} below threshold, topology from regex"
            ),
        }
        # If topology confidence is low, let regex decide topology
        if confidence < CONFIDENCE_THRESHOLD:
            topology = _detect_topology_regex(prompt, n)
            ml_info["topology"] = topology

        return n, requested, topology, ml_info

    # No explicit count → full ML prediction for both count and topology
    try:
        ml_info = predict_intent(prompt)
        confidence = ml_info["confidence"]
    except Exception:
        # ML inference failed → regex fallback
        n = 4
        topology = _detect_topology_regex(prompt, n)
        ml_info = {
            "qubits": n, "topology": topology,
            "class_index": None, "confidence": 0.0,
            "method": "regex", "ml_skipped": True,
            "reason": "ML inference failed — using rule-based parser",
        }
        return n, n, topology, ml_info

    # Confidence gate: if ML isn't sure, fall back to regex with n=4 (sensible default)
    if confidence < CONFIDENCE_THRESHOLD:
        n = 4  # safe default when we can't determine qubit count
        topology = _detect_topology_regex(prompt, n)
        ml_info = {
            **ml_info,
            "qubits": n,
            "topology": topology,
            "method": "regex",
            "ml_skipped": True,
            "reason": (
                f"ML confidence {confidence:.2f} below threshold {CONFIDENCE_THRESHOLD}; "
                "falling back to regex with default 4 qubits"
            ),
        }
        return n, n, topology, ml_info

    n = max(ML_QUBIT_MIN, min(max_qubits, ml_info["qubits"]))
    topology = _apply_topology_keywords(prompt, ml_info["topology"])
    ml_info = {
        **ml_info,
        "topology": topology,
        "ml_skipped": False,
        "reason": f"ML intent (1–7 qubits, conf={confidence:.2f})",
    }
    return n, ml_info["qubits"], topology, ml_info
