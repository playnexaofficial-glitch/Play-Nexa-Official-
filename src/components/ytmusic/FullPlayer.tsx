'use client'
import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Shuffle, SkipBack,
  Pause, Play, SkipForward, Repeat } from
  'lucide-react'
import { supabase } from '@/lib/supabase'
import type { MusicTrack } from
  '@/hooks/useMusicQueue'

type ViewMode = 'audio' | 'video'

interface Props {
  track: MusicTrack
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  isPlaying: boolean
  currentTime: number; duration: number
  progress: number; shuffleMode: boolean
  repeatMode: 'none'|'one'|'all'
  currentIndex: number; queueLength: number
  onTogglePlay: () => void
  onNext: () => void; onPrev: () => void
  onToggleShuffle: () => void
  onToggleRepeat: () => void
  onSeek: (t: number) => void
  onClose: () => void
  formatTime: (s: number) => string
  userId: string | null
  allTracks: MusicTrack[]
}

export default function FullPlayer({
  track, iframeRef, isPlaying, currentTime,
  duration, progress, shuffleMode, repeatMode,
  currentIndex, queueLength, onTogglePlay,
  onNext, onPrev, onToggleShuffle, onToggleRepeat,
  onSeek, onClose, formatTime, userId, allTracks
}: Props) {
  const [viewMode, setViewMode] =
    useState<ViewMode>('audio')
  const [liked, setLiked] = useState(false)

  const handleLike = async () => {
    if (!userId || !supabase) return
    setLiked(l => !l)
    if (!liked) {
      await supabase.from('music_likes')
        .upsert([{
          user_id: userId,
          track_id: track.id,
          youtube_id: track.youtube_id,
        }], { onConflict: 'user_id,track_id' })
    } else {
      await supabase.from('music_likes')
        .delete()
        .eq('user_id', userId)
        .eq('track_id', track.id)
    }
  }

  // Load liked state
  // (run on mount and track change)
  useEffect(() => {
    const loadLiked = async () => {
      if (!userId || !supabase) return
      const { data } = await supabase
        .from('music_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('track_id', track.id)
        .maybeSingle()
      setLiked(!!data)
    }
    loadLiked()
  }, [userId, track.id])

  return (
    <div className="fixed inset-0 z-[80]
      bg-[#0B0B1E] flex flex-col">

      {/* The actual iframe is in parent component
          We just show/hide the container here */}
      {/* Video mode: iframe moved here visually */}
      {viewMode === 'video' && iframeRef.current && (
        <div className="w-full aspect-video
          bg-black flex-shrink-0">
          {/* Iframe is in DOM at parent level,
              visually we show it here via CSS
              by moving it to visible position */}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center
        justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onClose}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60">
          <ArrowLeft size={22} color="#FFFFFF"/>
        </button>
        <div className="text-center">
          <p className="text-[#9CA3AF] text-xs">
            Now Playing
          </p>
          <p className="text-[#9CA3AF] text-[10px]">
            {currentIndex + 1} of {queueLength}
          </p>
        </div>
        {/* Audio/Video toggle — no emojis */}
        <div className="flex bg-[#1A1A2E]
          rounded-full p-0.5">
          {(['audio','video'] as const).map(m => (
            <button key={m}
              onClick={() => {
                setViewMode(m)
                // Move iframe visibility
                if (iframeRef.current) {
                  if (m === 'video') {
                    Object.assign(
                      iframeRef.current.style, {
                      position: 'relative',
                      top: '0', left: '0',
                      width: '100%', height: '100%',
                      opacity: '1',
                      pointerEvents: 'auto',
                    })
                  } else {
                    Object.assign(
                      iframeRef.current.style, {
                      position: 'fixed',
                      top: '-9999px',
                      left: '-9999px',
                      width: '1px', height: '1px',
                      opacity: '0',
                      pointerEvents: 'none',
                    })
                  }
                }
              }}
              className={`px-3 py-1.5 rounded-full
                text-xs font-medium min-h-[30px]
                capitalize transition-colors
                duration-150
                ${viewMode === m
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#9CA3AF]'}`}>
              {m === 'audio' ? 'Audio' : 'Video'}
            </button>
          ))}
        </div>
      </div>

      {/* Album Art (Audio mode) */}
      {viewMode === 'audio' && (
        <div className="flex-1 flex flex-col
          items-center justify-center px-8">
          <div className="relative mb-8">
            <div className="absolute inset-0
              rounded-full bg-[#7C3AED]/20
              scale-[1.4]"
              style={{
                display: isPlaying ? 'block' : 'none'
              }}/>
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-60 h-60 rounded-full
                object-cover border-4
                border-[#1A1A2E] relative z-10"
            />
          </div>
          <p className="text-white font-bold
            text-xl text-center mb-1 line-clamp-2
            leading-tight">
            {track.title}
          </p>
          <p className="text-[#9CA3AF] text-sm">
            {track.channel_name}
          </p>

          {/* Like button */}
          <button
            onClick={handleLike}
            className="mt-4 px-6 py-2 rounded-full
              border active:opacity-60
              transition-colors duration-150"
            style={{
              borderColor: liked
                ? '#7C3AED' : '#2D2D44',
              backgroundColor: liked
                ? 'rgba(124,58,237,0.1)' : 'transparent',
            }}>
            <span className="text-sm font-medium"
              style={{
                color: liked ? '#A78BFA' : '#9CA3AF'
              }}>
              {liked ? 'Liked' : 'Like'}
            </span>
          </button>
        </div>
      )}

      {/* Video mode info */}
      {viewMode === 'video' && (
        <div className="flex-1 flex flex-col
          justify-end px-4 pb-2">
          <p className="text-white font-bold
            text-base mb-0.5 line-clamp-1">
            {track.title}
          </p>
          <p className="text-[#9CA3AF] text-sm">
            {track.channel_name}
          </p>
        </div>
      )}

      {/* Seekbar */}
      <div className="px-6 mb-3">
        <div className="relative h-1
          bg-[#2D2D44] rounded-full mb-1">
          <div className="absolute h-full
            bg-[#7C3AED] rounded-full pointer-events-none"
            style={{ width: `${progress}%` }}/>
          <div className="absolute top-1/2 w-3 h-3
            bg-white rounded-full pointer-events-none"
            style={{
              left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
            }}/>
          <input
            type="range" min={0}
            max={duration || 100}
            value={currentTime} step={0.1}
            onChange={e =>
              onSeek(parseFloat(e.target.value))}
            className="absolute inset-0 w-full
              h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex justify-between
          text-xs text-[#6B7280]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center
        justify-center gap-6 px-6 pb-8
        flex-shrink-0">
        <button onClick={onToggleShuffle}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60">
          <Shuffle size={20}
            color={shuffleMode
              ? '#7C3AED' : '#9CA3AF'}/>
        </button>
        <button onClick={onPrev}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60">
          <SkipBack size={26} color="#FFFFFF"/>
        </button>
        <button onClick={onTogglePlay}
          className="w-16 h-16 rounded-full
            flex items-center justify-center
            active:opacity-80"
          style={{ backgroundColor: '#7C3AED' }}>
          {isPlaying
            ? <Pause size={26} color="#FFFFFF"
                fill="#FFFFFF"/>
            : <Play size={26} color="#FFFFFF"
                fill="#FFFFFF"/>}
        </button>
        <button onClick={onNext}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60">
          <SkipForward size={26} color="#FFFFFF"/>
        </button>
        <button onClick={onToggleRepeat}
          className="w-10 h-10 flex items-center
            justify-center active:opacity-60
            relative">
          <Repeat size={20}
            color={repeatMode !== 'none'
              ? '#7C3AED' : '#9CA3AF'}/>
          {repeatMode === 'one' && (
            <span className="absolute -top-0.5
              -right-0.5 text-[9px] font-bold
              text-[#7C3AED]">1</span>
          )}
        </button>
      </div>
    </div>
  )
}
