# Contract: Archive Adapter

## Purpose

The archive adapter contract isolates format-specific extraction behavior from the shared reader engine. All reader flows must consume archive pages through this contract rather than importing ZIP, TAR, or RAR tooling directly.

## TypeScript Shape

```ts
export type ArchiveFormat = 'cbz' | 'cbt' | 'cbr';

export type ArchiveEntryKind = 'page' | 'metadata' | 'unsupported';

export interface ArchiveOpenInput {
  format: ArchiveFormat;
  fileName: string;
  fileSizeBytes: number;
  source: Blob | File;
}

export interface ArchiveEntryDescriptor {
  path: string;
  pageIndex: number | null;
  kind: ArchiveEntryKind;
  compressedSizeBytes?: number;
  uncompressedSizeBytes?: number;
}

export interface ArchiveManifest {
  format: ArchiveFormat;
  pageCount: number;
  pageEntries: ArchiveEntryDescriptor[];
  warnings: string[];
}

export interface ExtractPageInput {
  manifest: ArchiveManifest;
  pageIndex: number;
}

export interface ExtractedPage {
  pageIndex: number;
  path: string;
  mimeType: string;
  data: ArrayBuffer;
}

export interface ArchiveAdapter {
  readonly format: ArchiveFormat;
  open(input: ArchiveOpenInput): Promise<ArchiveManifest>;
  extractPage(input: ExtractPageInput): Promise<ExtractedPage>;
  extractCover(manifest: ArchiveManifest): Promise<ExtractedPage | null>;
  close(): Promise<void>;
}
```

## Behavioral Requirements

- Adapters must return page entries in reader order.
- Unsupported entries must be ignored without failing the whole manifest unless no readable pages remain.
- Corrupt archives must produce normalized, user-safe errors.
- `extractCover` should prefer the first readable page unless a future metadata rule overrides it.
- Adapters may use workers internally but must keep the contract asynchronous and format-agnostic.

## Format Mapping

- `cbz`: ZIP-backed adapter using `fflate`.
- `cbt`: TAR-backed adapter using `js-untar` or equivalent browser-safe implementation.
- `cbr`: WASM-backed RAR adapter using a browser-compatible extractor wrapper.

## Test Expectations

- Contract tests must verify manifest ordering, first-page extraction, corrupt-archive normalization, and unsupported-file filtering for each format.
- Shared test fixtures should be reusable across adapters with format-specific expectations only where needed.