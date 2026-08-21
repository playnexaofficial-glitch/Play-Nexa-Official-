'use client'

import MovieCard from './MovieCard'
import LoadingShimmer from '@/components/ui/LoadingShimmer'
import type { YouTubeMovie } from '@/lib/types'

interface RelatedMoviesProps {
  movies: YouTubeMovie[]
  loading?: boolean
}

export default function RelatedMovies({ movies, loading = false }: RelatedMoviesProps) {
  if (loading) {
    return (
      <section aria-label="Related movies">
        <h2 className="text-white font-semibold text-base mb-3">
          🎬 You May Also Like
        </h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {Array.from({ length: 5 }).map((_, i) => (
            <LoadingShimmer
              key={i}
              className="w-[148px] h-[120px] rounded-2xl flex-shrink-0"
            />
          ))}
        </div>
      </section>
    )
  }

  if (movies.length === 0) return null

  return (
    <section aria-label="Related movies">
      <h2 className="text-white font-semibold text-base mb-3">
        🎬 You May Also Like
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {movies.map((movie) => (
          <div key={movie.id} className="flex-shrink-0">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </section>
  )
}
