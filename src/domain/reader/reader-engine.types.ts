// Reader Engine Contract Types
// Matches the contract defined in specs/001-comic-reader/contracts/reader-engine-contract.md

import type { ArchiveManifest } from '../archive/archive-adapter.types'

export type ReaderDisplayMode = 'page-flip'
export type ReaderEntryMode = 'library' | 'quick-read'

export interface ReaderOpenRequest {
  entryMode: ReaderEntryMode
  comicId?: string
  quickReadSessionId?: string
  archive: ArchiveManifest
  fileSource: Blob | File
  initialPage: number
  preferredDisplayMode: ReaderDisplayMode
}

export interface ReaderProgressSnapshot {
  currentPage: number
  pageCount: number
  displayMode: ReaderDisplayMode
  canAdvance: boolean
  canRetreat: boolean
}

export interface PreparedPage {
  pageIndex: number
  mimeType: string
  blob: Blob
  width?: number
  height?: number
}

export interface ReaderEngine {
  open(request: ReaderOpenRequest): Promise<ReaderProgressSnapshot>
  getSnapshot(): ReaderProgressSnapshot
  preparePage(pageIndex: number): Promise<PreparedPage>
  goToPage(pageIndex: number): Promise<ReaderProgressSnapshot>
  nextPage(): Promise<ReaderProgressSnapshot>
  previousPage(): Promise<ReaderProgressSnapshot>
  setDisplayMode(mode: ReaderDisplayMode): Promise<ReaderProgressSnapshot>
  persistProgress(): Promise<void>
  dispose(): Promise<void>
}
