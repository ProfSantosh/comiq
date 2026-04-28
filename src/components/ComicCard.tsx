import type { LibraryComic } from '../persistence/db'

interface ComicCardProps {
  comic: LibraryComic
  thumbnailUrl?: string
  progressPage?: number
  onClick?: () => void
}

export default function ComicCard({ comic, thumbnailUrl, progressPage, onClick }: ComicCardProps) {
  const isUnavailable = comic.availability !== 'ready'
  const progressPercent =
    comic.pageCount && progressPage
      ? Math.round((progressPage / comic.pageCount) * 100)
      : null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open ${comic.title}${isUnavailable ? ' (unavailable)' : ''}${progressPercent !== null ? `, ${progressPercent}% read` : ''}`}
      className="group relative flex flex-col rounded-lg overflow-hidden bg-ink-800 hover:bg-ink-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 text-left"
    >
      {/* Thumbnail */}
      <div className="aspect-[2/3] bg-ink-900 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`Cover of ${comic.title}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <span className="text-3xl font-bold uppercase">{comic.extension}</span>
          </div>
        )}
      </div>

      {/* Unavailable overlay */}
      {isUnavailable && (
        <div className="absolute inset-0 bg-ink-900/70 flex items-center justify-center">
          <span className="text-xs font-medium text-amber-400 bg-ink-900/80 px-2 py-1 rounded">
            {comic.availability === 'missing' ? 'Missing' : 'Unavailable'}
          </span>
        </div>
      )}

      {/* Progress badge */}
      {progressPercent !== null && !isUnavailable && (
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-1 bg-violet-600"
          style={{ width: `${progressPercent}%` }}
        />
      )}

      {/* Title */}
      <div className="p-2">
        <p className="text-xs text-zinc-300 truncate">{comic.title}</p>
      </div>
    </button>
  )
}
