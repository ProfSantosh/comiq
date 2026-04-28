import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CbrAdapter } from '../../src/domain/archive/cbr-adapter'

const TINY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// Mock the unrar.js WASM module
vi.mock('unrar.js', () => {
  return {
    default: {
      open: vi.fn(async (_buffer: ArrayBuffer) => ({
        getFilenames: () => ['page001.jpg', 'page002.png', 'ComicInfo.xml'],
        extractFile: vi.fn(async (name: string) => {
          if (name.endsWith('.xml')) return new Uint8Array([0x3c, 0x2f, 0x3e])
          return TINY_PNG
        }),
        close: vi.fn(),
      })),
    },
  }
})

describe('CBR Adapter Contract', () => {
  let adapter: CbrAdapter

  beforeEach(() => {
    adapter = new CbrAdapter()
  })

  describe('open()', () => {
    it('returns correct page count using WASM loader', async () => {
      const blob = new Blob([new Uint8Array([0x52, 0x61, 0x72, 0x21])], {
        type: 'application/x-rar-compressed',
      })

      const manifest = await adapter.open({
        format: 'cbr',
        fileName: 'test.cbr',
        fileSizeBytes: blob.size,
        source: blob,
      })

      expect(manifest.format).toBe('cbr')
      expect(manifest.pageCount).toBe(2) // 2 image files, xml filtered
    })

    it('skips unsupported files without failing', async () => {
      const blob = new Blob([new Uint8Array(4)], { type: 'application/x-rar-compressed' })

      const manifest = await adapter.open({
        format: 'cbr',
        fileName: 'test.cbr',
        fileSizeBytes: blob.size,
        source: blob,
      })

      const unsupported = manifest.pageEntries.filter((e) => e.kind === 'unsupported')
      expect(unsupported).toHaveLength(1)
      expect(manifest.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('extractPage()', () => {
    it('returns extracted page data', async () => {
      const blob = new Blob([new Uint8Array(4)])

      const manifest = await adapter.open({
        format: 'cbr',
        fileName: 'test.cbr',
        fileSizeBytes: blob.size,
        source: blob,
      })

      const page = await adapter.extractPage({ manifest, pageIndex: 0 })
      expect(page.pageIndex).toBe(0)
      expect(page.data.byteLength).toBeGreaterThan(0)
    })
  })

  describe('extractCover()', () => {
    it('returns first page as cover', async () => {
      const blob = new Blob([new Uint8Array(4)])
      const manifest = await adapter.open({
        format: 'cbr',
        fileName: 'test.cbr',
        fileSizeBytes: blob.size,
        source: blob,
      })

      const cover = await adapter.extractCover(manifest)
      expect(cover).not.toBeNull()
      expect(cover!.pageIndex).toBe(0)
    })

    it('returns null for empty manifest (pageCount === 0)', async () => {
      const fakeManifest = { format: 'cbr' as const, pageCount: 0, pageEntries: [], warnings: [] }
      const cover = await adapter.extractCover(fakeManifest)
      expect(cover).toBeNull()
    })
  })

  describe('extractPage() — error paths (pre-open)', () => {
    it('throws for an out-of-range page index', async () => {
      const blob = new Blob([new Uint8Array(4)])
      const manifest = await adapter.open({
        format: 'cbr',
        fileName: 'test.cbr',
        fileSizeBytes: blob.size,
        source: blob,
      })
      await expect(adapter.extractPage({ manifest, pageIndex: 99 })).rejects.toThrow(
        /invalid page index/i,
      )
    })
  })

  describe('close()', () => {
    it('calls close on the underlying archive', async () => {
      const blob = new Blob([new Uint8Array(4)])
      await adapter.open({
        format: 'cbr',
        fileName: 'test.cbr',
        fileSizeBytes: blob.size,
        source: blob,
      })
      // Should not throw
      await expect(adapter.close()).resolves.toBeUndefined()
    })
  })

  describe('error paths', () => {
    // These tests temporarily override the top-level vi.mock to exercise
    // branches that require failure conditions or unusual archive contents.

    it('throws when archive contains no image files', async () => {
      // Temporarily replace open to return only non-image entries
      const { default: unrar } = await import('unrar.js')
      vi.mocked(unrar.open).mockResolvedValueOnce({
        getFilenames: () => ['ComicInfo.xml', 'metadata.json'],
        extractFile: vi.fn(async () => new Uint8Array(0)),
        close: vi.fn(),
      })

      const freshAdapter = new CbrAdapter()
      const blob = new Blob([new Uint8Array(4)])
      await expect(
        freshAdapter.open({ format: 'cbr', fileName: 'empty.cbr', fileSizeBytes: 4, source: blob }),
      ).rejects.toThrow(/no readable image pages/i)
    })

    it('throws when loader.open rejects with a corrupt archive error', async () => {
      const { default: unrar } = await import('unrar.js')
      vi.mocked(unrar.open).mockRejectedValueOnce(new Error('invalid signature'))

      const freshAdapter = new CbrAdapter()
      const blob = new Blob([new Uint8Array(4)])
      await expect(
        freshAdapter.open({ format: 'cbr', fileName: 'corrupt.cbr', fileSizeBytes: 4, source: blob }),
      ).rejects.toThrow(/corrupt or unreadable/i)
    })

    it('throws on extractPage when archive has not been opened', async () => {
      const unopenedAdapter = new CbrAdapter()
      const fakeManifest = {
        format: 'cbr' as const,
        pageCount: 1,
        pageEntries: [{ path: 'page1.jpg', pageIndex: 0, kind: 'page' as const }],
        warnings: [],
      }
      await expect(
        unopenedAdapter.extractPage({ manifest: fakeManifest, pageIndex: 0 }),
      ).rejects.toThrow(/not opened/i)
    })

    it('throws on extractPage when extractFile rejects', async () => {
      const { default: unrar } = await import('unrar.js')
      const failExtract = vi.fn(async () => {
        throw new Error('read error')
      })
      vi.mocked(unrar.open).mockResolvedValueOnce({
        getFilenames: () => ['page1.jpg'],
        extractFile: failExtract,
        close: vi.fn(),
      })

      const freshAdapter = new CbrAdapter()
      const blob = new Blob([new Uint8Array(4)])
      const manifest = await freshAdapter.open({
        format: 'cbr',
        fileName: 'fail.cbr',
        fileSizeBytes: 4,
        source: blob,
      })
      await expect(freshAdapter.extractPage({ manifest, pageIndex: 0 })).rejects.toThrow(
        /failed to extract page/i,
      )
    })
  })
})


