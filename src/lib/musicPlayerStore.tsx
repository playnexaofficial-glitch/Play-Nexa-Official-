'use client'
import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react'

interface Track {
  id: string
  youtube_id: string
  title: string
  thumbnail: string
  channel_name: string
}

interface MusicStore {
  currentTrack: Track | null
  isPlaying: boolean
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  play: (track: Track) => void
  pause: () => void
}

const MusicStoreContext = createContext<MusicStore | null>(null)

export function MusicStoreProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const play = useCallback((track: Track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
  }, [])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  return (
    <MusicStoreContext.Provider value={{ currentTrack, isPlaying, iframeRef, play, pause }}>
      {children}
      {/* Persistent iframe — always in DOM, never unmounts */}
      {currentTrack && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${currentTrack.youtube_id}?autoplay=1&controls=0&enablejsapi=1&modestbranding=1&rel=0&playsinline=1`}
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
    </MusicStoreContext.Provider>
  )
}

export function useMusicStore() {
  const ctx = useContext(MusicStoreContext)
  if (!ctx) throw new Error('useMusicStore must be inside MusicStoreProvider')
  return ctx
}
