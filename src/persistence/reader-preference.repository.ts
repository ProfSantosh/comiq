import { db, type ReaderPreference } from './db'

const DEFAULT_PREFERENCES: ReaderPreference = {
  id: 'reader-preferences',
  defaultDisplayMode: 'page-flip',
  preloadWindowPages: 3,
  updatedAt: new Date().toISOString(),
}

export const readerPreferenceRepository = {
  async get(): Promise<ReaderPreference> {
    const prefs = await db.readerPreferences.get('reader-preferences')
    return prefs ?? { ...DEFAULT_PREFERENCES }
  },

  async save(changes: Partial<Omit<ReaderPreference, 'id'>>): Promise<void> {
    const existing = await db.readerPreferences.get('reader-preferences')
    const updated: ReaderPreference = {
      ...(existing ?? DEFAULT_PREFERENCES),
      ...changes,
      id: 'reader-preferences',
      updatedAt: new Date().toISOString(),
    }
    await db.readerPreferences.put(updated)
  },
}
