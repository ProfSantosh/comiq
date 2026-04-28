import { useEffect, useState } from 'react'
import type { LibrarySource } from '../../persistence/db'
import { librarySourceRepository } from '../../persistence/library-source.repository'
import { librarySourceService } from '../../domain/library/library-source.service'
import LibraryGrid from './LibraryGrid'
import RecentlyReadSection from './RecentlyReadSection'
import LibrarySourceManager from './LibrarySourceManager'
import ErrorRecoveryCard from '../../components/ErrorRecoveryCard'
import AppLayout from '../../components/AppLayout'

export default function LibraryView() {
  const [sources, setSources] = useState<LibrarySource[]>([])
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const sourceIds = sources.map((s) => s.id)

  async function loadSources() {
    const all = await librarySourceRepository.getAll()
    setSources(all)
  }

  useEffect(() => {
    void loadSources()
  }, [])

  async function handleAddFolder() {
    setAddError(null)
    setAdding(true)
    try {
      await librarySourceService.addFolder()
      await loadSources()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // AbortError means user cancelled — don't show error
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setAddError(msg)
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <AppLayout>
      <main className="flex flex-col gap-6 p-4 w-full">
        {/* Skip link for accessibility */}
        <a
          href="#library-grid"
          className="sr-only focus:not-sr-only focus:absolute focus:top-14 focus:left-2 bg-ink-800 text-zinc-100 px-3 py-1 rounded text-sm"
        >
          Skip to library
        </a>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Library</h1>
          <button
            type="button"
            disabled={adding}
            onClick={() => void handleAddFolder()}
            className="text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-3 py-1.5 rounded transition-colors"
          >
            {adding ? 'Adding…' : '+ Add folder'}
          </button>
        </div>

        {addError && (
          <ErrorRecoveryCard
            variant="generic"
            description={addError}
          />
        )}

        {sources.length > 0 && (
          <LibrarySourceManager sources={sources} onSourcesChanged={loadSources} />
        )}

        <RecentlyReadSection />

        <section id="library-grid" aria-label="All comics">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            All Comics
          </h2>
          <LibraryGrid sourceIds={sourceIds} />
        </section>
      </main>
    </AppLayout>
  )
}
