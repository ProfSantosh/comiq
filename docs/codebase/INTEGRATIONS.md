# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| Browser IndexedDB | Browser Storage API | Durable persistence of library sources, comics, thumbnails, reading progress, preferences | None (same-origin browser storage) | High | `src/persistence/db.ts` |
| File System Access API | Browser API | Directory picker for Library Mode; read file handles across sessions | Browser permission prompt (user gesture required) | High (Library Mode only) | `src/domain/library/library-source.service.ts`, `src/features/reader/ReaderView.tsx` |
| sessionStorage | Browser Storage API | Quick Read session resume (same-tab only) | None | Medium | `src/persistence/quick-read-session.store.ts` |
| Workbox Service Worker | Browser Cache API | App-shell offline caching; navigateFallback to `/comiq/index.html` | None | High (offline capability) | `vite.config.ts` (VitePWA config) |
| Google Fonts | External CDN | Loads Nunito font family at runtime | None (public CDN) | Low (cosmetic only) | `src/index.css` |
| GitHub Pages | Hosting / CDN | Serves the static PWA at `https://<user>.github.io/comiq/` | None (public static site) | High (deployment) | `scripts/deploy/deploy.mjs`, `.github/workflows/ci.yml` |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| IndexedDB (`comiq-db`) | Durable app data (sources, comics, thumbnails, progress, preferences, recent items) | `src/persistence/*.repository.ts` via Dexie | Browser storage eviction clears all library data without warning | `src/persistence/db.ts` |
| sessionStorage (`comiq:quick-read-session`) | Single-tab Quick Read resume state | `src/persistence/quick-read-session.store.ts` | Lost on tab close (by design); risk is accidental data loss confusion | `src/persistence/quick-read-session.store.ts` |
| Cache Storage | Service worker app-shell cache | Managed by Workbox (auto-generated SW) | Stale SW can serve outdated assets; `registerType: 'autoUpdate'` mitigates | `vite.config.ts` (VitePWA config) |

**IndexedDB schema (v1):**

| Table | Dexie Index | Key entity |
|-------|------------|------------|
| `librarySources` | `id, status, lastScannedAt` | `LibrarySource` |
| `libraryComics` | `id, [sourceId+relativePath], sourceId, extension, title, modifiedAt, availability` | `LibraryComic` |
| `thumbnails` | `id, &comicId` (unique on comicId) | `ThumbnailRecord` |
| `readingProgress` | `comicId, lastReadAt, completed` | `ReadingProgressRecord` |
| `recentItems` | `comicId, position, lastOpenedAt` | `RecentLibraryItem` |
| `readerPreferences` | `id` | `ReaderPreference` |

### 3) Secrets and Credentials Handling

- **Credential sources**: None required. This is a fully client-side application with no backend services.
- **Hardcoding checks**: No API keys, tokens, or credentials found in source. No `.env.example` file exists (not needed).
- **Rotation or lifecycle notes**: N/A — no server-side credentials to rotate.

### 4) Reliability and Failure Behavior

- **File System Access permission loss**: Handled gracefully. `ReaderView` calls `handle.queryPermission()` then `handle.requestPermission()` before reading. If denied, `normalizeReaderError()` maps to `revoked-permission` and `ErrorRecoveryCard` is shown.
- **Corrupt archive**: Adapter `open()` throws on parse failure; `normalizeReaderError()` maps to `corrupt-archive` (non-recoverable), surfaces recovery UI.
- **Missing folder**: `NotFoundError` DOMException mapped to `missing-folder` error code (recoverable).
- **Worker errors**: `extraction.worker.ts` wraps all async logic in try/catch; errors returned as `{ type: 'error', id, error: string }` postMessage — engine propagates as thrown `Error`.
- **Retry/backoff**: No automatic retry logic exists. Recovery is manual (user-triggered rescan or re-grant).
- **Timeout policy**: No request timeouts configured for archive operations or File System API calls.
- **Google Fonts failure**: Font is purely cosmetic; missing font falls back to `system-ui, -apple-system, sans-serif` (CSS fallback in `src/index.css`).

### 5) Observability for Integrations

- **Logging around external calls**: Minimal. `console.error` / `console.warn` used in some error paths. No structured log events for storage operations or permission flows.
- **Metrics/tracing coverage**: None. No analytics, error monitoring (Sentry, etc.), or performance tracing installed in v1.
- **Missing visibility gaps**: All IndexedDB failures, permission revocations, and extraction errors are surfaced only in the UI — no server-side visibility. This is by design (client-only), but debugging production issues requires local reproduction.

### 6) Evidence

- `src/persistence/db.ts`
- `src/persistence/quick-read-session.store.ts`
- `vite.config.ts` (VitePWA workbox config)
- `src/index.css` (Google Fonts import)
- `src/features/reader/ReaderView.tsx` (permission request flow)
- `src/domain/reader/reader-error.service.ts`
- `.github/workflows/ci.yml`
