// ── Play Nexa Cinematic Player Modal ────────────────────────────
// Dark Netflix/YouTube hybrid overlay
// Uses StealthPlayer for maximum YouTube branding removal
// GPU-only animations (opacity) — no backdrop-blur, no filters
// 2GB RAM safe — iframe loads on mount, unloads on close
// ESC key to close, click-outside to close
// Dubbed badges & language info in the info bar

'use client'

import { useEffect, useCallback, useRef } from 'react'
import StealthPlayer from './StealthPlayer'
import type { Movie } from '@/lib/search'
import type { YouTubeMovie } from '@/lib/types'
import { detectDubbedTags } from '@/lib/types'

type PlayerModalData = Movie | YouTubeMovie

const isLocalMovie = (m: PlayerModalData): m is Movie => 'year' in m && 'rating' in m

interface PlayerModalProps {
  movie: PlayerModalData
  onClose: () => void
}

export default function PlayerModal({ movie, onClose }: PlayerModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dubbedTags = ('dubbedTags' in movie && Array.isArray(movie.dubbedTags))
    ? movie.dubbedTags as string[]
    : detectDubbedTags(movie.title, movie.language)

  // ESC key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  // Click outside to close
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/90 animate-[fade-in_200ms_ease-out] pt-4 sm:pt-8 md:pt-12 px-2 sm:px-4 pb-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${movie.title}`}
    >
      <div className="w-full max-w-5xl animate-[fade-in_300ms_ease-out]">

        {/* ── HEADER BAR ── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="bg-pn-purple/90 rounded px-2.5 py-1">
              <p className="text-white text-[11px] font-bold tracking-wider">Play Nexa</p>
            </span>
            <span className="text-white/50 text-xs">NOW PLAYING</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-150 min-h-[44px] min-w-[44px]"
            aria-label="Close player"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── STEALTH PLAYER ── */}
        <StealthPlayer
          videoId={movie.videoId}
          title={movie.title}
          showClose={false}
          showBadge={false}
          className="rounded-xl shadow-2xl shadow-black/50"
        />

        {/* ── MOVIE INFO BAR ── */}
        <div className="mt-4 px-1">
          <h2 className="text-white text-lg font-bold leading-snug mb-2">
            {movie.title}
          </h2>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-pn-success text-white text-[10px] font-bold rounded-full px-2.5 py-1">
              FREE
            </span>
            <span className="bg-pn-card border border-pn-border text-pn-muted text-[10px] rounded-full px-2.5 py-1">
              {movie.duration}
            </span>
            {isLocalMovie(movie) && (
              <span className="bg-pn-card border border-pn-border text-pn-muted text-[10px] rounded-full px-2.5 py-1">
                {movie.year}
              </span>
            )}
            <span className="bg-pn-card border border-pn-border text-pn-muted text-[10px] rounded-full px-2.5 py-1">
              {movie.language}
            </span>

            {/* Dubbed language badges — premium lightweight */}
            {dubbedTags.map(tag => {
              const isDub = tag.toLowerCase().includes('dub')
              const isSub = tag.toLowerCase().includes('sub')
              return (
                <span
                  key={tag}
                  className={`text-[10px] font-medium rounded-full px-2.5 py-1 border ${
                    isDub
                      ? 'bg-pn-purple/15 text-pn-purple border-pn-purple/30'
                      : isSub
                        ? 'bg-pn-cyan/15 text-pn-cyan border-pn-cyan/30'
                        : 'bg-pn-card text-pn-muted border-pn-border'
                  }`}
                >
                  {tag}
                </span>
              )
            })}

            {isLocalMovie(movie) && (
              <span className="text-pn-cyan text-[11px] font-semibold flex items-center">
                ★ {movie.rating}
              </span>
            )}
          </div>

          {/* Description */}
          {movie.description && (
            <p className="text-pn-muted text-sm leading-relaxed line-clamp-3">
              {movie.description}
            </p>
          )}

          {/* Channel */}
          <div className="flex items-center gap-3 mt-3 bg-pn-card border border-pn-border rounded-xl p-3">
            <div
              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)' }}
            >
              {movie.channel.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{movie.channel}</p>
              <p className="text-pn-muted text-[11px]">YouTube Channel</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
