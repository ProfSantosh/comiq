import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComiqReaderEngine } from '../../src/domain/reader/reader-engine'
import type { ArchiveManifest } from '../../src/domain/archive/archive-adapter.types'
import type { ReaderOpenRequest } from '../../src/domain/reader/reader-engine.types'

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
})
