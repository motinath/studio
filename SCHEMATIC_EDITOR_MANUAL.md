# Schematic Editor — User Manual and Design Guide

Welcome to the **Schematic Editor** (`/schematic-editor`) guide. This manual details how to design quantum circuits, place component nodes, connect pins via micro-strip routes, and fully leverage the EDA workbench features.

---

## 1. Schematic Editor Interface Overview

The interface is divided into four main sections:
1. **Toolbar (Top)**: Actions for zooming, fitting canvas, saving workspace, undo/redo, toggling the Component Library, and opening the Code IDE panels.
2. **Component Library (Left, Toggleable)**: Contains the catalog of supported components (e.g. `TransmonPocket`, `TransmonCross`, `LaunchpadWirebond`, etc.) to drag onto the canvas.
3. **Interactive Canvas (Center)**: A millimeter-scale (9.0 mm × 6.0 mm) physical board where you place, drag, select, and connect components.
4. **Property Inspector (Right, Select-Sensitive)**: Automatically displays parameter options (e.g. `pad_width`, `coupling_length`, `orientation`) when a component is clicked.
5. **Code IDE Panel (Right, Conditional)**: View generated Qiskit Metal code or QCLang representation side-by-side with your visual design.

---

## 2. Placing and Positioning Components

### Drag & Drop Layout
1. Open the **Component Library** using the toolbar button.
2. Click and drag a component (e.g., `TransmonPocket`) from the library panel onto the canvas.
3. **Canvas Constraints**:
   - **Board Limits**: The active canvas area spans from **-4.5 mm to 4.5 mm** on the X-axis and **-3.0 mm to 3.0 mm** on the Y-axis.
   - **Snap-to-Grid**: Movement snaps to **0.05 mm** (50 µm) intervals to ensure perfect alignment for micro-strip routes.

---

## 3. Circuit Connections and Auto-Routing

Unlike conventional electronics simulators, transmission line routes cannot be placed as standalone nodes. Instead, they are generated dynamically between component pins.

### Creating a Connection:
1. Click on a placed component to reveal its available pins (represented as colored circle terminals, e.g. `readout`, `bus_0`, `bus_1`, `control`).
2. Hover over a pin terminal to activate the crosshair cursor.
3. **Click the starting pin**: The canvas will display a prompt: *"Click another pin to connect · Esc to cancel"*.
4. **Click the target pin** on another component.
5. The backend will invoke the routing engine, automatically computing and rendering a physical micro-strip CPW line (a `RouteMeander` component) with appropriate fillets, trace widths, and dielectric gaps.

### Connection Cautions:
- **Pin compatibility**: Always connect pins of the same type (e.g., connecting a qubit's `readout` pin to a resonator tee's `second_end` pin, or a qubit's `bus` pad to a coupler's connection pad).
- **Escape action**: If you select a start pin by mistake, press `Escape` to cancel the pending connection.

---

## 4. Keyboard Shortcuts Reference

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **`Ctrl + S`** (or `Cmd + S`) | Save Design | Commits the current canvas tab state to your workspace databases. |
| **`F`** | Fit to View | Auto-centers and zooms the canvas to fit all placed components. |
| **`Ctrl + Z`** (or `Cmd + Z`) | Undo | Reverts the last placement, connection, or deletion. |
| **`Ctrl + Shift + Z`** (or `Ctrl + Y`) | Redo | Restores the reverted action. |
| **`Delete`** / **`Backspace`** | Delete Selected | Deletes the currently selected qubit, launchpad, or CPW connection line. |
| **`Escape`** | Cancel / Deselect | Cancels a pending pin connection or deselects any active component. |

---

## 5. Design Rule Verification

The Schematic Editor is fully integrated with the backend physics engine. Use the top toolbar options to verify design parameters:
1. **DRC Review**: Verify that your placed components satisfy minimum spacing bounds (0.4 mm) and that neighboring qubits are spaced appropriately in frequency domain to avoid collisions.
2. **Parameters Sync**: Tweak coordinates or pad options in the **Property Inspector** and see the changes automatically re-routed and compiled.
