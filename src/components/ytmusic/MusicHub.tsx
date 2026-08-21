// ── Play Nexa YT Music Hub — Supabase-Powered ──────────────
// ONLINE music streaming from Supabase music_tracks table
// Dynamic greeting, mood chips, quick picks, recently played,
// top channels, new releases, recommended, always-visible search
// AMOLED dark theme, 44px touch targets, no backdrop-blur

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { lsGet, lsSet } from '@/lib/mediaUtils'
import { formatCount } from '@/lib/types'
import TrackCard, { type MusicTrack, type ChannelDisplay, formatTimeAgo } from './TrackCard'

// ── Mood chips config ──

const MOOD_CHIPS = [
  { key: 'Hot', icon: '🔥', filter: 'hot' },
  { key: 'New', icon: '🆕', filter: 'new' },
  { key: 'Bangla', icon: '🇧🇩', filter: 'bangla' },
  { key: 'Hindi', icon: '🇮🇳', filter: 'hindi' },
  { key: 'Happy', icon: '😊', filter: 'happy' },
  { key: 'Chill', icon: '😌', filter: 'chill' },
  { key: 'Energy', icon: '⚡', filter: 'energy' },
  { key: 'Sad', icon: '😢', filter: 'sad' },
] as const

type MoodFilter = typeof MOOD_CHIPS[number]['filter']

// ── Props ──

interface MusicHubProps {
  onTrackSelect: (track: MusicTrack, allTracks: MusicTrack[]) => void
}

// ═══════════════════════════════════════════════════════════════
//  MUSIC HUB — Main Component (Online Streaming)
// ═══════════════════════════════════════════════════════════════

