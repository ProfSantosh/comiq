import { Link } from 'react-router-dom'

interface FallbackBannerProps {
  reason: string | null
}

export default function FallbackBanner({ reason }: FallbackBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-900/40 border border-amber-700 rounded-lg p-4 text-amber-200"
    >
      <p className="font-semibold mb-1">Library Mode unavailable</p>
      <p className="text-sm">
        {reason ??
          'Library Mode requires a Chromium-based desktop browser with File System Access support.'}
      </p>
      <Link
        to="/quick-read"
        className="inline-block mt-3 text-sm underline text-amber-100 hover:text-white"
      >
        Open a comic with Quick Read →
      </Link>
    </div>
  )
}
