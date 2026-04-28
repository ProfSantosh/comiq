import { strToU8, zipSync } from 'fflate'

/**
 * Creates a minimal in-memory CBZ archive containing the given image entries.
 * @param entries Array of { name, content } where content is a Uint8Array
 */
export function makeCbzBlob(entries: Array<{ name: string; content: Uint8Array }>): Blob {
  const files: Record<string, Uint8Array> = {}
  for (const { name, content } of entries) {
    files[name] = content
  }
  const zipped = zipSync(files)
  return new Blob([zipped], { type: 'application/zip' })
}

/** A tiny 1×1 PNG pixel as Uint8Array */
export const TINY_PNG = strToU8(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  ),
  true,
)

/** A minimal broken ZIP (not valid) */
export const CORRUPT_ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00])
