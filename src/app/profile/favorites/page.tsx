// src/app/profile/favorites/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2, Heart, Film, Music as MusicIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function FavoritesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'movies' | 'music'>('movies')
  const [movies, setMovies] = useState<any[]>([])
  const [music, setMusic] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { auth } = await import('@/lib/firebase')
      const { onAuthStateChanged } = await import('firebase/auth')
      if (!auth) {
        setIsLoading(false)
        return
      }
      onAuthStateChanged(auth, async (user: any) => {
        setUserId(user?.uid || null)
        if (user?.uid) {
          if (!supabase) return
          const [watchlistRes, musicSavedRes] = await Promise.all([
            supabase
              .from('user_watchlist')
              .select('created_at, movies(id, youtube_id, title, thumbnail, channel_name)')
              .eq('user_id', user.uid)
              .order('created_at', { ascending: false }),
            supabase
              .from('music_saved')
              .select('created_at, music_tracks(id, youtube_id, title, thumbnail, channel_name)')
              .eq('user_id', user.uid)
              .order('created_at', { ascending: false }),
          ])

          setMovies((watchlistRes.data || []).filter((w: any) => w.movies))
          setMusic((musicSavedRes.data || []).filter((s: any) => s.music_tracks))
        }
        setIsLoading(false)
      })
    }
    init()
  }, [])

  const removeMovie = async (movieId: string) => {
    if (!userId || !supabase) return
    await supabase
      .from('user_watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', movieId)
    setMovies((prev) => prev.filter((w: any) => w.movies?.id !== movieId))
  }

  const removeMusic = async (trackId: string) => {
    if (!userId || !supabase) return
    await supabase
      .from('music_saved')
      .delete()
      .eq('user_id', userId)
      .eq('track_id', trackId)
    setMusic((prev) => prev.filter((s: any) => s.music_tracks?.id !== trackId))
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 sticky top-0 z-40 bg-[#0D0D0D] border-b border-[#1A1A2E]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center text-white active:opacity-60 transition-opacity duration-150"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-white">Favorites</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 pt-4 pb-3">
        <button
          onClick={() => setActiveTab('movies')}
          className={`flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold active:opacity-60 transition-colors duration-150 ${
            activeTab === 'movies'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#1A1A2E] text-[#9CA3AF] border border-[#2D2D44]'
          }`}
        >
          <Film size={14} />
          <span>Movies ({movies.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('music')}
          className={`flex items-center gap-2 h-9 px-4 rounded-full text-xs font-semibold active:opacity-60 transition-colors duration-150 ${
            activeTab === 'music'
              ? 'bg-[#7C3AED] text-white'
              : 'bg-[#1A1A2E] text-[#9CA3AF] border border-[#2D2D44]'
          }`}
        >
          <MusicIcon size={14} />
          <span>Music ({music.length})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-32 h-20 bg-[#1A1A2E] rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-[#1A1A2E] rounded-full w-3/4" />
                <div className="h-3 bg-[#1A1A2E] rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'movies' ? (
        movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <Heart size={40} color="#4B5563" className="mb-3" />
            <p className="text-white font-semibold mb-1">No favorite movies</p>
            <p className="text-[#9CA3AF] text-sm text-center">
              Movies you save to watchlist will appear here
            </p>
          </div>
        ) : (
          <div className="px-4 pt-2 space-y-3" style={{ contentVisibility: 'auto' }}>
            {movies.map((item: any) => {
              const movie = item.movies
              return (
                <div key={movie.id} className="flex gap-3 items-start">
                  <button
                    onClick={() => router.push(`/movies/${movie.id}`)}
                    className="flex-shrink-0 active:opacity-60 transition-opacity duration-150"
                  >
                    <img
                      src={movie.thumbnail}
                      alt={movie.title}
                      loading="lazy"
                      className="w-32 h-20 rounded-xl object-cover bg-[#1A1A2E]"
                    />
                  </button>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <button
                      onClick={() => router.push(`/movies/${movie.id}`)}
                      className="text-left w-full active:opacity-60 transition-opacity duration-150"
                    >
                      <p className="text-white text-sm font-medium line-clamp-2 leading-tight mb-1">
                        {movie.title}
                      </p>
                      <p className="text-[#9CA3AF] text-xs truncate">
                        {movie.channel_name}
                      </p>
                    </button>
                  </div>
                  <button
                    onClick={() => removeMovie(movie.id)}
                    className="w-8 h-8 flex items-center justify-center active:opacity-60 transition-opacity duration-150 flex-shrink-0 mt-0.5"
                  >
                    <Trash2 size={15} color="#6B7280" />
                  </button>
                </div>
              )
            })}
          </div>
        )
      ) : (
        music.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <Heart size={40} color="#4B5563" className="mb-3" />
            <p className="text-white font-semibold mb-1">No saved music</p>
            <p className="text-[#9CA3AF] text-sm text-center">
              Songs you save will appear here
            </p>
          </div>
        ) : (
          <div className="px-4 pt-2 space-y-3" style={{ contentVisibility: 'auto' }}>
            {music.map((item: any) => {
              const track = item.music_tracks
              return (
                <div key={track.id} className="flex gap-3 items-center">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#1A1A2E] flex-shrink-0">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate mb-0.5">
                      {track.title}
                    </p>
                    <p className="text-[#9CA3AF] text-xs truncate">
                      {track.channel_name}
                    </p>
                  </div>
                  <button
                    onClick={() => removeMusic(track.id)}
                    className="w-8 h-8 flex items-center justify-center active:opacity-60 transition-opacity duration-150 flex-shrink-0"
                  >
                    <Trash2 size={15} color="#6B7280" />
                  </button>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
