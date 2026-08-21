'use client'

import { useState, useEffect, useCallback } from 'react'
import { Film, Search, Trash2, Eye, EyeOff, Plus, ExternalLink, RefreshCw } from 'lucide-react'

interface Movie {
  id: string
  youtube_id: string
  title: string
  thumbnail: string
  channel_name: string
  channel_id: string
  is_hidden: boolean
  created_at: string
}

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Movie | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadMovies = useCallback(async () => {
    setLoading(true)
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
      const res = await fetch(`/api/admin/movies${q}`)
      const json = await res.json()
      if (json.error) {
        showToast('❌ ' + json.error)
      } else {
        setMovies(json.data || [])
      }
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Failed to load movies'))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMovies()
    }, 300)
    return () => clearTimeout(timer)
  }, [loadMovies])

  const toggleHide = async (movie: Movie) => {
    try {
      const nextHidden = !movie.is_hidden
      const res = await fetch('/api/admin/movies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: movie.id, is_hidden: nextHidden }),
      })
      const data = await res.json()
      if (data.success) {
        setMovies((prev) =>
          prev.map((m) => (m.id === movie.id ? { ...m, is_hidden: nextHidden } : m))
        )
        showToast(nextHidden ? '👁️ Hidden from app' : '✅ Visible in app')
      } else {
        showToast('❌ ' + (data.error || 'Failed to update'))
      }
    } catch {
      showToast('❌ Network error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/admin/movies?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      const data = await res.json()
      if (data.success) {
        setMovies((prev) => prev.filter((m) => m.id !== deleteTarget.id))
        showToast('🗑️ Movie deleted')
      } else {
        showToast('❌ ' + (data.error || 'Delete failed'))
      }
    } catch {
      showToast('❌ Network error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-[#A78BFA]">
            <Film size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Movie Hub</h1>
            <p className="text-xs text-[#9CA3AF]">
              {movies.length} movies loaded • Real-time DB
            </p>
          </div>
        </div>

        <button
          onClick={loadMovies}
          className="px-3 py-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-xs font-semibold min-h-[44px] active:opacity-80 hover:bg-[#1A1A2E] flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search movies by title..."
          className="w-full h-12 bg-[#0F0F1A] border border-[#1A1A2E] rounded-xl pl-10 pr-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563]"
        />
      </div>

      {loading && movies.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-16 bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl">
          <p className="text-[#6B7280] text-sm">
            {search ? 'No movies match your search.' : 'No movies in database yet. Use Auto-Scan or Quick Add!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {movies.map((m) => (
            <div
              key={m.id}
              className={`bg-[#0F0F1A] border rounded-2xl overflow-hidden flex flex-col transition-all duration-150 ${
                m.is_hidden ? 'border-red-900/30 opacity-70' : 'border-[#1A1A2E] hover:border-[#2D2D44]'
              }`}
            >
              <div className="relative aspect-video bg-[#141420]">
                {m.thumbnail ? (
                  <img
                    src={m.thumbnail}
                    alt={m.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#4B5563]">
                    <Film size={32} />
                  </div>
                )}
                {m.is_hidden && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-red-900/80 text-red-200 text-xs font-semibold">
                    Hidden
                  </span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    className="text-white text-sm font-semibold line-clamp-2 mb-1"
                    title={m.title}
                  >
                    {m.title}
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mb-3">
                    {m.channel_name || 'YouTube Channel'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#1A1A2E] gap-2">
                  <a
                    href={`https://youtube.com/watch?v=${m.youtube_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#7C3AED] hover:underline flex items-center gap-1 min-h-[36px]"
                  >
                    Watch <ExternalLink size={12} />
                  </a>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => toggleHide(m)}
                      className={`p-2 rounded-lg text-xs min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors ${
                        m.is_hidden
                          ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800/40 hover:bg-yellow-900/40'
                          : 'bg-[#141420] text-[#9CA3AF] hover:text-white border border-[#2D2D44]'
                      }`}
                      title={m.is_hidden ? 'Make visible' : 'Hide from app'}
                    >
                      {m.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="p-2 rounded-lg text-xs text-red-400 bg-red-900/20 border border-red-800/40 hover:bg-red-900/40 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/80"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] bg-[#0F0F1A] border border-[#2D2D44] rounded-2xl p-6 max-w-sm w-[90%] shadow-2xl">
            <h3 className="text-white font-bold text-base mb-2">Delete Movie?</h3>
            <p className="text-[#9CA3AF] text-xs mb-5 line-clamp-2">
              Are you sure you want to remove &quot;{deleteTarget.title}&quot; from Play Nexa?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 rounded-xl bg-[#141420] border border-[#2D2D44] text-[#9CA3AF] text-xs font-semibold hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 left-4 right-4 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 py-3 z-[70] max-w-sm mx-auto shadow-lg">
          <p className="text-white text-sm text-center">{toast}</p>
        </div>
      )}
    </div>
  )
}
