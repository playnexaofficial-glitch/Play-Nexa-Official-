// ── Play Nexa Shared Types & Utilities ──────────────────────────
// Replaces youtube.ts — type definitions and helpers used across the app
// Zero API calls — pure TypeScript types and formatting utilities

// ══════════════════════════════════════════════════════════════
//  YOUTUBE MOVIE TYPE
//  Used by MovieHub, db-cache, fallback, search, etc.
// ══════════════════════════════════════════════════════════════

export interface YouTubeMovie {
  id: string
  videoId: string
  title: string
  thumbnail: string
  duration: string
  durationSec: number
  channel: string
  channelId?: string
  description: string
  publishedAt?: string
  views: string
  likes: string
  comments: string
  rawViews: number
  rawLikes?: number
  language: string
  genre?: string[]
  category?: string
  free: boolean
  source: string
  trending?: boolean
  viral?: boolean
  tags?: string[]
  region?: 'bangladesh' | 'india' | 'international'
  dubbedTags?: string[]
}

// ══════════════════════════════════════════════════════════════
//  SUPABASE MOVIE TYPE
//  Matches the movies table schema
// ══════════════════════════════════════════════════════════════

export interface SupabaseMovie {
  id: number
  youtube_id: string
  title: string
  thumbnail: string | null
  channel_name: string
  channel_id: string
  published_at: string | null
  view_count: number
  like_count: number
  save_count: number
  watch_count: number
  description: string | null
  duration: string | null
  is_hidden: boolean
  source_channel_id: string | null
  language: string | null
  created_at: string
}

// ══════════════════════════════════════════════════════════════
//  SUPABASE MUSIC TRACK TYPE
//  Matches the music_tracks table schema
// ══════════════════════════════════════════════════════════════

export interface SupabaseMusicTrack {
  id: number
  youtube_id: string
  title: string
  thumbnail: string | null
  channel_name: string
  channel_id: string
  published_at: string | null
  view_count: number
  description: string | null
  duration: string | null
  mood: string
  language: string | null
  created_at: string
}

// ══════════════════════════════════════════════════════════════
//  CHANNEL DISPLAY TYPE
//  Matches channel_display table
// ══════════════════════════════════════════════════════════════

export interface ChannelDisplay {
  id: number
  channel_id: string
  display_name: string
  badge_color: string
  border_color: string
  is_visible: boolean
  avatar_url: string | null
  channel_type: 'movies' | 'music' | 'mixed'
  created_at: string
}

// ══════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════

/** Parse ISO 8601 duration (PT1H45M) to seconds */
export const parseDuration = (iso: string): number => {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] || '0') * 3600)
       + (parseInt(m[2] || '0') * 60)
       + (parseInt(m[3] || '0'))
}

/** Format seconds to "2h 10m" or "45m" */
export const formatDurationLong = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Format view/like/comment count: 1200000 → "1.2M" */
export const formatCount = (n: string | number): string => {
  const x = typeof n === 'string' ? parseInt(n || '0') : n
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`
  if (x >= 1_000) return `${(x / 1_000).toFixed(0)}K`
  return `${x}`
}

/** Format views with "views" suffix */
export const formatViews = (count: string | number): string => {
  return formatCount(count) + ' views'
}

/** Check if a title looks like a real movie (not trailer/clip) */
const BLACKLIST = [
  'trailer', 'teaser', 'clip', 'song', 'music',
  'interview', 'reaction', 'review', 'behind',
  'shorts', 'bts', 'promo', 'deleted', 'bloopers',
  'scene', 'highlight', 'recap', 'preview',
  'episode', 'season', 'ep ', 'e0',
  'part 1', 'part 2', 'part 3',
  'ost', 'soundtrack', 'lyric', 'cover',
  'explained', 'breakdown', 'analysis',
  'top 10', 'top 5', 'list', 'comparison',
  'fan made', 'fan edit', 'amv', 'edit',
  'opening', 'ending', 'credits',
]

export const isRealMovie = (title: string, durationSec: number): boolean => {
  const t = title.toLowerCase()
  return !BLACKLIST.some(w => t.includes(w)) && durationSec >= 4200
}

/** Detect language from title */
export const detectLanguage = (title: string): string => {
  const t = title.toLowerCase()
  if (t.includes('hindi')) return 'Hindi'
  if (t.includes('bangla') || t.includes('bengali')) return 'Bangla'
  if (t.includes('tamil')) return 'Tamil'
  if (t.includes('telugu')) return 'Telugu'
  if (t.includes('korean')) return 'Korean'
  if (t.includes('japanese') || t.includes('anime')) return 'Japanese'
  if (t.includes('dubbed')) return 'Dubbed'
  return 'English'
}

/** Detect region from metadata */
export type MovieRegion = 'bangladesh' | 'india' | 'international'

export const detectMovieRegion = (
  language: string,
  title: string,
  channel: string,
): MovieRegion => {
  const l = language.toLowerCase()
  const t = title.toLowerCase()
  const c = channel.toLowerCase()
  if (l === 'bangla' || l === 'bengali' || t.includes('bangla') || c.includes('bangla')) return 'bangladesh'
  if (l === 'hindi' || l === 'tamil' || l === 'telugu' || t.includes('hindi') || t.includes('bollywood') || c.includes('bollywood')) return 'india'
  return 'international'
}

/** Detect dubbed language tags */
export const detectDubbedTags = (title: string, language: string): string[] => {
  const tags: string[] = []
  const t = title.toLowerCase()
  if (t.includes('bangla dubbed') || t.includes('bengali dubbed')) tags.push('Bangla Dubbed')
  else if (t.includes('bangla sub') || t.includes('bengali sub')) tags.push('Bangla Sub')
  if (t.includes('hindi dubbed')) tags.push('Hindi Dubbed')
  else if (t.includes('hindi sub')) tags.push('Hindi Sub')
  if (t.includes('english dubbed') || t.includes('eng dub')) tags.push('English Dubbed')
  else if (t.includes('english sub') || t.includes('eng sub')) tags.push('English Sub')
  if (t.includes('tamil dubbed')) tags.push('Tamil Dubbed')
  if (t.includes('telugu dubbed')) tags.push('Telugu Dubbed')
  if (tags.length === 0 && language !== 'English') {
    if (language === 'Hindi' && !t.includes('hindi')) tags.push('Hindi')
    if (language === 'Bangla' && !t.includes('bangla')) tags.push('Bangla')
  }
  return tags
}
