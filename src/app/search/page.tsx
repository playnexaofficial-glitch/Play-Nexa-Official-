'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowLeft, Film, Music, Gamepad2, X } from 'lucide-react'

interface SearchResults {
  movies: any[]
  music: any[]
  games: any[]
  query: string
}

export default function SearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('pn_recent_searches') || '[]')
    } catch {
      return []
    }
  })

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null)
      return
    }
    const timer = setTimeout(() => {
      doSearch(query.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  const doSearch = async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const saveSearch = (q: string) => {
    if (!q.trim()) return
    const updated = [
      q.trim(),
      ...recentSearches.filter((s) => s !== q.trim()),
    ].slice(0, 8)
    setRecentSearches(updated)
    try {
      localStorage.setItem('pn_recent_searches', JSON.stringify(updated))
    } catch {}
  }

  const clearRecent = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem('pn_recent_searches')
    } catch {}
  }

  const totalResults = results
    ? (results.movies?.length || 0) +
      (results.music?.length || 0) +
      (results.games?.length || 0)
    : 0

  return (
    <div className="min-h-screen bg-pn-base pb-10">
      {/* Search header */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-3 sticky top-0 z-40 bg-pn-base border-b border-pn-border">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center flex-shrink-0 active:opacity-60"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-pn-card border border-pn-border rounded-xl px-3 h-11">
          <Search size={16} color="#6B7280" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                saveSearch(query.trim())
              }
            }}
            placeholder="Search movies, music, games..."
            className="flex-1 bg-transparent text-pn-text text-sm outline-none placeholder-pn-tertiary"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                setResults(null)
                inputRef.current?.focus()
              }}
              className="active:opacity-60 p-1"
            >
              <X size={16} color="#6B7280" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Recent searches — shown when no query */}
        {!query && recentSearches.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-pn-text font-semibold text-sm">Recent Searches</p>
              <button
                onClick={clearRecent}
                className="text-pn-purple text-xs active:opacity-70"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="flex items-center gap-2 px-3 py-2 bg-pn-card border border-pn-border rounded-full min-h-[36px] active:opacity-70"
                >
                  <Search size={12} color="#6B7280" />
                  <span className="text-pn-secondary text-xs">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-pn-purple border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <>
            <p className="text-pn-secondary text-xs mb-4">
              {totalResults} results for &quot;{results.query}&quot;
            </p>

            {/* Movies */}
            {results.movies && results.movies.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Film size={16} color="#7C3AED" />
                  <p className="text-pn-text font-semibold text-sm">
                    Movies ({results.movies.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {results.movies.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        saveSearch(query)
                        router.push(`/movies/${m.id}`)
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-pn-card border border-pn-border rounded-xl active:opacity-70 text-left hover:border-pn-elevated transition-colors"
                    >
                      {m.thumbnail ? (
                        <img
                          src={m.thumbnail}
                          loading="lazy"
                          className="w-20 h-12 rounded-lg object-cover flex-shrink-0"
                          alt={m.title}
                        />
                      ) : (
                        <div className="w-20 h-12 rounded-lg bg-pn-elevated flex items-center justify-center flex-shrink-0">
                          <Film size={18} color="#6B7280" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-pn-text text-sm font-medium line-clamp-2">
                          {m.title}
                        </p>
                        <p className="text-pn-tertiary text-xs mt-0.5 truncate">
                          {m.channel_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Music */}
            {results.music && results.music.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Music size={16} color="#06B6D4" />
                  <p className="text-pn-text font-semibold text-sm">
                    Music ({results.music.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {results.music.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        saveSearch(query)
                        router.push(`/ytmusic?track=${t.id}`)
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-pn-card border border-pn-border rounded-xl active:opacity-70 text-left hover:border-pn-elevated transition-colors"
                    >
                      {t.thumbnail ? (
                        <img
                          src={t.thumbnail}
                          loading="lazy"
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                          alt={t.title}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-pn-elevated flex items-center justify-center flex-shrink-0">
                          <Music size={18} color="#6B7280" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-pn-text text-sm font-medium line-clamp-1">
                          {t.title}
                        </p>
                        <p className="text-pn-tertiary text-xs mt-0.5 truncate">
                          {t.channel_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Games */}
            {results.games && results.games.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Gamepad2 size={16} color="#22C55E" />
                  <p className="text-pn-text font-semibold text-sm">
                    Games ({results.games.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {results.games.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        saveSearch(query)
                        router.push('/games')
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-pn-card border border-pn-border rounded-xl active:opacity-70 text-left hover:border-pn-elevated transition-colors"
                    >
                      {g.cover_url ? (
                        <img
                          src={g.cover_url}
                          loading="lazy"
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                          alt={g.name}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-pn-elevated flex items-center justify-center flex-shrink-0">
                          <Gamepad2 size={20} color="#6B7280" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-pn-text text-sm font-medium truncate">
                          {g.name}
                        </p>
                        <p className="text-pn-tertiary text-xs mt-0.5">
                          {g.category} • {g.game_type}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-4xl">🔍</p>
                <p className="text-pn-text font-semibold">No results found</p>
                <p className="text-pn-secondary text-sm text-center">
                  No movies, music or games matching &quot;{results.query}&quot;
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty state — no query, no recent */}
        {!query && recentSearches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-5xl">🔍</p>
            <p className="text-pn-text font-semibold">Search Everything</p>
            <p className="text-pn-secondary text-sm text-center px-8">
              Find movies, music and games all in one place
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
