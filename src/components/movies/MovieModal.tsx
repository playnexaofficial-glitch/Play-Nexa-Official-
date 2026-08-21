// ── Play Nexa Movie Modal ────────────────────────────────────
// Full screen, bg #000
// YouTube player (aspect-video, controls=1)
// Action bar: Like | Save | Share | Comment
// More from channel section
// Description (line-clamp-3 expandable)
// History recording to localStorage + Supabase watch_count increment
// AMOLED dark theme, 44px touch targets, no backdrop-blur

'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { lsGet, lsSet } from '@/lib/mediaUtils'
import { type Movie, type ChannelDisplay } from './MovieCard'
import { formatCount } from '@/lib/types'
import PlayNexaPlayer from './PlayNexaPlayer'

// ── Comment type (localStorage only) ──

interface Comment {
  id: string
  text: string
  timestamp: number
}

// ── Props ──

interface MovieModalProps {
  movie: Movie
  channelDisplay?: ChannelDisplay
  userId: string | null
  allMovies: Movie[]
  channels: ChannelDisplay[]
  onClose: () => void
  onMovieSelect: (movie: Movie) => void
}

// ═══════════════════════════════════════════════════════════════
//  MOVIE MODAL
// ═══════════════════════════════════════════════════════════════

export default function MovieModal({
  movie,
  channelDisplay,
  userId,
  allMovies,
  channels,
  onClose,
  onMovieSelect,
}: MovieModalProps) {

  const badgeColor = channelDisplay?.badge_color || '#A78BFA'

  // ── Like/Save state ──
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // ── Comments state ──
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Comment[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem(`pn_comments_${movie.youtube_id}`) || '[]'
      )
    } catch { return [] }
  })

  // ── Description expandable ──
  const [descExpanded, setDescExpanded] = useState(false)

  // ── Toast ──
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const showToastMsg = useCallback((msg: string) => {
    setToastMsg(msg)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2500)
  }, [])

  // ── Record to history on open + increment watch_count ──
  useEffect(() => {
    // Record in localStorage
    const history: Array<{ youtube_id: string; channel_id: string; watched_at: string }> =
      lsGet('pn_movie_history', [])
    const existing = history.findIndex(h => h.youtube_id === movie.youtube_id)
    if (existing >= 0) {
      history.splice(existing, 1)
    }
    history.unshift({
      youtube_id: movie.youtube_id,
      channel_id: movie.channel_id,
      watched_at: new Date().toISOString(),
    })
    if (history.length > 100) history.length = 100
    lsSet('pn_movie_history', history)

    // Increment watch_count in Supabase
    if (supabase) {
      supabase
        .from('movies')
        .update({ watch_count: (movie.watch_count || 0) + 1 })
        .eq('id', movie.id)
        .then(() => { /* silent */ })
    }
  }, [movie.id, movie.youtube_id, movie.channel_id, movie.watch_count])

  // ── Load like/save state on open ──
  useEffect(() => {
    if (!userId) {
      try {
        const localLikes: string[] = lsGet('pn_local_likes', [])
        const localSaved: string[] = lsGet('pn_movies_watchlist', [])
        setIsLiked(localLikes.includes(movie.youtube_id))
        setIsSaved(localSaved.includes(movie.youtube_id))
      } catch { /* silent */ }
      return
    }

    const checkStatus = async () => {
      if (!supabase) return

      const [likeRes, saveRes] = await Promise.all([
        supabase
          .from('user_likes')
          .select('id')
          .eq('user_id', userId)
          .eq('movie_id', movie.id)
          .maybeSingle(),
        supabase
          .from('user_watchlist')
          .select('id')
          .eq('user_id', userId)
          .eq('movie_id', movie.id)
          .maybeSingle()
      ])

      if (likeRes.data) setIsLiked(true)
      if (saveRes.data) setIsSaved(true)
    }

    checkStatus()
  }, [userId, movie.id, movie.youtube_id])

  // ── Close on Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Like handler (optimistic update) ──
  const handleLike = useCallback(async () => {
    if (isActionLoading) return
    setIsActionLoading(true)
    const newLiked = !isLiked
    setIsLiked(newLiked)

    if (!userId) {
      const local: string[] = lsGet('pn_local_likes', [])
      const updated = newLiked
        ? [...local, movie.youtube_id]
        : local.filter(id => id !== movie.youtube_id)
      lsSet('pn_local_likes', updated)
      showToastMsg(newLiked ? 'Liked!' : 'Removed like')
      setIsActionLoading(false)
      return
    }

    try {
      if (!supabase) throw new Error('Supabase not configured')
      if (newLiked) {
        await supabase.from('user_likes').insert({
          user_id: userId,
          movie_id: movie.id,
          youtube_id: movie.youtube_id,
          created_at: new Date().toISOString(),
        })
        showToastMsg('Liked!')
      } else {
        await supabase.from('user_likes')
          .delete()
          .eq('user_id', userId)
          .eq('movie_id', movie.id)
        showToastMsg('Removed like')
      }
    } catch {
      setIsLiked(!newLiked)
      showToastMsg('Action failed. Try again.')
    } finally {
      setIsActionLoading(false)
    }
  }, [isLiked, isActionLoading, userId, movie.id, movie.youtube_id, showToastMsg])

  // ── Save handler ──
  const handleSave = useCallback(async () => {
    if (isActionLoading) return
    setIsActionLoading(true)
    const newSaved = !isSaved
    setIsSaved(newSaved)

    if (!userId) {
      const local: string[] = lsGet('pn_movies_watchlist', [])
      const updated = newSaved
        ? [...local, movie.youtube_id]
        : local.filter(id => id !== movie.youtube_id)
      lsSet('pn_movies_watchlist', updated)
      showToastMsg(newSaved ? 'Saved to Watchlist' : 'Removed from Watchlist')
      setIsActionLoading(false)
      return
    }

    try {
      if (!supabase) throw new Error('Supabase not configured')
      if (newSaved) {
        await supabase.from('user_watchlist').insert({
          user_id: userId,
          movie_id: movie.id,
          youtube_id: movie.youtube_id,
          created_at: new Date().toISOString(),
        })
        showToastMsg('Saved to Watchlist')
      } else {
        await supabase.from('user_watchlist')
          .delete()
          .eq('user_id', userId)
          .eq('movie_id', movie.id)
        showToastMsg('Removed from Watchlist')
      }
    } catch {
      setIsSaved(!newSaved)
      showToastMsg('Action failed. Try again.')
    } finally {
      setIsActionLoading(false)
    }
  }, [isSaved, isActionLoading, userId, movie.id, movie.youtube_id, showToastMsg])

  // ── Share handler ──
  const handleShare = useCallback(async () => {
    const url = `https://youtube.com/watch?v=${movie.youtube_id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: movie.title, text: `Watch: ${movie.title}`, url })
      } else {
        await navigator.clipboard.writeText(url)
        showToastMsg('Link copied!')
      }
    } catch { /* user cancelled */ }
  }, [movie.title, movie.youtube_id, showToastMsg])

  // ── Comment handler (localStorage only) ──
  const handleComment = useCallback(() => {
    if (!commentText.trim()) return
    const newComment: Comment = {
      id: Date.now().toString(),
      text: commentText.trim(),
      timestamp: Date.now(),
    }
    const updated = [...comments, newComment]
    setComments(updated)
    setCommentText('')
    try {
      localStorage.setItem(
        `pn_comments_${movie.youtube_id}`,
        JSON.stringify(updated)
      )
    } catch { /* silent */ }
  }, [commentText, comments, movie.youtube_id])

  // ── More from channel ──
  const sameChannelMovies = allMovies
    .filter(m => m.channel_id === movie.channel_id && m.id !== movie.id)
    .slice(0, 6)

  // ── Render ──
  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-black">

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0">
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <p className="text-white text-sm font-medium flex-1 truncate">{movie.title}</p>
      </div>

      {/* ── PLAYER (aspect-video) — PLAYit-style with lock + gestures ── */}
      <PlayNexaPlayer
        title={movie.title}
        onClose={onClose}
        showBadge={false}
        isYouTube={true}
      >
        <iframe
          src={`https://www.youtube.com/embed/${movie.youtube_id}?autoplay=1&modestbranding=1&rel=0&controls=1&playsinline=1`}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
          allowFullScreen
          title={movie.title}
        />
      </PlayNexaPlayer>

      {/* ── SCROLLABLE BELOW ── */}
      <div className="flex-1 overflow-y-auto" style={{ contentVisibility: 'auto' } as React.CSSProperties}>

        {/* ── MOVIE INFO ── */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #1A1A1A' }}>
          <p className="text-white font-semibold text-base leading-snug mb-1">
            {movie.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: badgeColor }}>
              {movie.channel_name}
            </span>
            {movie.published_at && (
              <span className="text-[#9CA3AF] text-xs">
                · {new Date(movie.published_at).getFullYear()}
              </span>
            )}
            {movie.view_count > 0 && (
              <span className="text-[#9CA3AF] text-xs">
                · {formatCount(movie.view_count)} views
              </span>
            )}
          </div>
        </div>

        {/* ── ACTION BAR (4 equal buttons) ── */}
        <div className="grid grid-cols-4 px-4 py-3" style={{ borderBottom: '1px solid #1A1A1A' }}>
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={isActionLoading}
            className={`flex flex-col items-center gap-1 min-h-[44px] justify-center transition-opacity duration-150 ${isActionLoading ? 'opacity-50' : ''}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24"
              fill={isLiked ? '#7C3AED' : 'none'}
              stroke={isLiked ? '#7C3AED' : '#9CA3AF'}
              strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            <span className={`text-xs font-medium ${isLiked ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'}`}>
              {isLiked ? 'Liked' : 'Like'}
            </span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isActionLoading}
            className={`flex flex-col items-center gap-1 min-h-[44px] justify-center transition-opacity duration-150 ${isActionLoading ? 'opacity-50' : ''}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24"
              fill={isSaved ? '#06B6D4' : 'none'}
              stroke={isSaved ? '#06B6D4' : '#9CA3AF'}
              strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span className={`text-xs font-medium ${isSaved ? 'text-[#06B6D4]' : 'text-[#9CA3AF]'}`}>
              {isSaved ? 'Saved' : 'Save'}
            </span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 min-h-[44px] justify-center"
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

          {/* Comment */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex flex-col items-center gap-1 min-h-[44px] justify-center"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs text-[#9CA3AF]">
              {comments.length > 0 ? comments.length : 'Comment'}
            </span>
          </button>
        </div>

        {/* ── COMMENTS SECTION ── */}
        {showComments && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #1A1A1A' }}>
            <p className="text-white font-semibold text-sm mb-3">
              Comments ({comments.length})
            </p>
            <div className="flex gap-2 mb-3">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
                className="flex-1 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-3 py-2 text-sm text-white outline-none resize-none placeholder-[#9CA3AF]"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="px-4 rounded-xl text-white text-sm font-medium disabled:opacity-40 self-end py-2 min-h-[44px]"
                style={{ backgroundColor: '#7C3AED' }}
              >
                Post
              </button>
            </div>
            {comments.length === 0 ? (
              <p className="text-[#9CA3AF] text-sm text-center py-3">No comments yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...comments].reverse().map(c => (
                  <div key={c.id} className="bg-[#1A1A1A] rounded-xl px-3 py-2">
                    <p className="text-white text-sm">{c.text}</p>
                    <p className="text-[#9CA3AF] text-xs mt-1">
                      {new Date(c.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MORE FROM CHANNEL ── */}
        {sameChannelMovies.length > 0 && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #1A1A1A' }}>
            <p className="text-white font-semibold text-sm mb-3">
              More from {movie.channel_name}
            </p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {sameChannelMovies.map(m => {
                const mChDisplay = channels.find(ch =>
                  ch.channel_id === m.channel_id || ch.yt_channels?.channel_id === m.channel_id
                )
                const mThumb = m.thumbnail || `https://i.ytimg.com/vi/${m.youtube_id}/mqdefault.jpg`
                return (
                  <button
                    key={m.id}
                    onClick={() => onMovieSelect(m)}
                    className="flex-shrink-0 w-[140px] text-left active:scale-[0.97] transition-transform duration-100"
                  >
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-[#1A1A1A]">
                      <img
                        src={mThumb}
                        alt={m.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {m.duration && (
                        <span className="absolute bottom-1 right-1 text-white text-[9px] rounded px-1 py-0.5" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                          {m.duration}
                        </span>
                      )}
                    </div>
                    <p className="text-white text-[12px] font-medium line-clamp-2 mt-1.5">
                      {m.title}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── DESCRIPTION ── */}
        {movie.description && (
          <div className="px-4 py-3">
            <p className={`text-[#9CA3AF] text-xs ${descExpanded ? '' : 'line-clamp-3'}`}>
              {movie.description}
            </p>
            <button
              onClick={() => setDescExpanded(prev => !prev)}
              className="text-[#7C3AED] text-xs font-medium mt-1 min-h-[44px] flex items-center"
            >
              {descExpanded ? 'Show less' : 'Show more'}
            </button>
          </div>
        )}
      </div>

      {/* ── TOAST ── */}
      {showToast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-[#2D2D2D] rounded-full px-4 py-2 text-white text-sm z-[80] pointer-events-none">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
