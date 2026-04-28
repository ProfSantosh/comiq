# Architecture

## Core Sections (Required)

### 1) Architectural Style

- **Primary style**: Feature-oriented layered architecture (Domain / Persistence / Feature / Worker)
- **Why this classification**: Source is explicitly partitioned into `src/domain/` (pure business logic), `src/persistence/` (all data access), `src/features/` (UI+orchestration per feature), and `src/workers/` (off-thread computation). Each layer has a defined ownership boundary.
- **Primary constraints**:
  1. Fully client-side only — no backend, no server upload path, no network-dependent critical flows
  2. Chromium-first Library Mode with progressive fallback to Quick Read for other browsers
  3. Off-main-thread extraction and thumbnail generation via Web Workers to keep UI responsive

### 2) System Flow

```text
User action (browser)
  └─> src/features/**View.tsx         (React feature view — orchestrates)
        ├─> src/domain/**             (pure logic: capability detection, archive adapters, error normalization)
        ├─> src/persistence/**        (Dexie repositories → IndexedDB; sessionStorage via quick-read-session.store)
        └─> src/workers/extraction.worker.ts  (off-thread: archive open + page extraction via postMessage)
              └─> src/domain/archive/archive-adapter-registry.ts  (createArchiveAdapter → format-specific adapter)
                    └─> fflate (CBZ) / js-untar (CBT) / stub (CBR)
```

**Detailed flow — Library Mode comic open:**
1. `ReaderView` reads `comicId` from route params, fetches `LibraryComic` + `LibrarySource` from Dexie repositories
2. Requests File System Access permission on `source.handle`, resolves the file via directory traversal
3. Creates a format-specific archive adapter via `createArchiveAdapter()`, calls `adapter.open()` to build a manifest
4. Instantiates `ComiqReaderEngine`, passes manifest + initial page from `ReadingProgressRecord`
5. Engine opens an `extraction.worker.ts` worker via `new Worker(...)`, sends `open` message, awaits acknowledgment
6. For each page needed, sends `extractPage` message to worker; worker returns `Blob` (transferred, zero-copy)
7. Progress updates are saved to Dexie `readingProgress` table on every page turn

**Detailed flow — Quick Read:**
1. `QuickReadView` prompts file picker (`<input type="file">`), reads the `File` object directly (no File System Access API needed)
2. Creates adapter + manifest, stores session in `sessionStorage` via `quickReadSessionStore`
3. Routes to `/reader/:comicId` with a synthetic quick-read ID; reader engine restores page from sessionStorage
4. On tab close, sessionStorage is cleared — no Dexie records created for Quick Read comics

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| `src/domain/archive/` | Archive format parsing, manifest building, page extraction contracts | React, IndexedDB access, file picker UI | `src/domain/archive/archive-adapter-registry.ts` |
| `src/domain/library/` | Library capability detection, folder scanning, thumbnail generation orchestration | React components, routing, Dexie direct calls | `src/domain/library/library-scanner.service.ts` |
| `src/domain/reader/` | Reader engine state machine (open/navigate/snapshot), error normalization | React state, DOM, persistence writes | `src/domain/reader/reader-engine.ts` |
| `src/persistence/` | All Dexie table access, sessionStorage store | Business rules, rendering, archive parsing | `src/persistence/db.ts`, `*.repository.ts` |
| `src/features/reader/` | `ReaderView` orchestrates engine + persistence + UI rendering | Direct IndexedDB schema, archive format logic | `src/features/reader/ReaderView.tsx` |
| `src/features/library/` | Library browsing UI, source management, rescan triggers | Archive extraction, reader engine | `src/features/library/LibraryView.tsx` |
| `src/workers/` | Runs adapters off-thread; proxies archive open/extractPage over postMessage | React, Dexie, DOM | `src/workers/extraction.worker.ts` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Repository pattern | `src/persistence/*.repository.ts` | Isolates all Dexie/IndexedDB queries; domain never touches `db` directly |
| Adapter pattern | `src/domain/archive/{cbz,cbt,cbr}-adapter.ts` + registry | Uniform `ArchiveAdapter` interface per format; format is swapped transparently |
| Worker bridge pattern | `src/domain/reader/reader-engine.ts` + `src/workers/extraction.worker.ts` | Moves heavy extraction off main thread via postMessage; uses UUID per message for request/response correlation |
| Capability-gated progressive enhancement | `src/domain/library/capability-detection.service.ts` | Detects `showDirectoryPicker` at runtime; routes non-Chromium users to Quick Read |
| Session-scoped store | `src/persistence/quick-read-session.store.ts` | Uses `sessionStorage` (not IndexedDB) to guarantee Quick Read state never survives tab close |
| Error normalization | `src/domain/reader/reader-error.service.ts` | Single `normalizeReaderError()` function maps all thrown errors to typed `ReaderError` with recovery flags |

### 5) Known Architectural Risks

- **CBR support is a stub**: `unrar.js` WASM is not installed. CBR archives are recognized by the registry but cannot actually extract pages. Users selecting CBR files will get an error. This is an intentional v1 limitation noted in `vite.config.ts` comments.
- **Service Worker / PWA offline with GitHub Pages base path**: The Workbox `navigateFallback` is set to `/comiq/index.html`. Any misconfiguration of the base path between `vite.config.ts` (`base: '/comiq/'`) and `playwright.config.ts` will cause silent navigation failures in tests or offline mode.
- **File System Access handle serialization across sessions**: `FileSystemDirectoryHandle` objects are stored in IndexedDB via Dexie. Handle persistence across browser restarts depends on the browser granting persistent storage. If the browser purges IndexedDB, all library sources are lost without notice.
- **Main-thread permission prompts**: File permission re-requests (`handle.requestPermission()`) happen on the main thread inside `ReaderView`'s `useEffect`. If permission modal is blocked (e.g., missing user gesture timing), the reader silently fails. Error recovery surface exists but the timing is fragile.

### 6) Evidence

- `src/main.tsx`
- `src/routes/index.tsx`
- `src/domain/reader/reader-engine.ts`
- `src/domain/archive/archive-adapter-registry.ts`
- `src/persistence/db.ts`
- `src/workers/extraction.worker.ts`
- `src/domain/library/capability-detection.service.ts`
- `src/persistence/quick-read-session.store.ts`
