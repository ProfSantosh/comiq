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

interface TarEntry {
  name: string
  buffer: ArrayBuffer
}

// Minimal TAR parser (POSIX ustar format)
function parseTar(buffer: ArrayBuffer): TarEntry[] {
  const BLOCK = 512
  const bytes = new Uint8Array(buffer)
  const entries: TarEntry[] = []
  let offset = 0

  while (offset + BLOCK <= buffer.byteLength) {
    // Check for end-of-archive (two zero-filled blocks)
    let allZero = true
    for (let i = 0; i < BLOCK && allZero; i++) {
      if (bytes[offset + i] !== 0) allZero = false
    }
    if (allZero) break

    // Read name (100 bytes at offset 0)
    let name = ''
    for (let i = 0; i < 100; i++) {
      const c = bytes[offset + i]
      if (c === 0) break
      name += String.fromCharCode(c)
    }

    // Read prefix (155 bytes at offset 345) for ustar
    let prefix = ''
    for (let i = 0; i < 155; i++) {
      const c = bytes[offset + 345 + i]
      if (c === 0) break
      prefix += String.fromCharCode(c)
    }

    const fullName = prefix ? `${prefix}/${name}` : name

    // File size: octal at offset 124, 12 bytes
    let sizeStr = ''
    for (let i = 0; i < 12; i++) {
      const c = bytes[offset + 124 + i]
      if (c === 0 || c === 0x20) break
      sizeStr += String.fromCharCode(c)
    }
    const fileSize = parseInt(sizeStr, 8) || 0

    // Typeflag at offset 156
    const typeflag = String.fromCharCode(bytes[offset + 156])

    offset += BLOCK // move past header

    if ((typeflag === '0' || typeflag === '') && fileSize > 0 && !fullName.endsWith('/')) {
      const data = buffer.slice(offset, offset + fileSize)
      entries.push({ name: fullName, buffer: data })
    }

    // Skip to next block boundary
    offset += Math.ceil(fileSize / BLOCK) * BLOCK

    // Detect overflow
    if (offset > buffer.byteLength) break
  }

  return entries
}

export class CbtAdapter implements ArchiveAdapter {
  readonly format: ArchiveFormat = 'cbt'

  private _entries: TarEntry[] | null = null
  private _manifest: ArchiveManifest | null = null

  async open(input: ArchiveOpenInput): Promise<ArchiveManifest> {
    const arrayBuffer = await input.source.arrayBuffer()

    let entries: TarEntry[]
    try {
      entries = parseTar(arrayBuffer)
    } catch (err) {
      throw new Error(
        `CBT archive is corrupt or unreadable: ${err instanceof Error ? err.message : String(err)}`,
      )
    }

    this._entries = entries

    const imageEntries = entries.filter((e) => isImagePath(e.name)).sort((a, b) => naturalSort(a.name, b.name))
    const otherEntries = entries.filter((e) => !isImagePath(e.name))

    const warnings: string[] = []
    if (imageEntries.length === 0) {
      throw new Error('CBT archive contains no readable image pages.')
    }

    const pageEntries: ArchiveEntryDescriptor[] = imageEntries.map((e, idx) => ({
      path: e.name,
      pageIndex: idx,
      kind: 'page' as const,
    }))

    const unsupported: ArchiveEntryDescriptor[] = otherEntries.map((e) => ({
      path: e.name,
      pageIndex: null,
      kind: 'unsupported' as const,
    }))

    if (unsupported.length > 0) {
      warnings.push(`${unsupported.length} non-image file(s) skipped.`)
    }

    this._manifest = {
      format: 'cbt',
      pageCount: pageEntries.length,
      pageEntries: [...pageEntries, ...unsupported],
      warnings,
    }

    return this._manifest
  }

  async extractPage(input: ExtractPageInput): Promise<ExtractedPage> {
    if (!this._entries) throw new Error('Archive not opened. Call open() first.')

    const entry = input.manifest.pageEntries[input.pageIndex]
    if (!entry || entry.kind !== 'page') {
      throw new Error(`Invalid page index: ${input.pageIndex}`)
    }

    const tarEntry = this._entries.find((e) => e.name === entry.path)
    if (!tarEntry) {
      throw new Error(`Page entry not found in archive: ${entry.path}`)
    }

    return {
      pageIndex: input.pageIndex,
      path: entry.path,
      mimeType: getMimeType(entry.path),
      data: tarEntry.buffer,
    }
  }

  async extractCover(manifest: ArchiveManifest): Promise<ExtractedPage | null> {
    if (manifest.pageCount === 0) return null
    return this.extractPage({ manifest, pageIndex: 0 })
  }

  async close(): Promise<void> {
    this._entries = null
    this._manifest = null
  }
}
