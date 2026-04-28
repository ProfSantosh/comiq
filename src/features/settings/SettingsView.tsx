import { useEffect, useState } from 'react'
import type { ReaderPreference } from '../../persistence/db'
import { readerPreferenceRepository } from '../../persistence/reader-preference.repository'
import AppLayout from '../../components/AppLayout'

export default function SettingsView() {
  const [_prefs, setPrefs] = useState<ReaderPreference | null>(null)

  useEffect(() => {
    void readerPreferenceRepository.get().then(setPrefs)
  }, [])

  return (
    <AppLayout>
      <main className="flex flex-col gap-6 p-6 w-full text-center">
        <h1 className="text-xl font-bold">Settings</h1>

        <section aria-label="Reader settings" className="w-full text-center">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Reading Mode
          </h2>
          <p className="text-sm text-zinc-400">Page-flip mode is enabled. Pages advance one at a time with arrow keys or navigation buttons.</p>
        </section>
      </main>
    </AppLayout>
  )
}
