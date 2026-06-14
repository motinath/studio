# Routes — Silicofeller Quantum Studio (frontend)

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory is a route.

> Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or `app/layout.tsx` —  
> those are Next.js / Remix conventions, not TanStack Start.

`routeTree.gen.ts` is **auto-generated** by TanStack Router. Never edit it by hand.

---

## Route Map

| File | URL | Auth | Description |
|------|-----|------|-------------|
| `__root.tsx` | _(all)_ | — | App shell: `QueryClientProvider`, `AuthProvider`, `Toaster` |
| `index.tsx` | `/` | Public | Landing page — hero, features, demo, contact (own colour theme) |
| `_auth.tsx` | — | — | Unauthenticated layout (centred card) |
| `_auth/sign-in.tsx` | `/sign-in` | Public | Sign in form → `POST /api/auth/token` |
| `_auth/sign-up.tsx` | `/sign-up` | Public | Register form → `POST /api/auth/register` |
| `_auth/forgot-password.tsx` | `/forgot-password` | Public | Password reset |
| `_app.tsx` | — | **Required** | Authenticated layout: sidebar + header, redirects if not signed in |
| `_app/dashboard.tsx` | `/dashboard` | ✅ | Workspace home — real stats from `/api/projects` + `/api/simulations` |
| `_app/designer.tsx` | `/designer` | ✅ | AI chip designer — `POST /generate` → real chip from backend only |
| `_app/projects.tsx` | `/projects` | ✅ | Project manager — full CRUD via `/api/projects` |
| `_app/schematic-editor.tsx` | `/schematic-editor` | ✅ | Visual transmon schematic editor (canvas) |
| `_app/layout-viewer.tsx` | `/layout-viewer` | ✅ | Physical layout / GDS viewer — renders backend placement data |
| `_app/verification.tsx` | `/verification` | ✅ | DRC + frequency verification — `POST /api/verification/check` |
| `_app/simulations.tsx` | `/simulations` | ✅ | Simulation runner — `GET/POST /api/simulations` |
| `_app/results.tsx` | `/results` | ✅ | Results viewer |
| `_app/component-library.tsx` | `/component-library` | ✅ | Qubit component catalogue |
| `_app/physics-analysis.tsx` | `/physics-analysis` | ✅ | Physics analysis tools |
| `_app/fault-tolerance.tsx` | `/fault-tolerance` | ✅ | Fault-tolerance metrics |
| `_app/profile.tsx` | `/profile` | ✅ | User profile |
| `_app/settings.tsx` | `/settings` | ✅ | App settings |

---

## File-Based Routing Conventions

| Pattern | URL |
|---------|-----|
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `_layout.tsx` | Layout route (renders children via `<Outlet />`) |
| `__root.tsx` | App shell — wraps every page; do not remove `<Outlet />` |

---

## Backend Integration

**All data shown to the user comes from the backend.** There are no client-side mock generators.

All API calls live in `src/lib/api/backend.ts`. The backend URL is read from `VITE_BACKEND_URL`:

```env
VITE_BACKEND_URL=http://localhost:5000
```

### Key functions

```ts
generateChip(prompt, substrate?, metal?); // POST /generate → GenerateResponse (throws on error)
runVerification(payload);                 // POST /api/verification/check (throws on error)
fetchMaterials();                         // GET  /api/materials (throws on error)
fetchProjects();                          // GET  /api/projects
fetchSimulations();                       // GET  /api/simulations
fetchHealth();                            // GET  /health (returns {status:"offline"} safely)
parseQCLang(source);                      // POST /api/qclang/parse
compileQCLang(source, options?);          // POST /api/qclang/compile
askClaude(message, contextType?, ...);    // POST /api/claude/chat
```

> `generateChip`, `runVerification`, and `fetchMaterials` will **throw** if the backend is unavailable.
> The calling component is responsible for displaying the error to the user (the designer already does this).

---

## Designer Session Naming

New design sessions in the AI designer are automatically named **`Untitled Project 1`**, **`Untitled Project 2`**, etc.
Once a design is synthesised (num_qubits > 0), the sidebar label switches to `{N}Q {Topology}` (e.g. `27Q Heavy Hex`).

---

## Auth Roles

| Role | Access |
|------|--------|
| `admin` | All pages including Admin Console and Billing |
| `org_manager` | Dashboard, Designer, Projects, Schematic, Layout, Verification, Simulations, Settings, Profile |
| `engineer` | Dashboard, Designer, Schematic, Layout, Verification, Settings, Profile |
