// ── Play Nexa — Game Card Component ──────────────────────────────
// Displays a game with type-aware action buttons.
// offline/mini → [Play Now]
// download    → [Download] → progress → [Play]
// online      → [Play Online]
// Shows badges: game_type, FREE, Featured, Downloaded

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Star, Download, Play, Globe, Wifi, WifiOff, Zap } from 'lucide-react'
import { useGameDownload } from '@/hooks/useGameDownload'

// ── Types ──────────────────────────────────────────────────────

export interface Game {
  id: string
  name: string
  description: string | null
  category: string
  game_type: 'offline' | 'download' | 'online' | 'mini'
  apk_url: string | null
  web_url: string | null
  cover_url: string
  size: string
  version: string
  min_android: string
  is_featured: boolean
  is_hidden: boolean
  is_free: boolean
  downloads: number
  rating: number
  created_at: string
  updated_at: string
}

// Legacy format from games.json (backward compat with games/[id] page)
export interface LegacyGame {
  id: string
  title: string
  thumbnail: string
  gameUrl: string
  category: string
  rating: number
  isTrending: boolean
  isMultiplayer: boolean
  sizeLabel: string
  performanceLevel: string
  source: string
  orientation: string
}

/** Convert legacy JSON game to the new Game interface */
export function toGame(legacy: LegacyGame): Game {
  return {
    id: legacy.id,
    name: legacy.title,
    description: null,
    category: legacy.category,
    game_type: 'offline',
    apk_url: null,
    web_url: legacy.gameUrl,
    cover_url: legacy.thumbnail,
    size: legacy.sizeLabel,
    version: '1.0',
    min_android: '5.0',
    is_featured: legacy.isTrending,
    is_hidden: false,
    is_free: true,
    downloads: 0,
    rating: legacy.rating,
    created_at: '',
    updated_at: '',
  }
}

// Accept both new Game and legacy format
type GameInput = Game | LegacyGame

interface GameCardProps {
  game: GameInput
  size?: 'normal' | 'large'
  onPlay?: (game: Game) => void
  onDownload?: (game: Game) => void
}

// ── Badge Config ───────────────────────────────────────────────

const TYPE_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  offline:  { label: 'Offline',  icon: '📴', color: 'bg-gray-600/80 text-gray-200' },
  download: { label: 'Download', icon: '📥', color: 'bg-blue-600/80 text-blue-100' },
  online:   { label: 'Online',   icon: '🌐', color: 'bg-emerald-600/80 text-emerald-100' },
  mini:     { label: 'Mini',     icon: '⚡', color: 'bg-amber-600/80 text-amber-100' },
}

// ── Rating Stars ───────────────────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
  if (rating <= 0) return null
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={9}
          className={star <= Math.round(rating)
            ? 'text-yellow-400 fill-yellow-400'
            : 'text-gray-600'
          }
        />
      ))}
      <span className="text-[9px] text-yellow-400 ml-0.5">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

// ── Game Card Component ────────────────────────────────────────

