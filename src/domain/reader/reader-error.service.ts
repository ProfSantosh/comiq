export type ReaderErrorCode =
  | 'corrupt-archive'
  | 'unsupported-format'
  | 'extraction-failed'
  | 'missing-folder'
  | 'revoked-permission'
  | 'unknown'

export interface ReaderError {
  code: ReaderErrorCode
  message: string
  recoverable: boolean
}

export function normalizeReaderError(err: unknown): ReaderError {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()

  // DOM exceptions by name take precedence
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return { code: 'revoked-permission', message, recoverable: true }
    }
    if (err.name === 'NotFoundError') {
      return { code: 'missing-folder', message, recoverable: true }
    }
  }

  if (
    lower.includes('corrupt') ||
    lower.includes('unreadable') ||
    lower.includes('no readable') ||
    lower.includes('invalid zip') ||
    lower.includes('bad zip') ||
    lower.includes('invalid tar')
  ) {
    return { code: 'corrupt-archive', message, recoverable: false }
  }

  if (lower.includes('permission') || lower.includes('revoked') || lower.includes('denied')) {
    return { code: 'revoked-permission', message, recoverable: true }
  }

  if (lower.includes('not found') || lower.includes('missing')) {
    return { code: 'missing-folder', message, recoverable: true }
  }

  if (lower.includes('unsupported') || lower.includes('format')) {
    return { code: 'unsupported-format', message, recoverable: false }
  }

  if (lower.includes('extract') || lower.includes('extraction failed')) {
    return { code: 'extraction-failed', message, recoverable: true }
  }

  return { code: 'unknown', message, recoverable: true }
}
