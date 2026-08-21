"use client"
import {
  useState, useEffect,
  useCallback, useRef
} from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { X, Search, Clock, TrendingUp, Loader2, Film, Music2, Sparkles } from 'lucide-react'
import {
  universalSearch,
  getTypeBadge,
  SearchResult
} from '@/lib/universalSearch'

// ──────────────────────────────────────────────────────────────
//  Types for LIVE Supabase results
// ──────────────────────────────────────────────────────────────

interface LiveMediaResult {
  id: string
  type: 'movie' | 'music'
  title: string
  subtitle: string
  thumbnail: string | null
  href: string
  channel?: string | null
  durationSec?: number | null
  source?: string | null
}

interface LiveSearchResponse {
  query: string
  movies: LiveMediaResult[]
  music: LiveMediaResult[]
  total: number
  ts: number
  error?: string
}

// ──────────────────────────────────────────────────────────────
//  Component
// ──────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean
  onClose: () => void
}

const POPULAR = [
  'Action Movies', 'Anime', 'Hindi Dubbed',
  'Racing Games', 'Sci-Fi', 'Korean Movies',
  'Download', 'Shorts'
]

// ⏱ Debounce window — 300ms balances responsiveness vs DB load
const DEBOUNCE_MS = 300

export default function UniversalSearch(
  { isOpen, onClose }: Props
) {
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Search state ──
  const [query, setQuery]           = useState('')
  const [liveMovies, setLiveMovies] = useState<LiveMediaResult[]>([])
  const [liveMusic, setLiveMusic]   = useState<LiveMediaResult[]>([])
  const [staticResults, setStaticResults] = useState<SearchResult[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Recents ──
  const [recent, setRecent] = useState<string[]>([])

  // ── Abort controller ref — cancels in-flight fetches on new keystroke ──
  const abortRef = useRef<AbortController | null>(null)

  // Auto focus when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      const r = localStorage.getItem('pn_search_recent')
      if (r) {
        try { setRecent(JSON.parse(r)) } catch { /* ignore */ }
      }
    } else {
      // Reset on close
      setQuery('')
      setLiveMovies([])
      setLiveMusic([])
      setStaticResults([])
      setFetchError(null)
      setIsFetching(false)
      abortRef.current?.abort()
    }
  }, [isOpen])

  // ────────────────────────────────────────────────────────────
  //  DEBOUNCED LIVE SEARCH
  //  - 300ms setTimeout debounce
  //  - Aborts prior in-flight fetches
  //  - Bypasses Next.js cache via cache: 'no-store' + headers
  //  - Combines live Supabase results with local static features
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.trim()

    // ── Empty query → clear everything immediately ──
    if (!q) {
      setLiveMovies([])
      setLiveMusic([])
      setStaticResults([])
      setFetchError(null)
      setIsFetching(false)
      abortRef.current?.abort()
      return
    }

    // ── (A) Fire local static search immediately (instant, no debounce) ──
    //  This gives users instant feature/page nav results while the
    //  live DB query is debounced.
    setStaticResults(universalSearch(q).filter(r => r.type !== 'movie'))

    // ── (B) Debounce the live DB query ──
    setIsFetching(true)
    setFetchError(null)

    // Cancel any pending debounce + in-flight fetch
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timeoutId = setTimeout(async () => {
      try {
        const url = `/api/search/live?q=${encodeURIComponent(q)}&limit=20`
        const res = await fetch(url, {
          signal: controller.signal,
          // ⛔ Bypass all caches — always hit Supabase fresh
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        })

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const data: LiveSearchResponse = await res.json()
        if (controller.signal.aborted) return

        setLiveMovies(data.movies || [])
        setLiveMusic(data.music || [])
        setFetchError(data.error || null)
      } catch (err: any) {
        if (err?.name === 'AbortError') return // expected on new keystroke
        console.warn('[UniversalSearch] live fetch failed:', err?.message)
        setFetchError(err?.message || 'Live search failed')
        setLiveMovies([])
        setLiveMusic([])
      } finally {
        if (!controller.signal.aborted) setIsFetching(false)
      }
    }, DEBOUNCE_MS)

    // ── Cleanup on unmount or new keystroke ──
    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  // ────────────────────────────────────────────────────────────
  //  Selection handlers
  // ────────────────────────────────────────────────────────────

  const saveRecent = useCallback((title: string) => {
    setRecent(prev => {
      const updated = [title, ...prev.filter(r => r !== title)].slice(0, 8)
      localStorage.setItem('pn_search_recent', JSON.stringify(updated))
      return updated
    })
  }, [])

  const handleSelectLive = useCallback((result: LiveMediaResult) => {
    saveRecent(result.title)
    onClose()
    router.push(result.href)
  }, [router, onClose, saveRecent])

  const handleSelectStatic = useCallback((result: SearchResult) => {
    saveRecent(result.title)
    onClose()
    router.push(result.href)
  }, [router, onClose, saveRecent])

  const handlePopular = useCallback((term: string) => {
    setQuery(term)
  }, [])

  const clearRecent = () => {
    setRecent([])
    localStorage.removeItem('pn_search_recent')
  }

  if (!isOpen) return null

  // ── Derived totals for header ──
  const totalLive = liveMovies.length + liveMusic.length
  const totalStatic = staticResults.length
  const totalResults = totalLive + totalStatic
  const hasQuery = !!query.trim()
  const showNoResults =
    hasQuery &&
    !isFetching &&
    totalResults === 0 &&
    !fetchError

  return (
    <div
      className="fixed inset-0 z-[100]
                 bg-[#070B14] flex flex-col"
      style={{ touchAction: 'manipulation' }}
    >
      {/* ─────────────────────────────────────────────────────── */}
      {/*  Search Input Bar                                       */}
      {/* ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3
                      px-4 h-14 border-b border-[#1E293B]
                      flex-shrink-0">
        <div className="flex-1 flex items-center gap-3
                        bg-[#111827] border border-[#1E293B]
                        rounded-2xl px-4 h-11
                        focus-within:border-[#7C5CFF]
                        transition-colors duration-200">
          <Search size={16} className="text-[#94A3B8]
                                       flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search movies, music, features..."
            className="flex-1 bg-transparent text-white
                       text-sm outline-none
                       placeholder-[#94A3B8]"
          />
          {isFetching && (
            <Loader2 size={14} className="text-[#7C5CFF] animate-spin flex-shrink-0" />
          )}
          {query && !isFetching && (
            <button
              onClick={() => setQuery('')}
              className="p-0.5 active:scale-90
                         transition-transform duration-150"
            >
              <X size={14} className="text-[#94A3B8]" />
            </button>
          )}
        </div>

        {/* Cancel button */}
        <button
          onClick={onClose}
          className="text-[#7C5CFF] text-sm
                     font-semibold flex-shrink-0
                     active:scale-95
                     transition-transform duration-150"
        >
          Cancel
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────── */}
      {/*  Results / Default state                                */}
      {/* ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ──────────────────────────────────────────────────── */}
        {/*  SEARCH RESULTS (when query is non-empty)            */}
        {/* ──────────────────────────────────────────────────── */}
        {hasQuery && (
          <div className="px-4 pt-3 pb-8">

            {/* ── Error banner ── */}
            {fetchError && (
              <div className="bg-red-500/10 border border-red-500/20
                              rounded-xl p-3 mb-4 text-xs text-red-400">
                ⚠️ Live search failed: {fetchError}. Showing local results only.
              </div>
            )}

            {/* ── No results state ── */}
            {showNoResults && (
              <div className="flex flex-col items-center
                              justify-center mt-20 gap-3">
                <p className="text-4xl">🔍</p>
                <p className="text-white font-semibold">
                  No results for &quot;{query}&quot;
                </p>
                <p className="text-[#94A3B8] text-sm">
                  Try different keywords
                </p>
              </div>
            )}

            {/* ── Results header ── */}
            {totalResults > 0 && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#94A3B8] text-xs">
                  {totalResults} result{totalResults !== 1 ? 's' : ''}
                  {isFetching && <span className="text-[#7C5CFF] ml-2">• searching…</span>}
                </p>
                <span className="text-[10px] text-[#475569] uppercase tracking-wider">
                  Live from DB
                </span>
              </div>
            )}

            {/* ─────────────────────────────────────────────── */}
            {/*  🎬 MOVIES section (live from Supabase)         */}
            {/* ─────────────────────────────────────────────── */}
            {liveMovies.length > 0 && (
              <Section
                icon={<Film size={13} className="text-[#7C5CFF]" />}
                label="Movies"
                count={liveMovies.length}
              >
                <div className="space-y-2">
                  {liveMovies.map(r => (
                    <LiveResultCard
                      key={`mv-${r.id}`}
                      result={r}
                      onSelect={handleSelectLive}
                      accentColor="#7C5CFF"
                      badgeLabel="Movie"
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* ─────────────────────────────────────────────── */}
            {/*  🎵 MUSIC section (live from Supabase)          */}
            {/* ─────────────────────────────────────────────── */}
            {liveMusic.length > 0 && (
              <Section
                icon={<Music2 size={13} className="text-[#22C55E]" />}
                label="Music"
                count={liveMusic.length}
              >
                <div className="space-y-2">
                  {liveMusic.map(r => (
                    <LiveResultCard
                      key={`mu-${r.id}`}
                      result={r}
                      onSelect={handleSelectLive}
                      accentColor="#22C55E"
                      badgeLabel="Music"
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* ─────────────────────────────────────────────── */}
            {/*  ⚡ FEATURES / PAGES section (static local)     */}
            {/* ─────────────────────────────────────────────── */}
            {staticResults.length > 0 && (
              <Section
                icon={<Sparkles size={13} className="text-[#00D4FF]" />}
                label="Features & Pages"
                count={staticResults.length}
              >
                <div className="space-y-2">
                  {staticResults.map(result => {
                    const badge = getTypeBadge(result.type)
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelectStatic(result)}
                        className="w-full flex items-center
                                   gap-3 bg-[#111827]
                                   border border-[#1E293B]
                                   rounded-2xl p-3
                                   active:scale-95
                                   transition-transform
                                   duration-150"
                      >
                        {result.thumbnail ? (
                          <div className="w-14 h-10
                                          rounded-xl
                                          overflow-hidden
                                          flex-shrink-0
                                          bg-[#1E293B]">
                            <Image
                              src={result.thumbnail}
                              alt={result.title}
                              width={56}
                              height={40}
                              className="object-cover
                                         w-full h-full"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-10
                                          rounded-xl
                                          flex-shrink-0
                                          bg-[#1E293B]
                                          flex items-center
                                          justify-center
                                          text-2xl">
                            {result.icon}
                          </div>
                        )}

                        <div className="flex-1 text-left min-w-0">
                          <p className="text-white text-sm
                                        font-medium
                                        line-clamp-1">
                            {result.title}
                          </p>
                          <p className="text-[#94A3B8]
                                        text-xs mt-0.5
                                        line-clamp-1">
                            {result.subtitle}
                          </p>
                        </div>

                        <span
                          className="text-[10px] font-semibold
                                     rounded-full px-2 py-0.5
                                     flex-shrink-0"
                          style={{
                            backgroundColor: badge.color + '20',
                            color: badge.color
                          }}
                        >
                          {badge.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────── */}
        {/*  DEFAULT STATE (no query)                              */}
        {/* ─────────────────────────────────────────────────────── */}
        {!hasQuery && (
          <div className="px-4 pt-4 space-y-5">

            {/* Recent Searches */}
            {recent.length > 0 && (
              <div>
                <div className="flex items-center
                                justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14}
                           className="text-[#94A3B8]" />
                    <p className="text-[#94A3B8] text-xs
                                  font-medium uppercase
                                  tracking-wide">
                      Recent
                    </p>
                  </div>
                  <button
                    onClick={clearRecent}
                    className="text-[#7C5CFF] text-xs"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map(r => (
                    <button
                      key={r}
                      onClick={() => setQuery(r)}
                      className="flex items-center gap-1.5
                                 bg-[#111827]
                                 border border-[#1E293B]
                                 rounded-full px-3 py-2
                                 text-xs text-white
                                 active:scale-95
                                 transition-transform
                                 duration-150"
                    >
                      <Clock size={10}
                             className="text-[#94A3B8]" />
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14}
                            className="text-[#94A3B8]" />
                <p className="text-[#94A3B8] text-xs
                              font-medium uppercase
                              tracking-wide">
                  Popular
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map(term => (
                  <button
                    key={term}
                    onClick={() => handlePopular(term)}
                    className="bg-[#111827]
                               border border-[#1E293B]
                               rounded-full px-4 py-2
                               text-xs text-white
                               active:scale-95
                               transition-transform
                               duration-150"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Navigate */}
            <div>
              <p className="text-[#94A3B8] text-xs
                            font-medium uppercase
                            tracking-wide mb-3">
                Quick Navigate
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: '🎬', label: 'Movies',
                    href: '/movies' },
                  { icon: '▶️', label: 'Shorts',
                    href: '/shorts' },
                  { icon: '🎮', label: 'Games',
                    href: '/games' },
                  { icon: '⬇️', label: 'Download',
                    href: '/download' },
                  { icon: '📚', label: 'Library',
                    href: '/library' },
                  { icon: '📱', label: 'Platforms',
                    href: '/platforms' },
                  { icon: '👤', label: 'Profile',
                    href: '/profile' },
                  { icon: '⚙️', label: 'Settings',
                    href: '/settings' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      onClose()
                      router.push(item.href)
                    }}
                    className="flex flex-col items-center
                               gap-1.5 bg-[#111827]
                               border border-[#1E293B]
                               rounded-2xl p-3
                               active:scale-95
                               transition-transform
                               duration-150"
                  >
                    <span className="text-xl">
                      {item.icon}
                    </span>
                    <p className="text-[#94A3B8] text-[10px]">
                      {item.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  Sub-components
// ════════════════════════════════════════════════════════════

function Section({
  icon, label, count, children
}: {
  icon: React.ReactNode
  label: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <p className="text-white text-xs font-semibold uppercase tracking-wide">
          {label}
        </p>
        <span className="text-[#475569] text-xs">({count})</span>
      </div>
      {children}
    </div>
  )
}

function LiveResultCard({
  result, onSelect, accentColor, badgeLabel
}: {
  result: LiveMediaResult
  onSelect: (r: LiveMediaResult) => void
  accentColor: string
  badgeLabel: string
}) {
  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full flex items-center gap-3 bg-[#111827]
                 border border-[#1E293B] rounded-2xl p-3
                 active:scale-95 transition-transform duration-150"
    >
      {/* Thumbnail */}
      <div className="w-14 h-10 rounded-xl overflow-hidden
                      flex-shrink-0 bg-[#1E293B]">
        {result.thumbnail ? (
          <Image
            src={result.thumbnail}
            alt={result.title}
            width={56}
            height={40}
            className="object-cover w-full h-full"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl">
            {result.type === 'movie' ? '🎬' : '🎵'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-white text-sm font-medium line-clamp-1">
          {result.title}
        </p>
        <p className="text-[#94A3B8] text-xs mt-0.5 line-clamp-1">
          {result.subtitle}
        </p>
      </div>

      {/* Live badge */}
      <span
        className="text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0"
        style={{
          backgroundColor: accentColor + '20',
          color: accentColor,
        }}
      >
        {badgeLabel}
      </span>
    </button>
  )
}
