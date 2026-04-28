# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| High | CBR support is non-functional | `vite.config.ts` alias comment; no `unrar.js` in `node_modules` | Users selecting `.cbr` files get an extraction error; CBR is listed as a supported format in the spec | Install and integrate a working WASM RAR extractor or add a clear per-file error message before opening |
| High | IndexedDB eviction loses entire library without warning | `src/persistence/db.ts` — no storage persistence request | All library sources, comics, and progress data lost silently if browser clears site storage | Call `navigator.storage.persist()` on first app load; surface warning if persistence is denied |
| Medium | File System Access handle re-permission timing is fragile | `src/features/reader/ReaderView.tsx` `useEffect` — `requestPermission` called inside effect with no user gesture guard | Silent reader failure if browser blocks permission modal (gesture timing); error recovery exists but UX is poor | Trigger permission re-request from a button action (user gesture), not automatically inside `useEffect` |
| Medium | Service Worker base-path misconfiguration risk | `vite.config.ts` `base: '/comiq/'` vs `playwright.config.ts` `baseURL` | Stale SW or wrong navigateFallback could serve wrong HTML on navigation; hard to debug in CI | Add a Playwright test that explicitly verifies offline navigation to a deep route works correctly |
| Low | Google Fonts loaded from external CDN on every first load | `src/index.css` `@import url('https://fonts.googleapis.com...')` | Privacy concern (request to Google on every load); adds a blocking network round-trip for the font | Self-host the Nunito font using `public/` assets or use `next/font` equivalent via Vite font plugin |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| No formatter config | Project was scaffolded without Prettier | No `.prettierrc` or `prettier.config.*` found | Inconsistent formatting as codebase grows; diffs will include style noise | Add `prettier` + `.prettierrc` and a `format` npm script |
| No ESLint config | TypeScript strict mode used as only linter | No `.eslintrc` or `eslint.config.*` found | Missing React-specific rules (e.g., hooks rules, exhaustive-deps), accessibility lint, unused imports lint | Add `eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-jsx-a11y` |
| Worker tests absent | Web Workers not testable in jsdom | `src/workers/` — no test files | Worker postMessage protocol regressions will not be caught by unit tests | Consider a Worker integration test using a real browser via Playwright or a Node Worker polyfill |
| `page-prep.worker.ts` role unclear | File exists in `src/workers/` but no feature view was found importing it | `src/workers/page-prep.worker.ts` | Dead code if unused; hidden dependency if used but undocumented | [ASK USER] whether `page-prep.worker.ts` is actively used or a placeholder |
| Continuous scroll reader mode not yet implemented | Spec requires both page-flip and continuous scroll; only page-flip (`PageFlipReader.tsx`) exists | `src/features/reader/` | Spec acceptance criteria unmet; switcher control wired but nothing to switch to | Implement `ScrollReader.tsx` and wire the display mode switcher |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| No CSP header configured | A02 — Security Misconfiguration | `vite.config.ts` — no HTTP headers config; static GitHub Pages host | GitHub Pages provides basic security headers; no custom CSP exists | Add a `_headers` file or meta-tag CSP for GitHub Pages; restrict `script-src` and `connect-src` |
| Google Fonts CDN call leaks user IP to Google | A02 | `src/index.css` `@import` to `fonts.googleapis.com` | None | Self-host Nunito to avoid external network request on first load |
| File blobs temporarily held in memory during extraction | N/A (local processing) | `src/domain/reader/reader-engine.ts` `_pageCache` | Cache is per-session, not persisted | No immediate risk; document cache memory bounds for large comics |
| IndexedDB stores `FileSystemDirectoryHandle` objects | N/A | `src/persistence/db.ts` `LibrarySource.handle` | Same-origin IndexedDB access only; browser enforces isolation | No external risk; note that handle serialization behaviour is browser-specific |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| `_pageCache` in `ComiqReaderEngine` grows unbounded | `src/domain/reader/reader-engine.ts` `_pageCache = new Map<number, PreparedPage>()` | No eviction logic observed | Large comics (500MB, many pages) will exhaust memory | Implement LRU eviction; keep a sliding window of ±2-3 pages |
| Thumbnail generation runs fire-and-forget on scan | `src/domain/library/library-scanner.service.ts` `void generateThumbnailForComic(...)` | No back-pressure; all thumbnails requested immediately on scan | Scanning a library of 1,000 comics would issue 1,000 concurrent thumbnail jobs | Add a concurrency-limited queue (e.g., max 3 simultaneous thumbnail workers) |
| Library grid renders all comics at once | `src/features/library/LibraryGrid.tsx` (assumed from structure) | Acceptable at small library sizes | 1,000+ comics will cause jank on first render | Add virtual scrolling (TanStack Virtual or CSS `content-visibility: auto`) |
| Google Fonts import is render-blocking on first load | `src/index.css` | Minor first-load LCP impact | Low at current page weights | Use `font-display: swap` (currently in `@import`, browser-dependent) or self-host |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `src/domain/library/capability-detection.service.ts` | Type assertion `(window as unknown as Record<string, unknown>)['showDirectoryPicker']` — fragile casting | 2 commits in 90 days | Use a proper TypeScript browser interface declaration in `src/types/`; add unit test for detection logic |
| `tests/contract/cbr-adapter.contract.test.ts` | CBR adapter is a stub; tests must validate error paths not real extraction | 2 commits in 90 days | Document expected test behavior clearly; tests should verify `throw` on extraction attempt |
| `tests/contract/cbz-adapter.contract.test.ts` | Core adapter contract; changes to `fflate` usage or manifest shape will break this | 2 commits in 90 days | Pin `fflate` version; test against edge cases (nested folders, mixed content) |
| `specs/001-comic-reader/tasks.md` | Living spec document; modified frequently during implementation | 2 commits in 90 days | Not a code risk; expected behavior for active feature development |
| `dev-dist/` | Auto-generated by Vite PWA dev mode; should not be hand-edited | 2 commits in 90 days | Add to `.gitignore` if not already excluded (currently committed to git) |

### 6) `[ASK USER]` Questions

1. **[ASK USER]** Is `src/workers/page-prep.worker.ts` actively used in any feature, or is it a placeholder from the original plan? No import of this worker was found in feature views.
2. **[ASK USER]** Is there a plan to implement the continuous-scroll reading mode? `src/features/reader/PageFlipReader.tsx` exists but no `ScrollReader.tsx` was found. The spec requires both modes.
3. **[ASK USER]** Should `dev-dist/` be removed from version control? It contains auto-generated Workbox/service worker files that appear to be committed to git but should typically be in `.gitignore`.
4. **[ASK USER]** Is a code formatter (Prettier) expected to be part of the toolchain? No formatter config was found; inconsistent code style may emerge over time without it.
5. **[ASK USER]** Is there a plan to install a real CBR/WASM extractor (`unrar.js` or alternative) in v1, or is CBR support intentionally deferred to a future version?

### 7) Evidence

- `.codebase-scan.txt` — High-churn files section, TODO/FIXME section
- `src/domain/reader/reader-engine.ts` — `_pageCache` unbounded map
- `src/domain/library/library-scanner.service.ts` — fire-and-forget thumbnail generation
- `vite.config.ts` — CBR stub alias comment, no CSP headers
- `src/domain/library/capability-detection.service.ts` — fragile type assertion
- `src/index.css` — Google Fonts CDN import
