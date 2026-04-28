import type { ArchiveAdapter, ArchiveFormat } from './archive-adapter.types'
import { CbzAdapter } from './cbz-adapter'
import { CbtAdapter } from './cbt-adapter'
import { CbrAdapter } from './cbr-adapter'

export const SUPPORTED_EXTENSIONS = new Set<string>(['.cbz', '.cbt', '.cbr'])

export function getFormatFromExtension(filename: string): ArchiveFormat | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  if (ext === '.cbz') return 'cbz'
  if (ext === '.cbt') return 'cbt'
  if (ext === '.cbr') return 'cbr'
  return null
}

export function createArchiveAdapter(format: ArchiveFormat): ArchiveAdapter {
  switch (format) {
    case 'cbz':
      return new CbzAdapter()
    case 'cbt':
      return new CbtAdapter()
    case 'cbr':
      return new CbrAdapter()
  }
}

export function isSupported(filename: string): boolean {
  return getFormatFromExtension(filename) !== null
}
