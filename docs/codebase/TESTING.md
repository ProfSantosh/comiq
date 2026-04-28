# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- **Primary test framework**: Vitest 4.x (unit and integration); Playwright 1.59.x (E2E)
- **Assertion/mocking tools**: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `fake-indexeddb`

```bash
npm run test              # Run all Vitest tests (unit + contract + integration)
npm run test:unit         # Run Vitest with verbose reporter
npm run test:coverage     # Run Vitest + enforce 70% coverage thresholds
npm run test:e2e          # Run Playwright E2E (starts Vite dev server automatically)
```

### 2) Test Layout

- **Test file placement**: All tests in top-level `tests/` directory, separated from source
- **Naming conventions**:
  - `tests/contract/*.contract.test.ts` — adapter and repository contract tests (format behaviour guarantees)
  - `tests/integration/*.integration.test.ts` — multi-component integration tests
  - `tests/e2e/*.spec.ts` — Playwright browser tests
  - `tests/fixtures/archive-fixtures.ts` — shared test data helpers (in-memory archive builders)
  - `tests/__mocks__/unrar.js.ts` — stub for optional WASM dependency
- **Setup files**: `tests/setup.ts` — imports `@testing-library/jest-dom` to extend Vitest matchers; runs via `setupFiles` in `vite.config.ts`

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Contract (unit) | Yes | Archive adapters, repositories | `tests/contract/` — verifies adapter interface compliance per format |
| Integration | Yes | Library scanning, reader mode switch, Quick Read isolation, error recovery | `tests/integration/` — multi-component flows with fake IndexedDB |
| E2E | Yes | Offline/PWA, accessibility, performance audits, Quick Read flow, fallback messaging | `tests/e2e/` — Playwright Chromium only |
| Worker tests | No | `extraction.worker.ts`, `page-prep.worker.ts`, `thumbnail.worker.ts` | Workers are not directly tested; exercised indirectly via contract and integration tests |

### 4) Mocking and Isolation Strategy

- **`unrar.js` WASM stub**: `tests/__mocks__/unrar.js.ts` provides a no-op replacement. Aliased at the Vite test config level so CBR-related code paths do not crash in Node/jsdom.
- **IndexedDB isolation**: `fake-indexeddb` package provides an in-memory IndexedDB that Dexie can use in Node. Each test suite gets an isolated database instance (implied by how `fake-indexeddb` resets between test runs).
- **Web Workers**: `new Worker(...)` is not available in jsdom. `ComiqReaderEngine.open()` wraps worker instantiation in try/catch; if it throws (Node environment), the engine falls back to `_extractionWorker = null` and extraction calls will fail gracefully rather than crash the test.
- **File System Access API**: No mock for `showDirectoryPicker` or `FileSystemDirectoryHandle` exists in the test suite. Tests that require this use E2E (Playwright Chromium) where the real API is available, or they stub at the capability detection level.
- **Common failure mode**: Tests involving the reader engine in Vitest cannot exercise actual page extraction (worker unavailable in jsdom). Contract tests verify adapter behavior directly, bypassing the worker.

### 5) Coverage and Quality Signals

- **Coverage tool**: `@vitest/coverage-v8` (V8 native coverage)
- **Enforced thresholds**: 70% statements, branches, functions, lines (configured in `vite.config.ts`)
- **Coverage report location**: `coverage/` directory (HTML + JSON + text)
- **Current reported coverage**: Available in `coverage/index.html` after running `npm run test:coverage`
- **CI enforcement**: Coverage thresholds fail the `unit-tests` GitHub Actions job if not met
- **Known gaps**:
  - Worker entry files (`src/workers/`) are not directly unit tested
  - CBR adapter extraction path is untestable (WASM stub returns no data)
  - E2E tests cover Chromium only; Firefox and Safari behavior is untested

### 6) Evidence

- `vite.config.ts` (test and coverage configuration)
- `playwright.config.ts`
- `tests/setup.ts`
- `tests/__mocks__/unrar.js.ts`
- `tests/contract/cbz-adapter.contract.test.ts`
- `tests/integration/library-scan.integration.test.ts`
- `tests/e2e/accessibility-audit.spec.ts`
- `tests/fixtures/archive-fixtures.ts`
- `.github/workflows/ci.yml` (coverage job + E2E job)
