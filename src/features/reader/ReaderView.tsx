import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ComiqReaderEngine } from '../../domain/reader/reader-engine'
import type { PreparedPage, ReaderProgressSnapshot } from '../../domain/reader/reader-engine.types'
import { libraryComicRepository } from '../../persistence/library-comic.repository'
import { readingProgressRepository } from '../../persistence/reading-progress.repository'
import { readerPreferenceRepository } from '../../persistence/reader-preference.repository'
import { createArchiveAdapter, getFormatFromExtension } from '../../domain/archive/archive-adapter-registry'
import { librarySourceRepository } from '../../persistence/library-source.repository'
import { normalizeReaderError } from '../../domain/reader/reader-error.service'
import ErrorRecoveryCard from '../../components/ErrorRecoveryCard'
import ReaderControls from './ReaderControls'
import PageFlipReader from './PageFlipReader'

export default function ReaderView() {
  const { comicId } = useParams<{ comicId: string }>()
  const navigate = useNavigate()

  const engineRef = useRef<ComiqReaderEngine | null>(null)
  const [snapshot, setSnapshot] = useState<ReaderProgressSnapshot | null>(null)
  const [currentPage, setCurrentPage] = useState<PreparedPage | null>(null)
  const [rotation, setRotation] = useState(0) // session-only, not persisted (FR-028)
  const [error, setError] = useState<ReturnType<typeof normalizeReaderError> | null>(null)

  useEffect(() => {
    if (!comicId) return
    let cancelled = false

    async function openComic() {
      try {
        const comic = await libraryComicRepository.getById(comicId!)
        if (!comic) throw new Error('Comic not found.')

        const source = await librarySourceRepository.getById(comic.sourceId)
        if (!source) throw new Error('Library source not found.')

        const hasPermission = await source.handle.queryPermission({ mode: 'read' })
        if (hasPermission !== 'granted') {
          const result = await source.handle.requestPermission({ mode: 'read' })
          if (result !== 'granted') throw new Error('Permission revoked.')
        }

        // Locate file in directory handle
        const pathParts = comic.relativePath.split('/')
        let current: FileSystemDirectoryHandle | FileSystemFileHandle = source.handle
        for (let i = 0; i < pathParts.length - 1; i++) {
          current = await (current as FileSystemDirectoryHandle).getDirectoryHandle(pathParts[i])
        }
        const fileHandle = await (current as FileSystemDirectoryHandle).getFileHandle(
          pathParts[pathParts.length - 1],
        )
        const file = await fileHandle.getFile()

        const format = getFormatFromExtension(file.name)
        if (!format) throw new Error(`Unsupported format: ${file.name}`)

        const adapter = createArchiveAdapter(format)
        const manifest = await adapter.open({
          format,
          fileName: file.name,
          fileSizeBytes: file.size,
          source: file,
        })

        const prefs = await readerPreferenceRepository.get()
        const progress = await readingProgressRepository.getByComicId(comicId!)

        const engine = new ComiqReaderEngine()
        engineRef.current = engine

        const snap = await engine.open({
          entryMode: 'library',
          comicId: comicId!,
          archive: manifest,
          fileSource: file,
          initialPage: progress?.currentPage ?? 0,
          preferredDisplayMode: prefs.defaultDisplayMode,
        })

        if (!cancelled) {
          setSnapshot(snap)
          void loadPage(engine, snap.currentPage)
        }
      } catch (err) {
        if (!cancelled) setError(normalizeReaderError(err))
      }
    }

    void openComic()

    return () => {
      cancelled = true
      void engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [comicId])

  async function loadPage(engine: ComiqReaderEngine, pageIndex: number) {
    try {
      const page = await engine.preparePage(pageIndex)
      setCurrentPage(page)
      setSnapshot({ ...engine.getSnapshot() })
      await engine.persistProgress()
    } catch (err) {
      setError(normalizeReaderError(err))
    }
  }

  const handleNext = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    const snap = await engine.nextPage()
    setSnapshot(snap)
    void loadPage(engine, snap.currentPage)
  }, [])

  const handlePrevious = useCallback(async () => {
    const engine = engineRef.current
    if (!engine) return
    const snap = await engine.previousPage()
    setSnapshot(snap)
    void loadPage(engine, snap.currentPage)
  }, [])

  const handleGoToPage = useCallback(async (page: number) => {
    const engine = engineRef.current
    if (!engine) return
    const snap = await engine.goToPage(page)
    setSnapshot(snap)
    void loadPage(engine, snap.currentPage)
  }, [])

  if (error) {
    const variant =
      error.code === 'corrupt-archive'
        ? 'corrupt-archive'
        : error.code === 'revoked-permission'
          ? 'revoked-permission'
          : error.code === 'missing-folder'
            ? 'missing-folder'
            : 'generic'

    return (
      <div className="flex flex-col items-center justify-center h-dvh gap-4">
        <ErrorRecoveryCard
          variant={variant}
          description={error.message}
          onRetry={() => navigate(-1)}
        />
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="text-sm text-zinc-400 underline"
        >
          Back to library
        </button>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center h-dvh text-zinc-500" aria-live="polite">
        Opening comic…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-ink-900">
      <ReaderControls
        snapshot={snapshot}
        rotation={rotation}
        onPrevious={() => void handlePrevious()}
        onNext={() => void handleNext()}
        onGoToPage={(p) => void handleGoToPage(p)}
        onRotateCW={() => setRotation((r) => (r + 90) % 360)}
        onRotateCCW={() => setRotation((r) => (r - 90 + 360) % 360)}
      />
      <div className="flex-1 overflow-hidden">
        <PageFlipReader
          page={currentPage}
          rotation={rotation}
          onNext={() => void handleNext()}
          onPrevious={() => void handlePrevious()}
        />
      </div>
    </div>
  )
}
