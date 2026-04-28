import { db, type ThumbnailRecord } from './db'

export const thumbnailRepository = {
  async getByComicId(comicId: string): Promise<ThumbnailRecord | undefined> {
    return db.thumbnails.where('comicId').equals(comicId).first()
  },

  async save(record: ThumbnailRecord): Promise<void> {
    await db.thumbnails.put(record)
  },

  async markFailed(comicId: string, reason: string): Promise<void> {
    const existing = await db.thumbnails.where('comicId').equals(comicId).first()
    if (existing) {
      await db.thumbnails.update(existing.id, {
        status: 'failed',
        failureReason: reason,
      })
    }
  },

  async deleteByComicId(comicId: string): Promise<void> {
    await db.thumbnails.where('comicId').equals(comicId).delete()
  },

  async deleteByComicIds(comicIds: string[]): Promise<void> {
    await db.thumbnails.where('comicId').anyOf(comicIds).delete()
  },
}
