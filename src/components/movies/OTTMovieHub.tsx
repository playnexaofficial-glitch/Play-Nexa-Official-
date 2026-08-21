// ── Play Nexa OTT Movie Hub — Supabase Powered ──────────────────
// Zero YouTube Data API — Zero RSS feeds — Real Supabase DB queries
// Movies fetched from `movies` table with server-side channel filtering
// Structured OTT channel mapping: BD (G-Series, Eagle, Chorki, BongoBD)
//                               IN (Goldmines, Pen Movies, Sony LIV, YRF)
// Country tabs: All / Bangladesh / India → dynamic channel pill carousel
// Supabase query: .or('channel_name.eq.X,filter_key.eq.Y') for precision
// Neon channel badges, 2/3-column grid, 2GB RAM safe
// Full-screen YouTube player modal with engagement bar
// Like → upsert user_likes, Save → insert user_watchlist,
// Play → upsert user_history, Share → Web Share API
// AMOLED dark theme: bg #0D0D0D, surface #1A1A2E, accent #7C3AED
// 44px min touch targets, no backdrop-blur, no styled-jsx

'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Image from 'next/image'
import { getSupabase, isSupabaseReady, type SupabaseMovie } from '@/lib/supabase'
import { cacheGet, cacheSet } from '@/lib/cache'

// ════════════════════════════════════════════════════════════════
// STRUCTURED OTT CHANNEL MAPPING ARRAY
// ════════════════════════════════════════════════════════════════

export type CountryCode = 'BD' | 'IN'

export interface OTTChannel {
  /** Human-readable channel name — must match `channel_name` column in Supabase */
  name: string
  /** Machine filter key — must match `filter_key` column in Supabase (nullable) */
  filterKey: string
  /** Country grouping: BD = Bangladesh, IN = India */
  country: CountryCode
  /** Emoji rendered inside neon badge on cards */
  emoji: string
  /** Primary neon color for badge glow + pill highlight */
  color: string
}

/**
 * Official Bangladeshi & Indian YouTube Movie/Drama Channel Map
 * Each entry maps to real Supabase `movies` table rows via
 * `channel_name` or `filter_key` column matching.
 *
 * BD OTT Channels:
 *   G-Series Movies  → gseries_movies
 *   Eagle Movies     → eagle_movies
 *   Chorki           → chorki_free
 *   BongoBD          → bongobd
 *
 * IN Cinema Channels:
 *   Goldmines        → goldmines
 *   Pen Movies       → pen_movies
 *   Sony LIV         → sonyliv_free
 *   YRF              → yrf
 */
const OTT_CHANNELS: OTTChannel[] = [
  // ── Bangladesh (BD) OTT Channels ──
  {
    name: 'G-Series Movies',
    filterKey: 'gseries_movies',
    country: 'BD',
    emoji: '🎬',
    color: '#FF6B35',
  },
  {
    name: 'Eagle Movies',
    filterKey: 'eagle_movies',
    country: 'BD',
    emoji: '🍿',
    color: '#FFD700',
  },
  {
    name: 'Chorki',
    filterKey: 'chorki_free',
    country: 'BD',
    emoji: '⚡',
    color: '#E91E63',
  },
  {
    name: 'BongoBD',
    filterKey: 'bongobd',
    country: 'BD',
    emoji: '📺',
    color: '#00BCD4',
  },

  // ── India (IN) Cinema Channels ──
  {
    name: 'Goldmines',
    filterKey: 'goldmines',
    country: 'IN',
    emoji: '🔥',
    color: '#FF9800',
  },
  {
    name: 'Pen Movies',
    filterKey: 'pen_movies',
    country: 'IN',
    emoji: '🎯',
    color: '#4CAF50',
  },
  {
    name: 'Sony LIV',
    filterKey: 'sonyliv_free',
    country: 'IN',
    emoji: '💎',
    color: '#2196F3',
  },
  {
    name: 'YRF',
    filterKey: 'yrf',
    country: 'IN',
    emoji: '🌟',
    color: '#9C27B0',
  },
]

// ── Alias lookups ──────────────────────────────────────────────

const CHANNEL_BY_NAME: Record<string, OTTChannel> = {}
const CHANNEL_BY_FILTER_KEY: Record<string, OTTChannel> = {}

OTT_CHANNELS.forEach((ch) => {
  CHANNEL_BY_NAME[ch.name] = ch
  CHANNEL_BY_FILTER_KEY[ch.filterKey] = ch
})

