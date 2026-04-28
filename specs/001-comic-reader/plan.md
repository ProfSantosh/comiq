# Implementation Plan: Modern Comic Reader

**Branch**: `[001-build-comic-reader]` | **Date**: 2026-04-28 | **Spec**: `/specs/001-comic-reader/spec.md`
**Input**: Feature specification from `/specs/001-comic-reader/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a single-project, fully client-side PWA comic reader with two entry paths: a Chromium-first persistent Library Mode backed by File System Access plus IndexedDB, and a cross-browser Quick Read fallback for one-off file uploads. The implementation uses one shared reader engine across both modes, format-specific archive adapters for CBZ, CBT, and CBR, Vite module workers for archive extraction and page preparation, and service-worker app-shell caching so the app remains usable offline after the first successful load.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x, React 19, Vite 7.x  
**Primary Dependencies**: React, React Router, Dexie, vite-plugin-pwa, fflate, js-untar, browser-compatible WASM RAR extractor (`unrar.js`-style adapter), Vitest, React Testing Library, Playwright  
**Storage**: IndexedDB for durable app data, sessionStorage for same-tab Quick Read resume, localStorage only for lightweight UI preferences, Cache Storage for app-shell/offline assets  
**Testing**: Vitest, React Testing Library, Playwright  
**Target Platform**: Desktop web PWA, Chromium-first for Library Mode, cross-browser Quick Read fallback, GitHub Pages hosting
**Project Type**: Single-project client-side web application / PWA  
**Performance Goals**: First readable page for 95% of valid comics up to 500 MB within 5 seconds; previously indexed library of up to 1,000 comics browsable with visible covers and progress within 2 seconds; reader interactions remain responsive by keeping extraction, page preparation, and thumbnail work off the main thread  
**Constraints**: No backend, no server upload path, offline-capable after first successful load, shared reader engine across modes, multiple library folders in v1, no manga/right-to-left in v1, GitHub Pages base-path deployment, browser capability fallback required  
**Scale/Scope**: One installable PWA, up to 1,000 indexed library records in v1, three supported archive formats, two reader presentation modes, one v1.1 stretch goal for installed-PWA file-open integration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Confirm the feature preserves client-only processing with no required server upload,
  account dependency, or network-only critical path.
- Confirm durable state design: IndexedDB-backed persistence is identified for any library,
  preference, or resume data, and Quick Read session continuity is defined if applicable.
- Confirm progressive enhancement behavior: Chromium-first Library Mode capabilities,
  non-Chromium Quick Read fallback, and shared reader engine implications are explicit.
- Confirm performance checks for the touched flow, including large-archive handling,
  reader responsiveness, loading strategy, and any cache or memory bounds.
- Confirm validation scope: automated tests or executable checks cover shared reader
  engine behavior, archive adapter contracts, persistence/resume behavior, and offline
  app-shell impact where changed.

**Gate Status**: PASS

- Client-only processing is preserved: archive parsing, image handling, indexing, and progress tracking remain entirely in-browser with no network dependency for core reading flows.
- Durable state is explicit: IndexedDB stores library sources, folder handles, comic records, thumbnails, recent items, and page-based progress; Quick Read resume stays same-tab only in sessionStorage.
- Progressive enhancement is explicit: Library Mode is gated behind Chromium capability detection, unsupported browsers are routed to Quick Read, and both entry paths use the same reader engine and adapter contracts.
- Performance expectations are explicit: archive extraction, page preparation, and thumbnail generation run in workers; service-worker caching covers the app shell; memory-sensitive page loading remains incremental.
- Validation scope is explicit: unit/integration coverage will target the shared engine, adapter contracts, IndexedDB persistence, and resume semantics; Playwright will validate offline/PWA and browser-fallback behavior.

## Project Structure

### Documentation (this feature)

```text
specs/001-comic-reader/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
public/
├── .nojekyll
├── icons/
└── manifest.webmanifest

src/
├── app/
├── components/
├── domain/
│   ├── archive/
│   ├── library/
│   ├── reader/
│   └── quick-read/
├── features/
│   ├── library/
│   ├── quick-read/
│   ├── reader/
│   └── settings/
├── persistence/
├── pwa/
├── routes/
├── utils/
└── workers/

tests/
├── contract/
├── integration/
└── e2e/

scripts/
└── deploy/
```

**Structure Decision**: Use a single Vite/React PWA with feature-oriented UI modules under `src/features`, shared domain logic under `src/domain`, durable persistence under `src/persistence`, and worker entry points under `src/workers`. Keep Playwright coverage in `tests/e2e` and contract-level/unit integration tests in `tests/contract` and `tests/integration` so shared engine behavior is validated before mode-specific shells.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations require justification.

## Phase 0: Research Outcome

- Research decisions are captured in `/specs/001-comic-reader/research.md`.
- All technical-context unknowns are resolved without requiring scope changes.

## Phase 1: Design Outcome

- Data entities and validation rules are captured in `/specs/001-comic-reader/data-model.md`.
- Shared engine and archive adapter contracts are documented in `/specs/001-comic-reader/contracts/`.
- Implementation/bootstrap flow is captured in `/specs/001-comic-reader/quickstart.md`.

## Post-Design Constitution Check

**Status**: PASS

- The design keeps all comic content processing local and isolates deployment to static app-shell delivery.
- Durable and session-scoped persistence boundaries are explicit and match the constitution.
- Shared reader-engine and archive-adapter contracts prevent mode drift across Library Mode and Quick Read.
- Worker boundaries and cache responsibilities are defined to preserve responsiveness and offline continuity.
- The planned automated validation covers adapter behavior, resume persistence, fallback flows, and app-shell offline behavior.
