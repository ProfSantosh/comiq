# Data Model: Modern Comic Reader

## Overview

The persistent model separates durable library state from session-only Quick Read state. IndexedDB is the durable system of record; sessionStorage holds only the active-tab Quick Read resume payload; localStorage remains limited to lightweight, non-critical UI preferences.

## Entity: LibrarySource

**Purpose**: Represents a user-approved local folder used by Library Mode.

**Fields**:
- `id`: string, stable UUID.
- `displayName`: string, user-facing folder label.
- `handle`: `FileSystemDirectoryHandle`, persisted in IndexedDB.
- `permissionState`: enum `granted | prompt | denied | unavailable`.
- `lastScannedAt`: ISO timestamp, nullable.
- `lastSeenAt`: ISO timestamp, nullable.
- `status`: enum `ready | missing | revoked | scan-error`.
- `errorCode`: string, nullable.

**Indexes**:
- Primary key: `id`.
- Secondary: `status`, `lastScannedAt`.

**Validation**:
- `displayName` required.
- `handle` required for persisted sources.
- `status` must reflect the latest permission/folder reachability check.

**State transitions**:
- `ready -> missing` when the folder is moved, unavailable, or disconnected.
- `ready -> revoked` when permission is no longer granted.
- `missing/revoked -> ready` after successful recovery and rescan.
- `any -> scan-error` when a scan fails unexpectedly.

## Entity: LibraryComic

**Purpose**: Represents one discovered supported comic file from a granted library source.

**Fields**:
- `id`: string, stable UUID.
- `sourceId`: string, foreign key to `LibrarySource.id`.
- `relativePath`: string, path within the source folder.
- `fileName`: string.
- `extension`: enum `cbz | cbt | cbr`.
- `fileSizeBytes`: number.
- `modifiedAt`: ISO timestamp.
- `discoveredAt`: ISO timestamp.
- `title`: string, defaulting to filename-derived title.
- `pageCount`: number, nullable until first successful parse.
- `coverThumbnailId`: string, nullable.
- `availability`: enum `ready | unreadable | missing | permission-required`.
- `availabilityMessage`: string, nullable.

**Indexes**:
- Primary key: `id`.
- Unique composite key: `(sourceId, relativePath)`.
- Secondary: `extension`, `title`, `modifiedAt`, `availability`.

**Validation**:
- Only supported extensions are persisted.
- Duplicate files across different sources are allowed because uniqueness is source-relative.
- `pageCount` must be greater than zero once parsing succeeds.

**Relationships**:
- Many-to-one with `LibrarySource`.
- One-to-one optional with `ThumbnailRecord`.
- One-to-one optional with `ReadingProgressRecord`.

## Entity: ThumbnailRecord

**Purpose**: Stores generated cover thumbnails for library comics.

**Fields**:
- `id`: string, stable UUID.
- `comicId`: string, foreign key to `LibraryComic.id`.
- `blob`: Blob.
- `mimeType`: string.
- `width`: number.
- `height`: number.
- `generatedAt`: ISO timestamp.
- `sourcePage`: number, usually `1`.
- `status`: enum `ready | failed`.
- `failureReason`: string, nullable.

**Indexes**:
- Primary key: `id`.
- Unique secondary: `comicId`.

**Validation**:
- Stored only for library comics.
- Failed thumbnail generation must not block comic readability.

## Entity: ReadingProgressRecord

**Purpose**: Persists page-based progress for library comics.

**Fields**:
- `comicId`: string, foreign key to `LibraryComic.id`.
- `currentPage`: number.
- `pageCountSnapshot`: number.
- `lastReadAt`: ISO timestamp.
- `lastReadMode`: enum `scroll | page-flip`.
- `completed`: boolean.

**Indexes**:
- Primary key: `comicId`.
- Secondary: `lastReadAt`, `completed`.

**Validation**:
- `currentPage` must be between `1` and `pageCountSnapshot`.
- Progress is mode-agnostic and always stored by page number only.

## Entity: RecentLibraryItem

**Purpose**: Maintains the ordered list of the five most recently opened library comics.

**Fields**:
- `comicId`: string, foreign key to `LibraryComic.id`.
- `position`: number, `1` through `5`.
- `lastOpenedAt`: ISO timestamp.

**Indexes**:
- Primary key: `comicId`.
- Secondary: `position`, `lastOpenedAt`.

**Validation**:
- Maximum of five records at any time.
- Quick Read items are never inserted.

## Entity: ReaderPreference

**Purpose**: Stores durable reader-level preferences.

**Fields**:
- `id`: string, fixed key such as `reader-preferences`.
- `defaultDisplayMode`: enum `scroll | page-flip`.
- `preloadWindowPages`: number.
- `updatedAt`: ISO timestamp.

**Validation**:
- `defaultDisplayMode` required.
- `preloadWindowPages` must stay within a conservative desktop-safe range.

## Entity: QuickReadSession

**Purpose**: Stores same-tab-only resume state for the current Quick Read file.

**Storage**: sessionStorage, not IndexedDB.

**Fields**:
- `sessionId`: string, per-tab identifier.
- `fileName`: string.
- `fileFingerprint`: string, derived from lightweight file metadata.
- `extension`: enum `cbz | cbt | cbr`.
- `currentPage`: number.
- `pageCountSnapshot`: number, nullable.
- `openedAt`: ISO timestamp.
- `updatedAt`: ISO timestamp.

**Validation**:
- Exists only for the active tab session.
- Must be cleared when the tab session ends.
- Must never create linked `LibraryComic`, `ThumbnailRecord`, `RecentLibraryItem`, or durable progress entries.

## Derived/Transient Models

These models are not durable records but shape the runtime architecture:

- `ReaderSession`: active runtime session produced by the shared reader engine, regardless of entry mode.
- `ArchiveManifest`: ordered page-entry metadata returned by an archive adapter.
- `PreparedPage`: decoded or preprocessed page payload produced by worker pipelines.
- `LibraryCapabilityStatus`: computed browser capability state that determines whether Library Mode is shown.

## Relationships Summary

- `LibrarySource 1 -> many LibraryComic`
- `LibraryComic 1 -> 0..1 ThumbnailRecord`
- `LibraryComic 1 -> 0..1 ReadingProgressRecord`
- `LibraryComic 1 -> 0..1 RecentLibraryItem`
- `QuickReadSession` is intentionally isolated from the durable library graph.