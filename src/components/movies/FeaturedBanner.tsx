'use client'
import { Play } from 'lucide-react'

interface Movie {
  id: string; title: string; thumbnail: string
  channel_name: string; genre?: string[]
  watchPercent?: number; isNew?: boolean
  badge?: string | null
}
interface Props {
  movies: Movie[]; currentIndex: number
  onIndexChange: (i: number) => void
  onPlay: (id: string) => void
}

export default function FeaturedBanner({
  movies, currentIndex, onIndexChange, onPlay
}: Props) {
  const current = movies[currentIndex]
  if (!current) return null

  return (
    <div className="relative">
      {/* Main banner image */}
      <div className="relative w-full aspect-video
        bg-[#1A1A2E]">
        <img
          src={current.thumbnail}
          alt={current.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {/* Dark gradient overlay at bottom */}
        <div className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top,' +
              '#0D0D0D 0%,' +
              'rgba(13,13,13,0.6) 50%,' +
              'transparent 100%)'
          }}/>

        {/* Badge: Most Watched % or New */}
        <div className="absolute top-3 left-3
          flex gap-2">
          {current.badge && (
            <span className="px-2.5 py-1 rounded-lg
              text-xs font-bold text-white"
              style={{ backgroundColor: '#7C3AED' }}>
              {current.badge}
            </span>
          )}
          {current.isNew && (
            <span className="px-2.5 py-1 rounded-lg
              text-xs font-bold text-black
              bg-white">
              New
            </span>
          )}
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0
          right-0 p-4">
          <p className="text-white font-bold
            text-lg mb-1 line-clamp-2 leading-tight">
            {current.title}
          </p>
          <p className="text-[#9CA3AF] text-xs mb-3">
            {current.channel_name}
            {current.genre?.length
              ? ' · ' + current.genre[0] : ''}
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onPlay(current.id)}
              className="flex-1 h-10 rounded-xl
                text-sm font-bold text-black
                bg-white active:opacity-60 transition-opacity duration-150
                flex items-center justify-center
                gap-2">
              <Play size={16} fill="currentColor" />
              Watch Now
            </button>
            <button
              onClick={() => onPlay(current.id)}
              className="px-4 h-10 rounded-xl
                text-sm font-semibold text-white
                active:opacity-60 transition-opacity duration-150"
              style={{
                backgroundColor:
                  'rgba(255,255,255,0.15)'
              }}>
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      {movies.length > 1 && (
        <div className="flex justify-center gap-1.5
          mt-2 pb-1">
          {movies.map((_, i) => (
            <button key={i}
              onClick={() => onIndexChange(i)}
              className="rounded-full transition-all
                duration-150 active:opacity-60"
              style={{
                width: i === currentIndex
                  ? '20px' : '6px',
                height: '6px',
                backgroundColor: i === currentIndex
                  ? '#7C3AED' : '#2D2D44',
              }}/>
          ))}
        </div>
      )}
    </div>
  )
}
