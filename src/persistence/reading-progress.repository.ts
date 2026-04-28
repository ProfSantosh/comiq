import { db, type ReadingProgressRecord, type RecentLibraryItem } from './db'

const MAX_RECENT_ITEMS = 5

export const readingProgressRepository = {
  async getByComicId(comicId: string): Promise<ReadingProgressRecord | undefined> {
    return db.readingProgress.get(comicId)
  },

  async upsert(record: ReadingProgressRecord): Promise<void> {
    await db.readingProgress.put(record)
  },

  async deleteByComicId(comicId: string): Promise<void> {
    await db.readingProgress.delete(comicId)
  },

  async deleteByComicIds(comicIds: string[]): Promise<void> {
    await db.readingProgress.bulkDelete(comicIds)
  },
}

export const recentLibraryItemRepository = {
  async getAll(): Promise<RecentLibraryItem[]> {
    return db.recentItems.orderBy('position').toArray()
  },

  async upsert(comicId: string): Promise<void> {
    await db.transaction('rw', db.recentItems, async () => {
      const now = new Date().toISOString()
      const existing = await db.recentItems.get(comicId)

      if (existing) {
        // Move to top (position 1), shift others down
        const items = await db.recentItems
          .where('position')
          .below(existing.position)
          .toArray()
        for (const item of items) {
          await db.recentItems.update(item.comicId, { position: item.position + 1 })
        }
        await db.recentItems.put({ comicId, position: 1, lastOpenedAt: now })
      } else {
        // Shift all existing positions down
        const items = await db.recentItems.orderBy('position').toArray()
        for (const item of items) {
          await db.recentItems.update(item.comicId, { position: item.position + 1 })
        }

        // Add new item at position 1
        await db.recentItems.put({ comicId, position: 1, lastOpenedAt: now })

        // Evict if over limit
        const overflow = await db.recentItems
          .where('position')
          .above(MAX_RECENT_ITEMS)
          .toArray()
        for (const item of overflow) {
          await db.recentItems.delete(item.comicId)
        }
      }
    })
  },

  async deleteByComicId(comicId: string): Promise<void> {
    await db.recentItems.delete(comicId)
  },

  async deleteByComicIds(comicIds: string[]): Promise<void> {
    await db.recentItems.bulkDelete(comicIds)
  },
}
