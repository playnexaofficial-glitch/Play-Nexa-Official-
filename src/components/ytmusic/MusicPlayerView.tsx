'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { MusicTrack } from '@/hooks/useMusicQueue'

interface PlayerProps {
  track: MusicTrack
  isPlaying: boolean
  onTogglePlay: () => void
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  shuffleMode: boolean
  repeatMode: 'none' | 'one' | 'all'
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  queueLength: number
  currentIndex: number
}

type ViewMode = 'audio' | 'video'

export default function MusicPlayerView({
  track, isPlaying, onTogglePlay,
  onNext, onPrev, onClose,
  shuffleMode, repeatMode,
  onToggleShuffle, onToggleRepeat,
  queueLength, currentIndex,
}: PlayerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('audio')
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // YouTube iframe src with autoplay
  const iframeSrc = `https://www.youtube.com/embed/${track.youtube_id}?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`

  // Listen for iframe messages (time updates)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com') return
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data.event === 'onStateChange') {
          // 0 = ended, auto-play next
          if (data.info === 0) {
            onNext()
          }
        }
        if (data.event === 'infoDelivery' && data.info?.currentTime !== undefined) {
          const ct = data.info.currentTime || 0
          const dur = data.info.duration || 0
          setCurrentTime(ct)
          setDuration(dur)
          if (dur > 0) {
            setProgress((ct / dur) * 100)
          }
        }
      } catch {}
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onNext])

  // Post message to iframe
  const postToIframe = useCallback((data: any) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(data), '*')
  }, [])

  // Sync play/pause state to iframe
  useEffect(() => {
    if (isPlaying) {
      postToIframe({
        event: 'command',
        func: 'playVideo',
        args: [],
      })
    } else {
      postToIframe({
        event: 'command',
        func: 'pauseVideo',
        args: [],
      })
    }
  }, [isPlaying, postToIframe, track])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    postToIframe({
      event: 'command',
      func: 'seekTo',
      args: [newTime, true],
    })
    setCurrentTime(newTime)
    setProgress(duration > 0 ? (newTime / duration) * 100 : 0)
  }

  const formatTime = (s: number): string => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-[80] bg-[#0B0B1E] flex flex-col">

      {/* YouTube iframe — ALWAYS in DOM */}
      {/* Audio mode: off-screen but audio plays */}
      {/* Video mode: visible 16:9 */}
      <div
        style={viewMode === 'video' ? {
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          flexShrink: 0,
        } : {
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media"
          title={track.title}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center active:opacity-60">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        <span className="text-[#9CA3AF] text-xs">
          {currentIndex + 1} / {queueLength}
        </span>

        {/* Audio/Video toggle */}
        <div className="flex bg-[#1A1A2E] rounded-full p-1">
          <button
            onClick={() => setViewMode('audio')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[32px] transition-colors duration-150 ${viewMode === 'audio' ? 'bg-[#7C3AED] text-white' : 'text-[#9CA3AF]'}`}>
            🎵 Audio
          </button>
          <button
            onClick={() => setViewMode('video')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium min-h-[32px] transition-colors duration-150 ${viewMode === 'video' ? 'bg-[#7C3AED] text-white' : 'text-[#9CA3AF]'}`}>
            📺 Video
          </button>
        </div>
      </div>

      {/* Audio mode: Album art */}
      {viewMode === 'audio' && (
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="relative mb-8">
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: isPlaying ? 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)' : 'none',
                transform: 'scale(1.3)',
              }}
            />
            {/* Album art */}
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-56 h-56 rounded-full object-cover border-4 border-[#1A1A2E] relative z-10 animate-spin-slow"
              style={{
                animationPlayState: isPlaying ? 'running' : 'paused',
              }}
            />
          </div>

          <p className="text-white font-bold text-xl text-center mb-1 line-clamp-2">
            {track.title}
          </p>
          <p className="text-[#9CA3AF] text-sm">
            {track.channel_name}
          </p>
        </div>
      )}

      {/* Video mode spacer */}
      {viewMode === 'video' && (
        <div className="flex-1 flex flex-col justify-end px-4 pb-2">
          <p className="text-white font-bold text-base mb-0.5 line-clamp-1">
            {track.title}
          </p>
          <p className="text-[#9CA3AF] text-sm">
            {track.channel_name}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-6 mb-4">
        <div className="relative h-1 bg-[#2D2D44] rounded-full">
          <div
            className="absolute h-full bg-[#7C3AED] rounded-full"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {/* Thumb indicator */}
          <div
            className="absolute top-1/2 w-3 h-3 bg-white rounded-full -translate-y-1/2"
            style={{
              left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[#6B7280]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 px-6 pb-6">
        {/* Shuffle */}
        <button
          onClick={onToggleShuffle}
          className={`w-10 h-10 flex items-center justify-center active:opacity-60 ${shuffleMode ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 3 21 3 21 8"/>
            <line x1="4" y1="20" x2="21" y2="3"/>
            <polyline points="21 16 21 21 16 21"/>
            <line x1="15" y1="15" x2="21" y2="21"/>
          </svg>
        </button>

        {/* Previous */}
        <button
          onClick={onPrev}
          className="w-10 h-10 flex items-center justify-center text-white active:opacity-60">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="19 20 9 12 19 4"/>
            <rect x="5" y="4" width="2" height="16"/>
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          className="w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{ backgroundColor: '#7C3AED' }}>
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21"/>
            </svg>
          )}
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          className="w-10 h-10 flex items-center justify-center text-white active:opacity-60">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 4 15 12 5 20"/>
            <rect x="17" y="5" width="2" height="16"/>
          </svg>
        </button>

        {/* Repeat */}
        <button
          onClick={onToggleRepeat}
          className={`w-10 h-10 flex items-center justify-center active:opacity-60 relative ${repeatMode !== 'none' ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
          {repeatMode === 'one' && (
            <span className="absolute -top-1 -right-1 text-[8px] text-[#7C3AED] font-bold">1</span>
          )}
        </button>
      </div>

      {/* CSS for spinning album art */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin 20s linear infinite;
        }
      `}</style>
    </div>
  )
}
