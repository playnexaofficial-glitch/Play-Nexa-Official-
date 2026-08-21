// ── Play Nexa Movie Hub — Supabase-Powered ────────────────────
// Featured banner (auto-scroll top 5), channel chips,
// Trending Now, New Releases, Per-channel sections,
// Recommended for You (based on watch history)
// AMOLED dark theme, 44px touch targets, no backdrop-blur

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { lsGet, lsSet } from '@/lib/mediaUtils'
import { formatCount } from '@/lib/types'
import MovieCard, { type Movie, type ChannelDisplay } from './MovieCard'
import MovieModal from './MovieModal'

// ── Props ──

// none — this is a self-contained page component

// ═══════════════════════════════════════════════════════════════
//  MOVIE HUB — Main Component
// ═══════════════════════════════════════════════════════════════

export default function MovieHub() {
  // ── Auth state ──
  const [userId, setUserId] = useState<string | null>(null)

  // ── Data state ──
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [channels, setChannels] = useState<ChannelDisplay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Filter state ──
  const [activeChannel, setActiveChannel] = useState<string>('all')

  // ── Modal state ──
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)

  // ── Featured banner state ──
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const featuredTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Auth ──
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id || null)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // ── Fetch all data ──
  useEffect(() => {
    const fetchAll = async () => {
      if (!supabase) {
        setError('Database not configured. Please set up Supabase.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Fetch movies
        const { data: movieData, error: mErr } = await supabase
          .from('movies')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(200)

        if (mErr) throw mErr
        const movies = (movieData || []) as Movie[]
        setAllMovies(movies)

        // Fetch channels
        const { data: chData } = await supabase
          .from('channel_display')
          .select('*')
          .eq('is_visible', true)
          .order('sort_order')

        if (chData) setChannels(chData as ChannelDisplay[])
      } catch (err: any) {
        console.error('Supabase fetch error:', err.message)
        setError('Failed to load movies. Check connection.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAll()
  }, [])

  // ── Auto-scroll featured banner ──
  const featured = [...allMovies]
    .sort((a, b) => (b.view_count + b.like_count) - (a.view_count + a.like_count))
    .slice(0, 5)

  useEffect(() => {
    if (featured.length <= 1) return
    featuredTimerRef.current = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % featured.length)
    }, 4000)
    return () => {
      if (featuredTimerRef.current) clearInterval(featuredTimerRef.current)
    }
  }, [featured.length])

  // ── Derived data ──

  // Trending: ORDER BY watch_count + like_count DESC
  const trending = [...allMovies]
    .sort((a, b) => (b.watch_count + b.like_count) - (a.watch_count + a.like_count))
    .slice(0, 10)

  // New releases: ORDER BY published_at DESC
  const newReleases = [...allMovies]
    .sort((a, b) => {
      const aDate = a.published_at ? new Date(a.published_at).getTime() : 0
      const bDate = b.published_at ? new Date(b.published_at).getTime() : 0
      return bDate - aDate
    })
    .slice(0, 8)

  // Per-channel sections
  const channelSections = channels.map(ch => {
    const chId = ch.channel_id || ch.yt_channels?.channel_id
    const chMovies = allMovies
      .filter(m => m.channel_id === chId)
      .slice(0, 6)
    return { channel: ch, movies: chMovies }
  }).filter(cs => cs.movies.length > 0)

  // Recommended: based on most watched channel from history
  const recommended = (() => {
    const history: Array<{ youtube_id: string; channel_id: string; watched_at: string }> =
      lsGet('pn_movie_history', [])

    if (history.length > 0) {
      const channelCount: Record<string, number> = {}
      history.forEach(h => {
        channelCount[h.channel_id] = (channelCount[h.channel_id] || 0) + 1
      })
      const topChannel = Object.entries(channelCount).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (topChannel) {
        const watchedIds = history.map(h => h.youtube_id)
        const recMovies = allMovies
          .filter(m => m.channel_id === topChannel && !watchedIds.includes(m.youtube_id))
          .slice(0, 10)
        if (recMovies.length > 0) return recMovies
      }
    }

    // Fallback: most viewed overall
    return [...allMovies].sort((a, b) => b.view_count - a.view_count).slice(0, 10)
  })()

  // Filtered movies by active channel
  const filteredMovies = activeChannel === 'all'
    ? allMovies
    : allMovies.filter(m => m.channel_id === activeChannel)

  // ── Get channel display for a movie ──
  const getChannelDisplay = useCallback((movie: Movie): ChannelDisplay | undefined => {
    return channels.find(ch => ch.channel_id === movie.channel_id || ch.yt_channels?.channel_id === movie.channel_id)
  }, [channels])

  // ── Handle movie selection ──
  const handleMovieSelect = useCallback((movie: Movie) => {
    setSelectedMovie(movie)
  }, [])

  // ── Render ──
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>

      {/* ── FEATURED BANNER (auto-scroll) ── */}
      {featured.length > 0 && (
        <div className="relative w-full h-[200px] flex-shrink-0 overflow-hidden">
          {featured.map((movie, i) => (
            <div
              key={movie.id}
              className="absolute inset-0 transition-opacity duration-200"
              style={{ opacity: i === featuredIndex ? 1 : 0 }}
            >
              {/* Background thumbnail */}
              <img
                src={movie.thumbnail || `https://i.ytimg.com/vi/${movie.youtube_id}/maxresdefault.jpg`}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, #0A0A0A, rgba(10,10,10,0.4), transparent)',
                }}
              />

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                <p className="text-white font-bold text-lg line-clamp-1">{movie.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const ch = getChannelDisplay(movie)
                    return (
                      <span
                        className="text-xs font-medium"
                        style={{ color: ch?.badge_color || '#9CA3AF' }}
                      >
                        {ch?.display_name || movie.channel_name}
                      </span>
                    )
                  })()}
                  {movie.published_at && (
                    <span className="text-[#9CA3AF] text-xs">
                      · {new Date(movie.published_at).getFullYear()}
                    </span>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleMovieSelect(movie)}
                    className="px-4 py-2 rounded-lg text-white text-xs font-bold min-h-[44px] flex items-center gap-1"
                    style={{ backgroundColor: '#7C3AED' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Watch Now
                  </button>
                  <button
                    className="px-4 py-2 rounded-lg text-white text-xs font-bold min-h-[44px] flex items-center gap-1"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    Save
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Dot indicators */}
          {featured.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {featured.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFeaturedIndex(i)}
                  className="min-w-[44px] min-h-[12px] flex items-center justify-center"
                  aria-label={`Go to slide ${i + 1}`}
                >
                  <div
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === featuredIndex ? 16 : 6,
                      height: 6,
                      backgroundColor: i === featuredIndex ? '#7C3AED' : 'rgba(255,255,255,0.4)',
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CHANNEL CHIPS ── */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {/* All chip */}
          <button
            onClick={() => setActiveChannel('all')}
            className={`flex items-center gap-2 flex-shrink-0 px-3 py-2 rounded-full min-h-[44px] border-2 transition-colors duration-150 ${
              activeChannel === 'all'
                ? 'border-[#7C3AED] text-[#A78BFA]'
                : 'border-[#252525] text-[#9CA3AF]'
            }`}
            style={{
              backgroundColor: activeChannel === 'all' ? 'rgba(124,58,237,0.15)' : 'transparent',
            }}
          >
            <span className="text-sm font-medium whitespace-nowrap">All</span>
          </button>

          {/* Per-channel chips */}
          {channels.map(ch => {
            const chId = ch.channel_id || ch.yt_channels?.channel_id
            if (!chId) return null
            const isActive = activeChannel === chId
            const logoUrl = ch.logo_url || ch.avatar_url || null
            return (
              <button
                key={ch.channel_id}
                onClick={() => setActiveChannel(chId)}
                className="flex items-center gap-2 flex-shrink-0 px-3 py-2 rounded-full min-h-[44px] border-2 transition-colors duration-150"
                style={{
                  borderColor: isActive ? ch.border_color : '#252525',
                  backgroundColor: isActive ? ch.badge_color + '22' : 'transparent',
                }}
              >
                {/* Channel logo circle */}
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-[#1A1A1A]">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: ch.badge_color }}
                    >
                      <span className="text-white text-xs font-bold">
                        {ch.display_name[0]}
                      </span>
                    </div>
                  )}
                </div>
                <span
                  className="text-sm font-medium whitespace-nowrap"
                  style={{ color: isActive ? ch.badge_color : '#9CA3AF' }}
                >
                  {ch.display_name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── MAIN SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ contentVisibility: 'auto' } as React.CSSProperties}>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-6">
            <div>
              <div className="h-5 w-40 bg-[#1A1A1A] rounded mb-3 animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-[#1A1A1A] animate-pulse">
                    <div className="w-full aspect-video bg-[#242424]" />
                    <div className="p-2.5 space-y-2">
                      <div className="h-3 bg-[#242424] rounded w-4/5" />
                      <div className="h-2 bg-[#242424] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-[#9CA3AF] text-sm text-center">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl text-white text-sm font-medium min-h-[44px]"
              style={{ backgroundColor: '#7C3AED' }}
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* ── CHANNEL-FILTERED VIEW ── */}
            {activeChannel !== 'all' && filteredMovies.length > 0 && (
              <div className="mb-8">
                <p className="text-white text-base font-bold mb-3">
                  {channels.find(ch => (ch.channel_id || ch.yt_channels?.channel_id) === activeChannel)?.display_name || 'Movies'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {filteredMovies.map(movie => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      channelDisplay={getChannelDisplay(movie)}
                      onTap={() => handleMovieSelect(movie)}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeChannel !== 'all' && filteredMovies.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <p className="text-[#9CA3AF] text-sm">No movies from this channel</p>
                <button
                  onClick={() => setActiveChannel('all')}
                  className="px-4 py-2 rounded-xl text-white text-xs font-medium min-h-[44px]"
                  style={{ backgroundColor: '#1A1A1A', border: '1px solid #2D2D2D' }}
                >
                  Show All
                </button>
              </div>
            )}

            {/* ── ALL CHANNELS VIEW ── */}
            {activeChannel === 'all' && (
              <>
                {/* TRENDING NOW */}
                {trending.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">🔥 Trending Now</p>
                    <div className="grid grid-cols-2 gap-3">
                      {trending.map(movie => (
                        <MovieCard
                          key={movie.id}
                          movie={movie}
                          channelDisplay={getChannelDisplay(movie)}
                          onTap={() => handleMovieSelect(movie)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* NEW RELEASES */}
                {newReleases.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">🆕 New Releases</p>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                      {newReleases.map(movie => (
                        <div key={movie.id} className="flex-shrink-0 w-[160px]">
                          <MovieCard
                            movie={movie}
                            channelDisplay={getChannelDisplay(movie)}
                            onTap={() => handleMovieSelect(movie)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PER-CHANNEL SECTIONS */}
                {channelSections.map(cs => (
                  <div key={cs.channel.channel_id} className="mb-8">
                    <p className="text-white text-base font-bold mb-3">
                      {cs.channel.display_name}
                    </p>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                      {cs.movies.map(movie => (
                        <div key={movie.id} className="flex-shrink-0 w-[160px]">
                          <MovieCard
                            movie={movie}
                            channelDisplay={cs.channel}
                            onTap={() => handleMovieSelect(movie)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* RECOMMENDED FOR YOU */}
                {recommended.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">🎯 Recommended for You</p>
                    <div className="grid grid-cols-2 gap-3">
                      {recommended.map(movie => (
                        <MovieCard
                          key={movie.id}
                          movie={movie}
                          channelDisplay={getChannelDisplay(movie)}
                          onTap={() => handleMovieSelect(movie)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {allMovies.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <p className="text-[#9CA3AF] text-sm">No movies yet</p>
                    <p className="text-[#6B7280] text-xs text-center px-8">
                      Add YouTube channels from Admin Panel to import movies automatically
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ── MOVIE MODAL ── */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          channelDisplay={getChannelDisplay(selectedMovie)}
          userId={userId}
          allMovies={allMovies}
          channels={channels}
          onClose={() => setSelectedMovie(null)}
          onMovieSelect={handleMovieSelect}
        />
      )}
    </div>
  )
}
