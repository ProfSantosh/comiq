import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/quick-read', label: 'Quick Read' },
  { to: '/settings', label: 'Settings' },
] as const

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        buttonRef.current?.focus()
      }
    },
    [open],
  )

  return (
    <div ref={menuRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open navigation menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded hover:bg-ink-700 transition-colors text-zinc-300"
      >
        {/* Hamburger icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
          className="block"
        >
          <rect y="3" width="18" height="1.5" rx="0.75" fill="currentColor" />
          <rect y="8.25" width="18" height="1.5" rx="0.75" fill="currentColor" />
          <rect y="13.5" width="18" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <ul
          role="menu"
          aria-label="Navigation"
          className="absolute right-0 top-full mt-1 w-44 bg-ink-800 border border-ink-700 rounded-lg shadow-xl z-50 overflow-hidden"
        >
          {NAV_ITEMS.map(({ to, label }) => (
            <li key={to} role="none">
              <Link
                to={to}
                role="menuitem"
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  location.pathname === to
                    ? 'bg-ink-700 text-white font-medium'
                    : 'text-zinc-200 hover:bg-ink-700'
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
