import { db, type LibraryComic } from './db'

export const libraryComicRepository = {
  async getById(id: string): Promise<LibraryComic | undefined> {
    return db.libraryComics.get(id)
  },

  async getBySourceId(sourceId: string): Promise<LibraryComic[]> {
    return db.libraryComics.where('sourceId').equals(sourceId).toArray()
  },

  async getBySourceIdAndPath(
    sourceId: string,
    relativePath: string,
  ): Promise<LibraryComic | undefined> {
    return db.libraryComics
      .where('[sourceId+relativePath]')
      .equals([sourceId, relativePath])
      .first()
  },

  async upsert(comic: LibraryComic): Promise<void> {
    await db.libraryComics.put(comic)
  },

  async updateAvailability(
    id: string,
    availability: LibraryComic['availability'],
    message?: string | null,
  ): Promise<void> {
    await db.libraryComics.update(id, {
      availability,
      availabilityMessage: message ?? null,
    })
  },

  async deleteBySourceId(sourceId: string): Promise<void> {
    await db.libraryComics.where('sourceId').equals(sourceId).delete()
  },

  async delete(id: string): Promise<void> {
    await db.libraryComics.delete(id)
  },

  async getAll(): Promise<LibraryComic[]> {
    return db.libraryComics.orderBy('title').toArray()
  },
}
