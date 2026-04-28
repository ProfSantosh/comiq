import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { ComiqDatabase } from '../../src/persistence/db'
import { v4 as uuid } from 'uuid'

// Use a fresh in-memory database per test
let db: ComiqDatabase

beforeEach(async () => {
  db = new ComiqDatabase()
})


describe('LibrarySource Repository Contract', () => {
  it('can add and retrieve a source by id', async () => {
    const id = uuid()
    await db.librarySources.add({
      id,
      displayName: 'Comics',
      handle: {} as FileSystemDirectoryHandle,
      permissionState: 'granted',
      lastScannedAt: null,
      lastSeenAt: null,
      status: 'ready',
      errorCode: null,
    })

    const fetched = await db.librarySources.get(id)
    expect(fetched?.displayName).toBe('Comics')
  })

  it('can update status', async () => {
    const id = uuid()
    await db.librarySources.add({
      id,
      displayName: 'Test',
      handle: {} as FileSystemDirectoryHandle,
      permissionState: 'granted',
      lastScannedAt: null,
      lastSeenAt: null,
      status: 'ready',
      errorCode: null,
    })

    await db.librarySources.update(id, { status: 'revoked' })
    const updated = await db.librarySources.get(id)
    expect(updated?.status).toBe('revoked')
  })

  it('can delete a source', async () => {
    const id = uuid()
    await db.librarySources.add({
      id,
      displayName: 'Deleteable',
      handle: {} as FileSystemDirectoryHandle,
      permissionState: 'granted',
      lastScannedAt: null,
      lastSeenAt: null,
      status: 'ready',
      errorCode: null,
    })

    await db.librarySources.delete(id)
    expect(await db.librarySources.get(id)).toBeUndefined()
  })
})

describe('LibraryComic Repository Contract', () => {
  it('can upsert and retrieve by sourceId', async () => {
    const sourceId = uuid()
    const comicId = uuid()

    await db.libraryComics.put({
      id: comicId,
      sourceId,
      relativePath: 'volume1/issue1.cbz',
      fileName: 'issue1.cbz',
      extension: 'cbz',
      fileSizeBytes: 1024,
      modifiedAt: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      title: 'Issue 1',
      pageCount: 24,
      coverThumbnailId: null,
      availability: 'ready',
      availabilityMessage: null,
    })

    const results = await db.libraryComics.where('sourceId').equals(sourceId).toArray()
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Issue 1')
  })

  it('unique composite key prevents duplicate (sourceId, relativePath)', async () => {
    const sourceId = uuid()
    const comic = {
      id: uuid(),
      sourceId,
      relativePath: 'duplicate.cbz',
      fileName: 'duplicate.cbz',
      extension: 'cbz' as const,
      fileSizeBytes: 100,
      modifiedAt: new Date().toISOString(),
      discoveredAt: new Date().toISOString(),
      title: 'Dupe',
      pageCount: null,
      coverThumbnailId: null,
      availability: 'ready' as const,
      availabilityMessage: null,
    }

    await db.libraryComics.put(comic)
    // put with same id should update (upsert), not duplicate
    await db.libraryComics.put({ ...comic, title: 'Updated Title' })

    const results = await db.libraryComics.where('sourceId').equals(sourceId).toArray()
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Updated Title')
  })

  it('can delete comics by sourceId', async () => {
    const sourceId = uuid()
    await db.libraryComics.put({
      id: uuid(), sourceId, relativePath: 'a.cbz', fileName: 'a.cbz', extension: 'cbz',
      fileSizeBytes: 1, modifiedAt: '', discoveredAt: '', title: 'A', pageCount: null,
      coverThumbnailId: null, availability: 'ready', availabilityMessage: null,
    })

    await db.libraryComics.where('sourceId').equals(sourceId).delete()
    const remaining = await db.libraryComics.where('sourceId').equals(sourceId).toArray()
    expect(remaining).toHaveLength(0)
  })
})
