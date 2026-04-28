import { v4 as uuid } from 'uuid'
import { db, type LibrarySource } from '../../persistence/db'
import { librarySourceRepository } from '../../persistence/library-source.repository'
import { libraryComicRepository } from '../../persistence/library-comic.repository'
import { thumbnailRepository } from '../../persistence/thumbnail.repository'
import {
  readingProgressRepository,
  recentLibraryItemRepository,
} from '../../persistence/reading-progress.repository'
import { libraryScannerService } from './library-scanner.service'

export const librarySourceService = {
  async addFolder(): Promise<LibrarySource> {
    // showDirectoryPicker throws DOMException if user cancels
    const handle = await window.showDirectoryPicker({ mode: 'read' })

    const source: LibrarySource = {
      id: uuid(),
      displayName: handle.name,
      handle,
      permissionState: 'granted',
      lastScannedAt: null,
      lastSeenAt: new Date().toISOString(),
      status: 'ready',
      errorCode: null,
    }

    await librarySourceRepository.add(source)

    // Trigger async scan (non-blocking)
    void librarySourceService.rescan(source.id)

    return source
  },

  async verifyPermission(sourceId: string): Promise<boolean> {
    const source = await librarySourceRepository.getById(sourceId)
    if (!source) return false

    const state = await source.handle.queryPermission({ mode: 'read' })
    if (state === 'granted') {
      await librarySourceRepository.update(sourceId, {
        permissionState: 'granted',
        status: 'ready',
        lastSeenAt: new Date().toISOString(),
      })
      return true
    }

    if (state === 'prompt') {
      const granted = await source.handle.requestPermission({ mode: 'read' })
      if (granted === 'granted') {
        await librarySourceRepository.update(sourceId, {
          permissionState: 'granted',
          status: 'ready',
          lastSeenAt: new Date().toISOString(),
        })
        return true
      }
    }

    await librarySourceRepository.updateStatus(sourceId, 'revoked')
    return false
  },

  async rescan(sourceId: string): Promise<void> {
    const source = await librarySourceRepository.getById(sourceId)
    if (!source) return

    const hasPermission = await librarySourceService.verifyPermission(sourceId)
    if (!hasPermission) return

    try {
      await librarySourceRepository.updateStatus(sourceId, 'ready')
      await libraryScannerService.scanFolder(sourceId, source.handle)
      await libraryScannerService.markMissingComics(sourceId, source.handle)
      await librarySourceRepository.update(sourceId, {
        lastScannedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      })
    } catch {
      await librarySourceRepository.updateStatus(sourceId, 'scan-error')
    }
  },

  async removeSource(sourceId: string): Promise<void> {
    // Cascade-delete all associated records (FR-023)
    const comics = await libraryComicRepository.getBySourceId(sourceId)
    const comicIds = comics.map((c) => c.id)

    await db.transaction(
      'rw',
      [
        db.librarySources,
        db.libraryComics,
        db.thumbnails,
        db.readingProgress,
        db.recentItems,
      ],
      async () => {
        await thumbnailRepository.deleteByComicIds(comicIds)
        await readingProgressRepository.deleteByComicIds(comicIds)
        await recentLibraryItemRepository.deleteByComicIds(comicIds)
        await libraryComicRepository.deleteBySourceId(sourceId)
        await librarySourceRepository.delete(sourceId)
      },
    )
  },
}
