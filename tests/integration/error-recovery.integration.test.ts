import { describe, it, expect } from 'vitest'
import { normalizeReaderError } from '../../src/domain/reader/reader-error.service'

describe('Error Recovery Integration', () => {
  describe('normalizeReaderError()', () => {
    it('returns corrupt-archive for fflate decode errors', () => {
      const err = new Error('invalid zip')
      const result = normalizeReaderError(err)
      expect(result.code).toBe('corrupt-archive')
      expect(result.recoverable).toBe(false)
    })

    it('returns revoked-permission for NotAllowedError', () => {
      const err = new DOMException('Permission denied', 'NotAllowedError')
      const result = normalizeReaderError(err)
      expect(result.code).toBe('revoked-permission')
      expect(result.recoverable).toBe(true)
    })

    it('returns missing-folder for NotFoundError', () => {
      const err = new DOMException('File not found', 'NotFoundError')
      const result = normalizeReaderError(err)
      expect(result.code).toBe('missing-folder')
      expect(result.recoverable).toBe(true)
    })

    it('returns unsupported-format when message contains "unsupported"', () => {
      const err = new Error('Unsupported archive format: .rar')
      const result = normalizeReaderError(err)
      expect(result.code).toBe('unsupported-format')
      expect(result.recoverable).toBe(false)
    })

    it('returns unknown for unrecognized errors', () => {
      const err = new Error('some random failure')
      const result = normalizeReaderError(err)
      expect(result.code).toBe('unknown')
    })

    it('handles non-Error values gracefully', () => {
      const result = normalizeReaderError('string error')
      expect(result.code).toBe('unknown')
      expect(result.message).toBeTruthy()
    })

    it('returns extraction-failed for page extraction errors', () => {
      const err = new Error('extraction failed at page 3')
      const result = normalizeReaderError(err)
      expect(result.code).toBe('extraction-failed')
    })
  })
})
