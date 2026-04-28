import type {
  ReaderEngine,
  ReaderOpenRequest,
  ReaderProgressSnapshot,
  PreparedPage,
  ReaderDisplayMode,
} from './reader-engine.types'
import type { ArchiveManifest } from '../archive/archive-adapter.types'
import { readingProgressRepository, recentLibraryItemRepository } from '../../persistence/reading-progress.repository'
import { quickReadSessionStore } from '../../persistence/quick-read-session.store'
import { v4 as uuid } from 'uuid'

export class ComiqReaderEngine implements ReaderEngine {
  private _request: ReaderOpenRequest | null = null
  private _manifest: ArchiveManifest | null = null
  private _currentPage = 0
  private _displayMode: ReaderDisplayMode = 'page-flip'
  private _pageCache = new Map<number, PreparedPage>()
  private _extractionWorker: Worker | null = null
  private _workerReady: Promise<void> = Promise.resolve()

  async open(request: ReaderOpenRequest): Promise<ReaderProgressSnapshot> {
    this._request = request
    this._manifest = request.archive
    this._currentPage = Math.max(0, request.initialPage)
    this._displayMode = request.preferredDisplayMode

    // Wire extraction worker (unavailable in test/non-browser environments)
    try {
      this._extractionWorker = new Worker(
        new URL('../../workers/extraction.worker.ts', import.meta.url),
        { type: 'module' },
      )

      // Send open request to the worker and wait for acknowledgment before
      // any extractPage calls are made.
      const worker = this._extractionWorker
      this._workerReady = new Promise<void>((resolve, reject) => {
        const openId = uuid()
        const handler = (event: MessageEvent) => {
          if (event.data.id !== openId) return
          worker.removeEventListener('message', handler)
          if (event.data.type === 'error') {
            reject(new Error(event.data.error))
          } else {
            resolve()
          }
        }
        worker.addEventListener('message', handler)
        const src = request.fileSource
        worker.postMessage({
          type: 'open',
          id: openId,
          input: {
            format: request.archive.format,
            fileName: src instanceof File ? src.name : request.archive.format,
            fileSizeBytes: src instanceof File ? src.size : (src as Blob).size,
            source: src,
          },
        })
      })
    } catch {
      // Worker unavailable in test environment — extraction will fail gracefully
      this._extractionWorker = null
      this._workerReady = Promise.resolve()
    }

    // Restore Quick Read session if applicable
    if (request.entryMode === 'quick-read') {
      const session = quickReadSessionStore.get()
      if (session && request.quickReadSessionId && session.sessionId === request.quickReadSessionId) {
        this._currentPage = session.currentPage
      }
    }

    return this.getSnapshot()
  }

  getSnapshot(): ReaderProgressSnapshot {
    if (!this._manifest) throw new Error('Reader engine not open. Call open() first.')
    const pageCount = this._manifest.pageCount
    return {
      currentPage: this._currentPage,
      pageCount,
      displayMode: this._displayMode,
      canAdvance: this._currentPage < pageCount - 1,
      canRetreat: this._currentPage > 0,
    }
  }

  async preparePage(pageIndex: number): Promise<PreparedPage> {
    if (this._pageCache.has(pageIndex)) {
      return this._pageCache.get(pageIndex)!
    }

    if (!this._extractionWorker || !this._manifest) {
      throw new Error('Reader engine not open. Call open() first.')
    }

    // Ensure the worker has finished opening the archive before extracting
    await this._workerReady

    return new Promise<PreparedPage>((resolve, reject) => {
      const id = uuid()
      const entry = this._manifest!.pageEntries.find((e) => e.pageIndex === pageIndex)
      if (!entry) {
        reject(new Error(`Page index out of range: ${pageIndex}`))
        return
      }

      const handler = (event: MessageEvent) => {
        if (event.data.id !== id) return

        this._extractionWorker!.removeEventListener('message', handler)

        if (event.data.error) {
          reject(new Error(event.data.error))
          return
        }

        const extracted = event.data.page
        const preparedPage: PreparedPage = {
          pageIndex,
          mimeType: extracted.mimeType,
          blob: new Blob([extracted.data], { type: extracted.mimeType }),
        }
        this._pageCache.set(pageIndex, preparedPage)
        resolve(preparedPage)
      }

      this._extractionWorker!.addEventListener('message', handler)
      this._extractionWorker!.postMessage(
        { type: 'extractPage', id, input: { manifest: this._manifest!, pageIndex } },
      )
    })
  }

  async goToPage(pageIndex: number): Promise<ReaderProgressSnapshot> {
    const pageCount = this._manifest?.pageCount ?? 0
    this._currentPage = Math.max(0, Math.min(pageIndex, pageCount - 1))
    return this.getSnapshot()
  }

  async nextPage(): Promise<ReaderProgressSnapshot> {
    return this.goToPage(this._currentPage + 1)
  }

  async previousPage(): Promise<ReaderProgressSnapshot> {
    return this.goToPage(this._currentPage - 1)
  }

  async setDisplayMode(mode: ReaderDisplayMode): Promise<ReaderProgressSnapshot> {
    this._displayMode = mode
    // Progress is page-based and unchanged by mode switch
    return this.getSnapshot()
  }

  async persistProgress(): Promise<void> {
    if (!this._request || !this._manifest) return

    const now = new Date().toISOString()

    if (this._request.entryMode === 'library' && this._request.comicId) {
      await readingProgressRepository.upsert({
        comicId: this._request.comicId,
        currentPage: this._currentPage,
        pageCountSnapshot: this._manifest.pageCount,
        lastReadAt: now,
        lastReadMode: this._displayMode,
        completed: this._currentPage >= this._manifest.pageCount - 1,
      })
      await recentLibraryItemRepository.upsert(this._request.comicId)
    } else if (this._request.entryMode === 'quick-read') {
      quickReadSessionStore.update({
        currentPage: this._currentPage,
        pageCountSnapshot: this._manifest.pageCount,
        updatedAt: now,
      })
    }
  }

  async dispose(): Promise<void> {
    try {
      await this.persistProgress()
    } catch {
      // best-effort
    }
    this._extractionWorker?.postMessage({ type: 'close', id: uuid() })
    this._extractionWorker?.terminate()
    this._extractionWorker = null
    this._pageCache.clear()
    this._request = null
    this._manifest = null
  }
}
