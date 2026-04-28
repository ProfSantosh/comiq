import { unzipSync, type Unzipped } from 'fflate'
import type {
  ArchiveAdapter,
  ArchiveFormat,
  ArchiveManifest,
  ArchiveOpenInput,
  ArchiveEntryDescriptor,
  ExtractPageInput,
  ExtractedPage,
} from './archive-adapter.types'
import { isImagePath, getMimeType, naturalSort } from './archive-utils'

export class CbzAdapter implements ArchiveAdapter {
  readonly format: ArchiveFormat = 'cbz'

  private _unzipped: Unzipped | null = null
  private _manifest: ArchiveManifest | null = null

  async open(input: ArchiveOpenInput): Promise<ArchiveManifest> {
    const arrayBuffer = await input.source.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)

    let unzipped: Unzipped
    try {
      unzipped = unzipSync(uint8)
    } catch (err) {
      throw new Error(
        `CBZ archive is corrupt or unreadable: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    this._unzipped = unzipped

    const allPaths = Object.keys(unzipped).filter(
      (p) => !p.endsWith('/'), // skip directory entries
    )
    const imagePaths = allPaths.filter(isImagePath).sort(naturalSort)
    const otherPaths = allPaths.filter((p) => !isImagePath(p))

    const warnings: string[] = []
    if (imagePaths.length === 0) {
      throw new Error('CBZ archive contains no readable image pages.')
    }

    const pageEntries: ArchiveEntryDescriptor[] = imagePaths.map((path, idx) => ({
      path,
      pageIndex: idx,
      kind: 'page' as const,
    }))

    const unsupportedEntries: ArchiveEntryDescriptor[] = otherPaths.map((path) => ({
      path,
      pageIndex: null,
      kind: 'unsupported' as const,
    }))

    if (unsupportedEntries.length > 0) {
      warnings.push(`${unsupportedEntries.length} non-image file(s) skipped.`)
    }

    this._manifest = {
      format: 'cbz',
      pageCount: pageEntries.length,
      pageEntries: [...pageEntries, ...unsupportedEntries],
      warnings,
    }

    return this._manifest
  }

  async extractPage(input: ExtractPageInput): Promise<ExtractedPage> {
    if (!this._unzipped) throw new Error('Archive not opened. Call open() first.')

    const entry = input.manifest.pageEntries[input.pageIndex]
    if (!entry || entry.kind !== 'page') {
      throw new Error(`Invalid page index: ${input.pageIndex}`)
    }

    const data = this._unzipped[entry.path]
    if (!data) {
      throw new Error(`Page entry not found in archive: ${entry.path}`)
    }

    return {
      pageIndex: input.pageIndex,
      path: entry.path,
      mimeType: getMimeType(entry.path),
      data: data.buffer as ArrayBuffer,
    }
  }

  async extractCover(manifest: ArchiveManifest): Promise<ExtractedPage | null> {
    if (manifest.pageCount === 0) return null
    return this.extractPage({ manifest, pageIndex: 0 })
  }

  async close(): Promise<void> {
    this._unzipped = null
    this._manifest = null
  }
}
