'use client'

// ── Play Nexa Persistent Mini Player ────────────────────────
// Spotify/PLAYit hybrid dock at bottom
// Play/Pause · Next Track · Progress bar · Track name
// Stays alive across tab switches inside Local Hub
// 2GB RAM safe: no backdrop-blur, GPU transforms only

import { useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipForward, X, Music } from 'lucide-react'
import type { LocalTrack } from './MusicListView'

interface MiniPlayerProps {
  track: LocalTrack
  isPlaying: boolean
  onToggle: () => void
  onNext: () => void
  onClose: () => void
  onProgress: (percent: number) => void
}

export default function MiniPlayer({
  track, isPlaying, onToggle, onNext, onClose, onProgress
}: MiniPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<number>(0)

  // Sync audio element
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    if (track.url) {
      el.src = track.url
      if (isPlaying) el.play().catch(() => {})
    }
  }, [track.url])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (isPlaying) el.play().catch(() => {})
    else el.pause()
  }, [isPlaying])

  // Track progress
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onTime = () => {
      if (el.duration > 0) {
        const pct = (el.currentTime / el.duration) * 100
        progressRef.current = pct
        onProgress(pct)
      }
    }

    const onEnd = () => { onNext() }

    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnd)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnd)
    }
  }, [onProgress, onNext])

  const handleClose = useCallback(() => {
    const el = audioRef.current
    if (el) { el.pause(); el.src = '' }
    onClose()
  }, [onClose])

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      const el = audioRef.current
      if (el) { el.pause(); el.src = ''; el.load() }
    }
  }, [])

  return (
    <div className="fixed bottom-16 left-0 right-0 z-[9998] px-2
                    animate-[slide-up_300ms_ease-out]">
      <div className="bg-black border border-neutral-800 rounded-2xl overflow-hidden
                      shadow-[0_-4px_24px_rgba(0,0,0,0.8)]">
        {/* Thin progress bar */}
        <div className="h-[2px] bg-neutral-800 w-full">
          <div
            className="h-full bg-[#7C5CFF] transition-all duration-300 ease-linear"
            style={{ width: `${progressRef.current}%` }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          {/* Track icon */}
          <div className="w-10 h-10 rounded-lg bg-[#7C5CFF]/15 flex items-center justify-center flex-shrink-0">
            <Music size={18} className="text-[#7C5CFF]" />
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{track.name}</p>
            <p className="text-neutral-500 text-[10px]">
              {isPlaying ? 'Now playing' : 'Paused'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggle}
              className="w-10 h-10 rounded-full bg-[#7C5CFF] flex items-center justify-center
                         active:scale-90 transition-transform duration-100"
            >
              {isPlaying
                ? <Pause size={18} className="text-white" />
                : <Play size={18} className="text-white ml-0.5" />
              }
            </button>
            <button
              onClick={onNext}
              className="w-9 h-9 rounded-full flex items-center justify-center
                         active:scale-90 transition-transform duration-100"
            >
              <SkipForward size={16} className="text-neutral-400" />
            </button>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full flex items-center justify-center
                         active:scale-90 transition-transform duration-100"
            >
              <X size={14} className="text-neutral-500" />
            </button>
          </div>
        </div>

        <audio ref={audioRef} preload="metadata" />
      </div>
    </div>
  )
}
