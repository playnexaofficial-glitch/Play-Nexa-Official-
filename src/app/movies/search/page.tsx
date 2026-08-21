'use client'
import { useState, useEffect, useRef }
  from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, X } from 'lucide-react'

const RECENT_KEY = 'pn_movies_searches'

export default function MovieSearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>(
    () => {
      if (typeof window === 'undefined') return []
      try {
        return JSON.parse(
          localStorage.getItem(RECENT_KEY) || '[]')
      } catch { return [] }
    })

  useEffect(() => {
    setTimeout(() =>
      inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(
        `/api/movies/search?q=` +
        encodeURIComponent(query.trim()))
      const data = await res.json()
      setResults(data.results || [])
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const saveSearch = (q: string) => {
    if (!q.trim()) return
    const updated = [q.trim(),
      ...recent.filter(s => s !== q.trim())]
      .slice(0, 8)
    setRecent(updated)
    try {
      localStorage.setItem(RECENT_KEY,
        JSON.stringify(updated))
    } catch {}
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <div className="flex items-center gap-3
        px-3 py-3 sticky top-0 z-40
        bg-[#0D0D0D] border-b border-[#1A1A2E]">
        <button onClick={() => router.back()}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60 transition-opacity duration-150">
          <ArrowLeft size={22} color="#FFFFFF"/>
        </button>
        <div className="flex-1 flex items-center
          gap-2 bg-[#1A1A2E] border
          border-[#2D2D44] rounded-xl
          px-3 h-11 focus-within:border-[#7C3AED] transition-colors duration-150">
          <Search size={16} color="#6B7280"/>
          <input
            ref={inputRef}
            type="text" value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && query.trim())
                saveSearch(query.trim())
            }}
            placeholder="Search movies, channels..."
            className="flex-1 bg-transparent
              text-white text-sm outline-none
              placeholder-[#6B7280]"
          />
          {query && (
            <button onClick={() => {
              setQuery(''); setResults([])
            }} className="active:opacity-60 transition-opacity duration-150">
              <X size={16} color="#6B7280"/>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {!query && recent.length > 0 && (
          <div>
            <div className="flex items-center
              justify-between mb-3">
              <p className="text-white font-semibold
                text-sm">Recent</p>
              <button
                onClick={() => {
                  setRecent([])
                  localStorage.removeItem(RECENT_KEY)
                }}
                className="text-[#7C3AED] text-xs
                  active:opacity-60 transition-opacity duration-150">
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {recent.map(s => (
                <button key={s}
                  onClick={() => setQuery(s)}
                  className="w-full flex items-center
                    gap-3 py-2.5 px-2 rounded-xl
                    active:bg-[#1A1A2E] transition-colors duration-150 text-left">
                  <Search size={14}
                    color="#6B7280"/>
                  <span className="text-[#9CA3AF]
                    text-sm">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2
              border-[#7C3AED] border-t-transparent
              rounded-full animate-spin"/>
          </div>
        )}

        {results.length > 0 && !loading && (
          <div>
            <p className="text-[#9CA3AF] text-xs
              mb-3">
              {results.length} results
            </p>
            <div className="space-y-3"
              style={{ contentVisibility: 'auto' }}>
              {results.map(m => (
                <button key={m.id}
                  onClick={() => {
                    saveSearch(query.trim())
                    router.push(`/movies/${m.id}`)
                  }}
                  className="w-full flex gap-3
                    active:opacity-70 transition-opacity duration-150 text-left">
                  <img
                    src={m.thumbnail}
                    alt={m.title}
                    loading="lazy"
                    className="w-40 aspect-video
                      object-cover rounded-xl
                      bg-[#1A1A2E] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0
                    py-0.5">
                    <p className="text-white text-sm
                      font-medium line-clamp-2
                      leading-tight">
                      {m.title}
                    </p>
                    <p className="text-[#9CA3AF]
                      text-xs mt-1 truncate">
                      {m.channel_name}
                    </p>
                    <p className="text-[#6B7280]
                      text-xs mt-0.5">
                      {m.watch_count || 0} views
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="flex flex-col
            items-center justify-center py-20">
            <p className="text-white font-semibold
              mb-1">No results</p>
            <p className="text-[#9CA3AF] text-sm
              text-center">
              No movies found for "{query}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