/** Resolve a movie's channel_name or filter_key to our structured OTTChannel config */
function resolveChannel(channelName: string, filterKey?: string | null): OTTChannel {
  if (filterKey && CHANNEL_BY_FILTER_KEY[filterKey]) {
    return CHANNEL_BY_FILTER_KEY[filterKey]
  }
  if (CHANNEL_BY_NAME[channelName]) {
    return CHANNEL_BY_NAME[channelName]
  }
  // Fallback for channels not in our map
  return {
    name: channelName || 'Other',
    filterKey: '',
    country: 'BD',
    emoji: '🎥',
    color: '#7C3AED',
  }
}

// ════════════════════════════════════════════════════════════════
// COUNTRY FILTER TYPE
// ════════════════════════════════════════════════════════════════

type CountryFilter = 'all' | 'BD' | 'IN'

interface CountryTab {
  key: CountryFilter
  label: string
  flag: string
}

const COUNTRY_TABS: CountryTab[] = [
  { key: 'all', label: 'All', flag: '🌍' },
  { key: 'BD',  label: 'Bangladesh', flag: '🇧🇩' },
  { key: 'IN',  label: 'India', flag: '🇮🇳' },
]

// ── Constants ──────────────────────────────────────────────────

const CACHE_KEY = 'pn_ott_hub_movies'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const PAGE_SIZE = 20

// ── Helpers ────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    return `${weeks}w ago`
  } catch {
    return ''
  }
}

// ── Skeleton Loader ────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="w-full">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-pn-card">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
      <div className="pt-2.5 px-0.5 space-y-2">
        <div className="h-3.5 bg-pn-card rounded w-4/5 overflow-hidden">
          <div className="h-full -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
        <div className="h-2.5 bg-pn-card rounded w-3/5 overflow-hidden">
          <div className="h-full -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
        <div className="h-4 bg-pn-card rounded-full w-24 overflow-hidden" />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// COUNTRY TAB BUTTON
// ════════════════════════════════════════════════════════════════

function CountryTabButton({
  tab,
  active,
  onClick,
}: {
  tab: CountryTab
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-medium transition-all duration-200 min-h-[44px] border whitespace-nowrap ${
        active
          ? 'bg-pn-purple text-white border-pn-purple shadow-lg shadow-pn-purple/20'
          : 'bg-pn-card border-pn-border text-pn-muted active:bg-pn-secondary'
      }`}
      aria-pressed={active}
    >
      <span className="text-sm">{tab.flag}</span>
      <span>{tab.label}</span>
    </button>
  )
}

// ════════════════════════════════════════════════════════════════
// CHANNEL PILL BUTTON (Neon-styled)
// ════════════════════════════════════════════════════════════════

function ChannelPill({
  channel,
  active,
  onClick,
}: {
  channel: OTTChannel
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium transition-all duration-200 min-h-[44px] border ${
        active
          ? 'text-white shadow-lg'
          : 'bg-pn-card border-pn-border text-pn-muted active:bg-pn-secondary'
      }`}
      style={
        active
          ? {
              background: `linear-gradient(135deg, ${channel.color}33, ${channel.color}11)`,
              borderColor: `${channel.color}88`,
              boxShadow: `0 0 16px ${channel.color}22`,
            }
          : undefined
      }
      aria-pressed={active}
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
        style={{ background: active ? channel.color : '#1A1A2E' }}
      >
        <span className="text-white">{channel.emoji}</span>
      </span>
      <span className="truncate max-w-[80px]">{channel.name}</span>
    </button>
  )
}

// ════════════════════════════════════════════════════════════════
// VIDEO CARD WITH NEON CHANNEL BADGE
// ════════════════════════════════════════════════════════════════

