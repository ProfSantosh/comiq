// QuickReadSession: same-tab only, stored in sessionStorage
// Never written to IndexedDB. Cleared on tab close.

export interface QuickReadSession {
  sessionId: string
  fileName: string
  fileFingerprint: string
  extension: 'cbz' | 'cbt' | 'cbr'
  currentPage: number
  pageCountSnapshot: number | null
  openedAt: string
  updatedAt: string
}

const SESSION_KEY = 'comiq:quick-read-session'

export const quickReadSessionStore = {
  get(): QuickReadSession | null {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as QuickReadSession
    } catch {
      return null
    }
  },

  save(session: QuickReadSession): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  },

  update(changes: Partial<QuickReadSession>): void {
    const existing = this.get()
    if (!existing) return
    this.save({ ...existing, ...changes, updatedAt: new Date().toISOString() })
  },

  clear(): void {
    sessionStorage.removeItem(SESSION_KEY)
  },
}
