import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { ComiqReaderEngine } from '../../domain/reader/reader-engine'
import type { PreparedPage, ReaderProgressSnapshot } from '../../domain/reader/reader-engine.types'
import { createArchiveAdapter, getFormatFromExtension } from '../../domain/archive/archive-adapter-registry'
import { quickReadSessionStore } from '../../persistence/quick-read-session.store'
import { readerPreferenceRepository } from '../../persistence/reader-preference.repository'
import { normalizeReaderError } from '../../domain/reader/reader-error.service'
import ErrorRecoveryCard from '../../components/ErrorRecoveryCard'
import ReaderControls from '../reader/ReaderControls'
import PageFlipReader from '../reader/PageFlipReader'
import AppLayout from '../../components/AppLayout'

export default function QuickReadView() {
  const navigate = useNavigate()
  const [engine] = useState(() => new ComiqReaderEngine())
  const [snapshot, setSnapshot] = useState<ReaderProgressSnapshot | null>(null)
  const [currentPage, setCurrentPage] = useState<PreparedPage | null>(null)
  const [rotation, setRotation] = useState(0)
  const [error, setError] = useState<ReturnType<typeof normalizeReaderError> | null>(null)
  const [dragging, setDragging] = useState(false)

  async function openFile(file: File) {
    setError(null)

    const format = getFormatFromExtension(file.name)
    if (!format) {
      setError({ code: 'unsupported-format', message: `${file.name} is not a supported format (.cbz, .cbt, .cbr).`, recoverable: false })
      return
    }

    try {
      const adapter = createArchiveAdapter(format)
      const manifest = await adapter.open({
        format,
        fileName: file.name,
        fileSizeBytes: file.size,
        source: file,
      })

      const prefs = await readerPreferenceRepository.get()
      const sessionId = uuid()

      // Initialize session store for same-tab resume
      quickReadSessionStore.save({
        sessionId,
        fileName: file.name,
        fileFingerprint: `${file.name}:${file.size}:${file.lastModified}`,
        extension: format,
        currentPage: 0,
        pageCountSnapshot: manifest.pageCount,
        openedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const snap = await engine.open({
        entryMode: 'quick-read',
        quickReadSessionId: sessionId,
        archive: manifest,
        fileSource: file,
        initialPage: 0,
        preferredDisplayMode: prefs.defaultDisplayMode,
      })

      setSnapshot(snap)
      void loadPage(snap.currentPage)
    } catch (err) {
      setError(normalizeReaderError(err))
    }
  }

  async function loadPage(pageIndex: number) {
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
    const snap = await engine.nextPage()
    setSnapshot(snap)
    void loadPage(snap.currentPage)
  }, [engine])

  const handlePrevious = useCallback(async () => {
    const snap = await engine.previousPage()
    setSnapshot(snap)
    void loadPage(snap.currentPage)
  }, [engine])

  const handleGoToPage = useCallback(async (page: number) => {
    const snap = await engine.goToPage(page)
    setSnapshot(snap)
    void loadPage(snap.currentPage)
  }, [engine])

  if (snapshot) {
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

  return (
    <AppLayout centeredContent>
      <main className="flex flex-col items-center gap-6 p-4 w-full">
        <h1 className="text-2xl font-bold">Quick Read</h1>
      <p className="text-zinc-400 text-sm text-center max-w-xs">
        Open a comic archive (.cbz, .cbt, .cbr) to start reading immediately — no library setup required.
      </p>

      {error && (
        <ErrorRecoveryCard
          variant="generic"
          description={error.message}
          onRetry={() => setError(null)}
        />
      )}

      {/* File input */}
      <label
        className={`flex flex-col items-center justify-center w-80 h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          dragging
            ? 'border-violet-400 bg-violet-950/30'
            : 'border-ink-700 hover:border-zinc-400 bg-ink-800'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) void openFile(file)
        }}
      >
        <span className="text-3xl mb-2" aria-hidden="true">📂</span>
        <span className="text-sm text-zinc-300 font-medium">Drop a file here</span>
        <span className="text-xs text-zinc-500 mt-1">or click to browse</span>
        <input
          type="file"
          accept=".cbz,.cbt,.cbr"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void openFile(file)
          }}
        />
      </label>

      <button
        type="button"
        onClick={() => navigate('/library')}
        className="text-sm text-zinc-500 underline"
      >
        Go to Library
      </button>
      </main>
    </AppLayout>
  )
}
