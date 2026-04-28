import Dexie, { type Table } from 'dexie'

// Entity interfaces matching data-model.md

export interface LibrarySource {
  id: string
  displayName: string
  handle: FileSystemDirectoryHandle
  permissionState: 'granted' | 'prompt' | 'denied' | 'unavailable'
  lastScannedAt: string | null
  lastSeenAt: string | null
  status: 'ready' | 'missing' | 'revoked' | 'scan-error'
  errorCode: string | null
}

export interface LibraryComic {
  id: string
  sourceId: string
  relativePath: string
  fileName: string
  extension: 'cbz' | 'cbt' | 'cbr'
  fileSizeBytes: number
  modifiedAt: string
  discoveredAt: string
  title: string
  pageCount: number | null
  coverThumbnailId: string | null
  availability: 'ready' | 'unreadable' | 'missing' | 'permission-required'
  availabilityMessage: string | null
}

export interface ThumbnailRecord {
  id: string
  comicId: string
  blob: Blob
  mimeType: string
  width: number
  height: number
  generatedAt: string
  sourcePage: number
  status: 'ready' | 'failed'
  failureReason: string | null
}

export interface ReadingProgressRecord {
  comicId: string
  currentPage: number
  pageCountSnapshot: number
  lastReadAt: string
  lastReadMode: 'scroll' | 'page-flip'
  completed: boolean
}

export interface RecentLibraryItem {
  comicId: string
  position: number
  lastOpenedAt: string
}

export interface ReaderPreference {
  id: string
  defaultDisplayMode: 'page-flip'
  preloadWindowPages: number
  updatedAt: string
}

export class ComiqDatabase extends Dexie {
  librarySources!: Table<LibrarySource>
  libraryComics!: Table<LibraryComic>
  thumbnails!: Table<ThumbnailRecord>
  readingProgress!: Table<ReadingProgressRecord>
  recentItems!: Table<RecentLibraryItem>
  readerPreferences!: Table<ReaderPreference>

  constructor() {
    super('comiq-db')

    this.version(1).stores({
      librarySources: 'id, status, lastScannedAt',
      libraryComics: 'id, [sourceId+relativePath], sourceId, extension, title, modifiedAt, availability',
      thumbnails: 'id, &comicId',
      readingProgress: 'comicId, lastReadAt, completed',
      recentItems: 'comicId, position, lastOpenedAt',
      readerPreferences: 'id',
    })
  }
}

export const db = new ComiqDatabase()
