import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  readingProgressRepository,
  recentLibraryItemRepository,
} from '../../src/persistence/reading-progress.repository'
import { db } from '../../src/persistence/db'

// Wipe tables between tests so each test starts clean
beforeEach(async () => {
  await db.readingProgress.clear()
  await db.recentItems.clear()
})

// ---------------------------------------------------------------------------
// readingProgressRepository
// ---------------------------------------------------------------------------

describe('readingProgressRepository', () => {
  describe('upsert / getByComicId', () => {
    it('stores and retrieves a reading progress record', async () => {
      await readingProgressRepository.upsert({ comicId: 'comic-1', currentPage: 3 })
      const record = await readingProgressRepository.getByComicId('comic-1')
      expect(record?.currentPage).toBe(3)
    })

    it('overwrites an existing record on upsert', async () => {
      await readingProgressRepository.upsert({ comicId: 'comic-1', currentPage: 1 })
      await readingProgressRepository.upsert({ comicId: 'comic-1', currentPage: 7 })
      const record = await readingProgressRepository.getByComicId('comic-1')
      expect(record?.currentPage).toBe(7)
    })
  })

  describe('deleteByComicId', () => {
    it('removes the record for the given comicId', async () => {
      await readingProgressRepository.upsert({ comicId: 'comic-del', currentPage: 2 })
      await readingProgressRepository.deleteByComicId('comic-del')
      const record = await readingProgressRepository.getByComicId('comic-del')
      expect(record).toBeUndefined()
    })

    it('is a no-op when the comicId does not exist', async () => {
      // Must not throw
      await expect(
        readingProgressRepository.deleteByComicId('nonexistent'),
      ).resolves.toBeUndefined()
    })
  })

  describe('deleteByComicIds', () => {
    it('removes multiple records in a single call', async () => {
      await readingProgressRepository.upsert({ comicId: 'comic-a', currentPage: 1 })
      await readingProgressRepository.upsert({ comicId: 'comic-b', currentPage: 2 })
      await readingProgressRepository.upsert({ comicId: 'comic-c', currentPage: 3 })

      await readingProgressRepository.deleteByComicIds(['comic-a', 'comic-c'])

      expect(await readingProgressRepository.getByComicId('comic-a')).toBeUndefined()
      expect(await readingProgressRepository.getByComicId('comic-c')).toBeUndefined()
      // Untouched record should remain
      expect((await readingProgressRepository.getByComicId('comic-b'))?.currentPage).toBe(2)
    })
  })
})

// ---------------------------------------------------------------------------
// recentLibraryItemRepository
// ---------------------------------------------------------------------------

describe('recentLibraryItemRepository', () => {
  describe('upsert — new items', () => {
    it('inserts a new item at position 1', async () => {
      await recentLibraryItemRepository.upsert('comic-new')
      const items = await recentLibraryItemRepository.getAll()
      expect(items).toHaveLength(1)
      expect(items[0].comicId).toBe('comic-new')
      expect(items[0].position).toBe(1)
    })

    it('shifts existing items down when a new item is added', async () => {
      await recentLibraryItemRepository.upsert('comic-first')
      await recentLibraryItemRepository.upsert('comic-second')

      const items = await recentLibraryItemRepository.getAll()
      const second = items.find((i) => i.comicId === 'comic-second')
      const first = items.find((i) => i.comicId === 'comic-first')

      // newest is always at position 1
      expect(second?.position).toBe(1)
      expect(first?.position).toBe(2)
    })
  })

  describe('upsert — existing item (re-position to front)', () => {
    it('moves an existing item back to position 1 and adjusts others', async () => {
      // Seed three items: A (1), B (2), C (3)
      await recentLibraryItemRepository.upsert('comic-a') // position 1
      await recentLibraryItemRepository.upsert('comic-b') // b→1, a→2
      await recentLibraryItemRepository.upsert('comic-c') // c→1, b→2, a→3

      // Re-open comic-a (was at position 3)
      await recentLibraryItemRepository.upsert('comic-a')

      const items = await recentLibraryItemRepository.getAll()
      const a = items.find((i) => i.comicId === 'comic-a')
      const b = items.find((i) => i.comicId === 'comic-b')
      const c = items.find((i) => i.comicId === 'comic-c')

      expect(a?.position).toBe(1)
      // Items below comic-a's old position (3) get shifted down by 1
      expect(b?.position).toBe(3)
      expect(c?.position).toBe(2)
    })
  })

  describe('upsert — overflow eviction', () => {
    it('evicts items beyond MAX_RECENT_ITEMS (5) after insertion', async () => {
      // Insert 5 items first
      for (let i = 1; i <= 5; i++) {
        await recentLibraryItemRepository.upsert(`comic-${i}`)
      }

      // Insert a 6th — this should evict the item at position 6
      await recentLibraryItemRepository.upsert('comic-6')

      const items = await recentLibraryItemRepository.getAll()
      expect(items).toHaveLength(5)
      // The oldest (comic-1, now at position 6) should be evicted
      expect(items.find((i) => i.comicId === 'comic-1')).toBeUndefined()
      // The newest should be at position 1
      expect(items.find((i) => i.comicId === 'comic-6')?.position).toBe(1)
    })
  })

  describe('getAll', () => {
    it('returns items ordered by position ascending', async () => {
      await recentLibraryItemRepository.upsert('first')
      await recentLibraryItemRepository.upsert('second')
      await recentLibraryItemRepository.upsert('third')

      const items = await recentLibraryItemRepository.getAll()
      const positions = items.map((i) => i.position)
      expect(positions).toEqual([...positions].sort((a, b) => a - b))
    })
  })

  describe('deleteByComicId', () => {
    it('removes the recent item for the given comicId', async () => {
      await recentLibraryItemRepository.upsert('comic-x')
      await recentLibraryItemRepository.deleteByComicId('comic-x')
      const items = await recentLibraryItemRepository.getAll()
      expect(items.find((i) => i.comicId === 'comic-x')).toBeUndefined()
    })
  })

  describe('deleteByComicIds', () => {
    it('removes multiple recent items in one call', async () => {
      await recentLibraryItemRepository.upsert('r-a')
      await recentLibraryItemRepository.upsert('r-b')
      await recentLibraryItemRepository.upsert('r-c')

      await recentLibraryItemRepository.deleteByComicIds(['r-a', 'r-c'])

      const items = await recentLibraryItemRepository.getAll()
      expect(items.find((i) => i.comicId === 'r-a')).toBeUndefined()
      expect(items.find((i) => i.comicId === 'r-c')).toBeUndefined()
      expect(items.find((i) => i.comicId === 'r-b')).toBeDefined()
    })
  })
})
