# Contract: Shared Reader Engine

## Purpose

The shared reader engine defines the stable runtime API used by both Library Mode and Quick Read. UI shells may differ, but all navigation, display-mode switching, progress semantics, and page preparation flow through this contract.

## TypeScript Shape

```ts
export type ReaderDisplayMode = 'scroll' | 'page-flip';
export type ReaderEntryMode = 'library' | 'quick-read';

export interface ReaderOpenRequest {
  entryMode: ReaderEntryMode;
  comicId?: string;
  quickReadSessionId?: string;
  archive: ArchiveManifest;
  initialPage: number;
  preferredDisplayMode: ReaderDisplayMode;
}

export interface ReaderProgressSnapshot {
  currentPage: number;
  pageCount: number;
  displayMode: ReaderDisplayMode;
  canAdvance: boolean;
  canRetreat: boolean;
}

export interface PreparedPage {
  pageIndex: number;
  mimeType: string;
  blob: Blob;
  width?: number;
  height?: number;
}

export interface ReaderEngine {
  open(request: ReaderOpenRequest): Promise<ReaderProgressSnapshot>;
  getSnapshot(): ReaderProgressSnapshot;
  preparePage(pageIndex: number): Promise<PreparedPage>;
  goToPage(pageIndex: number): Promise<ReaderProgressSnapshot>;
  nextPage(): Promise<ReaderProgressSnapshot>;
  previousPage(): Promise<ReaderProgressSnapshot>;
  setDisplayMode(mode: ReaderDisplayMode): Promise<ReaderProgressSnapshot>;
  persistProgress(): Promise<void>;
  dispose(): Promise<void>;
}
```

## Behavioral Requirements

- Progress is always page-number based, regardless of display mode.
- `setDisplayMode` must preserve the current page and return an updated snapshot without reopening the comic from the start.
- `persistProgress` delegates to Library persistence or Quick Read session persistence based on `entryMode`, but callers use one API.
- Page preparation must be incremental and worker-backed so UI state remains responsive.
- Errors surfaced by archive adapters or page preparation must be normalized into reader-safe failures the UI can recover from.

## Mode-Specific Expectations

- `library`: persists durable progress to IndexedDB and updates recent items.
- `quick-read`: persists only session-scoped progress and never creates library metadata.

## Test Expectations

- Contract tests must prove that both entry modes share the same mode-switching and navigation semantics.
- Engine tests must prove that reopening uses the saved page number, not a mode-specific offset.
- Integration tests must validate that persistence routing changes by `entryMode` without changing engine behavior.