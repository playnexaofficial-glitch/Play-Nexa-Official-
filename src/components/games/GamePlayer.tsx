// ── Play Nexa — Game Player Component ───────────────────────────
// Full-screen game playback via iframe (HTML5 / web games).
// Controls overlay: tap to show/hide (back + fullscreen).
// Works for offline, mini, and online game types.

'use client'

import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, Maximize2, Minimize2 } from 'lucide-react'
import type { Game } from './GameCard'

interface GamePlayerProps {
  game: Game
  onBack: () => void
}

export default function GamePlayer({ game, onBack }: GamePlayerProps) {
  const [loaded, setLoaded] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Determine the game URL to load in the iframe
  const gameUrl = game.web_url || game.apk_url || ''

  // Auto-hide controls after 3 seconds
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      if (loaded) setShowControls(false)
    }, 3000)
  }, [loaded])

  // Tap handler for the game area
  const handleGameAreaTap = useCallback(() => {
    if (showControls) {
      setShowControls(false)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    } else {
      showControlsTemporarily()
    }
  }, [showControls, showControlsTemporarily])

  if (!gameUrl) {
    return (
      <div className="min-h-screen bg-[#0D0D0D]
                      flex flex-col items-center
                      justify-center gap-4 px-6">
        <div className="w-16 h-16 rounded-2xl bg-[#1A1A2E]
                        flex items-center justify-center text-3xl">
          🎮
        </div>
        <p className="text-white font-bold text-lg text-center">
          Game URL not available
        </p>
        <p className="text-[#9CA3AF] text-sm text-center">
          This game doesn&apos;t have a playable URL configured yet.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-xl
                     bg-[#7C3AED] text-white
                     text-sm font-semibold
                     min-h-[44px]
                     active:scale-95
                     transition-transform duration-150"
        >
          ← Go Back
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-black ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>

      {/* Loading state */}
      {!loaded && (
        <div className="absolute inset-0 z-20
                        bg-[#0D0D0D] flex flex-col
                        items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0
                            rounded-full border-2
                            border-[#7C3AED]/20" />
            <div className="absolute inset-0
                            rounded-full border-t-2
                            border-[#7C3AED]
                            animate-spin" />
            <div className="absolute inset-0
                            flex items-center
                            justify-center text-2xl">
              🎮
            </div>
          </div>
          <p className="text-white font-semibold text-sm">
            Loading {game.name}...
          </p>
          <p className="text-[#9CA3AF] text-xs">
            Preparing game engine
          </p>
        </div>
      )}

      {/* Game iframe */}
      <div
        className={`${fullscreen ? 'w-full h-full' : 'w-full'}`}
        onClick={handleGameAreaTap}
      >
        <iframe
          src={gameUrl}
          className={`w-full border-none
                      ${fullscreen
                        ? 'h-screen'
                        : 'h-[55vw] min-h-[280px] max-h-[70vh]'
                      }`}
          allowFullScreen
          allow="autoplay; fullscreen;
                 accelerometer; gyroscope;
                 payment; clipboard-write"
          onLoad={() => {
            setLoaded(true)
            showControlsTemporarily()
          }}
          style={{ border: 'none', display: 'block' }}
          title={game.name}
        />
      </div>

      {/* Controls overlay (show/hide on tap) */}
      {loaded && showControls && (
        <div className={`absolute inset-x-0 top-0 z-30
                         bg-gradient-to-b from-black/70 to-transparent
                         px-4 pt-3 pb-8
                         transition-opacity duration-300
                         ${fullscreen ? 'fixed' : 'absolute'}`}>
          <div className="flex items-center justify-between">
            {/* Back button + game name */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-full bg-black/50
                           border border-white/10
                           active:scale-90
                           transition-transform duration-150
                           min-h-[44px] min-w-[44px]
                           flex items-center justify-center"
              >
                <ChevronLeft size={18} className="text-white" />
              </button>
              <p className="text-white font-semibold
                            text-sm line-clamp-1 max-w-[200px]">
                {game.name}
              </p>
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 rounded-full bg-black/50
                         border border-white/10
                         active:scale-90
                         transition-transform duration-150
                         min-h-[44px] min-w-[44px]
                         flex items-center justify-center"
            >
              {fullscreen
                ? <Minimize2 size={16} className="text-white" />
                : <Maximize2 size={16} className="text-white" />
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
