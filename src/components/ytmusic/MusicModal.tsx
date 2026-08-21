// ── Play Nexa YT Music Modal ─────────────────────────────────
// Full screen overlay, bg #0A0A0A
// Album art (1:1, 280×280, YouTube thumbnail), seekbar, controls
// Hidden YouTube iframe (controls=0), Up Next queue
// Supabase engagement: Like (music_likes), Save (music_saved)
// localStorage fallback for anonymous users
// AMOLED dark theme, 44px touch targets, no backdrop-blur

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { lsGet, lsSet, formatDuration } from '@/lib/mediaUtils'
import type { MusicTrack, ChannelDisplay } from './TrackCard'

// ── Props ──

interface MusicModalProps {
  track: MusicTrack
  channelDisplay?: ChannelDisplay
  userId: string | null
  queue: MusicTrack[]
  onClose: () => void
  onNext: () => void
  onPrev: () => void
  onTrackSelect: (track: MusicTrack) => void
}

// ═══════════════════════════════════════════════════════════════
//  MUSIC MODAL
// ═══════════════════════════════════════════════════════════════

export default function MusicModal({
  track,
  channelDisplay,
  userId,
  queue,
  onClose,
  onNext,
  onPrev,
  onTrackSelect,
}: MusicModalProps) {

  const badgeColor = channelDisplay?.badge_color || '#A78BFA'
  const thumbSrc = track.thumbnail || `https://i.ytimg.com/vi/${track.youtube_id}/mqdefault.jpg`

  // ── Playback state ──
  const [isPlaying, setIsPlaying] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')
  const [shuffled, setShuffled] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Like/Save state ──
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saveCount, setSaveCount] = useState(0)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // ── Toast ──
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const showToastMsg = useCallback((msg: string) => {
    setToastMsg(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2500)
  }, [])

  // ── Record to history on open ──
  useEffect(() => {
    const history: Array<{ youtube_id: string; channel_id: string; watched_at: string }> =
      lsGet('pn_ytmusic_history', [])
    const existing = history.findIndex(h => h.youtube_id === track.youtube_id)
    if (existing >= 0) {
      history.splice(existing, 1)
    }
    history.unshift({
      youtube_id: track.youtube_id,
      channel_id: track.channel_id,
      watched_at: new Date().toISOString(),
    })
    // Keep max 100 entries
    if (history.length > 100) history.length = 100
    lsSet('pn_ytmusic_history', history)
  }, [track.youtube_id, track.channel_id])

  // ── Load like/save state on open ──
  useEffect(() => {
    if (!userId) {
      try {
        const localLikes: string[] = lsGet('pn_music_likes', [])
        const localSaved: string[] = lsGet('pn_music_saved', [])
        setIsLiked(localLikes.includes(track.youtube_id))
        setIsSaved(localSaved.includes(track.youtube_id))
      } catch { /* silent */ }
      return
    }

    const checkStatus = async () => {
      if (!supabase) return

      const [likeRes, saveRes] = await Promise.all([
        supabase
          .from('music_likes')
          .select('id')
          .eq('user_id', userId)
          .eq('track_id', track.id)
          .maybeSingle(),
        supabase
          .from('music_saved')
          .select('id')
          .eq('user_id', userId)
          .eq('track_id', track.id)
          .maybeSingle()
      ])

      if (likeRes.data) setIsLiked(true)
      if (saveRes.data) setIsSaved(true)
    }

    checkStatus()
  }, [userId, track.id, track.youtube_id])

  // ── Elapsed time timer ──
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying])

  // ── Close on Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Parse duration string to seconds for seekbar ──
  const durationSec = (() => {
    if (!track.duration) return 180 // default 3 min
    const parts = track.duration.split(':').map(Number)
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return 180
  })()

  const progressPercent = Math.min((elapsed / durationSec) * 100, 100)

  // ── Toggle play/pause ──
  const handleTogglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  // ── Like handler ──
  const handleLike = useCallback(async () => {
    if (isActionLoading) return
    setIsActionLoading(true)
    const newLiked = !isLiked
    setIsLiked(newLiked)

    if (!userId) {
      const local: string[] = lsGet('pn_music_likes', [])
      const updated = newLiked
        ? [...local, track.youtube_id]
        : local.filter(id => id !== track.youtube_id)
      lsSet('pn_music_likes', updated)
      showToastMsg(newLiked ? 'Liked!' : 'Removed like')
      setIsActionLoading(false)
      return
    }

    try {
      if (!supabase) throw new Error('Supabase not configured')
      if (newLiked) {
        await supabase.from('music_likes').insert({
          user_id: userId,
          track_id: track.id,
          youtube_id: track.youtube_id,
          created_at: new Date().toISOString(),
        })
        setLikeCount(prev => prev + 1)
        showToastMsg('Liked!')
      } else {
        await supabase.from('music_likes')
          .delete()
          .eq('user_id', userId)
          .eq('track_id', track.id)
        setLikeCount(prev => Math.max(0, prev - 1))
        showToastMsg('Removed like')
      }
    } catch {
      setIsLiked(!newLiked)
      showToastMsg('Action failed. Try again.')
    } finally {
      setIsActionLoading(false)
    }
  }, [isLiked, isActionLoading, userId, track.id, track.youtube_id, showToastMsg])

  // ── Save handler ──
  const handleSave = useCallback(async () => {
    if (isActionLoading) return
    setIsActionLoading(true)
    const newSaved = !isSaved
    setIsSaved(newSaved)

    if (!userId) {
      const local: string[] = lsGet('pn_music_saved', [])
      const updated = newSaved
        ? [...local, track.youtube_id]
        : local.filter(id => id !== track.youtube_id)
      lsSet('pn_music_saved', updated)
      showToastMsg(newSaved ? 'Saved!' : 'Removed from saved')
      setIsActionLoading(false)
      return
    }

    try {
      if (!supabase) throw new Error('Supabase not configured')
      if (newSaved) {
        await supabase.from('music_saved').insert({
          user_id: userId,
          track_id: track.id,
          youtube_id: track.youtube_id,
          created_at: new Date().toISOString(),
        })
        setSaveCount(prev => prev + 1)
        showToastMsg('Saved!')
      } else {
        await supabase.from('music_saved')
          .delete()
          .eq('user_id', userId)
          .eq('track_id', track.id)
        setSaveCount(prev => Math.max(0, prev - 1))
        showToastMsg('Removed from saved')
      }
    } catch {
      setIsSaved(!newSaved)
      showToastMsg('Action failed. Try again.')
    } finally {
      setIsActionLoading(false)
    }
  }, [isSaved, isActionLoading, userId, track.id, track.youtube_id, showToastMsg])

  // ── Share handler ──
  const handleShare = useCallback(async () => {
    const url = `https://youtube.com/watch?v=${track.youtube_id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text: `Listen: ${track.title}`, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToastMsg('Link copied!')
      }
    } catch { /* user cancelled */ }
  }, [track.title, track.youtube_id, showToastMsg])

  // ── Up Next: next 3 tracks from queue (excluding current) ──
  const currentIndex = queue.findIndex(t => t.id === track.id)
  const upNext: MusicTrack[] = (() => {
    const next = queue.filter((_, i) => i > currentIndex && i <= currentIndex + 3).slice(0, 3)
    if (next.length === 0) {
      return queue.filter(t => t.id !== track.id).slice(0, 3)
    }
    return next
  })()

  // ── Render ──
  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden" style={{ backgroundColor: '#0A0A0A' }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
          aria-label="Collapse"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <p className="text-white text-sm font-medium">Now Playing</p>
        <button
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
          aria-label="Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">

        {/* ── ALBUM ART (1:1, 280×280, rounded-2xl) ── */}
        <div className="flex justify-center mt-4 mb-8">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ width: 280, height: 280 }}
          >
            <img
              src={thumbSrc}
              alt={track.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${track.youtube_id}/maxresdefault.jpg`
              }}
            />
          </div>
        </div>

        {/* ── TRACK INFO ── */}
        <div className="mb-6">
          <h2 className="text-white text-[22px] font-bold leading-tight line-clamp-2 mb-1">
            {track.title}
          </h2>
          <p className="text-[14px]" style={{ color: badgeColor }}>
            {track.channel_name}
          </p>
        </div>

        {/* ── ACTION ROW: Like | Comment | Share | Save ── */}
        <div className="flex items-center justify-around mb-6">
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={isActionLoading}
            className={`flex flex-col items-center gap-1 min-w-[60px] min-h-[44px] justify-center transition-opacity duration-150 ${isActionLoading ? 'opacity-50' : ''}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24"
              fill={isLiked ? '#7C3AED' : 'none'}
              stroke={isLiked ? '#7C3AED' : '#9CA3AF'}
              strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            <span className={`text-xs font-medium ${isLiked ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'}`}>
              {likeCount > 0 ? likeCount : 'Like'}
            </span>
          </button>

          {/* Comment */}
          <button
            className="flex flex-col items-center gap-1 min-w-[60px] min-h-[44px] justify-center"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs text-[#9CA3AF]">Comment</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 min-w-[60px] min-h-[44px] justify-center"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span className="text-xs text-[#9CA3AF]">Share</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isActionLoading}
            className={`flex flex-col items-center gap-1 min-w-[60px] min-h-[44px] justify-center transition-opacity duration-150 ${isActionLoading ? 'opacity-50' : ''}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24"
              fill={isSaved ? '#06B6D4' : 'none'}
              stroke={isSaved ? '#06B6D4' : '#9CA3AF'}
              strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span className={`text-xs font-medium ${isSaved ? 'text-[#06B6D4]' : 'text-[#9CA3AF]'}`}>
              {saveCount > 0 ? saveCount : 'Save'}
            </span>
          </button>
        </div>

        {/* ── SEEKBAR ── */}
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={durationSec}
            value={elapsed}
            onChange={(e) => setElapsed(Number(e.target.value))}
            className="w-full h-1 cursor-pointer np-seekbar"
            aria-label="Seek"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[11px] text-[#9CA3AF]">{formatDuration(elapsed)}</span>
            <span className="text-[11px] text-[#9CA3AF]">{formatDuration(durationSec)}</span>
          </div>
        </div>

        {/* ── CONTROLS: shuffle | prev | play/pause | next | repeat ── */}
        <div className="flex items-center justify-between px-4 mb-8">
          {/* Shuffle */}
          <button
            onClick={() => setShuffled(prev => !prev)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-opacity duration-150 ${shuffled ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'}`}
            aria-label="Shuffle"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>

          {/* Prev */}
          <button
            onClick={onPrev}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
            aria-label="Previous track"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause — 60px circle #7C3AED */}
          <button
            onClick={handleTogglePlay}
            className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white transition-transform duration-100 active:scale-95"
            style={{ backgroundColor: '#7C3AED' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
            aria-label="Next track"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          {/* Repeat */}
          <button
            onClick={() => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-opacity duration-150 ${repeatMode !== 'off' ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'}`}
            aria-label="Repeat"
          >
            {repeatMode === 'one' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                <text x="10" y="15" fontSize="8" fill="currentColor" stroke="none">1</text>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            )}
          </button>
        </div>

        {/* ── UP NEXT QUEUE ── */}
        {upNext.length > 0 && (
          <div className="mb-4">
            <p className="text-white text-sm font-semibold mb-3">Up Next</p>
            <div className="space-y-1">
              {upNext.map(t => (
                <button
                  key={t.id}
                  onClick={() => onTrackSelect(t)}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left active:bg-[#1F1F1F] transition-colors duration-100 min-h-[44px]"
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#1A1A1A] flex-shrink-0">
                    <img
                      src={t.thumbnail || `https://i.ytimg.com/vi/${t.youtube_id}/mqdefault.jpg`}
                      alt={t.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{t.title}</p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">{t.channel_name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── HIDDEN YOUTUBE IFRAME ── */}
      <iframe
        src={`https://www.youtube.com/embed/${track.youtube_id}?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1`}
        className="w-0 h-0 absolute"
        allow="autoplay"
        title={track.title}
      />

      {/* ── TOAST ── */}
      {showToast && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#2D2D2D] rounded-full px-4 py-2 text-white text-sm z-[80] pointer-events-none">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
