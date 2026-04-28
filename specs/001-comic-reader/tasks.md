---
description: "Task list for the Modern Comic Reader feature"
---

# Tasks: Modern Comic Reader

**Input**: Design documents from `/specs/001-comic-reader/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Contract and integration tests cover the shared reader engine, all three archive adapters, IndexedDB persistence/resume, Quick Read session isolation, mode-switching progress invariants, error recovery flows, and offline app-shell behavior. Playwright e2e tests validate offline relaunch, PWA installability, fallback messaging, and Quick Read session isolation end-to-end.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- File paths follow the single-project layout defined in plan.md

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Scaffold the Vite/React/TypeScript project, install all dependencies, configure tooling, and prepare the GitHub Pages deployment target.

- [X] T001 Scaffold Vite React-TS project, set `base: '/comiq/'` in vite.config.ts and add `public/.nojekyll`
- [X] T002 Install runtime dependencies: react-router-dom, dexie, fflate, js-untar, vite-plugin-pwa, and browser-compatible WASM RAR adapter package
- [X] T003 Install dev dependencies: vitest, @vitest/coverage-v8, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, @playwright/test and add test/build/deploy scripts to package.json
- [X] T004 [P] Configure Tailwind CSS v4 — add @tailwindcss/vite plugin to vite.config.ts and add `@import "tailwindcss";` to src/index.css
- [X] T005 [P] Configure Vitest with jsdom environment, coverage thresholds, and test glob patterns in vite.config.ts
- [X] T006 [P] Configure Playwright in playwright.config.ts pointing to tests/e2e/ with Chromium project
- [X] T007 [P] Configure vite-plugin-pwa in vite.config.ts with Workbox app-shell caching, manifest generation, and `/comiq/` scope/start_url
- [X] T008 [P] Add `public/manifest.webmanifest` with correct `start_url`, `scope`, name, and placeholder icon references in public/icons/
- [X] T009 [P] Add GitHub Pages deployment script in scripts/deploy/ and add `npm run deploy` script (build + gh-pages push)

**Checkpoint**: Repo scaffolded, dependencies installed, tooling configured — `npm run dev` and `npm run test` run without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared TypeScript contracts, IndexedDB schema, persistence repositories, capability detection, app routing shell, and worker wiring that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T010 Define archive adapter TypeScript types and `ArchiveAdapter` interface per the contract in src/domain/archive/archive-adapter.types.ts
- [X] T011 [P] Define reader engine TypeScript types and `ReaderEngine` interface per the contract in src/domain/reader/reader-engine.types.ts
- [X] T012 [P] Implement Dexie database class with all stores and indexes (LibrarySource, LibraryComic, ThumbnailRecord, ReadingProgressRecord, RecentLibraryItem, ReaderPreference) in src/persistence/db.ts
- [X] T013 [P] Implement LibrarySource repository (CRUD, status update, handle persistence) in src/persistence/library-source.repository.ts
- [X] T014 [P] Implement LibraryComic repository (upsert by (sourceId, relativePath), list by sourceId, availability update) in src/persistence/library-comic.repository.ts
- [X] T015 [P] Implement ThumbnailRecord repository (save, get by comicId, mark failed) in src/persistence/thumbnail.repository.ts
- [X] T016 [P] Implement ReadingProgressRecord repository (upsert, get by comicId) and RecentLibraryItem repository (upsert with max-five eviction) in src/persistence/reading-progress.repository.ts
- [X] T017 [P] Implement ReaderPreference Dexie repository in src/persistence/reader-preference.repository.ts and QuickReadSession sessionStorage adapter in src/persistence/quick-read-session.store.ts
- [X] T018 Implement browser capability detection service (File System Access API presence + desktop check) in src/domain/library/capability-detection.service.ts
- [X] T019 [P] Create React Router v6 app shell with routes: `/`, `/library`, `/quick-read`, `/reader/:comicId`, `/settings` in src/routes/ with src/routes/index.tsx
- [X] T020 [P] Create application entry points: src/main.tsx, src/app/App.tsx with router provider, and src/index.css with Tailwind import

**Checkpoint**: All contracts typed, all IndexedDB stores implemented and tested with Vitest, routing shell renders — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — Build a Persistent Local Library (Priority: P1) 🎯 MVP

**Goal**: Users on desktop Chromium can grant access to one or more local folders, browse all supported comics in a combined library with covers and progress, and reopen titles in later sessions (including offline) with reading progress restored.

**Independent Test**: Grant access to two local folders containing CBZ/CBT/CBR files; confirm the library grid shows all supported comics with generated cover thumbnails and progress badges; open a comic, read to page 3, close the app, reopen the app offline, navigate to the same comic — confirm it reopens at page 3.

### Contract Tests for User Story 1

- [X] T021 [P] [US1] Write contract test suite for LibrarySource and LibraryComic repositories in tests/contract/library-persistence.contract.test.ts
- [X] T022 [P] [US1] Write contract tests for CBZ archive adapter (manifest ordering, first-page extraction, corrupt-archive error normalization, unsupported-file filtering) in tests/contract/cbz-adapter.contract.test.ts
- [X] T023 [P] [US1] Write contract tests for CBT archive adapter (same behavioral axes as T022) in tests/contract/cbt-adapter.contract.test.ts
- [X] T024 [P] [US1] Write contract tests for CBR archive adapter (same behavioral axes as T022, plus WASM load success) in tests/contract/cbr-adapter.contract.test.ts
- [X] T025 [P] [US1] Write integration test for multi-folder library scan workflow (scan → discover → persist comics) in tests/integration/library-scan.integration.test.ts

### Implementation for User Story 1

- [X] T026 [P] [US1] Implement CBZ archive adapter using fflate in src/domain/archive/cbz-adapter.ts conforming to ArchiveAdapter interface
- [X] T027 [P] [US1] Implement CBT archive adapter using js-untar in src/domain/archive/cbt-adapter.ts conforming to ArchiveAdapter interface
- [X] T028 [P] [US1] Implement CBR archive adapter using WASM RAR extractor in src/domain/archive/cbr-adapter.ts conforming to ArchiveAdapter interface
- [X] T029 [US1] Implement archive adapter registry / factory that selects the correct adapter by extension in src/domain/archive/archive-adapter-registry.ts (depends on T026, T027, T028)
- [X] T030 [US1] Implement thumbnail generation worker entry point in src/workers/thumbnail.worker.ts (accepts page ArrayBuffer, returns resized Blob via transferable)
- [X] T031 [US1] Implement thumbnail generation service (queues work to thumbnail worker, stores result in ThumbnailRecord) in src/domain/library/thumbnail.service.ts
- [X] T032 [US1] Implement library scanner service (reads FileSystemDirectoryHandle, discovers supported comics, upserts LibraryComic records, triggers thumbnail generation) in src/domain/library/library-scanner.service.ts
- [X] T033 [US1] Implement LibrarySource management service in src/domain/library/library-source.service.ts — add folder via `showDirectoryPicker`, verify/request permissions, update status; **remove source with cascade-delete** of all associated LibraryComic, ThumbnailRecord, ReadingProgressRecord, and RecentLibraryItem rows (FR-023); **on-demand rescan** that re-examines folder for new/removed/changed comics, marks missing comics with `availability: 'missing'` without deleting their records (FR-025, FR-026)
- [X] T034 [P] [US1] Implement ComicCard component in src/components/ComicCard.tsx — thumbnail image or placeholder, title, progress badge, ARIA label; render a **visible unavailable/missing indicator** when `availability !== 'ready'` (FR-026)
- [X] T035 [P] [US1] Implement RecentlyReadSection component showing the last 5 library comics ordered by lastOpenedAt in src/features/library/RecentlyReadSection.tsx
- [X] T036 [US1] Implement LibraryGrid component in src/features/library/LibraryGrid.tsx — responsive grid of ComicCard components, loading skeleton state; **sort comics alphabetically by fileName A→Z** by default (FR-024)
- [X] T036b [P] [US1] Implement LibrarySourceManager component in src/features/library/LibrarySourceManager.tsx — lists all granted folder sources with their status, provides **Remove** action per source (triggers cascade-delete via library-source.service) and **Rescan** action (triggers on-demand rescan); shown as a collapsible panel inside LibraryView
- [X] T037 [US1] Implement LibraryView page component — capability detection gate, add-folder action, library grid, recently read section in src/features/library/LibraryView.tsx
- [X] T038 [US1] Wire library route to LibraryView; redirect non-Chromium browsers to Quick Read with fallback message in src/routes/LibraryRoute.tsx

**Checkpoint**: User Story 1 fully functional — grant folders, browse library with thumbnails and progress, close and reopen offline at saved page.

---

## Phase 4: User Story 2 — Read a Single Comic Immediately (Priority: P2)

**Goal**: Any user can upload one supported comic archive and read it immediately without library setup; the session resumes within the same tab but leaves no permanent library record after the tab closes.

**Independent Test**: Upload a CBZ file through Quick Read, read to page 5, navigate away within the same tab and return — confirm resume at page 5; open a new tab to the app — confirm no library entry exists and no recent-read record for the uploaded file.

### Contract Tests for User Story 2

- [X] T039 [P] [US2] Write contract tests for the reader engine: open, navigation (nextPage, previousPage, goToPage), mode switching, progress snapshot semantics in tests/contract/reader-engine.contract.test.ts
- [X] T040 [P] [US2] Write integration test for Quick Read session isolation — confirm no LibraryComic, ThumbnailRecord, or RecentLibraryItem record is created during or after a Quick Read session in tests/integration/quick-read-isolation.integration.test.ts

### Implementation for User Story 2

- [X] T041 [P] [US2] Implement archive extraction worker entry point in src/workers/extraction.worker.ts (accepts ArchiveOpenInput, returns ArchiveManifest and extracted pages via transferable)
- [X] T042 [P] [US2] Implement page preparation worker entry point in src/workers/page-prep.worker.ts (accepts ArrayBuffer, decodes with createImageBitmap, returns PreparedPage via transferable)
- [X] T043 [US2] Implement shared reader engine conforming to ReaderEngine contract, wiring entry-mode-specific persistence routing in src/domain/reader/reader-engine.ts (depends on T041, T042)
- [X] T045 [P] [US2] Implement PageFlipReader component in src/features/reader/PageFlipReader.tsx — renders single PreparedPage; handles keyboard navigation: **ArrowLeft and ArrowUp** → previous page, **ArrowRight and ArrowDown** → next page (FR-027)
- [X] T046 [US2] Implement ReaderControls component in src/features/reader/ReaderControls.tsx — display mode toggle (scroll/page-flip), previous/next page buttons, page indicator (`x / n`), **rotate clockwise and rotate anticlockwise buttons** (each applies 90° rotation; state is session-only and must not persist to IndexedDB or localStorage), accessible ARIA labels on all icon-only controls (FR-027, FR-028)
- [X] T047 [US2] Implement ReaderView page component — opens comic via reader engine, renders the active display-mode component, mounts controls in src/features/reader/ReaderView.tsx
- [X] T048 [P] [US2] Implement QuickReadView page component — file upload dropzone (File input + drag-and-drop), validates extension, launches reader in src/features/quick-read/QuickReadView.tsx
- [X] T049 [US2] Wire Quick Read and reader routes; confirm reader engine uses `quick-read` entry mode for uploads in src/routes/QuickReadRoute.tsx

**Checkpoint**: User Stories 1 AND 2 independently functional — Library Mode and Quick Read both open comics; Quick Read leaves no permanent records.

---

## Phase 5: User Story 3 — Read Reliably Across Modes and Failures (Priority: P3)

**Goal**: Reading mode switching preserves progress; unsupported-browser users see clear fallback messaging; corrupt archives, missing folders, and revoked permissions produce actionable recovery UI without crashing the app.

**Independent Test**: Switch display modes mid-read — confirm page number unchanged; open app in Firefox — confirm Library Mode is hidden with clear fallback message; open a corrupt archive — confirm error card with recovery action; revoke folder permission during a session — confirm per-source error and re-grant action.

### Contract / Integration Tests for User Story 3

- [X] T050 [P] [US3] Write integration tests for display-mode switching: setDisplayMode preserves currentPage and returns correct snapshot in tests/integration/reader-mode-switch.integration.test.ts
- [X] T051 [P] [US3] Write integration tests for corrupt archive handling, missing folder detection, and permission-revoked recovery flows in tests/integration/error-recovery.integration.test.ts

### Implementation for User Story 3

- [X] T052 [US3] Implement reader error normalization service (maps adapter errors and FS errors to user-safe ReaderError payloads) in src/domain/reader/reader-error.service.ts
- [X] T053 [P] [US3] Implement FallbackBanner component (explains Library Mode unavailability, links to Quick Read) in src/components/FallbackBanner.tsx
- [X] T054 [P] [US3] Implement ErrorRecoveryCard component (corrupt archive, missing folder, revoked permission variants — each with a recovery CTA) in src/components/ErrorRecoveryCard.tsx
- [X] T055 [US3] Implement library recovery service (re-request folder permission, trigger rescan on successful recovery, update LibrarySource status) in src/domain/library/library-recovery.service.ts
- [X] T056 [US3] Wire FallbackBanner into LibraryRoute (shows when Library Mode is unavailable) and ErrorRecoveryCard into LibraryView (per-source errors) and ReaderView (corrupt archive) in src/routes/LibraryRoute.tsx, src/features/library/LibraryView.tsx, and src/features/reader/ReaderView.tsx
- [X] T057 [US3] Implement SettingsView page component with reading mode preference toggle (scroll/page-flip default) and persistence via ReaderPreference repository in src/features/settings/SettingsView.tsx

**Checkpoint**: All three user stories independently functional — display mode switching, fallback messaging, and all error recovery paths work.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, offline PWA verification, performance checks, accessibility audit, and final deployment.

- [X] T058 [P] Write Playwright e2e test for Library Mode offline relaunch: grant folders, scan, close, reload in offline mode, verify library renders with saved metadata in tests/e2e/library-offline.spec.ts
- [X] T059 [P] Write Playwright e2e test for Quick Read session isolation end-to-end: upload file, read, reload tab, confirm no library entry in tests/e2e/quick-read.spec.ts
- [X] T060 [P] Write Playwright e2e test for browser fallback messaging: open app in non-Chromium context, confirm FallbackBanner is visible and Quick Read is accessible in tests/e2e/fallback-messaging.spec.ts
- [X] T061 [P] Write Playwright e2e test for PWA installability and service-worker offline app-shell: install, go offline, reload, confirm shell loads in tests/e2e/pwa-offline.spec.ts
- [X] T062 Run quickstart.md validation checklist end-to-end: base path, manifest scope/start_url, service-worker registration, .nojekyll, offline reload, Chromium install flow
- [X] T063 [P] Performance audit: measure large-archive (≥200 MB CBZ) first-page time (target ≤ 5 s) and library-of-100 load time (target ≤ 2 s) using Playwright performance metrics
- [X] T064 [P] Accessibility audit: verify WCAG 2.2 AA compliance (skip link, ARIA labels on icon buttons, focus management in reader, live region for status messages) across LibraryView, ReaderView, QuickReadView
- [X] T065 Build production bundle (`npm run build`) and deploy to GitHub Pages at `/comiq/` base path (`npm run deploy`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases.
- **Phase 3 (US1)**: Depends on Phase 2 — can begin in parallel with Phase 4 and 5.
- **Phase 4 (US2)**: Depends on Phase 2 — can begin in parallel with Phase 3 and 5.
- **Phase 5 (US3)**: Depends on Phase 2 — can begin in parallel with Phase 3 and 4 (requires T043 from Phase 4 for mode-switch wiring).
- **Phase 6 (Polish)**: Depends on Phases 3, 4, and 5.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2. No dependency on US2 or US3.
- **US2 (P2)**: Starts after Phase 2. Reader engine (T043) is also consumed by US3 (T050, T056).
- **US3 (P3)**: Starts after Phase 2. Error normalization builds on reader engine from US2. Mode-switch wiring (T056) touches files from US1 and US2 — coordinate to avoid conflicts.

### Within Each Phase

- Contract tests (marked [P]) should be written and verified to fail before corresponding implementation tasks.
- Models and types before services; services before UI components; UI components before route wiring.
- Archive adapters (T026, T027, T028) can proceed in parallel once T010 is done.

### Parallel Opportunities

- All Phase 1 tasks marked [P] run in parallel after T001, T002, T003 complete.
- T010 and T011 are independent; T012–T017 can all run in parallel after T010.
- T026, T027, T028 (archive adapters) run in parallel.
- T044, T045, T048 (reader display components, Quick Read upload) run in parallel.
- All Phase 6 tasks marked [P] run in parallel.

---

## Parallel Example: User Story 1

```bash
# Archive adapters — all independent, run together after T029 contract types are ready:
T026: Implement CBZ adapter in src/domain/archive/cbz-adapter.ts
T027: Implement CBT adapter in src/domain/archive/cbt-adapter.ts
T028: Implement CBR adapter in src/domain/archive/cbr-adapter.ts

