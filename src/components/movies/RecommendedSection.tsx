// ── Play Nexa Recommended Section ─────────────────────────────
// Zero API — filters local JSON only
// IntersectionObserver — only renders when scrolled into view
// Instant results — no network needed

'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { getByCategory } from '@/lib/search'
import MovieCard from './MovieCard'
import type { Movie } from '@/lib/search'

interface Props {
  label: string
  genre: string
  excludeId: string
}

export default function RecommendedSection(
  { label, genre, excludeId }: Props,
) {
  const [visible, setVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  // IntersectionObserver — only render when visible
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '300px' },
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Memoized movies — instant, zero API
  const movies = useMemo(() => {
    if (!visible) return []
    return getByCategory(genre)
      .filter(m => m.id !== excludeId)
      .slice(0, 10)
  }, [visible, genre, excludeId])

  return (
    <div ref={sectionRef} className="mt-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-base font-semibold text-white">
          {label}
        </h3>
        <button
          type="button"
          className="text-xs text-pn-purple font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          See All →
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 px-4 pb-2">
          {!visible
            ? Array(5).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[148px] h-[120px] rounded-2xl bg-pn-card animate-pulse"
                />
              ))
            : movies.map(movie => (
                <div key={movie.id} className="flex-shrink-0">
                  <MovieCard movie={movie} />
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}
