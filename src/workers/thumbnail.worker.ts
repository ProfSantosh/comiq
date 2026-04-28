// Thumbnail generation worker
// Accepts: { pageData: ArrayBuffer, mimeType: string, targetWidth: number }
// Returns: { blob: Blob, width: number, height: number } via postMessage

interface ThumbnailRequest {
  pageData: ArrayBuffer
  mimeType: string
  targetWidth: number
}

interface ThumbnailResponse {
  blob: Blob
  width: number
  height: number
  error?: never
}

interface ThumbnailErrorResponse {
  error: string
  blob?: never
}

self.onmessage = async (event: MessageEvent<ThumbnailRequest>) => {
  const { pageData, mimeType, targetWidth } = event.data

  try {
    const blob = new Blob([pageData], { type: mimeType })
    const bitmap = await createImageBitmap(blob)

    const aspect = bitmap.height / bitmap.width
    const width = targetWidth
    const height = Math.round(width * aspect)

    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable')

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const resultBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 })

    const response: ThumbnailResponse = { blob: resultBlob, width, height }
    self.postMessage(response)
  } catch (err) {
    const response: ThumbnailErrorResponse = {
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(response)
  }
}
