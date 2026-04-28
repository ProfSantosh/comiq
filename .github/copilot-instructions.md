# GitHub Copilot Instructions — Comiq

## Priority Guidelines

When generating code for this repository:

1. **Version Compatibility**: Respect exact versions in `package.json`. Do not use TypeScript 5.x syntax or APIs from React 18 or below.
2. **Codebase Patterns First**: Before generating code, scan existing files in the same layer to match naming, structure, and idioms exactly.
3. **Architectural Boundaries**: Never cross layer boundaries. Domain code must not import from `src/persistence/` or React. Persistence code must not contain business logic.
4. **Strict TypeScript**: All code must pass `tsc -b` with the strictest compiler options in `tsconfig.app.json` — `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports`.
5. **Spec Reference**: For additional context, architecture decisions, and feature scope, read `specs/001-comic-reader/plan.md`.

---

## Technology Versions (from `package.json`)

| Technology | Version |
|------------|---------|
| TypeScript | ^6.0.3 |
| React | ^19.2.5 |
| React DOM | ^19.2.5 |
| React Router DOM | ^7.14.2 |
| Dexie (IndexedDB ORM) | ^4.4.2 |
| Vite | ^8.0.10 |
| Tailwind CSS | ^4.2.4 (`@tailwindcss/vite` plugin, not `tailwind.config.js`) |
| Vitest | ^4.1.5 |
| Playwright | ^1.59.1 |
| fflate (ZIP/CBZ extraction) | ^0.8.2 |
| js-untar (TAR/CBT extraction) | ^2.0.0 |
| uuid | ^14.0.0 |

**TypeScript target**: ES2020. **Module system**: ESNext ESM. **JSX**: `react-jsx` (no `React` import needed).

---

## Architecture — Layer Boundaries

This project uses a **feature-oriented layered architecture**. Every file lives in exactly one layer. Respect these ownership rules:

| Layer | Path | Owns | Must NOT import |
|-------|------|------|-----------------|
| Domain | `src/domain/` | Pure business logic, archive adapters, capability detection, error normalization | React, Dexie, DOM (except browser capability APIs) |
| Persistence | `src/persistence/` | All Dexie table access, sessionStorage store | Business rules, React hooks, domain logic |
| Features | `src/features/` | React views that orchestrate domain + persistence | Direct IndexedDB schema, archive parsing |
| Components | `src/components/` | Shared reusable React UI primitives | Feature-specific state, API calls |
| Workers | `src/workers/` | Web Worker entry scripts; delegates to domain adapters | React, Dexie, DOM |
| Routes | `src/routes/` | Route configuration only | Data fetching, business logic |

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| TypeScript source files (non-component) | `kebab-case` with typed suffix | `library-scanner.service.ts`, `cbz-adapter.ts`, `library-comic.repository.ts` |
| React component files | `PascalCase.tsx` | `ReaderView.tsx`, `AppLayout.tsx`, `ComicCard.tsx` |
| Interfaces and types | `PascalCase` | `LibraryComic`, `ArchiveAdapter`, `ReaderError` |
| Functions and methods | `camelCase` | `detectLibraryCapability()`, `normalizeReaderError()` |
| Module-level constants | `SCREAMING_SNAKE_CASE` | `SUPPORTED_EXTENSIONS` |
| React component functions | `export default function PascalCase()` | `export default function ReaderView()` |
| Worker entry files | `kebab-case.worker.ts` | `extraction.worker.ts`, `thumbnail.worker.ts` |
| File suffixes by module type | `.service.ts`, `.repository.ts`, `.store.ts`, `.types.ts`, `.worker.ts`, `.adapter.ts` | |

---

## File Suffix Conventions

Always apply the correct suffix when creating new files:

- **`.service.ts`** — Stateless domain service (e.g., `library-scanner.service.ts`)
- **`.repository.ts`** — Dexie/IndexedDB persistence access (e.g., `library-comic.repository.ts`)
- **`.store.ts`** — sessionStorage store (e.g., `quick-read-session.store.ts`)
- **`.types.ts`** — Pure TypeScript type/interface definitions (e.g., `archive-adapter.types.ts`)
- **`.worker.ts`** — Web Worker entry point (e.g., `extraction.worker.ts`)
- **`.adapter.ts`** — Format-specific archive adapter (e.g., `cbz-adapter.ts`)

---

## Import Conventions

