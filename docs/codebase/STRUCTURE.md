# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `src/` | All application source code | `vite.config.ts` |
| `src/app/` | Root React component; mounts the router | `src/app/App.tsx` |
| `src/main.tsx` | Browser entry point; renders `<App>` into `#root` | `src/main.tsx` |
| `src/index.css` | Global CSS; Tailwind import + custom theme tokens + typography | `src/index.css` |
| `src/routes/` | Route definitions via `createBrowserRouter`; lazy-loads Settings | `src/routes/index.tsx` |
| `src/components/` | Shared UI components (AppLayout, ComicCard, HamburgerMenu, etc.) | `src/components/` |
| `src/features/` | Feature-oriented view modules (home, library, quick-read, reader, settings) | `src/features/` |
| `src/domain/` | Pure business-logic services and archive adapters (no React, no persistence) | `src/domain/` |
| `src/persistence/` | Dexie-based repositories + session store; all IndexedDB/sessionStorage access | `src/persistence/db.ts` |
| `src/workers/` | Vite Web Worker entry points for archive extraction, page prep, and thumbnails | `src/workers/` |
| `src/hooks/` | Custom React hooks (`useSwipe.ts`) | `src/hooks/useSwipe.ts` |
| `src/types/` | Ambient TypeScript declarations for untyped modules | `src/types/` |
| `tests/` | All automated tests (contract, integration, e2e, fixtures) | `tests/` |
| `public/` | Static assets served verbatim: manifest, icons, `.nojekyll` | `public/` |
| `scripts/deploy/` | GitHub Pages deployment helper (`deploy.mjs`) | `scripts/deploy/deploy.mjs` |
| `specs/001-comic-reader/` | Feature spec, plan, data model, contracts, tasks | `specs/001-comic-reader/spec.md` |
| `.github/workflows/` | GitHub Actions CI/CD pipeline | `.github/workflows/ci.yml` |

### 2) Entry Points

- **Main runtime entry**: `src/main.tsx` — mounts React tree into `<div id="root">` in `index.html`
- **HTML shell**: `index.html` — root HTML; references `src/main.tsx` via `<script type="module">`
- **Worker entries**: `src/workers/extraction.worker.ts`, `src/workers/page-prep.worker.ts`, `src/workers/thumbnail.worker.ts`
- **Service Worker**: generated at build time by Workbox/vite-plugin-pwa; `dev-dist/sw.js` (dev), `dist/sw.js` (production)
- **How entry is selected**: Vite resolves `src/main.tsx` as the input; workers are instantiated via `new Worker(new URL('...', import.meta.url), { type: 'module' })` in domain/feature code

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `src/domain/` | Pure business logic: archive adapters, library scanning, capability detection, error normalization | React imports, Dexie/persistence calls, `window`/DOM access (except where testing browser APIs) |
| `src/persistence/` | IndexedDB repositories (via Dexie), sessionStorage store for Quick Read | Business rules, React hooks, domain logic |
| `src/features/` | React views and controllers per feature; orchestrates domain + persistence | Direct IndexedDB schema definitions, archive format parsing logic |
| `src/components/` | Reusable React UI primitives shared across features | Feature-specific state management, API calls |
| `src/workers/` | Web Worker entry scripts; delegates to domain adapters | UI code, React, Dexie |
| `src/routes/` | Route configuration only; no view logic | Data fetching, business logic |

### 4) Naming and Organization Rules

- **File naming**: `kebab-case` for all TypeScript source files (e.g., `library-scanner.service.ts`, `cbz-adapter.ts`, `quick-read-session.store.ts`)
- **Component files**: `PascalCase` for React component files (e.g., `AppLayout.tsx`, `LibraryView.tsx`, `ReaderView.tsx`)
- **Directory organization**: Feature-oriented under `src/features/`; domain-layer under `src/domain/`; flat repositories under `src/persistence/`
- **Suffixes by module type**:
  - `.service.ts` — stateless domain services (e.g., `library-scanner.service.ts`)
  - `.repository.ts` — persistence layer (e.g., `library-comic.repository.ts`)
  - `.store.ts` — sessionStorage stores (e.g., `quick-read-session.store.ts`)
  - `.types.ts` — pure type definitions
  - `.worker.ts` — Web Worker entry points
  - `.adapter.ts` — archive format adapters
- **Import aliases**: None configured in `tsconfig.json`; all imports use relative paths
- **Test file naming**: `*.contract.test.ts` for contract tests, `*.integration.test.ts` for integration, `*.spec.ts` for Playwright E2E

### 5) Evidence

- `src/main.tsx`
- `src/routes/index.tsx`
- `src/domain/archive/archive-adapter-registry.ts`
- `src/persistence/db.ts`
- `src/workers/extraction.worker.ts`
