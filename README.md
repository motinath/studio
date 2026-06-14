# Silicofeller Quantum Studio (V2)

### **Professional Constraint-Driven EDA Platform for Superconducting Quantum Chip Design**

Quantum Studio (V2) is an advanced constraint-driven electronic design automation (EDA) platform built for quantum hardware engineers. It mirrors professional industrial workflows for superconducting chip layouts:

```
Architecture Design ──> Chip Topology ──> Physical Layout ──> Auto-Routing
       │                                                          │
       v                                                          v
Tapeout Package <── Fabrication Review <── EM Simulation <── 4-Domain DRC
```

> [!IMPORTANT]
> **Dynamic Core Architecture:**
> All design actions, calculations, DRC runs, simulations, and export pipelines are executed dynamically by the backend API. There are no client-side fallbacks. The backend server **must** be active for the application workspace, schematic editor, and layout visualizer to function.

---

## 🚀 Quick Start (Running the Site)

You can run the entire site in a containerized environment using **Docker Compose** or run the services **locally** for development.

### Method A: Local Development Setup (Recommended)

#### 1. Backend Service (FastAPI)
Open your terminal and execute:
```bash
# Navigate to the backend directory
cd backend

# Initialize the virtual environment and install python packages
python setup.py       # Windows (CMD / PowerShell)
# or
python3 setup.py      # macOS / Linux

# Create your local environment settings file
cp .env.example .env    # macOS / Linux / Git Bash
# or
copy .env.example .env  # Windows CMD / PowerShell

# Start the development backend server
.venv\Scripts\python run.py   # Windows (CMD / PowerShell)
# or
.venv/bin/python run.py       # macOS / Linux
```
* **API Address:** `http://localhost:5000`
* **Interactive Swagger UI:** `http://localhost:5000/docs`
* **Alternative ReDoc UI:** `http://localhost:5000/redoc`

> [!NOTE]
> By default, the development server uses a zero-setup local SQLite database (`dev.db`), which is created and migrated automatically upon first start. No database administration is needed locally.

---

#### 2. Frontend Web Application (React & TanStack Start)
Open a **second terminal** window and run:
```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies (npm or bun)
npm install
# or
bun install

# Launch the development server
npm run dev
# or
bun run dev
```
* **Application URL:** `http://localhost:5173`
* **API Connection:** Configured automatically to hook into the backend at `http://localhost:5000`. You can override this endpoint in `frontend/.env.local` if needed:
  ```env
  VITE_BACKEND_URL=http://localhost:5000
  ```

---

### Method B: Containerized Production Launch (Docker Compose)

Run the database, caching queue, API server, and user interface together with one command.

1. **Set your cryptographic secret key** in your shell environment first:
   ```powershell
   # PowerShell (Windows)
   $env:SECRET_KEY="your-secret-minimum-32-chars-long"
   ```
   ```bash
   # Bash / Zsh (macOS / Linux)
   export SECRET_KEY="your-secret-minimum-32-chars-long"
   ```

2. **Spin up the stack** from the project's root folder:
   ```bash
   docker-compose up --build
   ```

3. **Docker Mappings:**
   * **Frontend Web App:** `http://localhost:3000`
   * **Backend API Server:** `http://localhost:5000`
   * **Postgres Database:** Port `5432` (Persistent storage)
   * **Redis Instance:** Port `6379` (Background queues)

---

## 🛠️ Stack & Prerequisites

### System Prerequisites
| Resource | Version | Purpose |
| :--- | :--- | :--- |
| **Python** | 3.10 – 3.11 | Python environment running the core algorithm engine |
| **Node.js** | 18+ (LTS) | Frontend bundling and development tools |
| **NPM / Bun** | Latest | Client dependency resolution |
| **Docker** | Latest Desktop | Container orchestration |

### Technology Stack
* **Frontend Web Application:** React (v19), TanStack Start, TanStack Router, TanStack Query, TailwindCSS (v4), Radix UI components, React Flow canvas, Recharts dashboards.
* **Backend API Framework:** FastAPI, Uvicorn, SQLAlchemy (async database driver), Alembic (DB migrations), Pydantic validation schemas.
* **Physics & Graph Engineering:** Qiskit Metal (sub-process design evaluator), NetworkX (topology algorithms), scqubits (charge qubit simulations), PyTorch (intent parsing).

---

## 📂 Project Repository Map

