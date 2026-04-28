import { describe, it, expect, beforeEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { ComiqReaderEngine } from '../../src/domain/reader/reader-engine'
import type { ArchiveManifest } from '../../src/domain/archive/archive-adapter.types'
import type { ReaderOpenRequest } from '../../src/domain/reader/reader-engine.types'

// Mock the persistence layer so IndexedDB writes don't error in jsdom
vi.mock('../../src/persistence/reading-progress.repository', () => ({
  readingProgressRepository: {
    upsert: vi.fn(async () => undefined),
    getByComicId: vi.fn(async () => undefined),
    deleteByComicId: vi.fn(async () => undefined),
    deleteByComicIds: vi.fn(async () => undefined),
  },
  recentLibraryItemRepository: {
    upsert: vi.fn(async () => undefined),
    getAll: vi.fn(async () => []),
    deleteByComicId: vi.fn(async () => undefined),
    deleteByComicIds: vi.fn(async () => undefined),
  },
}))

const FAKE_MANIFEST: ArchiveManifest = {
  format: 'cbz',
  pageCount: 5,
  pageEntries: Array.from({ length: 5 }, (_, i) => ({
    kind: 'page',
    path: `page00${i + 1}.jpg`,
    pageIndex: i,
    mimeType: 'image/jpeg',
  })),
  warnings: [],
}

const FAKE_ARCHIVE_DATA = new ArrayBuffer(8)

function makeOpenRequest(overrides: Partial<ReaderOpenRequest> = {}): ReaderOpenRequest {
  return {
    entryMode: 'quick-read',
    quickReadSessionId: 'test-session',
    archive: FAKE_MANIFEST,
    fileSource: new Blob([FAKE_ARCHIVE_DATA]),
    initialPage: 0,
    preferredDisplayMode: 'page-flip',
    ...overrides,
  }
}

describe('ReaderEngine Contract', () => {
  let engine: ComiqReaderEngine

  beforeEach(() => {
    engine = new ComiqReaderEngine()
  })

  describe('open()', () => {
    it('returns a snapshot reflecting the initial state', async () => {
      const snap = await engine.open(makeOpenRequest())

      expect(snap.currentPage).toBe(0)
      expect(snap.pageCount).toBe(5)
      expect(snap.displayMode).toBe('page-flip')
    })

    it('respects the initial page from a saved progress snapshot', async () => {
      const snap = await engine.open(makeOpenRequest({ initialPage: 3 }))
      expect(snap.currentPage).toBe(3)
    })

    it('respects the preferred display mode', async () => {
      const snap = await engine.open(makeOpenRequest({ preferredDisplayMode: 'page-flip' }))
      expect(snap.displayMode).toBe('page-flip')
    })
  })

  describe('nextPage() / previousPage()', () => {
    it('advances to next page', async () => {
      await engine.open(makeOpenRequest())
      const snap = await engine.nextPage()
      expect(snap.currentPage).toBe(1)
    })

    it('does not advance past last page', async () => {
      await engine.open(makeOpenRequest({ initialPage: 4 }))
      const snap = await engine.nextPage()
      expect(snap.currentPage).toBe(4)
    })

    it('goes back to previous page', async () => {
      await engine.open(makeOpenRequest({ initialPage: 2 }))
      const snap = await engine.previousPage()
      expect(snap.currentPage).toBe(1)
    })

    it('does not go below page 0', async () => {
      await engine.open(makeOpenRequest())
      const snap = await engine.previousPage()
      expect(snap.currentPage).toBe(0)
    })
  })

  describe('goToPage()', () => {
    it('jumps to a specific page', async () => {
      await engine.open(makeOpenRequest())
      const snap = await engine.goToPage(4)
      expect(snap.currentPage).toBe(4)
    })

    it('clamps to 0 on out-of-bounds low', async () => {
      await engine.open(makeOpenRequest())
      const snap = await engine.goToPage(-5)
      expect(snap.currentPage).toBe(0)
    })

    it('clamps to last page on out-of-bounds high', async () => {
      await engine.open(makeOpenRequest())
      const snap = await engine.goToPage(100)
      expect(snap.currentPage).toBe(4)
    })
  })

  describe('setDisplayMode()', () => {
    it('retains current page when called with page-flip', async () => {
      await engine.open(makeOpenRequest({ initialPage: 2 }))
      const snap = await engine.setDisplayMode('page-flip')
      expect(snap.displayMode).toBe('page-flip')
      expect(snap.currentPage).toBe(2)
    })
  })

  describe('getSnapshot()', () => {
    it('returns current state without changing it', async () => {
      await engine.open(makeOpenRequest({ initialPage: 1 }))
      const snap = engine.getSnapshot()
      expect(snap.currentPage).toBe(1)
    })
  })

  describe('dispose()', () => {
    it('cleans up without errors', async () => {
      await engine.open(makeOpenRequest())
      await expect(engine.dispose()).resolves.toBeUndefined()
    })

    it('throws when getting snapshot after dispose', async () => {
      await engine.open(makeOpenRequest())
      await engine.dispose()
      expect(() => engine.getSnapshot()).toThrow(/not open/i)
    })
  })

  describe('getSnapshot() before open', () => {
    it('throws when called before open()', () => {
      expect(() => engine.getSnapshot()).toThrow(/not open/i)
    })
  })

  describe('persistProgress() — branch coverage', () => {
    it('is a no-op when called before open (early return branch)', async () => {
      // _request and _manifest are null — must not throw
      await expect(engine.persistProgress()).resolves.toBeUndefined()
    })

    it('persists progress in library entry mode', async () => {
      const { readingProgressRepository, recentLibraryItemRepository } = await import(
        '../../src/persistence/reading-progress.repository'
      )
      await engine.open(
        makeOpenRequest({
          entryMode: 'library',
          comicId: 'lib-comic-001',
          initialPage: 2,
        }),
      )
      await engine.persistProgress()
      expect(readingProgressRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ comicId: 'lib-comic-001', currentPage: 2 }),
      )
      expect(recentLibraryItemRepository.upsert).toHaveBeenCalledWith('lib-comic-001')
    })

    it('persists progress in quick-read entry mode via sessionStorage', async () => {
      // Pre-seed a quick-read session so the store has data to update
      sessionStorage.setItem(
        'comiq:quick-read-session',
        JSON.stringify({
          sessionId: 'qr-session-abc',
          fileName: 'test.cbz',
          fileFingerprint: 'abc123',
          extension: 'cbz',
          currentPage: 0,
          pageCountSnapshot: 5,
          openedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      )
      await engine.open(
        makeOpenRequest({ entryMode: 'quick-read', quickReadSessionId: 'qr-session-abc' }),
      )
      await engine.goToPage(3)
      await engine.persistProgress()
      const raw = sessionStorage.getItem('comiq:quick-read-session')
      const session = JSON.parse(raw ?? '{}')
      expect(session.currentPage).toBe(3)
      sessionStorage.clear()
    })
  })

  describe('open() — quick-read session restore', () => {
    it('restores currentPage from a matching quick-read session', async () => {
      sessionStorage.setItem(
        'comiq:quick-read-session',
        JSON.stringify({
          sessionId: 'restore-session',
          fileName: 'test.cbz',
          fileFingerprint: 'def456',
          extension: 'cbz',
          currentPage: 4,
          pageCountSnapshot: 5,
          openedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      )
      const snap = await engine.open(
        makeOpenRequest({ entryMode: 'quick-read', quickReadSessionId: 'restore-session' }),
      )
      expect(snap.currentPage).toBe(4)
      sessionStorage.clear()
    })
  })
})
