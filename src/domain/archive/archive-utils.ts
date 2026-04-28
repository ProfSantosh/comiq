// Supported image file extensions for comic pages
const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.avif',
])

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
}

export function getExtension(path: string): string {
  const idx = path.lastIndexOf('.')
  if (idx === -1) return ''
  return path.slice(idx).toLowerCase()
}

export function getMimeType(path: string): string {
  return MIME_MAP[getExtension(path)] ?? 'application/octet-stream'
}

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.has(getExtension(path))
}

// Natural sort: compares strings numerically where sequences of digits appear
export function naturalSort(a: string, b: string): number {
  const re = /(\d+)/g
  const partsA = a.split(re)
  const partsB = b.split(re)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const pa = partsA[i] ?? ''
    const pb = partsB[i] ?? ''
    const na = parseInt(pa, 10)
    const nb = parseInt(pb, 10)

    if (!isNaN(na) && !isNaN(nb)) {
      if (na !== nb) return na - nb
    } else {
      const cmp = pa.localeCompare(pb)
      if (cmp !== 0) return cmp
    }
  }

  return 0
}