export default function MusicHub({ onTrackSelect }: MusicHubProps) {
  // ── Data state ──
  const [allTracks, setAllTracks] = useState<MusicTrack[]>([])
  const [filteredTracks, setFilteredTracks] = useState<MusicTrack[]>([])
  const [channels, setChannels] = useState<ChannelDisplay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Filter state ──
  const [activeMood, setActiveMood] = useState<MoodFilter>('hot')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Section data ──
  const [quickPicks, setQuickPicks] = useState<MusicTrack[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<MusicTrack[]>([])
  const [newReleases, setNewReleases] = useState<MusicTrack[]>([])
  const [recommended, setRecommended] = useState<MusicTrack[]>([])

  // ── Greeting based on time ──
  const greeting = (() => {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) return 'Good Morning'
    if (h >= 12 && h < 17) return 'Good Afternoon'
    if (h >= 17 && h < 21) return 'Good Evening'
    return 'Good Night'
  })()

  // ── Fetch all tracks from Supabase ──
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
        // Fetch tracks
        const { data: trackData, error: tErr } = await supabase
          .from('music_tracks')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(200)

        if (tErr) throw tErr
        const tracks = (trackData || []) as MusicTrack[]
        setAllTracks(tracks)

        // Fetch channels
        const { data: chData } = await supabase
          .from('channel_display')
          .select('*')
          .eq('is_visible', true)
          .order('sort_order')

        if (chData) setChannels(chData as ChannelDisplay[])

        // Generate quick picks (random 12)
        const shuffled = [...tracks].sort(() => Math.random() - 0.5)
        setQuickPicks(shuffled.slice(0, 12))

        // New releases (first 10 from published_at DESC — already sorted)
        setNewReleases(tracks.slice(0, 10))

        // Recently played from localStorage
        const history: Array<{ youtube_id: string; channel_id: string; watched_at: string }> =
          lsGet('pn_ytmusic_history', [])
        const recentIds = history.slice(0, 10).map(h => h.youtube_id)
        const recentTracks = recentIds
          .map(id => tracks.find(t => t.youtube_id === id))
          .filter((t): t is MusicTrack => !!t)
        setRecentlyPlayed(recentTracks)

        // Recommended: most watched channel → fetch songs from that channel
        let recTracks: MusicTrack[] = []
        if (history.length > 0) {
          const channelCount: Record<string, number> = {}
          history.forEach(h => {
            channelCount[h.channel_id] = (channelCount[h.channel_id] || 0) + 1
          })
          const topChannel = Object.entries(channelCount).sort((a, b) => b[1] - a[1])[0]?.[0]
          if (topChannel) {
            recTracks = tracks
              .filter(t => t.channel_id === topChannel)
              .filter(t => !recentIds.includes(t.youtube_id))
              .slice(0, 10)
          }
        }

        // Fallback recommended: most viewed
        if (recTracks.length === 0) {
          recTracks = [...tracks].sort((a, b) => b.view_count - a.view_count).slice(0, 10)
        }
        setRecommended(recTracks)
      } catch (err: any) {
        console.error('Supabase fetch error:', err.message)
        setError('Failed to load tracks. Check connection.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAll()
  }, [])

  // ── Apply mood filter + search ──
  useEffect(() => {
    let result = [...allTracks]

    // Mood filter
    switch (activeMood) {
      case 'hot':
        result.sort((a, b) => b.view_count - a.view_count)
        break
      case 'new':
        result.sort((a, b) => {
          const aDate = a.published_at ? new Date(a.published_at).getTime() : 0
          const bDate = b.published_at ? new Date(b.published_at).getTime() : 0
          return bDate - aDate
        })
        break
      case 'bangla':
        result = result.filter(t => t.language === 'Bangla' || t.language === 'Bengali')
        break
      case 'hindi':
        result = result.filter(t => t.language === 'Hindi')
        break
      case 'happy':
      case 'chill':
      case 'energy':
      case 'sad':
        result = result.filter(t => t.mood?.toLowerCase() === activeMood)
        break
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        t => t.title.toLowerCase().includes(q) || t.channel_name.toLowerCase().includes(q)
      )
    }

    setFilteredTracks(result)
  }, [activeMood, searchQuery, allTracks])

  // ── Debounced search ──
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = useCallback((value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value)
    }, 300)
  }, [])

  // ── Handle track select ──
  const handleTrackSelect = useCallback((track: MusicTrack) => {
    onTrackSelect(track, allTracks)
  }, [onTrackSelect, allTracks])

  // ── Get channel display for a track ──
  const getChannelDisplay = useCallback((track: MusicTrack): ChannelDisplay | undefined => {
    return channels.find(ch => ch.channel_id === track.channel_id || ch.yt_channels?.channel_id === track.channel_id)
  }, [channels])

  // ── Render ──
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <div>
          <h1 className="text-white text-2xl font-bold">{greeting}</h1>
          <p className="text-[#9CA3AF] text-sm mt-0.5">What would you like to listen to?</p>
        </div>
        <div className="flex gap-1">
          {/* Notification bell */}
          <button
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#9CA3AF]"
            aria-label="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          {/* Profile icon */}
          <button
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#9CA3AF]"
            aria-label="Profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── SEARCH (always visible) ── */}
      <div className="px-4 pb-3 flex-shrink-0">
        <input
          type="text"
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search songs, artists, channels..."
          className="w-full h-11 rounded-xl px-4 text-sm text-white outline-none placeholder-[#9CA3AF]"
          style={{
            backgroundColor: '#141414',
            border: '1px solid #252525',
          }}
        />
      </div>

      {/* ── MOOD CHIPS ── */}
      <div className="flex-shrink-0 px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {MOOD_CHIPS.map(chip => {
            const isActive = activeMood === chip.filter
            return (
              <button
                key={chip.key}
                onClick={() => setActiveMood(chip.filter)}
                className={`flex items-center gap-1.5 flex-shrink-0 px-4 py-2 rounded-full min-h-[44px] text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                  isActive
                    ? 'text-white'
                    : 'border text-[#9CA3AF]'
                }`}
                style={{
                  backgroundColor: isActive ? '#7C3AED' : 'transparent',
                  borderColor: isActive ? '#7C3AED' : '#252525',
                  borderWidth: isActive ? 0 : 1,
                }}
              >
                <span>{chip.icon}</span>
                <span>{chip.key}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── MAIN SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-32" style={{ contentVisibility: 'auto' } as React.CSSProperties}>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-8">
            <div>
              <div className="h-5 w-32 bg-[#1A1A1A] rounded mb-3 animate-pulse" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-[#1A1A1A] animate-pulse">
                    <div className="w-full aspect-square bg-[#242424]" />
                    <div className="p-2 space-y-1">
                      <div className="h-2.5 bg-[#242424] rounded w-4/5" />
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
            {/* Search results */}
            {searchQuery.trim() && filteredTracks.length > 0 && (
              <div className="mb-8">
                <p className="text-white text-sm font-semibold mb-3">
                  Search Results ({filteredTracks.length})
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {filteredTracks.slice(0, 20).map(track => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      channelDisplay={getChannelDisplay(track)}
                      onTap={handleTrackSelect}
                      view="grid"
                    />
                  ))}
                </div>
              </div>
            )}

            {searchQuery.trim() && filteredTracks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-[#9CA3AF] text-sm">No results found</p>
                <p className="text-[#6B7280] text-xs">Try a different search term</p>
              </div>
            )}

            {/* Don't show sections when searching */}
            {!searchQuery.trim() && (
              <>
                {/* QUICK PICKS — 4-column horizontal scroll */}
                {quickPicks.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">Quick Picks</p>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                      {quickPicks.map(track => (
                        <div key={track.id} className="flex-shrink-0 w-[140px]">
                          <TrackCard
                            track={track}
                            channelDisplay={getChannelDisplay(track)}
                            onTap={handleTrackSelect}
                            view="grid"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RECENTLY PLAYED — list rows */}
                {recentlyPlayed.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">Recently Played</p>
                    <div className="space-y-1">
                      {recentlyPlayed.slice(0, 10).map(track => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          channelDisplay={getChannelDisplay(track)}
                          onTap={handleTrackSelect}
                          view="list"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* TOP CHANNELS — horizontal scroll circles */}
                {channels.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">Top Channels</p>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                      {channels.map(ch => {
                        const logoUrl = ch.logo_url || ch.avatar_url || null
                        return (
                          <button
                            key={ch.channel_id}
                            className="flex flex-col items-center gap-2 flex-shrink-0 min-w-[64px] min-h-[44px]"
                          >
                            <div
                              className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
                              style={{
                                border: `2px solid ${ch.border_color}`,
                                backgroundColor: '#1A1A1A',
                              }}
                            >
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  alt={ch.display_name}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center"
                                  style={{ backgroundColor: ch.badge_color }}
                                >
                                  <span className="text-white text-lg font-bold">
                                    {ch.display_name[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] text-[#9CA3AF] truncate max-w-[56px] text-center">
                              {ch.display_name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* NEW RELEASES — 2-column grid, horizontal scroll */}
                {newReleases.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">New Releases</p>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                      {newReleases.map(track => (
                        <div key={track.id} className="flex-shrink-0 w-[160px]">
                          <TrackCard
                            track={track}
                            channelDisplay={getChannelDisplay(track)}
                            onTap={handleTrackSelect}
                            view="grid"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MOOD-FILTERED TRACKS — main content when mood is active */}
                {activeMood !== 'hot' && filteredTracks.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">
                      {MOOD_CHIPS.find(c => c.filter === activeMood)?.icon}{' '}
                      {MOOD_CHIPS.find(c => c.filter === activeMood)?.key} Tracks
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {filteredTracks.slice(0, 20).map(track => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          channelDisplay={getChannelDisplay(track)}
                          onTap={handleTrackSelect}
                          view="grid"
                        />
                      ))}
                    </div>
                    {filteredTracks.length === 0 && (
                      <p className="text-[#9CA3AF] text-sm text-center py-4">
                        No tracks found for this mood
                      </p>
                    )}
                  </div>
                )}

                {/* RECOMMENDED — 2-column grid */}
                {recommended.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">🎯 Recommended for You</p>
                    <div className="grid grid-cols-2 gap-3">
                      {recommended.map(track => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          channelDisplay={getChannelDisplay(track)}
                          onTap={handleTrackSelect}
                          view="grid"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* HOT TRACKS — default when mood is Hot */}
                {activeMood === 'hot' && filteredTracks.length > 0 && (
                  <div className="mb-8">
                    <p className="text-white text-base font-bold mb-3">🔥 Hot Tracks</p>
                    <div className="grid grid-cols-2 gap-3">
                      {filteredTracks.slice(0, 20).map(track => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          channelDisplay={getChannelDisplay(track)}
                          onTap={handleTrackSelect}
                          view="grid"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {allTracks.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <p className="text-[#9CA3AF] text-sm">No music yet</p>
                    <p className="text-[#6B7280] text-xs text-center px-8">
                      Add music channels from Admin Panel to import tracks automatically
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
