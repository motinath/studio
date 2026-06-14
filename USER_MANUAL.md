# User Manual — Silicofeller Quantum Studio (V2)

Welcome to the **Quantum Studio (V2)** User Manual. This guide provides an end-to-end walkthrough of the platform's layout visualization, EDA constraint checkers, and auto-routing pipelines.

---

## 1. Workbench Setup & Launching

Quantum Studio comprises a React frontend and a FastAPI backend. Start both services to begin your design session:

- **Launch Backend**: Under `/backend`, execute `.venv\Scripts\python run.py`.
- **Launch Frontend**: Under `/frontend`, execute `npm run dev` or `bun run dev` and navigate to `http://localhost:5173`.

---

## 2. Platform Authentication & Dashboard

1. **Accessing the Site**: Open `http://localhost:5173`. You will land on the homepage featuring custom styling.
2. **Register/Login**: Navigate to the Sign-In/Sign-Up pages. Authenticate with email/password to retrieve a JWT token.
3. **Project Dashboard**: Once logged in, you will be taken to your dashboard where you can:
   - Browse your active design project list.
   - See metadata summaries (qubit counts, active substrate, fabrication yield estimates).
   - Create a new project canvas or open an existing design.

---

## 3. The Schematic Editor & Prompt Copilot

The **Schematic Editor** (`/designer`) is where you specify the hardware configuration and topology of your quantum chip:

### Method A: Natural Language Prompt Copilot (Recommended)
1. In the sidebar panel, select **Prompt Copilot**.
2. Enter a natural language request, for example:
   > *"Create a 3-qubit ring on sapphire substrate with niobium metallization, target frequency 5.2 GHz"*
3. Click **Generate Layout**.
4. The system will run ML intent classification and physics solvers to automatically generate:
   - The correct qubit nodes (`Q1`, `Q2`, `Q3`) with frequency spacing $\ge 200$ MHz.
   - Qubit-qubit bus couplers and readout resonators.
   - Feedlines and control line wirebonds.
   - Staged coordinates.

### Method B: Graphical Schematic Building
- Drag and drop qubits, couplers, and resonators onto the schematic sheet.
- Bind pins (e.g. `bus_0` to a coupler's connection pad `a`) directly using the sidebar interface.

---

## 4. The Layout Designer (Physical Viewer)

Once the abstract schematic/prompt is compiled, the site loads the **Layout Viewer**:

1. **Interactive Canvas**: Pan and zoom inside the 2D layout canvas. The visualizer renders precise micro-strip paths, ground planes, pocket outlines, and wirebonds.
2. **Material Inspector**: Modify the active substrate and metallization choices:
   - **Substrates**: Silicon, Sapphire, or Silicon Nitride.
   - **Metals**: Aluminum, Niobium, Tantalum, or NbTiN.
3. **Property Inspector**: Select any placed component (Qubit, CoupledLineTee, Launchpad) to view and adjust parameters like `pad_width`, `pocket_height`, or `coupling_length`.

---

## 5. Design Rule Checking (DRC)

Before simulating or exporting, run the automated **DRC (Design Rule Checker)** to verify manufacturing tolerances:

1. Click **Run DRC** in the designer toolbar.
2. The engine evaluates 4 critical domains:
   - **Min Spacing**: Confirms qubits are separated by at least **0.4 mm** to prevent crosstalk.
   - **Frequency Collisions**: Checks that neighboring coupled qubits have a detuning separation $\ge 200$ MHz.
   - **Connectivity**: Validates that no qubits are left "floating" without coupler connections.
   - **Off-chip Bounds**: Validates that all components sit within the chip margins (e.g. 10.0 mm x 10.0 mm).
3. Any violations are highlighted on the canvas with instructions to resolve them.

---

## 6. Physics Simulator & Coherence Analysis

1. Click the **Physics Analysis** tab to analyze the electrical performance of your design.
2. **Transmon Parameters**: Review analytical computations of:
   - $E_J / E_C$ ratio.
   - Charge dispersion (in kHz).
   - Anharmonicity (in MHz).
3. **Coherence Estimates**: View estimated coherence times ($T_1$ and $T_2$ times) calculated based on substrate dielectric loss tangents and metal properties (e.g., Tantalum on Sapphire yield significantly longer coherence times than Aluminum on Silicon).
4. **Purcell Limits**: Review dressed frequency shifts and Purcell limit estimates.

---

## 7. Exporting the Tapeout Package

When your design passes all structural checks, you are ready to export the tapeout archives:

1. Click **Tapeout/Export** in the top toolbar.
2. The export engine compiles the design into the following files:
   - **GDS-II (`.gds`)**: The standard lithography layout binary file for wafer fabrication.
   - **DXF (`.dxf`)**: AutoCAD-compatible vector layout.
   - **SVG (`.svg`)**: Scalable vector rendering.
   - **QCLang (`.qc`)**: Structural representation of the design graph.
   - **Qiskit Metal Code (`.py`)**: A fully runnable python script setting up the Qiskit Metal `DesignPlanar` environment and placing the registry components.
3. Click **Download ZIP** to save the compiled tapeout package.
