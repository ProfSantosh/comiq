import { useEffect, useRef } from 'react'

interface SwipeOptions {
  /** Minimum horizontal distance (px) to trigger a swipe. Default: 50 */
  threshold?: number
  /** Cancel if vertical drift exceeds horizontal movement. Default: true */
  cancelOnVertical?: boolean
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

/**
 * Attaches pointer-based swipe detection to a DOM element ref.
 * Works for both touch and mouse drag (pointer events).
 */
export function useSwipe<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  { threshold = 50, cancelOnVertical = true, onSwipeLeft, onSwipeRight }: SwipeOptions,
) {
  // Store mutable callbacks in refs so the effect doesn't need to re-bind
  const cbLeft = useRef(onSwipeLeft)
  const cbRight = useRef(onSwipeRight)
  cbLeft.current = onSwipeLeft
  cbRight.current = onSwipeRight

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let startX = 0
    let startY = 0
    let active = false

    function onPointerDown(e: PointerEvent) {
      startX = e.clientX
      startY = e.clientY
      active = true
    }

    function onPointerUp(e: PointerEvent) {
      if (!active) return
      active = false

      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (absDx < threshold) return
      if (cancelOnVertical && absDy > absDx) return

      if (dx < 0) {
        cbLeft.current?.()
      } else {
        cbRight.current?.()
      }
    }

    function onPointerCancel() {
      active = false
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [ref, threshold, cancelOnVertical])
}
