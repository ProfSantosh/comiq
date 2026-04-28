// Archive extraction worker
// Accepts: ArchiveOpenInput + extracted page requests
// Returns: ArchiveManifest or ExtractedPage via postMessage

import type { ArchiveOpenInput, ExtractPageInput } from '../domain/archive/archive-adapter.types'
import { createArchiveAdapter } from '../domain/archive/archive-adapter-registry'

type ExtractionRequest =
  | { type: 'open'; id: string; input: ArchiveOpenInput }
  | { type: 'extractPage'; id: string; input: ExtractPageInput }
  | { type: 'close'; id: string }

let currentAdapter: ReturnType<typeof createArchiveAdapter> | null = null
let currentManifest: import('../domain/archive/archive-adapter.types').ArchiveManifest | null = null

self.onmessage = async (event: MessageEvent<ExtractionRequest>) => {
  const { type, id } = event.data

  try {
    if (type === 'open') {
      if (currentAdapter) await currentAdapter.close()
      currentAdapter = createArchiveAdapter(event.data.input.format)
      currentManifest = await currentAdapter.open(event.data.input)
      self.postMessage({ type: 'open', id, manifest: currentManifest })
    } else if (type === 'extractPage') {
      if (!currentAdapter || !currentManifest) {
        throw new Error('No archive open. Send an open request first.')
      }
      const page = await currentAdapter.extractPage(event.data.input)
      self.postMessage({ type: 'extractPage', id, page }, { transfer: [page.data] })
    } else if (type === 'close') {
      await currentAdapter?.close()
      currentAdapter = null
      currentManifest = null
      self.postMessage({ type: 'close', id })
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
