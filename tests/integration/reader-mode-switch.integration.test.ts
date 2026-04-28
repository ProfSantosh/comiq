import { describe, it, expect, beforeEach } from 'vitest'
import { ComiqReaderEngine } from '../../src/domain/reader/reader-engine'
import type { ArchiveManifest } from '../../src/domain/archive/archive-adapter.types'
import type { ReaderOpenRequest } from '../../src/domain/reader/reader-engine.types'

const FAKE_MANIFEST: ArchiveManifest = {
  format: 'cbz',
  pageCount: 8,
  pageEntries: Array.from({ length: 8 }, (_, i) => ({
    kind: 'page',
    path: `page${i + 1}.jpg`,
    pageIndex: i,
    mimeType: 'image/jpeg',
  })),
  warnings: [],
}

function makeOpenRequest(overrides: Partial<ReaderOpenRequest> = {}): ReaderOpenRequest {
  return {
    entryMode: 'quick-read',
    quickReadSessionId: 'test-session',
    archive: FAKE_MANIFEST,
    initialPage: 0,
    preferredDisplayMode: 'page-flip',
    ...overrides,
  }
}

describe('Reader Page-Flip Integration', () => {
  let engine: ComiqReaderEngine

  beforeEach(() => {
    engine = new ComiqReaderEngine()
  })

  it('opens in page-flip mode by default', async () => {
    const snap = await engine.open(makeOpenRequest())
    expect(snap.displayMode).toBe('page-flip')
  })

  it('preserves current page after setDisplayMode called with page-flip', async () => {
    await engine.open(makeOpenRequest({ initialPage: 3 }))
    const snap = await engine.setDisplayMode('page-flip')
    expect(snap.currentPage).toBe(3)
    expect(snap.displayMode).toBe('page-flip')
  })

  it('navigation does not corrupt state across multiple pages', async () => {
    await engine.open(makeOpenRequest({ initialPage: 2 }))

    await engine.nextPage()
    await engine.nextPage()
    const snap = await engine.nextPage()

    expect(snap.currentPage).toBe(5)
    expect(snap.displayMode).toBe('page-flip')
  })

  it('does not reset progress to page 0 after setDisplayMode', async () => {
    await engine.open(makeOpenRequest({ initialPage: 6 }))
    const snap = await engine.setDisplayMode('page-flip')
    expect(snap.currentPage).toBe(6)
  })
})
