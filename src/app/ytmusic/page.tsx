'use client'
import { useState, useEffect, useCallback }
  from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell } from 'lucide-react'
import { useMusicQueue, MusicTrack }
  from '@/hooks/useMusicQueue'
import { useMusicPlayer } from
  '@/hooks/useMusicPlayer'
import FullPlayer from
  '@/components/ytmusic/FullPlayer'
import MiniPlayer from
  '@/components/ytmusic/MiniPlayer'
import TrackCard from
  '@/components/ytmusic/TrackCard'
import TrackRow from
  '@/components/ytmusic/TrackRow'
import MoodChips from
  '@/components/ytmusic/MoodChips'
import PageLoader from '@/components/ui/PageLoader'

// Mood/filter definitions — NO emojis
const MOODS = [
  { id: 'all', label: 'All' },
  { id: 'hot', label: 'Hot' },
  { id: 'new', label: 'New' },
  { id: 'bangla', label: 'Bangla' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'happy', label: 'Happy' },
  { id: 'sad', label: 'Sad' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'lofi', label: 'Lofi' },
  { id: 'remix', label: 'Remix' },
]

export default function YTMusicPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<
    string | null>(null)
  const [feed, setFeed] = useState<any>({
    quickPicks: [], topChannels: [],
    newReleases: [], recommended: [],
    recentlyPlayed: [],
  })
  const [allTracks, setAllTracks] = useState<
    MusicTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMood, setSelectedMood] =
    useState('all')
  const [showPlayer, setShowPlayer] =
    useState(false)

  const {
    currentTrack, queue, currentIndex,
    shuffleMode, repeatMode, queueLength,
    playTrack, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat,
  } = useMusicQueue(userId)

  const {
    iframeRef, isPlaying, currentTime,
    duration, progress, togglePlay, seek,
    formatTime,
  } = useMusicPlayer()

  // Get Firebase user
  useEffect(() => {
    import('@/lib/firebase').then(({ auth }) => {
      const { onAuthStateChanged } =
        require('firebase/auth')
      const unsub = onAuthStateChanged(
        auth, (user: any) => {
          setUserId(user?.uid || null)
        })
      return () => unsub()
    })
  }, [])

  // Check for search result playback
  useEffect(() => {
    const playTrackStr = localStorage.getItem('pn_play_track')
    if (playTrackStr) {
      try {
        const track = JSON.parse(playTrackStr)
        localStorage.removeItem('pn_play_track')
        if (track) {
          playTrack(track, [track, ...allTracks])
          setShowPlayer(true)
        }
      } catch (e) {}
    }
  }, [playTrack, allTracks])

  // Load feed
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        if (userId) params.set('userId', userId)
        if (selectedMood !== 'all')
          params.set('mood', selectedMood)

        const res = await fetch(
          `/api/ytmusic/feed?${params}`)
        console.log('[YTMusic] Feed response status:', res.status)
        const data = await res.json()
        console.log('[YTMusic] Feed data:', data)
        if (data.error) {
          console.error('[YTMusic] Feed error:', data.error)
        }

        if (!data.error) {
          setFeed(data)
          // Collect all tracks for queue building
          const all = [
            ...(data.quickPicks || []),
            ...(data.newReleases || []),
            ...(data.recommended || []),
            ...(data.recentlyPlayed || []),
          ]
          const seen = new Set<string>()
          const unique: MusicTrack[] = []
          for (const t of all) {
            if (t && !seen.has(t.id)) {
              seen.add(t.id)
              unique.push(t)
            }
          }
          setAllTracks(unique)
        }
      } catch {}
      setIsLoading(false)
    }
    load()
  }, [userId, selectedMood])

  // Listen for track ended event
  useEffect(() => {
    const handler = () => nextTrack()
    window.addEventListener(
      'ytmusic:trackended', handler)
    return () => window.removeEventListener(
      'ytmusic:trackended', handler)
  }, [nextTrack])

  const handleTrackPress = useCallback(
    (track: MusicTrack) => {
      playTrack(track, allTracks)
      setShowPlayer(true)
    }, [playTrack, allTracks])

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 17) return 'Good Afternoon'
    if (h < 21) return 'Good Evening'
    return 'Good Night'
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="min-h-screen bg-[#0D0D0D]
      pb-36">

      {/* Header */}
      <div className="flex items-center
        justify-between px-4 pt-4 pb-2
        sticky top-0 z-40 bg-[#0D0D0D]">
        <div>
          <h1 className="text-xl font-bold
            text-white">{getGreeting()}</h1>
          <p className="text-[#9CA3AF] text-xs
            mt-0.5">What would you like to listen to?
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              router.push('/ytmusic/search')}
            className="w-10 h-10 rounded-full
              bg-[#1A1A2E] flex items-center
              justify-center active:opacity-60">
            <Search size={18} color="#FFFFFF"/>
          </button>
          <button
            className="w-10 h-10 rounded-full
              bg-[#1A1A2E] flex items-center
              justify-center active:opacity-60">
            <Bell size={18} color="#FFFFFF"/>
          </button>
        </div>
      </div>

      {/* Mood Chips */}
      <MoodChips
        moods={MOODS}
        selected={selectedMood}
        onChange={setSelectedMood}
      />

      {/* Sections */}
      <div className="space-y-8 px-4 mt-4">

        {/* Quick Picks */}
        {feed.quickPicks.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">Quick Picks</h2>
            <div className="flex gap-3
              overflow-x-auto hide-scroll pb-2"
              style={{ contentVisibility: 'auto' }}>
              {feed.quickPicks.map(
                (t: MusicTrack) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  isPlaying={isPlaying &&
                    currentTrack?.id === t.id}
                  onPress={() =>
                    handleTrackPress(t)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recently Played */}
        {feed.recentlyPlayed.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">Recently Played</h2>
            <div className="space-y-1"
              style={{ contentVisibility: 'auto' }}>
              {feed.recentlyPlayed.map(
                (t: MusicTrack) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  isPlaying={isPlaying &&
                    currentTrack?.id === t.id}
                  onPress={() =>
                    handleTrackPress(t)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Top Channels */}
        {feed.topChannels.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">Top Channels</h2>
            <div className="flex gap-4
              overflow-x-auto hide-scroll pb-2">
              {feed.topChannels.map(
                (ch: any) => (
                <button
                  key={ch.channel_id}
                  onClick={() => router.push(
                    `/ytmusic/channel/` +
                    ch.channel_id)}
                  className="flex flex-col
                    items-center gap-2 flex-shrink-0
                    active:opacity-60">
                  <div className="w-14 h-14
                    rounded-full bg-[#1A1A2E]
                    overflow-hidden border-2
                    border-[#7C3AED]">
                    <img
                      src={`https://unavatar.io/` +
                        `youtube/${ch.channel_id}`}
                      alt={ch.channel_name}
                      loading="lazy"
                      className="w-full h-full
                        object-cover"
                    />
                  </div>
                  <span className="text-[10px]
                    text-[#9CA3AF] text-center
                    max-w-[60px] leading-tight
                    line-clamp-2">
                    {ch.channel_name}
                  </span>
                </button>
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
              {feed.newReleases.map(
                (t: MusicTrack) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  isPlaying={isPlaying &&
                    currentTrack?.id === t.id}
                  onPress={() =>
                    handleTrackPress(t)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recommended */}
        {feed.recommended.length > 0 && (
          <section>
            <h2 className="text-base font-bold
              text-white mb-3">Recommended</h2>
            <div className="grid grid-cols-2 gap-3"
              style={{ contentVisibility: 'auto' }}>
              {feed.recommended.map(
                (t: MusicTrack) => (
                <button
                  key={t.id}
                  onClick={() =>
                    handleTrackPress(t)}
                  className="text-left
                    active:opacity-70">
                  <img
                    src={t.thumbnail}
                    alt={t.title}
                    loading="lazy"
                    className="w-full aspect-video
                      object-cover rounded-xl
                      bg-[#1A1A2E] mb-2"
                  />
                  <p className="text-white text-xs
                    font-medium line-clamp-2
                    leading-tight">{t.title}</p>
                  <p className="text-[#9CA3AF]
                    text-[10px] mt-0.5 truncate">
                    {t.channel_name}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!isLoading && (() => {
          const hasAnyMusic =
            feed.quickPicks.length > 0 ||
            feed.newReleases.length > 0 ||
            feed.recommended.length > 0 ||
            feed.recentlyPlayed.length > 0
          return !hasAnyMusic
        })() && (
          <div className="flex flex-col
            items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl
              bg-[#1A1A2E] flex items-center
              justify-center mb-4">
              <Search size={28} color="#6B7280"/>
            </div>
            <p className="text-white font-semibold">
              No music yet
            </p>
            <p className="text-[#9CA3AF] text-sm
              mt-1 text-center px-8">
              Add music channels from Admin Panel
              to populate your library
            </p>
          </div>
        )}
      </div>

      {/* Hidden YouTube iframe
          ALWAYS mounted when track is playing
          Audio mode: off-screen (audio continues)
          Video mode: visible (in FullPlayer) */}
      {currentTrack && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/` +
            `${currentTrack.youtube_id}` +
            `?autoplay=1&controls=0&enablejsapi=1` +
            `&modestbranding=1&rel=0&playsinline=1`}
          allow="autoplay; encrypted-media"
          title={currentTrack.title}
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Mini Player */}
      {currentTrack && !showPlayer && (
        <MiniPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          progress={progress}
          onTogglePlay={togglePlay}
          onNext={nextTrack}
          onExpand={() => setShowPlayer(true)}
        />
      )}

      {/* Full Player */}
      {currentTrack && showPlayer && (
        <FullPlayer
          track={currentTrack}
          iframeRef={iframeRef}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          shuffleMode={shuffleMode}
          repeatMode={repeatMode}
          currentIndex={currentIndex}
          queueLength={queueLength}
          onTogglePlay={togglePlay}
          onNext={nextTrack}
          onPrev={prevTrack}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onSeek={seek}
          onClose={() => setShowPlayer(false)}
          formatTime={formatTime}
          userId={userId}
          allTracks={allTracks}
        />
      )}
    </div>
  )
}
