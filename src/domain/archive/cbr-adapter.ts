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

// Type shim for the unrar.js / libarchive WASM adapter
// The actual WASM package may vary; this shim is intentionally thin
interface RarArchive {
  getFilenames(): string[]
  extractFile(name: string): Promise<Uint8Array>
  close(): void
}

type RarLoader = {
  open(buffer: ArrayBuffer): Promise<RarArchive>
}

async function getRarLoader(): Promise<RarLoader> {
  // Dynamic import to allow tree-shaking and late WASM initialisation
  // Replace 'unrar.js' with the actual installed package name if different
  try {
    const mod = await import(/* @vite-ignore */ 'unrar.js')
    const loader = mod.default ?? mod
    return loader as RarLoader
  } catch {
    throw new Error(
      'RAR WASM module could not be loaded. Ensure the unrar.js package is installed.',
    )
  }
}

export class CbrAdapter implements ArchiveAdapter {
  readonly format: ArchiveFormat = 'cbr'

  private _archive: RarArchive | null = null
  private _manifest: ArchiveManifest | null = null

  async open(input: ArchiveOpenInput): Promise<ArchiveManifest> {
    const arrayBuffer = await input.source.arrayBuffer()

    let loader: RarLoader
    try {
      loader = await getRarLoader()
    } catch (err) {
      throw new Error(
        `CBR support unavailable: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    let archive: RarArchive
    try {
      archive = await loader.open(arrayBuffer)
    } catch (err) {
      throw new Error(
        `CBR archive is corrupt or unreadable: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    this._archive = archive

    const allNames = archive.getFilenames()
    const imageNames = allNames.filter(isImagePath).sort(naturalSort)
    const otherNames = allNames.filter((n) => !isImagePath(n))

    const warnings: string[] = []
    if (imageNames.length === 0) {
      throw new Error('CBR archive contains no readable image pages.')
    }

    const pageEntries: ArchiveEntryDescriptor[] = imageNames.map((name, idx) => ({
      path: name,
      pageIndex: idx,
      kind: 'page' as const,
    }))

    const unsupported: ArchiveEntryDescriptor[] = otherNames.map((name) => ({
      path: name,
      pageIndex: null,
      kind: 'unsupported' as const,
    }))

    if (unsupported.length > 0) {
      warnings.push(`${unsupported.length} non-image file(s) skipped.`)
    }

    this._manifest = {
      format: 'cbr',
      pageCount: pageEntries.length,
      pageEntries: [...pageEntries, ...unsupported],
      warnings,
    }

    return this._manifest
  }

  async extractPage(input: ExtractPageInput): Promise<ExtractedPage> {
    if (!this._archive) throw new Error('Archive not opened. Call open() first.')

    const entry = input.manifest.pageEntries[input.pageIndex]
    if (!entry || entry.kind !== 'page') {
      throw new Error(`Invalid page index: ${input.pageIndex}`)
    }

    let uint8: Uint8Array
    try {
      uint8 = await this._archive.extractFile(entry.path)
    } catch (err) {
      throw new Error(
        `Failed to extract page ${input.pageIndex}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    return {
      pageIndex: input.pageIndex,
      path: entry.path,
      mimeType: getMimeType(entry.path),
      data: uint8.buffer as ArrayBuffer,
    }
  }

  async extractCover(manifest: ArchiveManifest): Promise<ExtractedPage | null> {
    if (manifest.pageCount === 0) return null
    return this.extractPage({ manifest, pageIndex: 0 })
  }

  async close(): Promise<void> {
    this._archive?.close()
    this._archive = null
    this._manifest = null
  }
}
