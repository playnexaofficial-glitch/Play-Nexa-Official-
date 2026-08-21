// ── Play Nexa — Game Hub Component ──────────────────────────────
// Main game browsing UI with 5 tabs, featured banner, search,
// and game playback. Fetches from Supabase with JSON fallback.
// Supports offline/download/online/mini game types.

'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Search, X, Gamepad2 } from 'lucide-react'
import { getSupabase, isSupabaseReady } from '@/lib/supabase'
import GameCard, { type Game } from './GameCard'
import GamePlayer from './GamePlayer'

// ── Tab Configuration ──────────────────────────────────────────

const TABS = [
  { key: 'all',      label: 'All Games',  icon: '🎮' },
  { key: 'offline',  label: 'Offline',    icon: '📴' },
  { key: 'download', label: 'Download',   icon: '📥' },
  { key: 'online',   label: 'Online',     icon: '🌐' },
  { key: 'mini',     label: 'Mini Games', icon: '⚡' },
] as const

type TabKey = typeof TABS[number]['key']

// ── Static JSON Fallback ───────────────────────────────────────
// Used when Supabase is unavailable. Converts games.json format
// to the new Game interface for consistent rendering.

import gamesData from '@/data/games.json'

function getFallbackGames(): Game[] {
  return gamesData.games.map(g => ({
    id: g.id,
    name: g.title,
    description: null,
    category: g.category,
    game_type: 'offline' as const,
    apk_url: null,
    web_url: g.gameUrl,
    cover_url: g.thumbnail,
    size: g.sizeLabel,
    version: '1.0',
    min_android: '5.0',
    is_featured: g.isTrending,
    is_hidden: false,
    is_free: true,
    downloads: 0,
    rating: g.rating,
    created_at: '',
    updated_at: '',
  }))
}

// ── Game Hub Component ─────────────────────────────────────────

export default function GameHub() {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Game player state
  const [playingGame, setPlayingGame] = useState<Game | null>(null)

  // ── Fetch games from Supabase ──

  const fetchGames = useCallback(async () => {
    setIsLoading(true)

    const supabase = getSupabase()

    if (!supabase || !isSupabaseReady()) {
      // Fallback to static JSON
      setGames(getFallbackGames())
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('is_hidden', false)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        setGames(data as Game[])
      } else {
        // Empty Supabase table — fall back to JSON
        setGames(getFallbackGames())
      }
    } catch {
      // Supabase error — fall back to static JSON
      setGames(getFallbackGames())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  // ── Derived data ──

  const featured = useMemo(
    () => games.filter(g => g.is_featured).slice(0, 8),
    [games]
  )

  const displayGames = useMemo(() => {
    let list = games

    // Filter by tab (game_type)
    if (activeTab !== 'all') {
      list = list.filter(g => g.game_type === activeTab)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      )
    }

    return list
  }, [games, activeTab, searchQuery])

  // ── Game action handlers ──

  const handlePlay = useCallback((game: Game) => {
    // For web-based games, open the GamePlayer
    if (game.web_url) {
      setPlayingGame(game)
      return
    }

    // For games without a web_url, try opening in new tab as fallback
    if (game.apk_url && game.game_type !== 'download') {
      window.open(game.apk_url, '_blank')
    }
  }, [])

  const handleDownload = useCallback((_game: Game) => {
    // Download tracking could be added here
    // (e.g., increment downloads count in Supabase)
  }, [])

  const handlePlayerBack = useCallback(() => {
    setPlayingGame(null)
  }, [])

  // ── If a game is being played, show the GamePlayer ──
  if (playingGame) {
    return (
      <GamePlayer
        game={playingGame}
        onBack={handlePlayerBack}
      />
    )
  }

  // ── Main Game Hub UI ──
  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">

      {/* TopBar */}
      <div className="sticky top-0 z-50 bg-[#0D0D0D]
                      border-b border-[#1E293B]
                      px-4 h-14 flex items-center
                      justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 size={20} className="text-[#7C3AED]" />
          <h1 className="text-lg font-bold text-white">
            Game Hub
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#7C3AED]
                           bg-[#7C3AED]/10 rounded-full
                           px-3 py-1">
            {games.length} Games
          </span>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-full bg-[#1A1A2E]
                       border border-[#1E293B]
                       min-h-[44px] min-w-[44px]
                       flex items-center justify-center"
          >
            {showSearch
              ? <X size={16} className="text-white" />
              : <Search size={16} className="text-white" />
            }
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="sticky top-14 z-40 bg-[#0D0D0D]
                        border-b border-[#1E293B]
                        px-4 py-3">
          <div className="relative">
            <Search size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2
                               text-[#9CA3AF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              autoFocus
              className="w-full h-11 bg-[#1A1A2E]
                         border border-[#1E293B]
                         rounded-xl pl-10 pr-4
                         text-white text-sm
                         outline-none focus:border-[#7C3AED]
                         transition-colors duration-150
                         placeholder:text-[#6B7280]"
            />
          </div>
        </div>
      )}

      {/* Featured Banner */}
      {featured.length > 0 && activeTab === 'all' && !searchQuery && (
        <div className="px-4 pt-4 mb-5">
          <div className="relative w-full h-[140px]
                          rounded-2xl overflow-hidden"
               style={{
                 background:
                   'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)'
               }}>
            <div className="absolute inset-0 p-5
                            flex flex-col justify-end">
              <p className="text-white/70 text-xs mb-1">
                ⭐ Featured
              </p>
              <h2 className="text-white font-bold text-xl">
                {featured[0]?.name || 'Play Instantly'}
              </h2>
              <p className="text-white/70 text-xs mt-1">
                No download. No install. Just play.
              </p>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8
                            w-32 h-32 rounded-full
                            bg-white/10" />
            <div className="absolute -right-4 top-8
                            w-20 h-20 rounded-full
                            bg-white/5" />
          </div>

          {/* Featured games horizontal scroll */}
          <div className="overflow-x-auto scrollbar-hide mt-3">
            <div className="flex gap-3 pb-1">
              {featured.map(game => (
                <div key={game.id} className="flex-shrink-0 w-[160px]">
                  <GameCard
                    game={game}
                    onPlay={handlePlay}
                    onDownload={handleDownload}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Row */}
      <div className="overflow-x-auto scrollbar-hide px-4 mb-4">
        <div className="flex gap-2">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 rounded-full
                         px-4 py-2 text-xs font-medium
                         transition-all duration-200
                         ${activeTab === tab.key
                           ? 'bg-[#7C3AED] text-white'
                           : 'bg-[#1A1A2E] border border-[#1E293B] text-[#9CA3AF]'
                         }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Game Grid */}
      <div className="px-4">
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">
            {activeTab === 'all'
              ? '🎮 All Games'
              : `${TABS.find(t => t.key === activeTab)?.icon || ''} ${
                  TABS.find(t => t.key === activeTab)?.label || ''
                }`
            }
          </h2>
          <span className="text-xs text-[#9CA3AF]">
            {displayGames.length} game{displayGames.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-10 h-10 border-2 border-[#7C3AED]
                            border-t-transparent rounded-full
                            animate-spin" />
            <p className="text-[#9CA3AF] text-sm">Loading games...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && displayGames.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1A2E]
                            flex items-center justify-center text-3xl">
              🎮
            </div>
            <p className="text-[#6B7280] text-sm">
              {searchQuery
                ? `No games found for "${searchQuery}"`
                : 'No games in this category yet'
              }
            </p>
          </div>
        )}

        {/* 2-column grid */}
        {!isLoading && displayGames.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {displayGames.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onPlay={handlePlay}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
