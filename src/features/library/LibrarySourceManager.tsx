import { useState } from 'react'
import type { LibrarySource } from '../../persistence/db'
import { librarySourceService } from '../../domain/library/library-source.service'

interface LibrarySourceManagerProps {
  sources: LibrarySource[]
  onSourcesChanged: () => void
}

export default function LibrarySourceManager({ sources, onSourcesChanged }: LibrarySourceManagerProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function handleRemove(sourceId: string) {
    setBusy(sourceId)
    try {
      await librarySourceService.removeSource(sourceId)
      onSourcesChanged()
    } finally {
      setBusy(null)
    }
  }

  async function handleRescan(sourceId: string) {
    setBusy(sourceId)
    try {
      await librarySourceService.rescan(sourceId)
      onSourcesChanged()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="border border-ink-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-zinc-300 hover:bg-ink-800 transition-colors"
      >
        <span className="font-medium">Manage folders ({sources.length})</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul className="divide-y divide-ink-700">
          {sources.map((source) => (
            <li key={source.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-zinc-200 truncate">{source.displayName}</span>
                <span className="block text-xs text-zinc-500 capitalize">{source.status}</span>
              </span>
              <button
                type="button"
                disabled={busy === source.id}
                onClick={() => void handleRescan(source.id)}
                className="text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors"
                aria-label={`Rescan ${source.displayName}`}
              >
                Rescan
              </button>
              <button
                type="button"
                disabled={busy === source.id}
                onClick={() => void handleRemove(source.id)}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                aria-label={`Remove ${source.displayName}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
