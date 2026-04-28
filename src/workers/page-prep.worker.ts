// Page preparation worker
// Accepts: { id: string, data: ArrayBuffer, mimeType: string }
// Returns: PreparedPage via postMessage with transferable

import type { PreparedPage } from '../domain/reader/reader-engine.types'

interface PagePrepRequest {
  id: string
  pageIndex: number
  data: ArrayBuffer
  mimeType: string
}

self.onmessage = async (event: MessageEvent<PagePrepRequest>) => {
  const { id, pageIndex, data, mimeType } = event.data

  try {
    const blob = new Blob([data], { type: mimeType })

    // Decode to get dimensions via createImageBitmap
    let width: number | undefined
    let height: number | undefined
    try {
      const bitmap = await createImageBitmap(blob)
      width = bitmap.width
      height = bitmap.height
      bitmap.close()
    } catch {
      // Dimension detection is best-effort; not fatal
    }

    const preparedPage: PreparedPage = { pageIndex, mimeType, blob, width, height }
    self.postMessage({ id, page: preparedPage })
  } catch (err) {
    self.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