- **No path aliases**. All imports use relative paths (e.g., `../../persistence/db`).
- **No barrel `index.ts` files**. Import directly from the file (e.g., `import { CbzAdapter } from './cbz-adapter'`).
- **Import grouping order**: external packages first, then relative imports.
- **ESM only**: Use `import/export`. Never use `require()`.
- **Worker instantiation**: `new Worker(new URL('../workers/extraction.worker.ts', import.meta.url), { type: 'module' })`.

---

## React Component Patterns

Based on `src/features/reader/ReaderView.tsx` and `src/components/AppLayout.tsx`:

```tsx
// Component with typed props interface
interface MyComponentProps {
  value: string
  optional?: boolean
}

export default function MyComponent({ value, optional = false }: MyComponentProps) {
  // useRef, useState, useCallback, useEffect in that order
  const ref = useRef<SomeType | null>(null)
  const [state, setState] = useState<TypedState | null>(null)

  const handleAction = useCallback(() => {
    // ...
  }, [/* dependencies */])

  useEffect(() => {
    let cancelled = false
    async function doWork() {
      try {
        // async work
        if (!cancelled) setState(result)
      } catch (err) {
        if (!cancelled) setError(normalizeReaderError(err))
      }
    }
    doWork()
    return () => { cancelled = true }
  }, [/* dependencies */])

  return (
    <div className="...tailwind classes...">
      {/* JSX */}
    </div>
  )
}
```

Key patterns:
- Use `cancelled` flag in `useEffect` async functions to prevent state updates on unmounted components.
- Wrap all async operations in try/catch; normalize errors with `normalizeReaderError()` from `src/domain/reader/reader-error.service.ts`.
- Display `<ErrorRecoveryCard>` when a `ReaderError` is set.
- Use `useRef` for engine/worker instances, `useState` for UI state.

---

## Repository Pattern (Persistence Layer)

Based on `src/persistence/library-comic.repository.ts`:

```typescript
import { db, type MyEntity } from './db'

export const myEntityRepository = {
  async getById(id: string): Promise<MyEntity | undefined> {
    return db.myTable.get(id)
  },

  async upsert(entity: MyEntity): Promise<void> {
    await db.myTable.put(entity)
  },

  async delete(id: string): Promise<void> {
    await db.myTable.delete(id)
  },
}
```

Key patterns:
- Export a plain object literal (not a class) with async methods.
- All methods return `Promise<T>` or `Promise<void>`.
- Use Dexie query builder (`where(...).equals(...).toArray()`) for filtered queries.
- Never throw custom errors; let Dexie errors propagate.
- Entity interfaces are defined in `src/persistence/db.ts`.

---

## Domain Service / Adapter Patterns

Based on `src/domain/archive/archive-adapter-registry.ts` and `src/domain/reader/reader-error.service.ts`:

- Export named functions or class instances (not default exports) for domain modules.
- Use `SCREAMING_SNAKE_CASE` for module-level constants (`SUPPORTED_EXTENSIONS`).
- Factory functions use `create*` prefix (e.g., `createArchiveAdapter(format)`).
- Normalizer functions use `normalize*` prefix (e.g., `normalizeReaderError(err)`).
- Adapters implement a shared interface defined in a `*.types.ts` file.

---

## Error Handling

Based on `src/domain/reader/reader-error.service.ts`:

- The domain layer throws standard `Error` or `DOMException` — never custom error subclasses.
- Feature views call `normalizeReaderError(err)` to produce a typed `ReaderError` with a `code` and `recoverable` flag.
- Worker bridge errors are serialized as `{ type: 'error', id: string, error: string }` postMessage payloads.
- Repository layer lets Dexie errors propagate; no custom wrapping.
- Never log sensitive data (file contents, user paths beyond filenames).
- Use `console.error`/`console.warn` sparingly; no structured logger exists.

---

## Tailwind CSS v4

This project uses **Tailwind CSS v4** via `@tailwindcss/vite` plugin — there is no `tailwind.config.js`.

- Import tailwind in CSS with `@import "tailwindcss"` (not `@tailwind base/components/utilities`).
- Define custom theme tokens using `@theme { --color-*: ...; --animate-*: ...; }` in `src/index.css`.
- Custom tokens are referenced in JSX as utility classes (e.g., `bg-ink-900`, `text-ink-700`).
- Custom animations are defined with `@keyframes` and registered in `@theme` as `--animate-*`.
- Respect `prefers-reduced-motion` by disabling animations in a media query block.

