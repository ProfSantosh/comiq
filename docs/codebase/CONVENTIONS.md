# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Source files (non-component) | `kebab-case` with suffix | `library-scanner.service.ts`, `cbz-adapter.ts` | `src/domain/`, `src/persistence/` |
| React component files | `PascalCase.tsx` | `ReaderView.tsx`, `AppLayout.tsx` | `src/features/`, `src/components/` |
| Interfaces / types | `PascalCase` | `LibraryComic`, `ArchiveAdapter`, `ReaderError` | `src/persistence/db.ts`, `src/domain/archive/archive-adapter.types.ts` |
| Functions / methods | `camelCase` | `detectLibraryCapability()`, `normalizeReaderError()` | `src/domain/library/capability-detection.service.ts` |
| Constants (module-level) | `SCREAMING_SNAKE_CASE` | `SUPPORTED_EXTENSIONS` | `src/domain/archive/archive-adapter-registry.ts` |
| React components (JSX) | `PascalCase` function | `export default function ReaderView()` | `src/features/reader/ReaderView.tsx` |
| Worker entry files | `kebab-case.worker.ts` | `extraction.worker.ts`, `thumbnail.worker.ts` | `src/workers/` |

### 2) Formatting and Linting

- **Formatter**: No Prettier config file detected. Formatting is enforced implicitly through TypeScript strict mode and likely via editor defaults. `[ASK USER]` whether Prettier is used but unconfigured.
- **Linter**: TypeScript compiler acts as primary linter. No ESLint config file detected. TypeScript strict options in `tsconfig.app.json`:
  - `strict: true` (enables all strict type checks)
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
  - `noUncheckedSideEffectImports: true`
- **Run commands**: `tsc -b` (part of `npm run build`); no standalone lint command in `package.json`

### 3) Import and Module Conventions

- **Import grouping**: No enforced import sorter detected. Observed pattern: external packages first, then relative imports (seen in `src/features/reader/ReaderView.tsx`, `src/persistence/library-comic.repository.ts`)
- **Alias vs relative import policy**: No `paths` aliases in `tsconfig.json`. All imports use relative paths (e.g., `../../persistence/db`, `../archive/archive-adapter-registry`)
- **Public exports/barrel policy**: No `index.ts` barrel files. Each module is imported directly by its file path
- **Module format**: ESM (`"type": "module"` in `package.json`); `import.meta.url` used for worker instantiation

### 4) Error and Logging Conventions

- **Error strategy**:
  - Domain layer: throws standard `Error` or `DOMException` objects; callers normalize via `normalizeReaderError()` in `src/domain/reader/reader-error.service.ts`
  - Feature views: wrap async calls in try/catch, map to typed `ReaderError` with `recoverable` flag, display `ErrorRecoveryCard` component
  - Worker bridge: all errors serialized to `{ type: 'error', id, error: string }` postMessage shape; worker catches synchronously and asynchronously
  - Repository layer: lets Dexie errors propagate; no custom wrapping
- **Logging style**: No structured logger installed. `console.error`/`console.warn` used sparingly in development paths. No telemetry or monitoring integration exists in v1.
- **Sensitive-data redaction**: No logging of file contents or user data. File names and paths appear in error messages (acceptable for local-only app).

### 5) Testing Conventions

- **Test file naming**:
  - Contract tests: `tests/contract/*.contract.test.ts`
  - Integration tests: `tests/integration/*.integration.test.ts`
  - E2E tests: `tests/e2e/*.spec.ts`
  - Test fixtures: `tests/fixtures/*.ts`
  - Mocks: `tests/__mocks__/*.ts`
- **Mocking strategy**:
  - `unrar.js` WASM module aliased to a no-op stub in both `vite.config.ts` (build-time) and test alias config (test-time) — `tests/__mocks__/unrar.js.ts`
  - `fake-indexeddb` used to provide an in-memory IndexedDB for Dexie in Vitest
  - No global mock reset patterns observed; each test file manages its own setup
- **Coverage expectation**: 70% statements, branches, functions, lines enforced in `vite.config.ts` via `@vitest/coverage-v8`
- **E2E environment**: Playwright Chromium only; `baseURL: http://localhost:5173/comiq/`; Vite dev server started automatically via `webServer`

### 6) Evidence

- `tsconfig.app.json`
- `vite.config.ts`
- `src/domain/reader/reader-error.service.ts`
- `src/domain/archive/archive-adapter-registry.ts`
- `tests/__mocks__/unrar.js.ts`
- `playwright.config.ts`
