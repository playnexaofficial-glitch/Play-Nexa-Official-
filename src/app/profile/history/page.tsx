// src/app/profile/history/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function HistoryPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { auth } = await import('@/lib/firebase')
      const { onAuthStateChanged } = await import('firebase/auth')
      onAuthStateChanged(auth, async (user) => {
        setUserId(user?.uid || null)
        if (user?.uid) {
          const [movieRes, musicRes] = await Promise.all([
            supabase
              .from('user_history')
              .select('watched_at, movies(id, youtube_id, title, thumbnail, channel_name)')
              .eq('user_id', user.uid)
              .order('watched_at', { ascending: false })
              .limit(40),
            supabase
              .from('music_history')
              .select('played_at, music_tracks(id, youtube_id, title, thumbnail, artist)')
              .eq('user_id', user.uid)
              .order('played_at', { ascending: false })
              .limit(40)
          ])

          const movieItems = (movieRes.data || [])
            .filter((h: any) => h.movies)
            .map((h: any) => ({
              id: h.movies.id,
              title: h.movies.title,
              thumbnail: h.movies.thumbnail,
              subtitle: h.movies.channel_name,
              timestamp: h.watched_at,
              type: 'movie'
            }))

          const musicItems = (musicRes.data || [])
            .filter((h: any) => h.music_tracks)
            .map((h: any) => ({
              id: h.music_tracks.id,
              title: h.music_tracks.title,
              thumbnail: h.music_tracks.thumbnail,
              subtitle: h.music_tracks.artist,
              timestamp: h.played_at,
              type: 'music'
            }))

          const combined = [...movieItems, ...musicItems].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )

          setHistory(combined)
        }
        setIsLoading(false)
      })
    }
    init()
  }, [])

  const deleteItem = async (itemId: string, type: 'movie' | 'music') => {
    if (!userId) return
    const table = type === 'movie' ? 'user_history' : 'music_history'
    const column = type === 'movie' ? 'movie_id' : 'track_id'
    
    await supabase
      .from(table)
      .delete()
      .eq('user_id', userId)
      .eq(column, itemId)
    
    setHistory((prev) => prev.filter((h: any) => !(h.id === itemId && h.type === type)))
  }

  const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(mins / 60)
    const days = Math.floor(hrs / 24)
    if (days > 0) return `${days}d ago`
    if (hrs > 0) return `${hrs}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'Just now'
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
        <h1 className="flex-1 text-lg font-bold text-white">Activity History</h1>
        {history.length > 0 && (
          <button
            onClick={async () => {
              if (!userId) return
              await Promise.all([
                supabase.from('user_history').delete().eq('user_id', userId),
                supabase.from('music_history').delete().eq('user_id', userId)
              ])
              setHistory([])
            }}
            className="text-[#EF4444] text-xs active:opacity-60 transition-opacity duration-150"
          >
            Clear All
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 px-4 pt-4">
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
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Clock size={40} color="#4B5563" className="mb-3" />
          <p className="text-white font-semibold mb-1">No history yet</p>
          <p className="text-[#9CA3AF] text-sm text-center">
            Content you watch or listen to will appear here
          </p>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3" style={{ contentVisibility: 'auto' }}>
          {history.map((item: any) => {
            const isMovie = item.type === 'movie'
            return (
              <div key={`${item.type}-${item.id}`} className="flex gap-3 items-start">
                <button
                  onClick={() => router.push(isMovie ? `/movies/${item.id}` : `/ytmusic/player/${item.id}`)}
                  className="flex-shrink-0 active:opacity-60 transition-opacity duration-150"
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    loading="lazy"
                    className={`w-32 h-20 rounded-xl object-cover bg-[#1A1A2E] ${!isMovie ? 'aspect-square !h-20 !w-20' : ''}`}
                  />
                </button>
                <div className="flex-1 min-w-0 pt-0.5">
                  <button
                    onClick={() => router.push(isMovie ? `/movies/${item.id}` : `/ytmusic/player/${item.id}`)}
                    className="text-left w-full active:opacity-60 transition-opacity duration-150"
                  >
                    <p className="text-white text-sm font-medium line-clamp-2 leading-tight mb-1">
                      {item.title}
                    </p>
                    <p className="text-[#9CA3AF] text-xs truncate">
                      {item.subtitle}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isMovie ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {item.type}
                      </span>
                      <span className="text-[#6B7280] text-[10px]">
                        {timeAgo(item.timestamp)}
                      </span>
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => deleteItem(item.id, item.type)}
                  className="w-8 h-8 flex items-center justify-center active:opacity-60 transition-opacity duration-150 flex-shrink-0 mt-0.5"
                >
                  <Trash2 size={15} color="#6B7280" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
