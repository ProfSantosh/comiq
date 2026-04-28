# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript 6.x | `package.json` devDependencies |
| Runtime target | Browser (ES2020) | `tsconfig.app.json` |
| Package manager | npm (lockfile v3) | `package-lock.json` |
| Module/build system | Vite 8.x (ESM) | `vite.config.ts`, `package.json` scripts |

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| react | ^19.2.5 | UI rendering framework | `package.json` |
| react-dom | ^19.2.5 | DOM renderer for React | `package.json` |
| react-router-dom | ^7.14.2 | Client-side routing (BrowserRouter) | `src/routes/index.tsx` |
| dexie | ^4.4.2 | IndexedDB ORM for all durable persistence | `src/persistence/db.ts` |
| fflate | ^0.8.2 | CBZ/CBT extraction (ZIP/TAR in-browser) | `src/domain/archive/cbz-adapter.ts`, `cbt-adapter.ts` |
| js-untar | ^2.0.0 | CBT TAR extraction support | `src/domain/archive/cbt-adapter.ts` |
| vite-plugin-pwa | ^1.2.0 | PWA manifest + Workbox service worker | `vite.config.ts` |
| uuid | ^14.0.0 | ID generation for all entities | `src/domain/library/library-scanner.service.ts`, `src/persistence/db.ts` |

**Note:** `unrar.js` (optional WASM CBR extraction) is **not installed**. The CBR adapter is stubbed with a no-op alias in `vite.config.ts` pointing to `tests/__mocks__/unrar.js.ts`. CBR archives open but page extraction is unsupported at runtime.

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| Vite 8.x | Dev server and production bundler | `vite.config.ts` |
| TypeScript 6.x | Type checking; strict mode + no unused vars | `tsconfig.app.json` |
| Tailwind CSS v4 | Utility-first CSS via `@tailwindcss/vite` plugin | `src/index.css`, `vite.config.ts` |
| Vitest 4.x | Unit/integration test runner (jsdom environment) | `vite.config.ts` `test` block |
| @vitest/coverage-v8 | Code coverage (70% threshold all metrics) | `vite.config.ts` coverage section |
| @testing-library/react | React component testing | `tests/contract/*.test.ts` |
| @testing-library/jest-dom | DOM assertion matchers | `tests/setup.ts` |
| Playwright 1.59.x | E2E tests (Chromium only) | `playwright.config.ts` |
| fake-indexeddb | In-memory IndexedDB for Vitest | implied by `tests/contract/library-persistence.contract.test.ts` |
| jsdom | DOM simulation environment for Vitest | `vite.config.ts` `test.environment` |
| gh-pages | GitHub Pages deployment | `package.json` scripts |

### 4) Key Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173/comiq/)
npm run build        # Type-check + production build to dist/
npm run preview      # Serve built output locally
npm run test         # Run all Vitest tests
npm run test:unit    # Run Vitest tests with verbose reporter
npm run test:coverage # Run tests + enforce 70% coverage
npm run test:e2e     # Run Playwright E2E tests (requires dev server)
npm run deploy       # Build then deploy to GitHub Pages via gh-pages
```

### 5) Environment and Config

- Config sources: `vite.config.ts` (all build and test config), `tsconfig.app.json`, `tsconfig.node.json`, `playwright.config.ts`, `public/manifest.webmanifest`
- Required env vars: **None** — fully client-side, no server-side secrets required
- Base path: `/comiq/` (GitHub Pages deployment at `https://<user>.github.io/comiq/`)
- Deployment: GitHub Pages via `gh-pages` package; CI via `.github/workflows/ci.yml`
- No `.env.example` file exists — no environment variables are expected at runtime

### 6) Evidence

- `package.json`
- `vite.config.ts`
- `tsconfig.app.json`
- `playwright.config.ts`
- `src/persistence/db.ts`
