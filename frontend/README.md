# Quantum Studio Frontend

This directory contains the React (Vite + TanStack Start) web application for Quantum Studio.

For complete setup guidelines, backend configuration, environment variables, Docker configuration, and troubleshooting, please refer to the main **[root README.md](../README.md)**.

## Quick Start (Local Run)

### Using npm

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Using Bun (Recommended if bun.lock is used)

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

The app will start on **`http://localhost:5173`** and proxy API calls to the backend running at **`http://localhost:5000`**. You can override this in `frontend/.env.local` if needed.
