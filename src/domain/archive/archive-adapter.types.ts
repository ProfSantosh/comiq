// Archive Adapter Contract Types
// Matches the contract defined in specs/001-comic-reader/contracts/archive-adapter-contract.md

export type ArchiveFormat = 'cbz' | 'cbt' | 'cbr'

export type ArchiveEntryKind = 'page' | 'metadata' | 'unsupported'

export interface ArchiveOpenInput {
  format: ArchiveFormat
  fileName: string
  fileSizeBytes: number
  source: Blob | File
}

export interface ArchiveEntryDescriptor {
  path: string
  pageIndex: number | null
  kind: ArchiveEntryKind
  compressedSizeBytes?: number
  uncompressedSizeBytes?: number
}

export interface ArchiveManifest {
  format: ArchiveFormat
  pageCount: number
  pageEntries: ArchiveEntryDescriptor[]
  warnings: string[]
}

export interface ExtractPageInput {
  manifest: ArchiveManifest
  pageIndex: number
}

export interface ExtractedPage {
  pageIndex: number
  path: string
  mimeType: string
  data: ArrayBuffer
}

export interface ArchiveAdapter {
  readonly format: ArchiveFormat
  open(input: ArchiveOpenInput): Promise<ArchiveManifest>
  extractPage(input: ExtractPageInput): Promise<ExtractedPage>
  extractCover(manifest: ArchiveManifest): Promise<ExtractedPage | null>
  close(): Promise<void>
}
