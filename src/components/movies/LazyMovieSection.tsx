// ── Play Nexa Lazy Movie Section ──────────────────────────────
// Sections only fetch when scrolled into view.
// Saves API quota massively.
// Uses IntersectionObserver — real, no library needed.

'use client'

import { useRef, useState, useEffect } from 'react'
import { useMovieCategory } from '@/hooks/useMovies'
import MovieCard from './MovieCard'
import LoadingShimmer from '@/components/ui/LoadingShimmer'

interface Props {
  label: string
  category: string
}

export default function LazyMovieSection({ label, category }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  // Only start fetching when section scrolls into view
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect() // fetch once, stop observing
        }
      },
      { rootMargin: '200px' }, // start fetch 200px before visible
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="mb-6">
      {/* Section header always visible */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-semibold text-white">
          {label}
        </h2>
        <button
          type="button"
          className="text-xs text-pn-purple font-medium min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity duration-150 hover:opacity-80 active:scale-95"
        >
          See All →
        </button>
      </div>

      {/* Content only loads when visible */}
      {visible
        ? <SectionContent category={category} />
        : <SectionSkeleton />
      }
    </div>
  )
}

function SectionContent({ category }: { category: string }) {
  const { movies, loading } = useMovieCategory(category)

  if (loading) return <SectionSkeleton />

  if (movies.length === 0) {
    return (
      <div className="flex items-center justify-center w-full py-8">
        <p className="text-pn-muted text-xs">No movies found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-3 px-4 pb-2">
        {movies.map(movie => (
          <div key={movie.id} className="flex-shrink-0">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-3 px-4 pb-2">
        {Array(5).fill(0).map((_, i) => (
          <LoadingShimmer
            key={i}
            className="w-[148px] h-[120px] rounded-2xl flex-shrink-0"
          />
        ))}
      </div>
    </div>
  )
}
