import { Link } from 'react-router-dom'
import type { ReaderProgressSnapshot } from '../../domain/reader/reader-engine.types'
import HamburgerMenu from '../../components/HamburgerMenu'

interface ReaderControlsProps {
  snapshot: ReaderProgressSnapshot
  rotation: number
  onPrevious: () => void
  onNext: () => void
  onGoToPage: (page: number) => void
  onRotateCW: () => void
  onRotateCCW: () => void
}

export default function ReaderControls({
  snapshot,
  rotation: _rotation,
  onPrevious,
  onNext,
  onGoToPage: _onGoToPage,
  onRotateCW,
  onRotateCCW,
}: ReaderControlsProps) {
  const { currentPage, pageCount, canAdvance, canRetreat } = snapshot

  return (
    <div
      role="toolbar"
      aria-label="Reader controls"
      className="shrink-0 grid grid-cols-3 items-center px-4 h-12 bg-ink-800/90 backdrop-blur border-b border-ink-700 select-none"
    >
      {/* Left: Comiq title */}
      <div className="flex items-center">
        <Link
          to="/"
          className="text-base font-bold tracking-tight hover:text-zinc-300 transition-colors"
          aria-label="Go to Comiq home"
        >
          Comi<span className="text-violet-400">q</span>
        </Link>
      </div>

      {/* Centre: page navigation */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canRetreat}
          aria-label="Previous page"
          className="p-1.5 rounded hover:bg-ink-700 disabled:opacity-40 transition-colors"
        >
          ‹
        </button>
        <span
          aria-live="polite"
          aria-atomic="true"
          className="text-xs text-zinc-400 min-w-[4rem] text-center"
        >
          {pageCount > 0 ? `${currentPage + 1} / ${pageCount}` : '—'}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!canAdvance}
          aria-label="Next page"
          className="p-1.5 rounded hover:bg-ink-700 disabled:opacity-40 transition-colors"
        >
          ›
        </button>
      </div>

      {/* Right: rotate + hamburger */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={onRotateCCW}
          aria-label="Rotate anticlockwise"
          title="Rotate anticlockwise"
          className="p-1.5 rounded hover:bg-ink-700 transition-colors text-zinc-300"
        >
          ↺
        </button>
        <button
          type="button"
          onClick={onRotateCW}
          aria-label="Rotate clockwise"
          title="Rotate clockwise"
          className="p-1.5 rounded hover:bg-ink-700 transition-colors text-zinc-300"
        >
          ↻
        </button>
        <HamburgerMenu />
      </div>
    </div>
  )
}