export default function GameCard({ game: rawGame, size = 'normal', onPlay, onDownload }: GameCardProps) {
  // Normalize: convert legacy format to new Game interface
  const game: Game = 'title' in rawGame ? toGame(rawGame as LegacyGame) : rawGame as Game

  const {
    isDownloading,
    isDownloaded,
    progress,
    error,
    checkDownloaded,
    downloadGame,
    launchGame,
    clearError,
  } = useGameDownload()

  const [showError, setShowError] = useState(false)

  // Check if APK game is already downloaded
  useEffect(() => {
    if (game.game_type === 'download' && game.apk_url) {
      checkDownloaded(game.id)
    }
  }, [game.id, game.game_type, game.apk_url, checkDownloaded])

  // Auto-hide errors after 4 seconds
  useEffect(() => {
    if (error) {
      setShowError(true)
      const timer = setTimeout(() => {
        setShowError(false)
        clearError()
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  // ── Action button based on game_type ──

  const handleAction = useCallback(() => {
    switch (game.game_type) {
      case 'offline':
      case 'mini':
        // Play HTML5 game in iframe
        onPlay?.(game)
        break

      case 'download':
        if (isDownloaded) {
          // Launch downloaded APK
          launchGame(game.id)
        } else if (!isDownloading) {
          // Start download
          if (game.apk_url) {
            downloadGame(game.id, game.apk_url)
            onDownload?.(game)
          }
        }
        break

      case 'online':
        // Play online game in iframe
        onPlay?.(game)
        break
    }
  }, [game, isDownloaded, isDownloading, onPlay, onDownload, downloadGame, launchGame])

  const typeBadge = TYPE_BADGES[game.game_type] || TYPE_BADGES.offline

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden
                    bg-[#111827] border border-[#1E293B]
                    active:scale-[0.97]
                    transition-transform duration-150">

      {/* Cover Image */}
      <div className="relative w-full aspect-video bg-[#1A1A2E]">
        <Image
          src={game.cover_url}
          alt={game.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 220px"
          loading="lazy"
          unoptimized
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-0"
             style={{
               background: 'linear-gradient(to top, #070B14 0%, transparent 60%)'
             }}
        />

        {/* Game type badge — top left */}
        <span className={`absolute top-2 left-2
                          text-[9px] font-bold
                          rounded-full px-2 py-0.5
                          ${typeBadge.color}`}>
          {typeBadge.icon} {typeBadge.label}
        </span>

        {/* FREE badge — top right */}
        {game.is_free && (
          <span className="absolute top-2 right-2
                           bg-emerald-500/80 text-white
                           text-[9px] font-bold
                           rounded-full px-2 py-0.5">
            FREE
          </span>
        )}

        {/* Featured star — if not free, show star in corner */}
        {game.is_featured && !game.is_free && (
          <span className="absolute top-2 right-2
                           bg-amber-500/80 text-white
                           text-[9px] font-bold
                           rounded-full px-2 py-0.5">
            ★
          </span>
        )}

        {/* Featured star — shown alongside FREE badge */}
        {game.is_featured && game.is_free && (
          <span className="absolute top-8 right-2
                           bg-amber-500/80 text-white
                           text-[9px] font-bold
                           rounded-full px-1.5 py-0.5">
            ★
          </span>
        )}

        {/* Downloaded badge */}
        {isDownloaded && game.game_type === 'download' && (
          <span className="absolute bottom-2 left-2
                           bg-emerald-500/90 text-white
                           text-[9px] font-bold
                           rounded-full px-2 py-0.5
                           flex items-center gap-1">
            ✓ Downloaded
          </span>
        )}

        {/* Action button — bottom right overlay */}
        <button
          onClick={handleAction}
          disabled={isDownloading}
          className={`absolute bottom-2 right-2
                     flex items-center gap-1.5
                     text-[10px] font-bold
                     rounded-full px-3 py-1.5
                     transition-all duration-150
                     active:scale-95
                     min-h-[32px]
                     ${isDownloading
                       ? 'bg-gray-700/90 text-gray-300 cursor-wait'
                       : game.game_type === 'download' && isDownloaded
                         ? 'bg-emerald-500/90 text-white'
                         : 'bg-[#7C3AED]/90 text-white'
                     }`}
        >
          {game.game_type === 'offline' && (
            <><WifiOff size={11} /> Play</>
          )}
          {game.game_type === 'mini' && (
            <><Zap size={11} /> Play</>
          )}
          {game.game_type === 'online' && (
            <><Globe size={11} /> Play</>
          )}
          {game.game_type === 'download' && isDownloading && (
            <><Download size={11} className="animate-pulse" /> {progress}%</>
          )}
          {game.game_type === 'download' && !isDownloading && isDownloaded && (
            <><Play size={11} /> Play</>
          )}
          {game.game_type === 'download' && !isDownloading && !isDownloaded && (
            <><Download size={11} /> Get</>
          )}
        </button>
      </div>

      {/* Download progress bar */}
      {isDownloading && game.game_type === 'download' && (
        <div className="w-full h-1.5 bg-[#1A1A2E]">
          <div
            className="h-full bg-[#7C3AED] transition-all duration-300 rounded-r-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error banner */}
      {showError && error && (
        <div className="w-full px-2 py-1.5 bg-red-900/40
                        border-b border-red-800/30">
          <p className="text-[9px] text-red-300 truncate">
            {error}
          </p>
        </div>
      )}

      {/* Info section */}
      <div className="p-2.5">
        <p className="text-white text-xs font-semibold
                      line-clamp-1 mb-1">
          {game.name}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category badge */}
          <span className="bg-[#7C3AED]/20 text-[#7C3AED]
                           border border-[#7C3AED]/30
                           text-[9px] rounded-full
                           px-1.5 py-0.5">
            {game.category}
          </span>

          {/* Size (for download games) */}
          {game.game_type === 'download' && game.size && (
            <span className="text-[#9CA3AF] text-[9px]">
              {game.size}
            </span>
          )}

          {/* Rating */}
          <RatingStars rating={game.rating} />
        </div>
      </div>
    </div>
  )
}