# UI leaf components — all independent, run together:
T034: ComicCard in src/components/ComicCard.tsx
T035: RecentlyReadSection in src/features/library/RecentlyReadSection.tsx
```

## Parallel Example: User Story 2

```bash
# Workers — independent, run together:
T041: Extraction worker in src/workers/extraction.worker.ts
T042: Page prep worker in src/workers/page-prep.worker.ts

# Reader display components — independent, run together:
T045: PageFlipReader in src/features/reader/PageFlipReader.tsx
T048: QuickReadView in src/features/quick-read/QuickReadView.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T009)
2. Complete Phase 2: Foundational (T010–T020) — CRITICAL, blocks everything
3. Complete Phase 3: User Story 1 (T021–T038)
4. **STOP AND VALIDATE**: Grant two folders, confirm library grid with thumbnails, close and reopen offline at saved page
5. Ship MVP / demo

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add US1 → persistent library (MVP)
3. Add US2 → Quick Read broadens access
4. Add US3 → reliable reading and recovery
5. Polish → e2e validation, performance, a11y, deploy

### Parallel Team Strategy

With three developers (after Phases 1–2 complete):

- **Dev A**: User Story 1 (library, folder scanning, thumbnails)
- **Dev B**: User Story 2 (reader engine, workers, Quick Read UI)
- **Dev C**: User Story 3 (error handling, fallback UI, settings)

Stories integrate through shared contracts (T010, T011) and the persistence layer (T012–T017).

---

## Task Count Summary

| Phase | Tasks | Parallelizable |
|-------|-------|---------------|
| Phase 1: Setup | 9 (T001–T009) | 6 |
| Phase 2: Foundational | 11 (T010–T020) | 8 |
| Phase 3: US1 | 18 (T021–T038) | 10 |
| Phase 4: US2 | 11 (T039–T049) | 7 |
| Phase 5: US3 | 8 (T050–T057) | 4 |
| Phase 6: Polish | 8 (T058–T065) | 6 |
| **Total** | **65** | **41** |


