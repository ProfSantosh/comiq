import { useEffect, useRef, useState } from 'react'
import type { PreparedPage } from '../../domain/reader/reader-engine.types'
import { useSwipe } from '../../hooks/useSwipe'

interface PageFlipReaderProps {
  page: PreparedPage | null
  rotation: number // degrees, multiples of 90
  onNext: () => void
  onPrevious: () => void
}

export default function PageFlipReader({
  page,
  rotation,
  onNext,
  onPrevious,
}: PageFlipReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Track page changes to drive slide direction and re-trigger animation
  const [animKey, setAnimKey] = useState(0)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')
  const prevPageIndex = useRef<number | null>(null)

  useEffect(() => {
    if (!page) return
    const prev = prevPageIndex.current
    if (prev !== null && prev !== page.pageIndex) {
      setSlideDir(page.pageIndex > prev ? 'left' : 'right')
      setAnimKey((k) => k + 1)
    }
    prevPageIndex.current = page.pageIndex
  }, [page])

  // Keyboard navigation: ArrowLeft/ArrowUp → previous, ArrowRight/ArrowDown → next (FR-027)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        onNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        onPrevious()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onNext, onPrevious])

  // Swipe navigation: swipe left → next, swipe right → previous (touch + mouse)
  useSwipe(containerRef, {
    threshold: 50,
    cancelOnVertical: true,
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
  })

  const imageUrl = page ? URL.createObjectURL(page.blob) : null
  const slideClass = animKey > 0
    ? (slideDir === 'left' ? 'animate-slide-in-left' : 'animate-slide-in-right')
    : ''

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full overflow-hidden touch-pan-y select-none"
      aria-label={page ? `Page ${page.pageIndex + 1}` : 'Loading…'}
    >
      {imageUrl ? (
        <div
          key={animKey}
          className={`flex items-center justify-center w-full h-full ${slideClass}`}
        >
          <img
            src={imageUrl}
            alt={`Page ${page!.pageIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        </div>
      ) : (
        <div className="w-48 h-64 bg-zinc-800 rounded animate-pulse" aria-hidden="true" />
      )}
    </div>
  )
}
