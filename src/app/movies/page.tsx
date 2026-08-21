'use client'
import { useState, useEffect, useRef }
  from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import FeaturedBanner from
  '@/components/movies/FeaturedBanner'
import MovieCard from
  '@/components/movies/MovieCard'

export default function MoviesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<
    string|null>(null)
  const [feed, setFeed] = useState<any>({
    featured: [], trending: [],
    newReleases: [], channelSections: [],
    channels: [],
  })
  const [selectedChannel, setSelectedChannel] =
    useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [bannerIndex, setBannerIndex] =
    useState(0)
  const bannerRef = useRef<NodeJS.Timeout>(undefined)

  // Get Firebase user
  useEffect(() => {
    import('@/lib/firebase').then(({ auth }) => {
      const { onAuthStateChanged } =
        require('firebase/auth')
      onAuthStateChanged(auth, (user: any) => {
        setUserId(user?.uid || null)
      })
    })
  }, [])

  // Load feed
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (userId) params.set('userId', userId)
      if (selectedChannel !== 'all')
        params.set('channel', selectedChannel)
      const res = await fetch(
        `/api/movies/feed?${params}`)
      console.log('[Movies] status:', res.status)
      const data = await res.json()
      console.log('[Movies] data keys:', Object.keys(data))
      if (data.error) {
        console.error('[Movies] error:', data.error)
      }
      if (!data.error) setFeed(data)
      setIsLoading(false)
    }
    load()
  }, [userId, selectedChannel])

  // Auto-rotate featured banner every 5s
  useEffect(() => {
    if (feed.featured.length <= 1) return
    bannerRef.current = setInterval(() => {
      setBannerIndex(i =>
        (i + 1) % feed.featured.length)
    }, 5000)
    return () => {
      if (bannerRef.current)
        clearInterval(bannerRef.current)
    }
  }, [feed.featured.length])

  return (
    <div className="min-h-screen bg-[#0D0D0D]
      pb-24">

      {/* Header */}
      <div className="flex items-center
        justify-between px-4 pt-4 pb-2
        sticky top-0 z-40 bg-[#0D0D0D]">
        <h1 className="text-xl font-bold
          text-white">Movies</h1>
        <button
          onClick={() =>
            router.push('/movies/search')}
          className="w-10 h-10 rounded-full
            bg-[#1A1A2E] flex items-center
            justify-center active:opacity-60 transition-opacity duration-150">
          <Search size={18} color="#FFFFFF"/>
        </button>
      </div>

      {/* Channel Filter Chips */}
      {feed.channels.length > 0 && (
        <div className="flex gap-2
          overflow-x-auto hide-scroll px-4 py-2">
          <button
            onClick={() =>
              setSelectedChannel('all')}
            className={`flex-shrink-0 px-4 py-1.5
              rounded-full text-sm font-medium
              min-h-[34px] transition-colors
              duration-150 active:opacity-60
              ${selectedChannel === 'all'
                ? 'bg-white text-black'
                : 'bg-[#1A1A2E] text-[#9CA3AF]'
              }`}>
            All
          </button>
          {feed.channels.map((ch: any) => (
            <button key={ch.id}
              onClick={() =>
                setSelectedChannel(ch.id)}
              className={`flex-shrink-0 px-4 py-1.5
                rounded-full text-sm font-medium
                min-h-[34px] transition-colors
                duration-150 active:opacity-60
                ${selectedChannel === ch.id
                  ? 'bg-white text-black'
                  : 'bg-[#1A1A2E] text-[#9CA3AF]'
                }`}>
              {ch.name}
            </button>
          ))}
        </div>
      )}

      {/* Featured Banner */}
      {feed.featured.length > 0 && (
        <div className="px-0 mb-6">
          <FeaturedBanner
            movies={feed.featured}
            currentIndex={bannerIndex}
            onIndexChange={setBannerIndex}
            onPlay={id =>
              router.push(`/movies/${id}`)}
          />
        </div>
      )}

      {/* Content Sections */}
      <div className="space-y-8 px-4">

        {/* Trending Now */}
        {feed.trending.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">Trending Now</h2>
            <div className="flex gap-3
              overflow-x-auto hide-scroll pb-2"
              style={{ contentVisibility: 'auto' }}>
              {feed.trending.map((m: any) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  variant="portrait"
                  onPress={() =>
                    router.push(`/movies/${m.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* New Releases */}
        {feed.newReleases.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">New Releases</h2>
            <div className="flex gap-3
              overflow-x-auto hide-scroll pb-2"
              style={{ contentVisibility: 'auto' }}>
              {feed.newReleases.map((m: any) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  variant="portrait"
                  onPress={() =>
                    router.push(`/movies/${m.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Channel Sections */}
        {feed.channelSections.map((sec: any) => (
          <section key={sec.channelId}>
            <div className="flex items-center
              justify-between mb-3">
              <h2 className="text-base font-bold
                text-white">{sec.channelName}</h2>
              <button
                onClick={() =>
                  setSelectedChannel(sec.channelId)}
                className="text-[#7C3AED] text-xs
                  active:opacity-60 transition-opacity duration-150">
                See all
              </button>
            </div>
            <div className="flex gap-3
              overflow-x-auto hide-scroll pb-2"
              style={{ contentVisibility: 'auto' }}>
              {sec.movies.map((m: any) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  variant="landscape"
                  onPress={() =>
                    router.push(`/movies/${m.id}`)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Empty state */}
        {!isLoading && (() => {
          const hasAnyMovies =
            feed.featured.length > 0 ||
            feed.trending.length > 0 ||
            feed.newReleases.length > 0 ||
            feed.channelSections.length > 0
          return !hasAnyMovies
        })() && (
          <div className="flex flex-col
            items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl
              bg-[#1A1A2E] flex items-center
              justify-center mb-4">
              <Search size={28} color="#6B7280"/>
            </div>
            <p className="text-white font-semibold">
              No movies yet
            </p>
            <p className="text-[#9CA3AF] text-sm
              mt-1 text-center px-8">
              Add movie channels from Admin Panel
              to populate your library
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