```
Quantum_Studio/
├── backend/
│   ├── app/
│   │   ├── core/design_graph/   # Graph data structure (Nodes: Qubits, Readout, Launchpad...)
│   │   ├── constraints/         # Builder translating user constraints JSON into design graphs
│   │   ├── drc/                 # 4-Domain Design Rule Checking (Geometry, Freq, Fab, Connectivity)
│   │   ├── routing/             # Auto-routing engines (CPW, Resonators, Feedlines)
│   │   ├── exports/             # Export engine (GDS-II, DXF, QCLang, SVG, PDF report, JSON)
│   │   ├── services/            # Main design orchestrators, simulation, materials, tapeout
│   │   ├── routers/             # Web API routes (design, simulations, projects, auth...)
│   │   └── main.py              # FastAPI app startup and configurations
│   ├── requirements.txt         # Python libraries
│   ├── setup.py                 # Virtual env builder and package installer
│   └── run.py                   # Development server entry point
├── frontend/
│   ├── src/
│   │   ├── routes/              # TanStack router structure (landing page, dashboard, designer, schematic)
│   │   ├── lib/api/backend.ts   # Main client querying the FastAPI server (strictly zero mocks)
│   │   ├── components/          # Reusable UI dashboard, canvas elements, and editor components
│   │   └── styles.css           # Styling directives
│   ├── Dockerfile               # Production container configurations (detects NPM or Bun)
│   ├── package.json             # NPM project scripts and dependencies
│   └── vite.config.ts           # Vite + TanStack Start runtime options
└── docker-compose.yml           # Complete container network definition for database, API, and UI
```

---

## 🧩 Key API Reference

### Design Synthesizer (V2)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/design/generate` | Synthesizes a full design graph from abstract constraints JSON. |
| `POST` | `/api/design/generate-from-graph` | Triggers physical layout compiler from custom schematic graph. |
| `POST` | `/api/design/validate` | Validates connectivity, bipartite coloring, and degree constraints. |
| `POST` | `/api/design/route` | Resolves CPW micro-strip routing configurations. |
| `POST` | `/api/design/drc` | Runs the 4-domain design rule checker. |
| `POST` | `/api/design/export-all` | Compiles DXF, GDS-II, QCLang, SVG, and PDF into a zip archive. |

### Project Management & Simulations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/token` | Issues a cryptographically signed OAuth2 JWT. |
| `GET`  | `/api/projects` | Queries all projects created by the authenticated user. |
| `POST` | `/api/simulations/{id}/run` | Triggers a scqubits/Palace simulation worker. |
| `GET`  | `/api/materials` | Fetches active substrate (Silicon, Sapphire) and metal properties. |
| `POST` | `/api/claude/chat` | AI co-pilot chatbot endpoint. |

---

## ⚙️ Configuration Variables

### Backend Settings (`backend/.env`)
Create this file by copying `backend/.env.example`. Adjust configuration variables as needed:
```env
# Database Settings (SQLite defaults, override with PostgreSQL in production)
DATABASE_URL=sqlite+aiosqlite:///./dev.db
SYNC_DATABASE_URL=sqlite:///./dev.db

# Cryptographic Salt & Token Settings
SECRET_KEY=dev-secret-key-change-in-production-minimum-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Cross-Origin Resource Sharing (CORS) Allowlist
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174

# AI Intent Co-pilot
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🧪 Validation & Tests

Confirm system readiness and run structural algorithm validation suites in your backend environment:

```bash
cd backend

# Execute the core V2 unit test suite (Graph modeling, DRC engines, layout routing)
.venv\Scripts\python check_v2.py   # Windows
# or
.venv/bin/python check_v2.py       # macOS / Linux

# Execute the API integration smoke tests
.venv\Scripts\python smoke_test.py # Windows
# or
.venv/bin/python smoke_test.py     # macOS / Linux
```

---

## 🔍 Troubleshooting

### Common Setup Hurdles

| Symptom | Root Cause | Solution |
| :--- | :--- | :--- |
| **Backend server fails to start** | Uninitialized python virtual env | Run `python setup.py` in the `/backend` folder. |
| **Port 5000 is already in use** | Zombie process locking the port | Free up port 5000: <br>• Windows: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess`<br>• Unix: `kill -9 $(lsof -t -i:5000)` |
| **Blank screens or network exceptions** | Frontend is active but backend is offline | Start the backend API server. The UI depends on backend endpoints for material specs, designs, and simulations. |
| **Qiskit Metal imports failing on system** | Missing native GUI widgets / Qt modules | The backend implements a mock UI subsystem wrapper in `app/routers/bridge_worker.py` ensuring headless design compiler execution on modern servers. |
