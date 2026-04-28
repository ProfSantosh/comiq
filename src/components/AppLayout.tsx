import { Link } from 'react-router-dom'
import HamburgerMenu from './HamburgerMenu'

interface AppLayoutProps {
  children: React.ReactNode
  /** Vertically centres content in the scroll area (e.g. Home, Quick Read landing) */
  centeredContent?: boolean
}

export default function AppLayout({ children, centeredContent = false }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-dvh bg-ink-900 text-zinc-100">
      {/* Sticky top header */}
      <header className="shrink-0 flex items-center justify-between px-4 h-12 bg-ink-800 border-b border-ink-700">
        <Link
          to="/"
          className="text-base font-bold tracking-tight hover:text-zinc-300 transition-colors"
          aria-label="Go to Comiq home"
        >Comi<span className="text-violet-400">q</span>
        </Link>
        <HamburgerMenu />
      </header>

      {/* Scrollable content area */}
      <div
        className={`flex-1 overflow-y-auto${centeredContent ? ' flex flex-col items-center justify-center' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}
