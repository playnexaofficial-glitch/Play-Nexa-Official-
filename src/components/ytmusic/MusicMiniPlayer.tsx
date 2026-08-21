// ── Play Nexa YT Music Mini Player ───────────────────────────
// Fixed bottom mini player above nav, z-45
// Shows when a track is active but modal is closed
// Tap center → opens MusicModal
// AMOLED dark theme, 44px touch targets, no backdrop-blur

'use client'

import Image from 'next/image'
import { useCallback } from 'react'
import type { MusicTrack, ChannelDisplay } from './TrackCard'

// ── Props ──

interface MusicMiniPlayerProps {
  track: MusicTrack
  channelDisplay?: ChannelDisplay
  isPlaying: boolean
  onTogglePlay: () => void
  onNext: () => void
  onOpenModal: () => void
  progress?: number // 0-100
}

// ═══════════════════════════════════════════════════════════════
//  MUSIC MINI PLAYER
// ═══════════════════════════════════════════════════════════════

export default function MusicMiniPlayer({
  track,
  channelDisplay,
  isPlaying,
  onTogglePlay,
  onNext,
  onOpenModal,
  progress = 0,
}: MusicMiniPlayerProps) {
  const badgeColor = channelDisplay?.badge_color || '#A78BFA'
  const thumbSrc = track.thumbnail || `https://i.ytimg.com/vi/${track.youtube_id}/mqdefault.jpg`

  const handleCenterTap = useCallback(() => {
    onOpenModal()
  }, [onOpenModal])

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-[45] h-16 border-t"
      style={{
        backgroundColor: '#141414',
        borderColor: '#1F1F1F',
      }}
    >
      {/* Progress bar 2px */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#1F1F1F]">
        <div
          className="h-full bg-[#7C3AED] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center h-full px-2 gap-2">

        {/* LEFT: Thumbnail 44×44 */}
        <div
          className="relative w-11 h-11 rounded-lg overflow-hidden bg-[#1A1A1A] flex-shrink-0 cursor-pointer"
          onClick={handleCenterTap}
        >
          <Image
            src={thumbSrc}
            alt={track.title}
            fill
            className="object-cover"
            sizes="44px"
            unoptimized
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${track.youtube_id}/mqdefault.jpg`
            }}
          />
        </div>

        {/* CENTER: Title + Channel (truncated) — tap opens modal */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={handleCenterTap}
        >
          <p className="text-white text-sm font-medium truncate">{track.title}</p>
          <p className="text-[11px] truncate" style={{ color: badgeColor }}>
            {track.channel_name}
          </p>
        </div>

        {/* RIGHT: play/pause + next */}
        <div className="flex items-center gap-0 flex-shrink-0">
          {/* Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
            aria-label="Next track"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 4l10 8-10 8V4z" />
              <rect x="17" y="5" width="2" height="14" rx="1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
