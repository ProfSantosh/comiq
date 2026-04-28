import { db, type LibrarySource } from './db'

export const librarySourceRepository = {
  async getAll(): Promise<LibrarySource[]> {
    return db.librarySources.toArray()
  },

  async getById(id: string): Promise<LibrarySource | undefined> {
    return db.librarySources.get(id)
  },

  async add(source: LibrarySource): Promise<void> {
    await db.librarySources.add(source)
  },

  async update(id: string, changes: Partial<LibrarySource>): Promise<void> {
    await db.librarySources.update(id, changes)
  },

  async updateStatus(
    id: string,
    status: LibrarySource['status'],
    errorCode?: string | null,
  ): Promise<void> {
    await db.librarySources.update(id, { status, errorCode: errorCode ?? null })
  },

  async updateHandle(id: string, handle: FileSystemDirectoryHandle): Promise<void> {
    await db.librarySources.update(id, { handle })
  },

  async delete(id: string): Promise<void> {
    await db.librarySources.delete(id)
  },
}
