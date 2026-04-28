import { describe, it, expect, beforeEach } from 'vitest'
import { CbtAdapter } from '../../src/domain/archive/cbt-adapter'

// Build a minimal POSIX ustar TAR buffer in memory
function buildTar(entries: Array<{ name: string; content: Uint8Array }>): Blob {
  const BLOCK = 512
  const chunks: Uint8Array[] = []

  for (const { name, content } of entries) {
    const header = new Uint8Array(BLOCK)
    const enc = new TextEncoder()

    // name (100 bytes)
    enc.encodeInto(name.slice(0, 99), header.subarray(0, 100))
    // mode
    enc.encodeInto('0000644\0', header.subarray(100, 108))
    // uid, gid
    enc.encodeInto('0000000\0', header.subarray(108, 116))
    enc.encodeInto('0000000\0', header.subarray(116, 124))
    // size (octal, 12 bytes)
    const sizeOctal = content.byteLength.toString(8).padStart(11, '0') + ' '
    enc.encodeInto(sizeOctal, header.subarray(124, 136))
    // mtime
    enc.encodeInto('00000000000\0', header.subarray(136, 148))
    // typeflag: '0' = regular file
    header[156] = 0x30
    // magic
    enc.encodeInto('ustar\0', header.subarray(257, 263))

    // Compute checksum
    header[148] = 0x20
    header[149] = 0x20
    header[150] = 0x20
    header[151] = 0x20
    header[152] = 0x20
    header[153] = 0x20
    header[154] = 0x20
    header[155] = 0x20
    let checksum = 0
    for (const b of header) checksum += b
    enc.encodeInto(checksum.toString(8).padStart(6, '0') + '\0 ', header.subarray(148, 156))

    chunks.push(header)

    // File data padded to block boundary
    const padded = Math.ceil(content.byteLength / BLOCK) * BLOCK
    const dataPadded = new Uint8Array(padded)
    dataPadded.set(content)
    chunks.push(dataPadded)
  }

  // Two zero-filled end blocks
  chunks.push(new Uint8Array(BLOCK))
  chunks.push(new Uint8Array(BLOCK))

  const total = chunks.reduce((s, c) => s + c.byteLength, 0)
  const result = new Uint8Array(total)
  let off = 0
  for (const chunk of chunks) {
    result.set(chunk, off)
    off += chunk.byteLength
  }

  return new Blob([result], { type: 'application/x-tar' })
}

const TINY_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  // Minimal IHDR chunk (1x1 px)
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
])

describe('CBT Adapter Contract', () => {
  let adapter: CbtAdapter

  beforeEach(() => {
    adapter = new CbtAdapter()
  })

  describe('open()', () => {
    it('returns correct page count for a valid CBT', async () => {
      const blob = buildTar([
        { name: 'page001.jpg', content: TINY_PNG },
        { name: 'page002.png', content: TINY_PNG },
      ])

      const manifest = await adapter.open({
        format: 'cbt',
        fileName: 'test.cbt',
        fileSizeBytes: blob.size,
        source: blob,
      })

      expect(manifest.format).toBe('cbt')
      expect(manifest.pageCount).toBe(2)
    })

    it('returns page entries in natural sort order', async () => {
      const blob = buildTar([
        { name: 'page010.jpg', content: TINY_PNG },
        { name: 'page002.jpg', content: TINY_PNG },
        { name: 'page001.jpg', content: TINY_PNG },
      ])

      const manifest = await adapter.open({
        format: 'cbt',
        fileName: 'test.cbt',
        fileSizeBytes: blob.size,
        source: blob,
      })

      const pages = manifest.pageEntries.filter((e) => e.kind === 'page')
      expect(pages[0].path).toContain('001')
      expect(pages[2].path).toContain('010')
    })

    it('skips unsupported files (e.g., .xml metadata)', async () => {
      const blob = buildTar([
        { name: 'page001.jpg', content: TINY_PNG },
        { name: 'ComicInfo.xml', content: new Uint8Array([0x3c, 0x2f, 0x3e]) },
      ])

      const manifest = await adapter.open({
        format: 'cbt',
        fileName: 'test.cbt',
        fileSizeBytes: blob.size,
        source: blob,
      })

      expect(manifest.pageCount).toBe(1)
      const unsupported = manifest.pageEntries.filter((e) => e.kind === 'unsupported')
      expect(unsupported).toHaveLength(1)
    })

    it('throws if archive has no readable pages', async () => {
      const blob = buildTar([
        { name: 'readme.txt', content: new Uint8Array([0x68, 0x69]) },
      ])

      await expect(
        adapter.open({
          format: 'cbt',
          fileName: 'empty.cbt',
          fileSizeBytes: blob.size,
          source: blob,
        }),
      ).rejects.toThrow(/no readable/i)
    })
  })

  describe('extractPage()', () => {
    it('extracts correct data for a page index', async () => {
      const blob = buildTar([
        { name: 'page001.jpg', content: TINY_PNG },
        { name: 'page002.jpg', content: TINY_PNG },
      ])

      const manifest = await adapter.open({
        format: 'cbt',
        fileName: 'test.cbt',
        fileSizeBytes: blob.size,
        source: blob,
      })

      const page = await adapter.extractPage({ manifest, pageIndex: 0 })
      expect(page.pageIndex).toBe(0)
      expect(page.data.byteLength).toBeGreaterThan(0)
    })
  })

  describe('extractCover()', () => {
    it('returns first image as cover', async () => {
      const blob = buildTar([
        { name: 'cover.jpg', content: TINY_PNG },
        { name: 'page002.jpg', content: TINY_PNG },
      ])
      const manifest = await adapter.open({
        format: 'cbt',
        fileName: 'test.cbt',
        fileSizeBytes: blob.size,
        source: blob,
      })
      const cover = await adapter.extractCover(manifest)
      expect(cover).not.toBeNull()
      expect(cover!.pageIndex).toBe(0)
    })
  })
})
