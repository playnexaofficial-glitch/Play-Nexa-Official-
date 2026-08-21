// Game plays INSIDE app — no new tab
// Fullscreen iframe
// Recently played saved to localStorage

"use client"
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Maximize2,
  Star, Share2, Zap, Users
} from 'lucide-react'
import gamesData from '@/data/games.json'
import GameCard from '@/components/games/GameCard'

const games = gamesData.games

export default function GamePlayerPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = use(params)
  const router = useRouter()
  const game   = games.find(g => g.id === id)
  const [fullscreen, setFullscreen] = useState(false)
  const [loaded, setLoaded]         = useState(false)

  // Save to recently played
  useEffect(() => {
    if (!game) return
    const saved = localStorage.getItem('pn_recent_games') || localStorage.getItem('grovix_recent_games')
    const recent: string[] = saved ? JSON.parse(saved) : []
    const updated = [
      game.id,
      ...recent.filter(rid => rid !== game.id)
    ].slice(0, 10)
    localStorage.setItem(
      'pn_recent_games',
      JSON.stringify(updated)
    )
  }, [game])

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0D0D0D]
                      flex flex-col items-center
                      justify-center gap-4">
        <p className="text-5xl">🎮</p>
        <p className="text-white font-bold">
          Game not found
        </p>
        <button
          onClick={() => router.back()}
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

  // Related games from same category
  const related = games.filter(
    g => g.category === game.category && g.id !== game.id
  ).slice(0, 4)

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">

      {/* TopBar */}
      <div className={`sticky top-0 z-50 bg-[#0D0D0D]
                       border-b border-[#1E293B]
                       px-4 h-14 flex items-center
                       justify-between
                       ${fullscreen ? 'hidden' : ''}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-[#1A1A2E]
                       border border-[#1E293B]
                       active:scale-90
                       transition-transform duration-150
                       min-h-[44px] min-w-[44px]
                       flex items-center justify-center"
          >
            <ChevronLeft size={18}
                         className="text-white" />
          </button>
          <p className="text-white font-semibold
                        text-sm line-clamp-1 max-w-[160px]">
            {game.title}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 rounded-full bg-[#1A1A2E]
                       border border-[#1E293B]
                       active:scale-90
                       transition-transform duration-150
                       min-h-[44px] min-w-[44px]
                       flex items-center justify-center"
          >
            <Maximize2 size={16}
                       className="text-white" />
          </button>
        </div>
      </div>

      {/* Game iframe */}
      <div className={`relative bg-black
                       ${fullscreen
                         ? 'fixed inset-0 z-40'
                         : 'w-full'
                       }`}>

        {/* Loading state */}
        {!loaded && (
          <div className="absolute inset-0 z-10
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
              Loading {game.title}...
            </p>
            <p className="text-[#9CA3AF] text-xs">
              Preparing game engine
            </p>
          </div>
        )}

        {/* Game iframe — plays inside app */}
        <iframe
          src={game.gameUrl}
          className={`w-full border-none
                      ${fullscreen
                        ? 'h-screen'
                        : game.orientation === 'portrait'
                          ? 'h-[120vw] min-h-[420px] max-h-[70vh]'
                          : 'h-[55vw] min-h-[280px]'
                      }`}
          allowFullScreen
          allow="autoplay; fullscreen;
                 accelerometer; gyroscope;
                 payment"
          onLoad={() => setLoaded(true)}
          style={{ border: 'none', display: 'block' }}
          title={game.title}
        />

        {/* Exit fullscreen button */}
        {fullscreen && (
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 z-50
                       bg-black/70 rounded-full p-2.5
                       active:scale-90
                       transition-transform duration-150
                       min-h-[44px] min-w-[44px]
                       flex items-center justify-center"
          >
            <ChevronLeft size={20}
                         className="text-white" />
          </button>
        )}
      </div>

      {/* Game Info */}
      {!fullscreen && (
        <div className="px-4 pt-4">

          {/* Title + Rating */}
          <div className="flex items-start
                          justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-lg font-bold
                             text-white mb-1">
                {game.title}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1
                                 text-yellow-400 text-sm">
                  <Star size={14} fill="currentColor" />
                  {game.rating}
                </span>
                <span className="bg-[#7C3AED]/20
                                 text-[#7C3AED]
                                 border border-[#7C3AED]/30
                                 text-xs rounded-full
                                 px-2 py-0.5">
                  {game.category}
                </span>
                {game.isMultiplayer && (
                  <span className="flex items-center gap-1
                                   bg-[#06B6D4]/20
                                   text-[#06B6D4]
                                   border border-[#06B6D4]/30
                                   text-xs rounded-full
                                   px-2 py-0.5">
                    <Users size={10} />
                    Multiplayer
                  </span>
                )}
                <span className="flex items-center gap-1
                                 bg-[#1A1A2E]
                                 border border-[#1E293B]
                                 text-[#9CA3AF] text-xs
                                 rounded-full
                                 px-2 py-0.5">
                  <Zap size={10} />
                  {game.sizeLabel}
                </span>
                {game.orientation && (
                  <span className="bg-[#1A1A2E]
                                   border border-[#1E293B]
                                   text-[#9CA3AF] text-xs
                                   rounded-full
                                   px-2 py-0.5">
                    {game.orientation === 'portrait' ? '📱 Portrait' : '🖥️ Landscape'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Performance badge */}
          <div className="mb-4">
            <span className={`text-[11px] rounded-full
                             px-2.5 py-1 font-medium
                             ${game.performanceLevel === 'Low-End Friendly'
                               ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                               : game.performanceLevel === 'Mid-Range'
                                 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                                 : 'bg-red-500/10 text-red-400 border border-red-500/30'
                             }`}>
              {game.performanceLevel === 'Low-End Friendly'
                ? '✅ ' + game.performanceLevel
                : game.performanceLevel === 'Mid-Range'
                  ? '⚡ ' + game.performanceLevel
                  : '🔥 ' + game.performanceLevel
              }
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setFullscreen(true)}
              className="flex-1 h-12 rounded-xl
                         bg-[#7C3AED] text-white
                         text-sm font-semibold
                         flex items-center
                         justify-center gap-2
                         active:scale-95
                         transition-transform duration-150"
            >
              <Maximize2 size={16} />
              Fullscreen
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.share({
                    title: game.title,
                    text: `Play ${game.title} on Play Nexa`,
                    url: window.location.href
                  })
                } catch {}
              }}
              className="h-12 px-4 rounded-xl
                         bg-[#1A1A2E] border border-[#1E293B]
                         text-white text-sm
                         flex items-center gap-2
                         active:scale-95
                         transition-transform duration-150
                         min-h-[44px]"
            >
              <Share2 size={16} />
            </button>
          </div>

          {/* More games from same category */}
          {related.length > 0 && (
            <div>
              <h3 className="text-base font-semibold
                             text-white mb-3">
                🎮 More {game.category} Games
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {related.map(g => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
