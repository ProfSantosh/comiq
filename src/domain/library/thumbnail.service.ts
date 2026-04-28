import { v4 as uuid } from 'uuid'
import { thumbnailRepository } from '../../persistence/thumbnail.repository'
import { libraryComicRepository } from '../../persistence/library-comic.repository'

const THUMBNAIL_WIDTH = 180

export const thumbnailService = {
  async generateAndStore(comicId: string, pageData: ArrayBuffer, mimeType: string): Promise<void> {
    const worker = new Worker(
      new URL('../../workers/thumbnail.worker.ts', import.meta.url),
      { type: 'module' },
    )

    return new Promise<void>((resolve) => {
      worker.onmessage = async (event: MessageEvent) => {
        const result = event.data as
          | { blob: Blob; width: number; height: number }
          | { error: string }

        if ('error' in result) {
          await thumbnailRepository.markFailed(comicId, result.error)
        } else {
          await thumbnailRepository.save({
            id: uuid(),
            comicId,
            blob: result.blob,
            mimeType: 'image/webp',
            width: result.width,
            height: result.height,
            generatedAt: new Date().toISOString(),
            sourcePage: 0,
            status: 'ready',
            failureReason: null,
          })
          // Update comic's coverThumbnailId via the record we just saved
          const saved = await thumbnailRepository.getByComicId(comicId)
          if (saved) {
            await libraryComicRepository.upsert(
              Object.assign(
                {},
                await libraryComicRepository.getById(comicId),
                { coverThumbnailId: saved.id },
              ) as Parameters<typeof libraryComicRepository.upsert>[0],
            )
          }
        }

        worker.terminate()
        resolve()
      }

      worker.onerror = async (err) => {
        await thumbnailRepository.markFailed(comicId, err.message)
        worker.terminate()
        resolve()
      }

      worker.postMessage({ pageData, mimeType, targetWidth: THUMBNAIL_WIDTH }, [pageData])
    })
  },
}