function VideoCard({
  movie,
  onPlay,
  isLiked,
  isSaved,
}: {
  movie: SupabaseMovie
  onPlay: (movie: SupabaseMovie) => void
  isLiked: boolean
  isSaved: boolean
}) {
  const [imgReady, setImgReady] = useState(false)
  const channel = resolveChannel(movie.channel, (movie as any).filter_key)

  return (
    <div
      onClick={() => onPlay(movie)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay(movie)
      }}
      className="group cursor-pointer active:scale-[0.97] transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-pn-purple rounded-xl w-full"
    >
      {/* ── THUMBNAIL ── */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-pn-card">
        <Image
          src={movie.thumbnail_url || ''}
          alt={movie.title}
          fill
          className={`object-cover transition-opacity duration-300 ${imgReady ? 'opacity-100' : 'opacity-0'}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          loading="lazy"
          unoptimized
          onLoad={() => setImgReady(true)}
        />

        {/* Shimmer while loading */}
        {!imgReady && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200 bg-black/30">
          <div className="w-11 h-11 rounded-full bg-pn-purple/90 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* ── NEON CHANNEL BADGE PILL ── */}
        <span
          className="absolute top-2 left-2 z-10 flex items-center gap-1 text-[9px] font-bold rounded-full px-2 py-1 border"
          style={{
            background: `${channel.color}22`,
            borderColor: `${channel.color}88`,
            color: channel.color,
            boxShadow: `0 0 8px ${channel.color}33`,
          }}
        >
          <span className="text-[10px]">{channel.emoji}</span>
          <span className="truncate max-w-[60px]">{channel.name}</span>
        </span>

        {/* Country flag micro-badge */}
        <span className="absolute top-2 right-2 z-10 text-[10px] bg-black/70 rounded-full px-1.5 py-0.5">
          {channel.country === 'BD' ? '🇧🇩' : '🇮🇳'}
        </span>

        {/* Published time badge */}
        {movie.created_at && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-medium rounded px-1.5 py-0.5">
            {timeAgo(movie.created_at)}
          </span>
        )}

        {/* Liked / Saved indicators */}
        {(isLiked || isSaved) && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {isLiked && (
              <span className="bg-pn-purple/90 text-white text-[8px] font-bold rounded px-1.5 py-0.5">
                ❤️
              </span>
            )}
            {isSaved && (
              <span className="bg-pn-success/90 text-white text-[8px] font-bold rounded px-1.5 py-0.5">
                🔖
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── INFO ── */}
      <div className="pt-2 pb-1 px-0.5">
        <h3 className="text-white text-[13px] font-medium leading-snug line-clamp-2 mb-1">
          {movie.title}
        </h3>
        <p className="text-pn-muted text-[11px] truncate">
          {movie.channel}
          {movie.language && movie.language !== 'Bangla' && (
            <span className="ml-1 text-pn-muted/60">&bull; {movie.language}</span>
          )}
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// ENGAGEMENT BAR (Like, Comment, Share, Save)
// ════════════════════════════════════════════════════════════════

function EngagementBar({
  movie,
  isLiked,
  isSaved,
  onToggleLike,
  onToggleSave,
}: {
  movie: SupabaseMovie
  isLiked: boolean
  isSaved: boolean
  onToggleLike: () => void
  onToggleSave: () => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setLocalComments] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pn_ott_comments') || '{}')
      return stored[movie.id] || []
    } catch {
      return []
    }
  })

  const channel = resolveChannel(movie.channel, (movie as any).filter_key)

  // ── COMMENT ──
  const handleSubmitComment = useCallback(() => {
    if (!commentText.trim()) return
    const updated = [commentText.trim(), ...comments]
    setLocalComments(updated)
    setCommentText('')
    try {
      const stored = JSON.parse(localStorage.getItem('pn_ott_comments') || '{}')
      stored[movie.id] = updated
      localStorage.setItem('pn_ott_comments', JSON.stringify(stored))
    } catch {
      /* silent */
    }
  }, [commentText, comments, movie.id])

  // ── SHARE ──
  const handleShare = useCallback(async () => {
    const shareUrl = `https://www.youtube.com/watch?v=${movie.yt_video_id}`
    const shareData = {
      title: movie.title,
      text: `Watch "${movie.title}" on YouTube`,
      url: shareUrl,
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      try {
        await navigator.clipboard.writeText(shareUrl)
      } catch {
        // Final fallback — no-op
      }
    }
  }, [movie.yt_video_id, movie.title])

  return (
    <div className="mt-4">
      {/* ── TITLE & CHANNEL ── */}
      <h2 className="text-white text-lg font-bold leading-snug mb-2">{movie.title}</h2>

      <div className="flex flex-wrap gap-2 mb-3">
        {/* Neon channel badge */}
        <span
          className="flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 border"
          style={{
            background: `${channel.color}22`,
            borderColor: `${channel.color}66`,
            color: channel.color,
          }}
        >
          <span>{channel.emoji}</span>
          {channel.name}
        </span>
        {/* Country badge */}
        <span className="bg-pn-card border border-pn-border text-pn-muted text-[10px] rounded-full px-2.5 py-1">
          {channel.country === 'BD' ? '🇧🇩 Bangladesh' : '🇮🇳 India'}
        </span>
        <span className="bg-pn-success/15 text-pn-success text-[10px] font-bold rounded-full px-2.5 py-1 border border-pn-success/30">
          FREE
        </span>
        {movie.created_at && (
          <span className="bg-pn-card border border-pn-border text-pn-muted text-[10px] rounded-full px-2.5 py-1">
            {timeAgo(movie.created_at)}
          </span>
        )}
        {movie.language && (
          <span className="bg-pn-card border border-pn-border text-pn-muted text-[10px] rounded-full px-2.5 py-1">
            {movie.language}
          </span>
        )}
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="flex items-center gap-1 border-y border-pn-border py-2">
        {/* Like */}
        <button
          type="button"
          onClick={onToggleLike}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-150 min-h-[44px] ${
            isLiked
              ? 'bg-pn-purple/15 text-pn-purple border border-pn-purple/30'
              : 'bg-pn-card border border-pn-border text-pn-muted active:bg-pn-secondary'
          }`}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          <span>{isLiked ? 'Liked' : 'Like'}</span>
        </button>

        {/* Comment */}
        <button
          type="button"
          onClick={() => setShowComments((c) => !c)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-150 min-h-[44px] ${
            showComments
              ? 'bg-pn-cyan/15 text-pn-cyan border border-pn-cyan/30'
              : 'bg-pn-card border border-pn-border text-pn-muted active:bg-pn-secondary'
          }`}
          aria-label="Comments"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{comments.length > 0 ? comments.length : 'Comment'}</span>
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium bg-pn-card border border-pn-border text-pn-muted active:bg-pn-secondary transition-all duration-150 min-h-[44px]"
          aria-label="Share"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>Share</span>
        </button>

        {/* Save / Watchlist */}
        <button
          type="button"
          onClick={onToggleSave}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-150 min-h-[44px] ${
            isSaved
              ? 'bg-pn-success/15 text-pn-success border border-pn-success/30'
              : 'bg-pn-card border border-pn-border text-pn-muted active:bg-pn-secondary'
          }`}
          aria-label={isSaved ? 'Remove from Watchlist' : 'Save to Watchlist'}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      {/* ── COMMENT SECTION (expandable) ── */}
      {showComments && (
        <div className="mt-3">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitComment()
              }}
              placeholder="Add a comment..."
              className="flex-1 bg-pn-card border border-pn-border rounded-full px-4 py-2.5 text-white text-xs placeholder-pn-muted focus:outline-none focus:border-pn-purple transition-colors min-h-[44px]"
              maxLength={500}
            />
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={!commentText.trim()}
              className="rounded-full px-4 py-2.5 text-xs font-medium bg-pn-purple text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all duration-150 min-h-[44px]"
            >
              Post
            </button>
          </div>

          {comments.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {comments.map((comment, idx) => (
                <div
                  key={idx}
                  className="bg-pn-card border border-pn-border rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-pn-purple/30 flex items-center justify-center">
                      <span className="text-pn-purple text-[9px] font-bold">U</span>
                    </div>
                    <span className="text-pn-muted text-[10px]">You</span>
                  </div>
                  <p className="text-white text-xs leading-relaxed">{comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-pn-muted text-xs text-center py-4">
              No comments yet. Be the first!
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PLAYER MODAL (Full-screen YouTube iframe)
// ════════════════════════════════════════════════════════════════

function PlayerModal({
  movie,
  isLiked,
  isSaved,
  onToggleLike,
  onToggleSave,
  onClose,
}: {
  movie: SupabaseMovie
  isLiked: boolean
  isSaved: boolean
  onToggleLike: () => void
  onToggleSave: () => void
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Build YouTube embed URL from the youtube_id in the Supabase row
  const embedUrl = `https://www.youtube.com/embed/${movie.yt_video_id}?autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1&playsinline=1&fs=1&color=white&cc_load_policy=0&iv_load_policy=3`

  // ESC key & body scroll lock
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Click outside to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose]
  )

  const channel = resolveChannel(movie.channel, (movie as any).filter_key)

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/95 animate-[fade-in_200ms_ease-out] pt-2 sm:pt-4 md:pt-8 px-2 sm:px-4 pb-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${movie.title}`}
    >
      <div className="w-full max-w-5xl animate-[fade-in_300ms_ease-out]">
        {/* ── HEADER BAR ── */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="bg-pn-purple/90 rounded px-2.5 py-1">
              <p className="text-white text-[11px] font-bold tracking-wider">Play Nexa</p>
            </span>
            <span className="text-white/50 text-xs">NOW PLAYING</span>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-150 min-h-[44px] min-w-[44px]"
            aria-label="Close player"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── YOUTUBE IFRAME PLAYER ── */}
        <div className="relative w-full bg-black rounded-xl overflow-hidden">
          <div className="relative aspect-video overflow-hidden">
            <div className="absolute -top-[10px] left-0 right-0 bottom-0">
              <iframe
                src={embedUrl}
                className="w-full h-[calc(100%+10px)]"
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                style={{ border: 'none' }}
                title={movie.title}
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* ── ENGAGEMENT BAR ── */}
        <EngagementBar
          movie={movie}
          isLiked={isLiked}
          isSaved={isSaved}
          onToggleLike={onToggleLike}
          onToggleSave={onToggleSave}
        />

        {/* ── DESCRIPTION ── */}
        {movie.description && (
          <div className="mt-3 bg-pn-card border border-pn-border rounded-xl p-3">
            <p className="text-pn-muted text-xs leading-relaxed line-clamp-4">
              {movie.description}
            </p>
          </div>
        )}

        {/* ── CHANNEL CARD ── */}
        <div className="mt-3 flex items-center gap-3 bg-pn-card border border-pn-border rounded-xl p-3">
          <div
            className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
            style={{ background: channel.color }}
          >
            {channel.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{channel.name}</p>
            <p className="text-pn-muted text-[11px]">
              {channel.country === 'BD' ? 'Bangladesh' : 'India'} &bull; Official Channel
            </p>
          </div>
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(movie.channel_name + ' official')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pn-purple text-xs font-medium min-h-[44px] flex items-center px-2"
            onClick={(e) => e.stopPropagation()}
          >
            Visit
          </a>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN OTT MOVIE HUB PAGE — Supabase + Channel Map Powered
// ════════════════════════════════════════════════════════════════

export default function OTTMovieHub({ embedded = false }: { embedded?: boolean }) {
  // ── State ──
  const [allMovies, setAllMovies] = useState<SupabaseMovie[]>([])
  const [activeCountry, setActiveCountry] = useState<CountryFilter>('all')
  const [activeChannelKey, setActiveChannelKey] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [playingMovie, setPlayingMovie] = useState<SupabaseMovie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const fetchedRef = useRef(false)
  const isFirstMountRef = useRef(true)
  const loaderRef = useRef<HTMLDivElement>(null)

  // ── Derived: channel list based on active country ──
  const visibleChannels = useMemo(() => {
    if (activeCountry === 'all') return OTT_CHANNELS
    return OTT_CHANNELS.filter((ch) => ch.country === activeCountry)
  }, [activeCountry])

  // ── Reset channel selection when country changes ──
  useEffect(() => {
    // If the currently selected channel is no longer visible, reset to "all"
    if (activeChannelKey !== 'all') {
      const stillVisible = visibleChannels.some(
        (ch) => ch.filterKey === activeChannelKey || ch.name === activeChannelKey
      )
      if (!stillVisible) {
        setActiveChannelKey('all')
      }
    }
  }, [activeCountry, activeChannelKey, visibleChannels])

  // ════════════════════════════════════════════════════════════
  // SUPABASE FETCH — Server-Side Channel Filtering
  // ════════════════════════════════════════════════════════════

  const fetchMovies = useCallback(
    async (pageNum: number, append = false) => {
      if (!isSupabaseReady()) {
        setError('Database not configured. Check your Supabase connection.')
        setLoading(false)
        return
      }

      const sb = getSupabase()
      if (!sb) {
        setError('Supabase client unavailable.')
        setLoading(false)
        return
      }

      try {
        if (!append) {
          setLoading(true)
          setError(null)
        }

        const from = pageNum * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        // ── Build the Supabase query based on active filters ──
        let query = sb.from('movies').select('*').order('created_at', { ascending: false })

        // Country filter: match on the `country` column or channel grouping
        if (activeCountry !== 'all') {
          const countryChannels = OTT_CHANNELS.filter((ch) => ch.country === activeCountry)
          const channelNames = countryChannels.map((ch) => ch.name)
          const filterKeys = countryChannels.map((ch) => ch.filterKey)

          // Use OR to match any channel belonging to the selected country
          // .or('channel_name.eq.G-Series Movies,channel_name.eq.Chorki,...')
          const channelOrClauses = channelNames
            .map((n) => `channel_name.eq.${n}`)
            .join(',')
          const filterKeyOrClauses = filterKeys
            .map((k) => `filter_key.eq.${k}`)
            .join(',')

          // Combined: match channel_name OR filter_key for any channel in this country
          if (channelOrClauses && filterKeyOrClauses) {
            query = query.or(`${channelOrClauses},${filterKeyOrClauses}`)
          } else if (channelOrClauses) {
            query = query.or(channelOrClauses)
          }
        }

        // Specific channel filter: narrow down to a single channel
        if (activeChannelKey !== 'all') {
          const channel = OTT_CHANNELS.find(
            (ch) => ch.filterKey === activeChannelKey || ch.name === activeChannelKey
          )
          if (channel) {
            // Override the country-level OR with a precise single-channel match
            // Rebuild query for single channel
            query = sb
              .from('movies')
              .select('*')
              .order('created_at', { ascending: false })
              .or(`channel_name.eq.${channel.name},filter_key.eq.${channel.filterKey}`)
          }
        }

        const { data, error: dbError } = await query.range(from, to)

        if (dbError) {
          console.error('Play Nexa Movie Hub: Supabase query error:', dbError.message)
          setError(`Database error: ${dbError.message}`)
          return
        }

        if (!data || data.length === 0) {
          setHasMore(false)
          if (!append && allMovies.length === 0) {
            setError('No movies found in the database yet.')
          }
          return
        }

        const movies = data as SupabaseMovie[]

        if (append) {
          setAllMovies((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const newMovies = movies.filter((m) => !existingIds.has(m.id))
            return [...prev, ...newMovies]
          })
        } else {
          setAllMovies(movies)
          // Cache first page
          cacheSet(CACHE_KEY, { movies, fetchedAt: Date.now() })
        }

        setHasMore(movies.length === PAGE_SIZE)
      } catch (err) {
        console.error('Play Nexa Movie Hub: Fetch error:', err)
        setError('Failed to load movies. Check your connection.')
      } finally {
        setLoading(false)
      }
    },
    [activeCountry, activeChannelKey, allMovies.length]
  )

  // ── Load user engagement state (likes, saves) ──
  const loadUserEngagement = useCallback(async () => {
    const sb = getSupabase()
    if (!sb) return

    try {
      const {
        data: { user },
      } = await sb.auth.getUser()
      if (!user) return

      // Load liked movie IDs
      const { data: likes } = await sb
        .from('user_likes')
        .select('movie_id')
        .eq('user_id', user.id)

      if (likes) {
        setLikedIds(new Set(likes.map((l) => l.movie_id)))
      }

      // Load saved movie IDs
      const { data: saves } = await sb
        .from('user_watchlist')
        .select('movie_id')
        .eq('user_id', user.id)

      if (saves) {
        setSavedIds(new Set(saves.map((s) => s.movie_id)))
      }
    } catch {
      // Non-critical — engagement state is optional
    }
  }, [])

  // ── Initial load ──
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const init = async () => {
      // 1. Check cache first
      const cached = cacheGet<{ movies: SupabaseMovie[]; fetchedAt: number }>(CACHE_KEY)
      if (cached && cached.movies.length > 0) {
        setAllMovies(cached.movies)
        setHasMore(cached.movies.length === PAGE_SIZE)
        setLoading(false)
      }

      // 2. Fetch fresh from Supabase
      await fetchMovies(0, false)

      // 3. Load user engagement state
      await loadUserEngagement()
    }

    init()
  }, [fetchMovies, loadUserEngagement])

  // ── Re-fetch when country or channel filter changes ──
  useEffect(() => {
    // Skip the initial mount — handled by the init effect above
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false
      return
    }

    if (!isSupabaseReady()) return
    const sb = getSupabase()
    if (!sb) return

    const fetchFiltered = async () => {
      setLoading(true)
      setError(null)
      setPage(0)
      setHasMore(true)

      try {
        let query = sb.from('movies').select('*').order('created_at', { ascending: false })

        // Country filter: match channels belonging to the selected country
        if (activeCountry !== 'all') {
          const countryChannels = OTT_CHANNELS.filter((ch) => ch.country === activeCountry)
          const channelNames = countryChannels.map((ch) => ch.name)
          const filterKeys = countryChannels.map((ch) => ch.filterKey)
          const channelOrClauses = channelNames.map((n) => `channel_name.eq.${n}`).join(',')
          const filterKeyOrClauses = filterKeys.map((k) => `filter_key.eq.${k}`).join(',')

          if (channelOrClauses && filterKeyOrClauses) {
            query = query.or(`${channelOrClauses},${filterKeyOrClauses}`)
          } else if (channelOrClauses) {
            query = query.or(channelOrClauses)
          }
        }

        // Specific channel filter: narrow down to a single channel
        if (activeChannelKey !== 'all') {
          const channel = OTT_CHANNELS.find(
            (ch) => ch.filterKey === activeChannelKey || ch.name === activeChannelKey
          )
          if (channel) {
            query = sb
              .from('movies')
              .select('*')
              .order('created_at', { ascending: false })
              .or(`channel_name.eq.${channel.name},filter_key.eq.${channel.filterKey}`)
          }
        }

        const { data, error: dbError } = await query.range(0, PAGE_SIZE - 1)

        if (dbError) {
          setError(`Database error: ${dbError.message}`)
          return
        }

        const movies = (data as SupabaseMovie[]) || []
        setAllMovies(movies)
        setHasMore(movies.length === PAGE_SIZE)
        if (movies.length === 0) {
          setError('No movies found for this selection.')
        }
      } catch {
        setError('Failed to load movies. Check your connection.')
      } finally {
        setLoading(false)
      }
    }

    fetchFiltered()
     
  }, [activeCountry, activeChannelKey])

  // ── Infinite scroll observer ──
  useEffect(() => {
    if (!hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchMovies(nextPage, true)
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    const el = loaderRef.current
    if (el) observer.observe(el)

    return () => {
      if (el) observer.unobserve(el)
    }
  }, [hasMore, loading, page, fetchMovies])

  // ── Filtered + searched movies (client-side search on top of server-filtered data) ──
  const displayedMovies = useMemo(() => {
    let filtered = allMovies

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.channel_name || m.channel || '').toLowerCase().includes(q) ||
          ((m as any).filter_key && (m as any).filter_key.toLowerCase().includes(q))
      )
    }

    return filtered
  }, [allMovies, searchQuery])

  // ── Play handler → also record to user_history ──
  const handlePlay = useCallback(
    async (movie: SupabaseMovie) => {
      setPlayingMovie(movie)

      // Record watch history in Supabase
      const sb = getSupabase()
      if (!sb) return

      try {
        const {
          data: { user },
        } = await sb.auth.getUser()
        if (!user) return

        await sb
          .from('user_history')
          .upsert(
            {
              user_id: user.id,
              movie_id: movie.id,
              watch_progress: 0,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,movie_id',
            }
          )
      } catch {
        // Non-critical — history is optional
      }
    },
    []
  )

  // ── Like toggle → upsert user_likes ──
  const handleToggleLike = useCallback(async () => {
    if (!playingMovie) return
    const sb = getSupabase()
    if (!sb) return

    try {
      const {
        data: { user },
      } = await sb.auth.getUser()
      if (!user) return

      if (likedIds.has(playingMovie.id)) {
        // Unlike: delete the row
        await sb
          .from('user_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('movie_id', playingMovie.id)

        setLikedIds((prev) => {
          const next = new Set(prev)
          next.delete(playingMovie.id)
          return next
        })
      } else {
        // Like: insert the row
        await sb
          .from('user_likes')
          .upsert(
            {
              user_id: user.id,
              movie_id: playingMovie.id,
            },
            {
              onConflict: 'user_id,movie_id',
            }
          )

        setLikedIds((prev) => new Set(prev).add(playingMovie.id))
      }
    } catch {
      // Non-critical
    }
  }, [playingMovie, likedIds])

  // ── Save toggle → upsert user_watchlist ──
  const handleToggleSave = useCallback(async () => {
    if (!playingMovie) return
    const sb = getSupabase()
    if (!sb) return

    try {
      const {
        data: { user },
      } = await sb.auth.getUser()
      if (!user) return

      if (savedIds.has(playingMovie.id)) {
        // Unsave: delete the row
        await sb
          .from('user_watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('movie_id', playingMovie.id)

        setSavedIds((prev) => {
          const next = new Set(prev)
          next.delete(playingMovie.id)
          return next
        })
      } else {
        // Save: insert the row
        await sb
          .from('user_watchlist')
          .upsert(
            {
              user_id: user.id,
              movie_id: playingMovie.id,
            },
            {
              onConflict: 'user_id,movie_id',
            }
          )

        setSavedIds((prev) => new Set(prev).add(playingMovie.id))
      }
    } catch {
      // Non-critical
    }
  }, [playingMovie, savedIds])

  // ── Refresh handler ──
  const handleRefresh = useCallback(async () => {
    cacheSet(CACHE_KEY, null)
    setPage(0)
    setHasMore(true)
    fetchedRef.current = false
    await fetchMovies(0, false)
    fetchedRef.current = true
  }, [fetchMovies])

  // ── Country change handler ──
  const handleCountryChange = useCallback((country: CountryFilter) => {
    setActiveCountry(country)
    setActiveChannelKey('all') // Reset channel filter on country change
    setSearchQuery('') // Clear search on country switch
  }, [])

  // ── Channel change handler ──
  const handleChannelChange = useCallback(
    (key: string) => {
      setActiveChannelKey(key)
      setSearchQuery('') // Clear search on channel switch
    },
    []
  )

  // ── Active channel label for result count ──
  const activeChannelLabel = useMemo(() => {
    if (activeChannelKey === 'all') {
      if (activeCountry === 'all') return 'All Channels'
      return activeCountry === 'BD' ? 'All BD Channels' : 'All IN Channels'
    }
    const ch = OTT_CHANNELS.find(
      (c) => c.filterKey === activeChannelKey || c.name === activeChannelKey
    )
    return ch ? ch.name : activeChannelKey
  }, [activeChannelKey, activeCountry])

  return (
    <div className={embedded ? '' : 'min-h-screen bg-pn-bg pb-24'}>
      {/* ── TOP BAR (only in standalone mode) ── */}
      {!embedded && (
        <header className="sticky top-0 z-50 bg-pn-bg/95 border-b border-pn-border px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white">Movie Hub</h1>
            <span className="text-[10px] text-pn-purple bg-pn-purple/10 border border-pn-purple/30 rounded-full px-2 py-0.5 font-medium">
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              type="button"
              disabled={loading}
              className="p-2 rounded-lg bg-pn-card border border-pn-border active:scale-90 transition-transform duration-150 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-40"
              aria-label="Refresh movies"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeLinecap="round"
                className={loading ? 'animate-spin' : ''}
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* ── SEARCH BAR ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies & channels..."
            className="w-full bg-pn-card border border-pn-border rounded-full pl-10 pr-4 py-2.5 text-white text-xs placeholder-pn-muted focus:outline-none focus:border-pn-purple transition-colors min-h-[44px]"
            maxLength={100}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-pn-border flex items-center justify-center"
              aria-label="Clear search"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          COUNTRY TABS — All / 🇧🇩 Bangladesh / 🇮🇳 India
          ════════════════════════════════════════════════════════════ */}
      <nav className="overflow-x-auto scrollbar-hide py-2 px-4" aria-label="Country filters">
        <div className="flex gap-2">
          {COUNTRY_TABS.map((tab) => (
            <CountryTabButton
              key={tab.key}
              tab={tab}
              active={activeCountry === tab.key}
              onClick={() => handleCountryChange(tab.key)}
            />
          ))}
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════
          CHANNEL PILL CAROUSEL — Dynamic based on country
          ════════════════════════════════════════════════════════════ */}
      <nav className="overflow-x-auto scrollbar-hide py-2" aria-label="Channel filters">
        <div className="flex gap-2 px-4">
          {/* "All" chip — active by default */}
          <ChannelPill
            channel={{
              name: 'All',
              filterKey: 'all',
              country: activeCountry === 'BD' ? 'BD' : activeCountry === 'IN' ? 'IN' : 'BD',
              emoji: '🌍',
              color: '#7C3AED',
            }}
            active={activeChannelKey === 'all'}
            onClick={() => handleChannelChange('all')}
          />
          {/* Per-channel pills for the active country */}
          {visibleChannels.map((ch) => (
            <ChannelPill
              key={ch.filterKey}
              channel={ch}
              active={activeChannelKey === ch.filterKey || activeChannelKey === ch.name}
              onClick={() => handleChannelChange(ch.filterKey)}
            />
          ))}
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="px-3">
        {/* Loading skeleton */}
        {loading && allMovies.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && allMovies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="text-4xl mb-3">🎬</p>
            <p className="text-white font-semibold mb-1">Movies unavailable</p>
            <p className="text-pn-muted text-sm text-center mb-4">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-full px-6 py-2.5 text-sm font-medium bg-pn-purple text-white active:scale-95 transition-all duration-150 min-h-[44px]"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && displayedMovies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="text-4xl mb-3">🎬</p>
            <p className="text-white font-semibold mb-1">No movies found</p>
            <p className="text-pn-muted text-sm text-center">
              {searchQuery
                ? 'Try a different search term.'
                : `No movies available on ${activeChannelLabel} yet.`}
            </p>
          </div>
        )}

        {/* ── VIDEO GRID (2-col mobile, 3-col tablet+) ── */}
        {!loading && !error && displayedMovies.length > 0 && (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-pn-muted text-[11px]">
                {displayedMovies.length} {displayedMovies.length === 1 ? 'movie' : 'movies'}
                {activeChannelKey !== 'all' && (
                  <span>
                    {' '}
                    from{' '}
                    <span className="text-white font-medium">{activeChannelLabel}</span>
                  </span>
                )}
                {activeCountry !== 'all' && activeChannelKey === 'all' && (
                  <span>
                    {' '}
                    from{' '}
                    <span className="text-white font-medium">
                      {activeCountry === 'BD' ? '🇧🇩 Bangladesh' : '🇮🇳 India'}
                    </span>
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {displayedMovies.map((movie) => (
                <VideoCard
                  key={movie.id}
                  movie={movie}
                  onPlay={handlePlay}
                  isLiked={likedIds.has(movie.id)}
                  isSaved={savedIds.has(movie.id)}
                />
              ))}
            </div>

            {/* Infinite scroll loader sentinel */}
            {hasMore && (
              <div ref={loaderRef} className="flex justify-center py-6">
                {loading && (
                  <div className="w-6 h-6 border-2 border-pn-purple/30 border-t-pn-purple rounded-full animate-spin" />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── PLAYER MODAL ── */}
      {playingMovie && (
        <PlayerModal
          movie={playingMovie}
          isLiked={likedIds.has(playingMovie.id)}
          isSaved={savedIds.has(playingMovie.id)}
          onToggleLike={handleToggleLike}
          onToggleSave={handleToggleSave}
          onClose={() => setPlayingMovie(null)}
        />
      )}
    </div>
  )
}
