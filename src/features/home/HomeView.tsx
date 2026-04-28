import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'

function BookOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-10 h-10"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-10 h-10"
    >
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-10 h-10"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

interface NavCardProps {
  to: string
  icon: React.ReactNode
  label: string
  description: string
}

function NavCard({ to, icon, label, description }: NavCardProps) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-ink-800 hover:bg-ink-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 text-center"
    >
      <span className="text-violet-400">{icon}</span>
      <span className="font-semibold text-zinc-100 text-lg">{label}</span>
      <span className="text-zinc-400 text-sm leading-snug">{description}</span>
    </Link>
  )
}

export default function HomeView() {
  return (
    <AppLayout centeredContent>
      <main className="flex flex-col items-center gap-10 p-6 w-full">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src="/comiq/icons/comiq_logo.svg"
            alt=""
            aria-hidden="true"
            className="w-40 h-40"
          />
          <h1 className="text-3xl font-bold tracking-tight">Comi<span className="text-violet-400">q</span></h1>
          <p className="text-zinc-400 text-sm max-w-xs">
            Local-first comic reader for CBZ, CBT, and CBR files. Your files never leave your device.
          </p>
        </div>

      <nav aria-label="Main navigation" className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        <NavCard
          to="/library"
          icon={<BookOpenIcon />}
          label="Library"
          description="Browse your comic collection with cover thumbnails and reading progress."
        />
        <NavCard
          to="/quick-read"
          icon={<BoltIcon />}
          label="Quick Read"
          description="Open a single comic instantly — no library setup required."
        />
        <NavCard
          to="/settings"
          icon={<GearIcon />}
          label="Settings"
          description="Configure your reading preferences."
        />
      </nav>
      </main>
    </AppLayout>
  )
}
