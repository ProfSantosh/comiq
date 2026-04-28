import { v4 as uuid } from 'uuid'
import { libraryComicRepository } from '../../persistence/library-comic.repository'
import { createArchiveAdapter, getFormatFromExtension, isSupported } from '../archive/archive-adapter-registry'
import { thumbnailService } from './thumbnail.service'
import type { LibraryComic } from '../../persistence/db'

export const libraryScannerService = {
  async scanFolder(
    sourceId: string,
    handle: FileSystemDirectoryHandle,
    onProgress?: (scanned: number) => void,
  ): Promise<void> {
    const files = await collectSupportedFiles(handle, '')
    let scanned = 0

    for (const { relativePath, fileHandle } of files) {
      scanned++
      onProgress?.(scanned)

      const file = await fileHandle.getFile()
      const format = getFormatFromExtension(file.name)
      if (!format) continue

      const existing = await libraryComicRepository.getBySourceIdAndPath(sourceId, relativePath)

      const comicId = existing?.id ?? uuid()
      const extension = format as 'cbz' | 'cbt' | 'cbr'

      const comic: LibraryComic = {
        id: comicId,
        sourceId,
        relativePath,
        fileName: file.name,
        extension,
        fileSizeBytes: file.size,
        modifiedAt: new Date(file.lastModified).toISOString(),
        discoveredAt: existing?.discoveredAt ?? new Date().toISOString(),
        title: existing?.title ?? deriveTitle(file.name),
        pageCount: existing?.pageCount ?? null,
        coverThumbnailId: existing?.coverThumbnailId ?? null,
        availability: 'ready',
        availabilityMessage: null,
      }

      await libraryComicRepository.upsert(comic)

      // Generate thumbnail if not already present
      if (!existing?.coverThumbnailId) {
        void generateThumbnailForComic(comicId, file, format)
      }

      // Parse page count if unknown
      if (!existing?.pageCount) {
        void parsePageCount(comicId, file, format)
      }
    }
  },

  async markMissingComics(sourceId: string, handle: FileSystemDirectoryHandle): Promise<void> {
    const files = await collectSupportedFiles(handle, '')
    const foundPaths = new Set(files.map((f) => f.relativePath))
    const existing = await libraryComicRepository.getBySourceId(sourceId)

    for (const comic of existing) {
      if (!foundPaths.has(comic.relativePath) && comic.availability === 'ready') {
        await libraryComicRepository.updateAvailability(
          comic.id,
          'missing',
          'File no longer found in folder.',
        )
      }
    }
  },
}

async function collectSupportedFiles(
  dir: FileSystemDirectoryHandle,
  prefix: string,
): Promise<Array<{ relativePath: string; fileHandle: FileSystemFileHandle }>> {
  const results: Array<{ relativePath: string; fileHandle: FileSystemFileHandle }> = []

  for await (const [name, entry] of dir) {
    const path = prefix ? `${prefix}/${name}` : name
    if (entry.kind === 'file') {
      if (isSupported(name)) {
        results.push({ relativePath: path, fileHandle: entry as FileSystemFileHandle })
      }
    } else if (entry.kind === 'directory') {
      const sub = await collectSupportedFiles(entry as FileSystemDirectoryHandle, path)
      results.push(...sub)
    }
  }

  return results
}

function deriveTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, '')
  return withoutExt.replace(/[-_]/g, ' ').trim()
}

async function generateThumbnailForComic(
  comicId: string,
  file: File,
  format: string,
): Promise<void> {
  try {
    const adapter = createArchiveAdapter(format as 'cbz' | 'cbt' | 'cbr')
    const manifest = await adapter.open({
      format: format as 'cbz' | 'cbt' | 'cbr',
      fileName: file.name,
      fileSizeBytes: file.size,
      source: file,
    })
    const cover = await adapter.extractCover(manifest)
    await adapter.close()
    if (cover) {
      await thumbnailService.generateAndStore(comicId, cover.data, cover.mimeType)
    }
  } catch {
    // Non-fatal: thumbnail failure should not block library
  }
}

async function parsePageCount(comicId: string, file: File, format: string): Promise<void> {
  try {
    const adapter = createArchiveAdapter(format as 'cbz' | 'cbt' | 'cbr')
    const manifest = await adapter.open({
      format: format as 'cbz' | 'cbt' | 'cbr',
      fileName: file.name,
      fileSizeBytes: file.size,
      source: file,
    })
    await adapter.close()

    const comic = await libraryComicRepository.getById(comicId)
    if (comic) {
      await libraryComicRepository.upsert({ ...comic, pageCount: manifest.pageCount })
    }
  } catch {
    // Non-fatal
  }
}
