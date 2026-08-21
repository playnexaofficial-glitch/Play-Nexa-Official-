// ── Play Nexa Channel Page ────────────────────────────────────
// Internal channel page — NO YouTube redirect
// Zero API — filters local JSON by channel name
// Instant results — no network needed

'use client'

import { useMemo, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Play, Film } from 'lucide-react'
import { getByChannel } from '@/lib/search'
import MovieCard from '@/components/movies/MovieCard'

export default function ChannelPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = use(params)
  const router = useRouter()
  const channel = decodeURIComponent(id)

  // Zero API — filter local JSON by channel name
  const videos = useMemo(() => getByChannel(channel), [channel])

  return (
    <div className="min-h-screen bg-pn-bg pb-24">
      {/* Channel Header */}
      <div className="relative">
        {/* Gradient banner */}
        <div
          className="h-32 w-full"
          style={{
            background: 'linear-gradient(135deg, #7C5CFF 0%, #00D4FF 100%)',
          }}
        />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          type="button"
          className="absolute top-4 left-4 bg-black/50 rounded-full p-2 active:scale-90 transition-transform duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Go back"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        {/* Play Nexa badge */}
        <div className="absolute top-4 right-4 bg-pn-card/80 rounded-lg px-2.5 py-1">
          <p className="text-pn-purple text-[11px] font-bold tracking-wide">
            PLAY NEXA
          </p>
        </div>

        {/* Channel avatar */}
        <div className="absolute -bottom-8 left-4">
          <div
            className="w-16 h-16 rounded-full border-4 border-pn-bg flex items-center justify-center text-white font-bold text-2xl"
            style={{
              background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)',
            }}
          >
            {channel.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Channel info */}
      <div className="pt-12 px-4 pb-4">
        <h1 className="text-xl font-bold text-white">{channel}</h1>
        <p className="text-pn-muted text-sm mt-1">
          YouTube Channel • Available on Play Nexa
        </p>

        {/* Stats */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <Film size={14} className="text-pn-purple" />
            <span className="text-white text-sm font-semibold">{videos.length}</span>
            <span className="text-pn-muted text-xs">videos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Play size={14} className="text-pn-cyan" />
            <span className="text-pn-muted text-xs">Free to watch</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-pn-border mb-4" />

      {/* Videos grid */}
      <div className="px-4">
        <h2 className="text-base font-semibold text-white mb-3">
          🎬 All Videos
        </h2>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-4xl">🎬</p>
            <p className="text-white font-semibold">No videos found</p>
            <p className="text-pn-muted text-sm">Try searching directly</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {videos.map(video => (
              <MovieCard key={video.id} movie={video} fullWidth />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
