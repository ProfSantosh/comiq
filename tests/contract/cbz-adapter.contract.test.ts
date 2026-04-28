import { describe, it, expect, beforeEach } from 'vitest'
import { CbzAdapter } from '../../src/domain/archive/cbz-adapter'
import { makeCbzBlob, TINY_PNG, CORRUPT_ZIP } from '../fixtures/archive-fixtures'

describe('CBZ Adapter Contract', () => {
  let adapter: CbzAdapter

  beforeEach(() => {
    adapter = new CbzAdapter()
  })

  describe('open()', () => {
    it('returns a manifest with correct page count for a valid CBZ', async () => {
      const blob = makeCbzBlob([
        { name: 'page001.jpg', content: TINY_PNG },
        { name: 'page002.jpg', content: TINY_PNG },
        { name: 'page003.png', content: TINY_PNG },
      ])

      const manifest = await adapter.open({
        format: 'cbz',
        fileName: 'test.cbz',
        fileSizeBytes: blob.size,
        source: blob,
      })

      expect(manifest.format).toBe('cbz')
      expect(manifest.pageCount).toBe(3)
      expect(manifest.pageEntries.filter((e) => e.kind === 'page')).toHaveLength(3)
    })

    it('returns page entries in reader order (natural sort)', async () => {
      const blob = makeCbzBlob([
        { name: 'page010.jpg', content: TINY_PNG },
        { name: 'page002.jpg', content: TINY_PNG },
        { name: 'page001.jpg', content: TINY_PNG },
      ])

      const manifest = await adapter.open({
        format: 'cbz',
        fileName: 'test.cbz',
        fileSizeBytes: blob.size,
        source: blob,
      })

      const pageEntries = manifest.pageEntries.filter((e) => e.kind === 'page')
      expect(pageEntries[0].path).toContain('001')
      expect(pageEntries[1].path).toContain('002')
      expect(pageEntries[2].path).toContain('010')
    })

    it('skips unsupported files without failing', async () => {
      const blob = makeCbzBlob([
        { name: 'page001.jpg', content: TINY_PNG },
        { name: 'ComicInfo.xml', content: new Uint8Array([0x3c, 0x2f, 0x3e]) },
        { name: 'page002.jpg', content: TINY_PNG },
      ])

      const manifest = await adapter.open({
        format: 'cbz',
        fileName: 'test.cbz',
        fileSizeBytes: blob.size,
        source: blob,
      })

      expect(manifest.pageCount).toBe(2)
      const unsupported = manifest.pageEntries.filter((e) => e.kind === 'unsupported')
      expect(unsupported).toHaveLength(1)
      expect(manifest.warnings.length).toBeGreaterThan(0)
    })

    it('throws a user-safe error for corrupt archives', async () => {
      const blob = new Blob([CORRUPT_ZIP], { type: 'application/zip' })

      await expect(
        adapter.open({
          format: 'cbz',
          fileName: 'corrupt.cbz',
          fileSizeBytes: blob.size,
          source: blob,
        }),
      ).rejects.toThrow(/corrupt|unreadable/i)
    })

    it('throws if archive has no readable image pages', async () => {
      const blob = makeCbzBlob([
        { name: 'readme.txt', content: new Uint8Array([0x74, 0x65, 0x78, 0x74]) },
      ])

      await expect(
        adapter.open({
          format: 'cbz',
          fileName: 'noImages.cbz',
          fileSizeBytes: blob.size,
          source: blob,
        }),
      ).rejects.toThrow(/no readable/i)
    })
  })

  describe('extractPage()', () => {
    it('extracts a page by index', async () => {
      const blob = makeCbzBlob([
        { name: 'page001.jpg', content: TINY_PNG },
        { name: 'page002.png', content: TINY_PNG },
      ])

      const manifest = await adapter.open({
        format: 'cbz',
        fileName: 'test.cbz',
        fileSizeBytes: blob.size,
        source: blob,
      })

      const page = await adapter.extractPage({ manifest, pageIndex: 0 })
      expect(page.pageIndex).toBe(0)
      expect(page.data).toBeInstanceOf(ArrayBuffer)
      expect(page.data.byteLength).toBeGreaterThan(0)
    })

    it('throws for an out-of-range page index', async () => {
      const blob = makeCbzBlob([{ name: 'page001.jpg', content: TINY_PNG }])
      const manifest = await adapter.open({
        format: 'cbz',
        fileName: 'test.cbz',
        fileSizeBytes: blob.size,
        source: blob,
      })
      await expect(adapter.extractPage({ manifest, pageIndex: 99 })).rejects.toThrow(/invalid page index/i)
    })

    it('throws when entry kind is not "page"', async () => {
      const blob = makeCbzBlob([
        { name: 'page001.jpg', content: TINY_PNG },
        { name: 'ComicInfo.xml', content: new Uint8Array([0x3c, 0x2f, 0x3e]) },
      ])
      const manifest = await adapter.open({
        format: 'cbz',
        fileName: 'test.cbz',
        fileSizeBytes: blob.size,
        source: blob,
      })
      // The unsupported entry is appended after page entries; craft a manifest pointing at it
      const unsupportedEntry = manifest.pageEntries.find((e) => e.kind === 'unsupported')!
      const manipulated = { ...manifest, pageEntries: [unsupportedEntry] }
      await expect(adapter.extractPage({ manifest: manipulated, pageIndex: 0 })).rejects.toThrow(
        /invalid page index/i,
      )
    })
  })

  describe('extractCover()', () => {
    it('returns first page as cover', async () => {
      const blob = makeCbzBlob([
        { name: 'cover.jpg', content: TINY_PNG },
        { name: 'page002.jpg', content: TINY_PNG },
      ])

      const manifest = await adapter.open({
        format: 'cbz',
        fileName: 'test.cbz',
        fileSizeBytes: blob.size,
        source: blob,
      })

      const cover = await adapter.extractCover(manifest)
      expect(cover).not.toBeNull()
      expect(cover!.pageIndex).toBe(0)
    })

    it('returns null for empty manifest', async () => {
      // We cannot create an empty manifest via open() (it throws), so test directly
      const fakeManifest = { format: 'cbz' as const, pageCount: 0, pageEntries: [], warnings: [] }
      const cover = await adapter.extractCover(fakeManifest)
      expect(cover).toBeNull()
    })
  })

  describe('close()', () => {
    it('resets adapter state after close', async () => {
      const blob = makeCbzBlob([{ name: 'page001.jpg', content: TINY_PNG }])
      const manifest = await adapter.open({
        format: 'cbz',
        fileName: 'test.cbz',
        fileSizeBytes: blob.size,
        source: blob,
      })
      await adapter.close()
      await expect(adapter.extractPage({ manifest, pageIndex: 0 })).rejects.toThrow(/not opened/i)
    })
  })
})
