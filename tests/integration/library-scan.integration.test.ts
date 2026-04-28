import { describe, it, expect, beforeEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { libraryComicRepository } from '../../src/persistence/library-comic.repository'
import { libraryScannerService } from '../../src/domain/library/library-scanner.service'
import type { LibrarySource } from '../../src/persistence/db'
import { v4 as uuid } from 'uuid'

// Mock thumbnail service to prevent Worker instantiation in tests
vi.mock('../../src/domain/library/thumbnail.service', () => ({
  thumbnailService: {
    generateForComic: vi.fn(async () => undefined),
  },
}))

// ---------------------------------------------------------------------------
// Helpers: build a fake FileSystemDirectoryHandle tree
// ---------------------------------------------------------------------------

function makeFakeFile(name: string, sizeBytes = 1024): FileSystemFileHandle {
  const lastModified = Date.now()
  return {
    kind: 'file',
    name,
    getFile: vi.fn(async () => ({
      name,
      size: sizeBytes,
      lastModified,
      arrayBuffer: vi.fn(async () => new ArrayBuffer(0)),
    })),
    isSameEntry: vi.fn(async () => false),
    queryPermission: vi.fn(async () => 'granted' as PermissionState),
    requestPermission: vi.fn(async () => 'granted' as PermissionState),
  } as unknown as FileSystemFileHandle
}

function makeFakeDir(
  name: string,
  children: Array<FileSystemFileHandle | FileSystemDirectoryHandle>,
): FileSystemDirectoryHandle {
  async function* entries() {
    for (const child of children) yield [child.name, child] as const
  }
  const handle = {
    kind: 'directory',
    name,
    [Symbol.asyncIterator]: entries,
    values: vi.fn(async function* () {
      for (const child of children) yield child
    }),
    isSameEntry: vi.fn(async () => false),
    queryPermission: vi.fn(async () => 'granted' as PermissionState),
    requestPermission: vi.fn(async () => 'granted' as PermissionState),
  } as unknown as FileSystemDirectoryHandle
  return handle
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Library Scan Integration', () => {
  let sourceId: string
  let fakeSource: LibrarySource

  beforeEach(() => {
    sourceId = uuid()
    fakeSource = {
      id: sourceId,
      displayName: 'My Comics',
      handle: {} as FileSystemDirectoryHandle,
      permissionState: 'granted',
      lastScannedAt: null,
      lastSeenAt: null,
      status: 'ready',
      errorCode: null,
    }
    vi.clearAllMocks()
  })

  it('discovers and upserts CBZ and CBT comics in a flat folder', async () => {
    const handle = makeFakeDir('comics', [
      makeFakeFile('issue1.cbz'),
      makeFakeFile('issue2.cbt'),
      makeFakeFile('readme.txt'),
    ])

    await libraryScannerService.scanFolder(sourceId, handle)

    const comics = await libraryComicRepository.getBySourceId(sourceId)
    expect(comics).toHaveLength(2)
    expect(comics.map((c) => c.fileName).sort()).toEqual(['issue1.cbz', 'issue2.cbt'])
  })

  it('recursively finds comics in nested subdirectories', async () => {
    const subDir = makeFakeDir('Volume 1', [
      makeFakeFile('chapter1.cbz'),
      makeFakeFile('chapter2.cbz'),
    ])
    const rootDir = makeFakeDir('library', [
      subDir,
      makeFakeFile('cover.cbz'),
    ])

    await libraryScannerService.scanFolder(sourceId, rootDir)

    const comics = await libraryComicRepository.getBySourceId(sourceId)
    expect(comics).toHaveLength(3)
  })

  it('calls onProgress callback during scan', async () => {
    const handle = makeFakeDir('comics', [
      makeFakeFile('a.cbz'),
      makeFakeFile('b.cbz'),
    ])

    const onProgress = vi.fn()
    await libraryScannerService.scanFolder(sourceId, handle, onProgress)

    expect(onProgress).toHaveBeenCalled()
  })

  it('marks missing comics as unavailable on second scan', async () => {
    // First scan: 2 comics
    const initialDir = makeFakeDir('comics', [
      makeFakeFile('issue1.cbz'),
      makeFakeFile('issue2.cbz'),
    ])
    await libraryScannerService.scanFolder(sourceId, initialDir)

    // Second scan: only 1 comic remains
    const reducedDir = makeFakeDir('comics', [
      makeFakeFile('issue1.cbz'),
    ])
    await libraryScannerService.markMissingComics(sourceId, reducedDir)

    const comics = await libraryComicRepository.getBySourceId(sourceId)
    const missing = comics.filter((c) => c.availability === 'missing')
    expect(missing).toHaveLength(1)
    expect(missing[0].fileName).toBe('issue2.cbz')
  })
})
