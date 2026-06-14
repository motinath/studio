# Silicofeller Physics Analysis Engine

Scqubits-based physics analysis engine for the Silicofeller Quantum Studio platform.

## Overview

This module takes EM simulation results (from AWS Palace) and design specifications,
uses **scqubits** to compute qubit physics (frequencies, anharmonicity, T1/T2 coherence),
validates against design targets, and outputs structured reports.

## Supported Qubit Types

- **Transmon** (standard charge qubit)
- **Tunable Transmon** (SQUID-based, flux-tunable)
- **Fluxonium** (with superinductance)

## Capacity

- Up to **5 qubits** with readout resonators and coupling elements

## Quick Start

```bash
# Install
pip install -e ".[dev]"

# Run tests
pytest tests/ -v

# Start API server
uvicorn physics_engine.api.app:app --reload --port 8100

# Run example analysis
python examples/run_analysis.py
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/analyze` | POST | Full physics analysis pipeline |
| `/api/v1/analyze/single-qubit` | POST | Single qubit quick check |
| `/api/v1/analyze/coherence` | POST | Noise/coherence analysis only |
| `/api/v1/analyze/sweep` | POST | Parameter sweep |
| `/api/v1/validate` | POST | Validate against targets |
| `/api/v1/suggest-params` | POST | Reverse-engineer EJ/EC from targets |
| `/api/v1/health` | GET | Health check |

## Project Structure

```
src/physics_engine/
├── config.py                  # Constants and defaults
├── models/                    # Pydantic data models (integration schemas)
├── core/                      # Core computation engine
├── validators/                # Physics target validation
├── visualization/             # Plot generation
├── report/                    # Report assembly
├── pipeline.py                # End-to-end orchestrator
└── api/                       # FastAPI service
```
