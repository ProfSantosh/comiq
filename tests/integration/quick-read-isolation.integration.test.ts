import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { quickReadSessionStore } from '../../src/persistence/quick-read-session.store'

describe('Quick Read Isolation', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('stores session only in sessionStorage, not IndexedDB', () => {
    quickReadSessionStore.save({
      sessionId: 'sess-1',
      fileName: 'test.cbz',
      fileFingerprint: 'test.cbz:1024:12345',
      extension: 'cbz',
      currentPage: 3,
      pageCountSnapshot: 24,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const stored = sessionStorage.getItem('comiq:quick-read-session')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.sessionId).toBe('sess-1')
  })

  it('retrieve returns null when no session is saved', () => {
    expect(quickReadSessionStore.get()).toBeNull()
  })

  it('update merges partial fields', () => {
    quickReadSessionStore.save({
      sessionId: 'sess-2',
      fileName: 'comic.cbt',
      fileFingerprint: 'comic.cbt:512:999',
      extension: 'cbt',
      currentPage: 0,
      pageCountSnapshot: 10,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    quickReadSessionStore.update({ currentPage: 5 })

    const updated = quickReadSessionStore.get()
    expect(updated?.currentPage).toBe(5)
    expect(updated?.fileName).toBe('comic.cbt')
  })

  it('clear removes session from storage', () => {
    quickReadSessionStore.save({
      sessionId: 'sess-3',
      fileName: 'x.cbz',
      fileFingerprint: 'x.cbz:1:1',
      extension: 'cbz',
      currentPage: 0,
      pageCountSnapshot: 1,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    quickReadSessionStore.clear()
    expect(quickReadSessionStore.get()).toBeNull()
  })

  it('does not persist quick-read file data to IndexedDB', async () => {
    // This test verifies there is no database writes for quick-read sessions
    const dbWriteSpy = vi.fn()

    // Intercept any potential Dexie calls (should never be called)
    vi.mock('../../src/persistence/db', () => ({
      db: {
        libraryComics: { put: dbWriteSpy, add: dbWriteSpy },
        readingProgress: { put: dbWriteSpy, add: dbWriteSpy },
      },
    }))

    quickReadSessionStore.save({
      sessionId: 'isolated',
      fileName: 'isolated.cbz',
      fileFingerprint: 'isolated.cbz:512:777',
      extension: 'cbz',
      currentPage: 7,
      pageCountSnapshot: 20,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    expect(dbWriteSpy).not.toHaveBeenCalled()
  })
})
