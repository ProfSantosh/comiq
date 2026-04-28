# Research: Modern Comic Reader

## Decision 1: Use a single-project React + Vite PWA deployed to GitHub Pages

**Decision**: Build the app as one client-side React/TypeScript project on Vite, package it as a PWA with `vite-plugin-pwa`, and deploy the static bundle to GitHub Pages under the repository base path.

**Rationale**:
- Matches the no-backend requirement and keeps deployment simple.
- Vite handles ESM, worker bundling, and static asset base-path rewriting cleanly.
- `vite-plugin-pwa` provides manifest generation, Workbox integration, and app-shell caching without introducing server dependencies.
- GitHub Pages provides HTTPS and static hosting, which is sufficient for service-worker registration and installability.

**Alternatives considered**:
- Netlify or Vercel: technically viable but adds platform-specific deployment behavior with no product benefit for v1.
- Multi-project frontend/backend split: rejected because the product promise is local-only processing with no backend.

## Decision 2: Use Dexie over raw IndexedDB or `idb`

**Decision**: Use Dexie as the primary IndexedDB access layer.

**Rationale**:
- Provides typed tables, indexes, migrations, and cleaner transaction semantics for a schema with multiple related stores.
- Easier to model queries for recent items, progress lookup, source availability, and thumbnail retrieval than the raw IndexedDB API.
- The bundle cost is small relative to the feature complexity and avoids persistence boilerplate.

**Alternatives considered**:
- Raw IndexedDB: smallest dependency footprint, but too verbose and error-prone for this schema.
- `idb`: simpler and lighter, but offers less ergonomic querying and schema organization for this feature set.

## Decision 3: Persist durable and transient state in separate browser stores

**Decision**: Keep IndexedDB as the durable source of truth for library sources, folder handles, comic records, thumbnail blobs, recent items, and reading progress; use sessionStorage only for Quick Read same-tab resume; use localStorage only for lightweight UI preferences such as dismissed prompts or non-critical toggles.

**Rationale**:
- Matches the constitution and the user request exactly.
- Prevents Quick Read from leaking into durable history or library records.
- Keeps localStorage out of large or structured data flows and avoids quota misuse.

**Alternatives considered**:
- IndexedDB for Quick Read resume too: possible, but violates the requirement that Quick Read remain tab-session scoped only.
- localStorage for progress or recent items: rejected because it is too limited and insufficiently structured.

## Decision 4: Build one shared reader engine for Library Mode and Quick Read

**Decision**: Define a shared reader engine that owns page ordering, page-based progress, display-mode switching, prefetch strategy, error normalization, and navigation state for both Library Mode and Quick Read.

**Rationale**:
- Prevents drift between the two entry modes.
- Aligns with the constitution requirement for one common engine API.
- Makes tests and adapter contracts reusable across library and one-off reading flows.

**Alternatives considered**:
- Separate library and quick-read readers: simpler initially, but creates duplicate logic and inconsistent behavior over time.

## Decision 5: Separate archive handling behind format-specific adapters

**Decision**: Implement a common archive-adapter contract with concrete adapters for CBZ via `fflate`, CBT via `js-untar`, and CBR via a browser-compatible WASM RAR extractor wrapped behind a dedicated adapter.

**Rationale**:
- Keeps reader flows format-agnostic.
- Uses lightweight, browser-friendly tooling for ZIP and TAR.
- Contains the riskier browser/WASM behavior for RAR behind one adapter boundary.
- Makes it possible to validate adapter behavior independently in contract tests.

**Alternatives considered**:
- One generic archive library: rejected because RAR support in browsers is materially different from ZIP/TAR support.
- Dropping CBR in v1: rejected because the requested scope explicitly includes CBR.

## Decision 6: Use Vite module workers for extraction, page preparation, and thumbnail generation

**Decision**: Use dedicated Vite-bundled module workers for archive extraction, page preparation, and thumbnail generation, and communicate using transferable objects where practical.

**Rationale**:
- Keeps decompression and image-heavy work off the main thread.
- Vite's native worker support is sufficient; no worker orchestration library is needed for v1.
- Separate workers keep responsibilities clear and allow queueing or throttling later without changing the public contracts.

**Alternatives considered**:
- Main-thread extraction with deferred rendering: rejected because it risks violating responsiveness goals for large archives.
- SharedWorker or worker-pool libraries: not necessary for the initial scope.

## Decision 7: Use incremental page preparation with browser-native decode APIs plus worker resize pipeline

**Decision**: Prepare pages incrementally, decode images with browser-native APIs such as `createImageBitmap` where available, and generate thumbnails in a worker-based resize pipeline with browser-compatible fallbacks.

**Rationale**:
- Avoids fully materializing large archives in memory.
- Keeps first-page time low by prioritizing cover/first-page extraction over complete archive expansion.
- Supports thumbnail caching independently from full reading.

**Alternatives considered**:
- Fully extract all pages before opening: rejected because it increases latency and memory pressure.
- Main-thread thumbnail generation: rejected because the user explicitly requires worker-based processing.

## Decision 8: Make Library Mode Chromium-first by capability detection, not UA branching alone

**Decision**: Gate Library Mode on the availability of the required File System Access capabilities and a desktop-class browser environment, while keeping Quick Read available everywhere the core reader can run.

**Rationale**:
- Fits the clarified v1 browser-support scope.
- Produces better fallback messaging than a blunt unsupported-browser block.
- Reduces the chance of presenting broken folder workflows on non-Chromium browsers.

**Alternatives considered**:
- Hard UA block only: simpler, but less robust and less future-friendly.
- Attempting partial library support on unsupported browsers: rejected because it creates a degraded experience the spec does not ask for.

## Decision 9: Use Workbox app-shell caching with explicit GitHub Pages base-path handling

**Decision**: Configure `vite-plugin-pwa` with Workbox and a GitHub Pages base path, ensure manifest scope and start URL align with `/comiq/`, and include `.nojekyll` in public assets.

**Rationale**:
- GitHub Pages is static-only, so the service worker must own offline shell continuity.
- Base-path alignment is required for route handling, service-worker scope, and installability on Pages.
- `.nojekyll` avoids Pages processing conflicts with generated assets.

**Alternatives considered**:
- Manual service-worker wiring: possible, but slower to implement and easier to misconfigure.

## Decision 10: Validate the shared engine and browser behaviors with Vitest, React Testing Library, and Playwright

**Decision**: Use Vitest for unit and integration logic, React Testing Library for UI interaction tests, and Playwright for end-to-end coverage of offline behavior, browser fallbacks, and PWA flows.

**Rationale**:
- Matches the requested test stack.
- Vite-native test tooling reduces setup friction.
- Playwright is well-suited for Chromium-focused PWA and offline tests.

**Alternatives considered**:
- Jest: workable but less aligned with a Vite-first stack.
- Cypress: viable for UI flows but less attractive for the required PWA/offline validation.

## Decision 11: Treat installed-PWA file-open integration as a v1.1 capability layered on Quick Read

**Decision**: Defer file-open integration to v1.1 and design it as an alternate launcher into the existing Quick Read flow rather than a new reader path.

**Rationale**:
- Browser support is limited and mainly useful for installed Chromium PWAs.
- Reusing Quick Read keeps the entry surface small and avoids adding a third reading mode.
- Protects v1 from unnecessary platform-specific delivery risk.

**Alternatives considered**:
- Deliver file-open support in v1: rejected because it adds platform-specific scope beyond the core reader promise.