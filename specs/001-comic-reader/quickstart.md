# Quickstart: Modern Comic Reader

## Goal

Bootstrap and validate the planned single-project React/Vite PWA for local-first comic reading on GitHub Pages.

## Planned Stack

- React + TypeScript + Vite
- Dexie for IndexedDB
- `vite-plugin-pwa` for service worker and manifest generation
- `fflate`, `js-untar`, and a WASM RAR adapter for archive handling
- Web Workers for extraction, page preparation, and thumbnail generation
- Vitest, React Testing Library, and Playwright for validation

## Initial Project Setup

```bash
npm create vite@latest . -- --template react-ts
npm install react-router-dom dexie fflate js-untar vite-plugin-pwa
npm install <browser-compatible-rar-wasm-package>
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test
```

## Planned Implementation Order

1. Scaffold the single-project Vite app with GitHub Pages base-path support.
2. Add the PWA manifest, `.nojekyll`, and service-worker integration.
3. Implement the IndexedDB schema and repository layer.
4. Define and test the shared archive adapter and reader engine contracts.
5. Implement worker-backed archive extraction, page preparation, and thumbnail generation.
6. Build Library Mode with capability detection and multi-folder persistence.
7. Build Quick Read on top of the shared reader engine.
8. Add recent items, progress indicators, fallback messaging, and recovery flows.
9. Add unit, integration, contract, and Playwright coverage.
10. Build and deploy to GitHub Pages.

## Development Commands

```bash
npm run dev
npm run test
npm run test:unit
npm run test:e2e
npm run build
npm run preview
```

## Validation Focus

- Library Mode only appears when Chromium folder-access capabilities are present.
- Quick Read works without persistent library side effects.
- Reader mode switching preserves page-based progress.
- Offline reload works after a successful initial load.
- Corrupt archives and missing permissions return the user to a stable state.

## GitHub Pages Notes

- Set Vite `base` to `/comiq/` for production builds.
- Ensure manifest `start_url` and service-worker scope align with `/comiq/`.
- Include `public/.nojekyll` so Pages does not rewrite generated assets.
- Validate the deployed app in Chromium with offline mode and installation flow.

## Stretch Goal Boundary

Installed-PWA file-open integration is intentionally deferred to v1.1 and should reuse the Quick Read launch path instead of introducing a third reader mode.