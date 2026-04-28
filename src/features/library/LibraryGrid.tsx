import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ComicCard from '../../components/ComicCard'
import type { LibraryComic } from '../../persistence/db'
import { libraryComicRepository } from '../../persistence/library-comic.repository'
import { thumbnailRepository } from '../../persistence/thumbnail.repository'
import { readingProgressRepository } from '../../persistence/reading-progress.repository'

interface LibraryGridProps {
  sourceIds?: string[]
}

export default function LibraryGrid({ sourceIds }: LibraryGridProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Array<{ comic: LibraryComic; thumbnailUrl?: string; progressPage?: number }>>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      let comics: LibraryComic[]

      if (sourceIds && sourceIds.length > 0) {
        const lists = await Promise.all(sourceIds.map((id) => libraryComicRepository.getBySourceId(id)))
        comics = lists.flat()
      } else {
        comics = await libraryComicRepository.getAll()
      }

      // Sort alphabetically by fileName A→Z (FR-024)
      comics.sort((a, b) => a.fileName.localeCompare(b.fileName))

      if (cancelled) return

      const entries = await Promise.all(
        comics.map(async (comic) => {
          let thumbnailUrl: string | undefined
          if (comic.coverThumbnailId) {
            const thumb = await thumbnailRepository.getByComicId(comic.id)
            if (thumb?.status === 'ready') {
              thumbnailUrl = URL.createObjectURL(thumb.blob)
            }
          }

          const progress = await readingProgressRepository.getByComicId(comic.id)
          return { comic, thumbnailUrl, progressPage: progress?.currentPage }
        }),
      )

      if (!cancelled) {
        setItems(entries)
        setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [sourceIds])

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading library" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-zinc-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        No comics found. Add a folder to get started.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {items.map(({ comic, thumbnailUrl, progressPage }) => (
        <ComicCard
          key={comic.id}
          comic={comic}
          thumbnailUrl={thumbnailUrl}
          progressPage={progressPage}
          onClick={() => navigate(`/reader/${comic.id}`)}
        />
      ))}
    </div>
  )
}
