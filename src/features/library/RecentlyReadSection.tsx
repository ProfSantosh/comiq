import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ComicCard from '../../components/ComicCard'
import type { LibraryComic, RecentLibraryItem } from '../../persistence/db'
import { libraryComicRepository } from '../../persistence/library-comic.repository'
import { recentLibraryItemRepository } from '../../persistence/reading-progress.repository'
import { thumbnailRepository } from '../../persistence/thumbnail.repository'

export default function RecentlyReadSection() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Array<{ comic: LibraryComic; thumbnailUrl?: string }>>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const recent: RecentLibraryItem[] = await recentLibraryItemRepository.getAll()
      if (cancelled) return

      const entries = await Promise.all(
        recent.slice(0, 5).map(async (r) => {
          const comic = await libraryComicRepository.getById(r.comicId)
          if (!comic) return null

          let thumbnailUrl: string | undefined
          if (comic.coverThumbnailId) {
            const thumb = await thumbnailRepository.getByComicId(comic.id)
            if (thumb?.status === 'ready') {
              thumbnailUrl = URL.createObjectURL(thumb.blob)
            }
          }

          return { comic, thumbnailUrl }
        }),
      )

      if (!cancelled) {
        setItems(entries.filter(Boolean) as Array<{ comic: LibraryComic; thumbnailUrl?: string }>)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (items.length === 0) return null

  return (
    <section aria-label="Recently read comics">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
        Recently Read
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map(({ comic, thumbnailUrl }) => (
          <ComicCard
            key={comic.id}
            comic={comic}
            thumbnailUrl={thumbnailUrl}
            onClick={() => navigate(`/reader/${comic.id}`)}
          />
        ))}
      </div>
    </section>
  )
}