Existing theme tokens (from `src/index.css`):
- `--color-ink-900: #0F0F12` → `bg-ink-900`, `text-ink-900`
- `--color-ink-800: #1F1F26` → `bg-ink-800`
- `--color-ink-700: #2C2C3A` → `border-ink-700`

---

## Testing Conventions

### Vitest (unit + contract + integration)

- **Contract tests** → `tests/contract/*.contract.test.ts`
- **Integration tests** → `tests/integration/*.integration.test.ts`
- **Test fixtures** → `tests/fixtures/*.ts`
- **Mocks** → `tests/__mocks__/*.ts`
- **Setup** → `tests/setup.ts` (imports `@testing-library/jest-dom`)

Contract test structure (based on `tests/contract/cbz-adapter.contract.test.ts`):

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MyAdapter } from '../../src/domain/archive/my-adapter'
import { makeArchiveBlob } from '../fixtures/archive-fixtures'

describe('MyAdapter Contract', () => {
  let adapter: MyAdapter

  beforeEach(() => {
    adapter = new MyAdapter()
  })

  describe('methodName()', () => {
    it('describes expected behavior clearly', async () => {
      // Arrange
      const blob = makeArchiveBlob([...])
      // Act
      const result = await adapter.method(input)
      // Assert
      expect(result.property).toBe(expectedValue)
    })
  })
})
```

- Use `describe` → `describe` → `it` nesting (feature → method → scenario).
- Use `beforeEach` to reset adapter instances.
- Use `fake-indexeddb` for any test that touches Dexie — never real IndexedDB in Vitest.
- Coverage threshold: 70% statements, branches, functions, lines (enforced by `vite.config.ts`).

### Playwright E2E

- All E2E tests in `tests/e2e/*.spec.ts`.
- Use `getByRole`, `getByLabel`, `getByText` (accessibility-first locators).
- Use `test.step()` to group interactions.
- Use `await expect(locator).toMatchAriaSnapshot(...)` for structural accessibility checks.
- Chromium only (`project: chromium`). Base URL: `http://localhost:5173/comiq/`.

---

## Dexie / IndexedDB Schema

All entity interfaces are defined in `src/persistence/db.ts`. Key entities:

- `LibrarySource` — directory handles and permission state
- `LibraryComic` — scanned comic metadata
- `ThumbnailRecord` — cover image blobs
- `ReadingProgressRecord` — per-comic reading position
- `RecentLibraryItem` — recently opened comics list
- `ReaderPreference` — display preferences

When adding new Dexie tables, define the entity interface in `db.ts`, add the table to the `ComiqDatabase` class, and increment the database version.

---

## Web Workers

Workers in `src/workers/` are instantiated with:

```typescript
new Worker(new URL('../workers/extraction.worker.ts', import.meta.url), { type: 'module' })
```

Worker message protocol pattern (request/response correlation by UUID):

```typescript
// Send
const id = crypto.randomUUID()
worker.postMessage({ type: 'doWork', id, payload })

// Receive
worker.onmessage = (e) => {
  if (e.data.id !== id) return
  if (e.data.type === 'error') { /* handle */ }
  else { /* success */ }
}
```

Workers must not import React, Dexie, or DOM APIs. They delegate to `src/domain/` adapters only.

---

## Known Constraints

- **CBR support is stubbed**: `unrar.js` is not installed. The CBR adapter exists but extraction fails at runtime. Do not attempt to implement CBR extraction without installing the WASM package.
- **No path aliases**: Always use relative imports; `tsconfig.json` has no `paths` configuration.
- **No barrel files**: Import from direct file paths, not from `index.ts` re-exports.
- **Client-side only**: There is no backend, no server-side rendering, and no environment variables needed at runtime.
- **Base path is `/comiq/`**: All routing and asset references must respect this GitHub Pages base path.
- **Chromium-first**: The File System Access API (`showDirectoryPicker`) is only available in Chromium. Non-Chromium users are redirected to Quick Read mode via capability detection in `src/domain/library/capability-detection.service.ts`.

---

## Key Commands

```bash
npm run dev          # Vite dev server → http://localhost:5173/comiq/
npm run build        # tsc -b + Vite production build
npm run test         # Run all Vitest tests
npm run test:coverage # Run tests + enforce 70% coverage
npm run test:e2e     # Playwright E2E (auto-starts dev server)
npm run deploy       # Build + deploy to GitHub Pages
```

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read specs/001-comic-reader/plan.md
<!-- SPECKIT END -->
