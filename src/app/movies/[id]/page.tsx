'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import ActionBar from
  '@/components/movies/ActionBar'

export default function WatchPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [userId, setUserId] = useState<
    string|null>(null)
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (data?.userState) {
      setSubscribed(!!data.userState.subscribed)
    }
  }, [data])

  const handleSubscribe = async () => {
    if (!userId || !data?.movie?.channel_id) return
    const next = !subscribed
    setSubscribed(next)
    try {
      const res = await fetch('/api/movies/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          userId,
          movieId: id,
          youtubeId: data.movie.youtube_id,
          channelId: data.movie.channel_id,
          channelName: data.movie.channel_name,
        }),
      })
      const result = await res.json()
      if (result && typeof result.subscribed === 'boolean') {
        setSubscribed(result.subscribed)
      }
    } catch {
      setSubscribed(!next)
    }
  }

  useEffect(() => {
    import('@/lib/firebase').then(({ auth }) => {
      const { onAuthStateChanged } =
        require('firebase/auth')
      onAuthStateChanged(auth, (user: any) => {
        setUserId(user?.uid || null)
      })
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const params = userId
        ? `?userId=${userId}` : ''
      const res = await fetch(
        `/api/movies/${id}${params}`)
      const d = await res.json()
      if (!d.error) setData(d)
      setIsLoading(false)
    }
    load()
  }, [id, userId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D]">
        <div className="w-full aspect-video
          bg-[#1A1A2E]"/>
        <div className="p-4 space-y-3">
          <div className="h-5 bg-[#1A1A2E]
            rounded-xl w-3/4"/>
          <div className="h-4 bg-[#1A1A2E]
            rounded-xl w-1/2"/>
        </div>
      </div>
    )
  }

  if (!data?.movie) {
    return (
      <div className="min-h-screen bg-[#0D0D0D]
        flex items-center justify-center relative">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center bg-[#1A1A2E] rounded-full active:opacity-60 transition-opacity duration-150">
          <ChevronLeft size={22} color="#FFFFFF" />
        </button>
        <p className="text-[#9CA3AF]">
          Movie not found
        </p>
      </div>
    )
  }

  const { movie, userState, recommendations } = data

  return (
    <div className="min-h-screen bg-[#0D0D0D]
      pb-24">

      {/* YouTube Player */}
      <div className="w-full aspect-video
        bg-black relative">
        <iframe
          src={`https://www.youtube.com/embed/` +
            `${movie.youtube_id}?autoplay=1` +
            `&rel=0&modestbranding=1&playsinline=1`}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={movie.title}
        />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center bg-black/50 rounded-full active:opacity-60 transition-opacity duration-150 z-50">
          <ChevronLeft size={22} color="#FFFFFF" />
        </button>
      </div>

      {/* Movie Info */}
      <div className="px-4 py-4">
        {/* Title */}
        <h1 className="text-white font-bold
          text-lg leading-tight mb-2">
          {movie.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center
          flex-wrap gap-2 mb-4">
          <span className="text-[#9CA3AF] text-sm">
            {movie.watch_count || 0} views
          </span>
          {movie.genre?.length > 0 && (
            <>
              <span className="text-[#2D2D44]">•</span>
              <span className="text-[#9CA3AF] text-sm">
                {movie.genre[0]}
              </span>
            </>
          )}
        </div>

        {/* Action Bar */}
        <ActionBar
          movieId={id}
          youtubeId={movie.youtube_id}
          title={movie.title}
          userId={userId}
          initialLiked={userState.liked}
          initialSaved={userState.saved}
          initialReaction={userState.reaction}
          channelId={movie.channel_id}
          channelName={movie.channel_name}
        />

        {/* Channel Row */}
        <div className="flex items-center gap-3
          py-4 border-t border-b
          border-[#1A1A2E] mt-4">
          <div className="w-10 h-10 rounded-full
            bg-[#1A1A2E] overflow-hidden
            flex-shrink-0">
            <img
              src={`https://unavatar.io/youtube/` +
                movie.channel_id}
              alt={movie.channel_name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm
              font-semibold truncate">
              {movie.channel_name}
            </p>
          </div>
          <button
            onClick={handleSubscribe}
            style={{ cursor: 'pointer' }}
            className={`px-4 py-2 rounded-full text-sm font-semibold min-h-[36px] active:opacity-80 transition-all duration-150 ${
              subscribed
                ? 'bg-[#1A1A2E] text-[#9CA3AF] border border-[#2D2D44]'
                : 'bg-white text-black'
            }`}
          >
            {subscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-bold
              text-white mb-3">More Like This</h2>
            <div className="space-y-3"
              style={{ contentVisibility: 'auto' }}>
              {recommendations.map((m: any) => (
                <button key={m.id}
                  onClick={() =>
                    router.push(`/movies/${m.id}`)}
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
      </div>
    </div>
  )
}
