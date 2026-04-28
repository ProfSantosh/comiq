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
})
