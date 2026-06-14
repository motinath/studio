# Quantum Studio Backend

This directory contains the FastAPI backend server for Quantum Studio.

For complete setup guidelines, frontend configuration, environment variables, Docker configuration, and troubleshooting, please refer to the main **[root README.md](../README.md)**.

## Quick Start (Local Run)

### Setup

```bash
# Create virtual environment and install dependencies
python setup.py     # Windows (CMD / PowerShell)
# or
python3 setup.py    # macOS / Linux

# Copy environment variables template
cp .env.example .env    # macOS / Linux
# or
copy .env.example .env  # Windows
```

### Run Server

```bash
# Start development server
.venv\Scripts\python run.py   # Windows (CMD / PowerShell)
# or
.venv/bin/python run.py       # macOS / Linux
```

The server will run at **`http://localhost:5000`**. You can access the interactive API docs at `http://localhost:5000/docs`.

## Running Tests

Verify system algorithms and configurations:

```bash
# V2 design graph, routing and DRC tests
.venv\Scripts\python check_v2.py   # Windows
# or
.venv/bin/python check_v2.py       # macOS / Linux

# Integration smoke tests
.venv\Scripts\python smoke_test.py # Windows
# or
.venv/bin/python smoke_test.py     # macOS / Linux
```
