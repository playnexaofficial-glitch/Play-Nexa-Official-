// ── Play Nexa YouTube API Service ──────────────────────────────
// Fixed architecture: cache → API → fallback
// Prevents quota exhaustion + never shows empty screen
// Uses native fetch (no axios dependency)

import { cacheGet, cacheSet } from './cache'
import { FALLBACK_MOVIES, getFallbackByCategory } from './fallback'

const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
const BASE = 'https://www.googleapis.com/youtube/v3'

// ── Types ──────────────────────────────────────────────────

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

// ── In-memory dedup guard ──
// Prevents identical requests from firing in parallel
const pendingRequests = new Map<string, Promise<YouTubeMovie[]>>()
const pendingSingleRequests = new Map<string, Promise<YouTubeMovie | null>>()

// ── Parse ISO 8601 duration to seconds ──

export const parseDuration = (iso: string): number => {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] || '0') * 3600)
       + (parseInt(m[2] || '0') * 60)
       + (parseInt(m[3] || '0'))
}

// ── Format duration to "2h 10m" or "45m" ──

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Format view/like/comment count ──

export const formatCount = (n: string): string => {
  const x = parseInt(n || '0')
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`
  if (x >= 1_000) return `${(x / 1_000).toFixed(0)}K`
  return `${x}`
}

export const formatViews = (count: string): string => {
  return formatCount(count) + ' views'
}

export const formatLikes = (count: string): string => {
  return formatCount(count)
}

// ── Detect language from title ──

const detectLanguage = (title: string): string => {
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

// ── Detect region from metadata ──

type Region = 'bangladesh' | 'india' | 'international'

const detectRegion = (language: string, title: string, channel: string): Region => {
  const l = language.toLowerCase()
  const t = title.toLowerCase()
  const c = channel.toLowerCase()
  if (l === 'bangla' || l === 'bengali' || t.includes('bangla') || c.includes('bangla')) return 'bangladesh'
  if (l === 'hindi' || l === 'tamil' || l === 'telugu' || t.includes('hindi') || t.includes('bollywood') || c.includes('bollywood')) return 'india'
  return 'international'
}

// ── Detect dubbed tags from title ──

const detectDubbedTags = (title: string, language: string): string[] => {
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

// ── Movie blacklist filter ──
// STRICT 60-minute minimum (3600 seconds) for movies.
// Anything under 60 min is a trailer/clip/song/review — NOT a movie.
// videoDuration:'long' is sent to YouTube API as a pre-filter,
// but this is the FINAL gate that actually enforces the rule.

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

/**
 * STRICT 70-minute movie filter.
 * Videos under 70 minutes (4200 seconds) are REJECTED.
 * This prevents fake videos that claim long durations but are actually short.
 * The actual duration comes from YouTube's contentDetails.duration (ISO 8601),
 * which cannot be faked by the uploader.
 */
const MOVIE_MIN_DURATION_SEC = 4200 // 70 minutes — strict, no exceptions

const isMovie = (title: string, sec: number): boolean => {
  const t = title.toLowerCase()
  return !BLACKLIST.some(w => t.includes(w)) && sec >= MOVIE_MIN_DURATION_SEC
}

// Alias for backward compatibility
export const isRealMovie = isMovie

// ── Format a raw YouTube API video item ──

const formatVideo = (video: Record<string, unknown>): YouTubeMovie => {
  const snippet = video.snippet as Record<string, unknown>
  const contentDetails = video.contentDetails as Record<string, string>
  const statistics = video.statistics as Record<string, string>
  const sec = parseDuration(contentDetails?.duration || '')
  const thumbnails = snippet?.thumbnails as Record<string, Record<string, string>>

  const lang = detectLanguage((snippet?.title as string) || '')
  const ch = (snippet?.channelTitle as string) || ''
  const ttl = (snippet?.title as string) || ''

  return {
    id: video.id as string,
    videoId: video.id as string,
    title: ttl,
    thumbnail:
      thumbnails?.maxres?.url ||
      thumbnails?.high?.url ||
      thumbnails?.medium?.url ||
      '',
    duration: formatDuration(sec),
    durationSec: sec,
    channel: ch,
    channelId: snippet?.channelId as string || '',
    description: ((snippet?.description as string) || '').slice(0, 300),
    publishedAt: snippet?.publishedAt as string || '',
    views: formatViews(statistics?.viewCount || '0'),
    likes: formatLikes(statistics?.likeCount || '0'),
    comments: formatLikes(statistics?.commentCount || '0'),
    rawViews: parseInt(statistics?.viewCount || '0'),
    rawLikes: parseInt(statistics?.likeCount || '0'),
    language: lang,
    genre: [],
    free: true,
    source: 'YouTube',
    trending: false,
    viral: false,
    tags: (snippet?.tags as string[]) || [],
    region: detectRegion(lang, ttl, ch),
    dubbedTags: detectDubbedTags(ttl, lang),
  }
}

// ── Error handler (backward compatible) ──

export const handleApiError = (error: unknown): string => {
  if (error instanceof Response) {
    if (error.status === 403) return 'API quota exceeded. Please try later.'
    if (error.status === 400) return 'Invalid request. Check API key.'
  }
  if (error instanceof Error && error.message.includes('failed')) {
    return 'Network request failed. Please check your connection.'
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet connection.'
  }
  return 'Something went wrong. Please retry.'
}

// ── Legacy session cache helpers (kept for backward compat) ──

export const getCached = (key: string): YouTubeMovie[] | null => {
  return cacheGet<YouTubeMovie[]>(key)
}

export const setCache = (key: string, data: YouTubeMovie[]): void => {
  cacheSet(key, data)
}

// ════════════════════════════════════════════════════════════
//  CORE FETCH: cache → API → fallback
// ════════════════════════════════════════════════════════════

// ── FETCH BY CATEGORY ──
// Maps category names to optimized YouTube search queries

export const fetchMoviesByCategory = async (
  category: string,
  maxResults = 12,
): Promise<YouTubeMovie[]> => {
  const cacheKey = `pn_cat_${category}`

  // 1. Check localStorage cache first (30-min TTL)
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  // 2. Dedup: if same request is in-flight, reuse it
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!
  }

  const queries: Record<string, string> = {
    'Trending': 'trending full movie 2024 free',
    'Hollywood': 'hollywood full movie english free',
    'Bollywood': 'bollywood full movie hindi free',
    'Anime': 'anime movie full english dubbed free',
    'Korean': 'korean full movie english subtitles free',
    'Sci-Fi': 'sci fi full movie free english',
    'Action': 'action full movie free english',
    'Horror': 'horror full movie free english',
    'Comedy': 'comedy full movie free english',
    'Hindi Dubbed': 'hindi dubbed full movie free',
    'Bangla': 'bangla full movie free bengali',
    'Bangladesh': 'bangla full movie free bengali 2024',
    'India': 'bollywood full movie hindi dubbed free',
    'International': 'hollywood full movie english free 2024',
    'Adventure': 'adventure full movie free english',
    'Drama': 'drama full movie free english',
    'Thriller': 'thriller full movie free english',
    'Romance': 'romance full movie free english',
  }

  const q = queries[category] || `${category} full movie free`

  const fetchPromise = (async (): Promise<YouTubeMovie[]> => {
    try {
      // Search request
      const searchRes = await fetch(
        `${BASE}/search?` +
        `key=${API_KEY}` +
        `&q=${encodeURIComponent(q)}` +
        `&type=video` +
        `&part=snippet` +
        `&maxResults=${maxResults + 8}` +
        `&videoDuration=long` +
        `&videoEmbeddable=true` +
        `&order=relevance` +
        `&safeSearch=moderate`,
      )

      if (!searchRes.ok) throw new Error('search failed')
      const searchData = await searchRes.json()

      if (!searchData.items?.length) {
        return getFallbackByCategory(category)
      }

      const ids = searchData.items
        .map((i: Record<string, unknown>) => (i.id as Record<string, string>)?.videoId)
        .filter(Boolean)
        .join(',')

      if (!ids) return getFallbackByCategory(category)

      // Details request
      const detailRes = await fetch(
        `${BASE}/videos?` +
        `key=${API_KEY}` +
        `&id=${ids}` +
        `&part=snippet,contentDetails,statistics`,
      )

      if (!detailRes.ok) throw new Error('detail failed')
      const detailData = await detailRes.json()

      const movies: YouTubeMovie[] = detailData.items
        .map((v: Record<string, unknown>) => {
          const formatted = formatVideo(v)
          // Re-check duration from raw data
          const cd = (v as Record<string, Record<string, string>>)?.contentDetails
          const sec = parseDuration(cd?.duration || '')
          return { ...formatted, durationSec: sec }
        })
        .filter((m: YouTubeMovie) => isMovie(m.title, m.durationSec))
        .slice(0, maxResults)

      // Save to cache if we got results
      if (movies.length > 0) {
        cacheSet(cacheKey, movies)
        return movies
      }

      // API returned results but all filtered out
      return getFallbackByCategory(category)

    } catch {
      // Quota exceeded or network error — silently use fallback
      console.warn(`Play Nexa: Using fallback for ${category}`)
      return getFallbackByCategory(category)
    } finally {
      pendingRequests.delete(cacheKey)
    }
  })()

  pendingRequests.set(cacheKey, fetchPromise)
  return fetchPromise
}

// ── TRENDING ──
// Uses mostPopular chart for Bangladesh region

export const fetchTrending = async (
  maxResults = 16,
): Promise<YouTubeMovie[]> => {
  const cacheKey = 'pn_trending'
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  try {
    const res = await fetch(
      `${BASE}/videos?` +
      `key=${API_KEY}` +
      `&part=snippet,contentDetails,statistics` +
      `&chart=mostPopular` +
      `&videoCategoryId=1` +
      `&maxResults=${maxResults + 8}` +
      `&regionCode=BD` +
      `&hl=en`,
    )

    if (!res.ok) throw new Error('trending failed')
    const data = await res.json()

    const movies: YouTubeMovie[] = data.items
      .map((v: Record<string, unknown>) => {
        const formatted = formatVideo(v)
        const cd = (v as Record<string, Record<string, string>>)?.contentDetails
        const sec = parseDuration(cd?.duration || '')
        return { ...formatted, durationSec: sec, trending: true }
      })
      .filter((m: YouTubeMovie) => isMovie(m.title, m.durationSec))
      .slice(0, maxResults)

    if (movies.length > 0) {
      cacheSet(cacheKey, movies)
      return movies
    }

    return FALLBACK_MOVIES.filter(m => m.trending)

  } catch {
    return FALLBACK_MOVIES.filter(m => m.trending)
  }
}

// ── SEARCH ──
// Searches YouTube for movies matching query

export const searchMovies = async (
  query: string,
  maxResults = 20,
): Promise<YouTubeMovie[]> => {
  if (!query.trim()) return []

  const cacheKey = `pn_search_${query.toLowerCase().trim()}`
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  try {
    const searchRes = await fetch(
      `${BASE}/search?` +
      `key=${API_KEY}` +
      `&q=${encodeURIComponent(query + ' full movie')}` +
      `&type=video` +
      `&part=snippet` +
      `&maxResults=${maxResults + 8}` +
      `&videoDuration=long` +
      `&videoEmbeddable=true` +
      `&order=relevance`,
    )

    if (!searchRes.ok) throw new Error('search failed')
    const searchData = await searchRes.json()

    if (!searchData.items?.length) return []

    const ids = searchData.items
      .map((i: Record<string, unknown>) => (i.id as Record<string, string>)?.videoId)
      .filter(Boolean)
      .join(',')

    if (!ids) return []

    const detailRes = await fetch(
      `${BASE}/videos?` +
      `key=${API_KEY}` +
      `&id=${ids}` +
      `&part=snippet,contentDetails,statistics`,
    )

    if (!detailRes.ok) throw new Error('detail failed')
    const detailData = await detailRes.json()

    const movies: YouTubeMovie[] = detailData.items
      .map((v: Record<string, unknown>) => {
        const formatted = formatVideo(v)
        const cd = (v as Record<string, Record<string, string>>)?.contentDetails
        const sec = parseDuration(cd?.duration || '')
        return { ...formatted, durationSec: sec }
      })
      .filter((m: YouTubeMovie) => isMovie(m.title, m.durationSec))
      .slice(0, maxResults)

    if (movies.length > 0) {
      cacheSet(cacheKey, movies)
    }

    return movies

  } catch {
    // Search fallback — filter local data
    return FALLBACK_MOVIES.filter(m =>
      m.title.toLowerCase().includes(query.toLowerCase()),
    )
  }
}

// ── VIDEO DETAIL ──
// Fetches full details for a single video

export const fetchVideoDetail = async (
  videoId: string,
): Promise<YouTubeMovie | null> => {
  const cacheKey = `pn_video_${videoId}`
  const cached = cacheGet<YouTubeMovie>(cacheKey)
  if (cached) return cached

  // Dedup in-flight requests
  if (pendingSingleRequests.has(cacheKey)) {
    return pendingSingleRequests.get(cacheKey)!
  }

  const fetchPromise = (async (): Promise<YouTubeMovie | null> => {
    try {
      const res = await fetch(
        `${BASE}/videos?` +
        `key=${API_KEY}` +
        `&id=${videoId}` +
        `&part=snippet,contentDetails,statistics`,
      )

      if (!res.ok) throw new Error('detail failed')
      const data = await res.json()

      if (!data.items?.length) {
        // Check fallback
        return FALLBACK_MOVIES.find(m => m.videoId === videoId) || null
      }

      const movie = formatVideo(data.items[0] as Record<string, unknown>)
      cacheSet(cacheKey, movie)
      return movie

    } catch {
      return FALLBACK_MOVIES.find(m => m.videoId === videoId) || null
    } finally {
      pendingSingleRequests.delete(cacheKey)
    }
  })()

  pendingSingleRequests.set(cacheKey, fetchPromise)
  return fetchPromise
}

// ── Backward compatible alias ──
export const fetchVideoDetails = fetchVideoDetail

// ── FETCH RELATED ──
// Uses first few words of title to find related movies

export const fetchRelated = async (
  query: string,
  maxResults = 10,
): Promise<YouTubeMovie[]> => {
  const searchQuery = query.split(' ').slice(0, 4).join(' ')
  return searchMovies(searchQuery + ' full movie', maxResults)
}

// ── FETCH CHANNEL VIDEOS ──
// Searches YouTube for videos from a specific channel by name
// Uses cache + dedup for quota protection

export const fetchChannelVideos = async (
  channelTitle: string,
  max = 12,
): Promise<YouTubeMovie[]> => {
  const cacheKey = `pn_ch_${channelTitle}`
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  // Dedup in-flight requests
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!
  }

  const fetchPromise = (async (): Promise<YouTubeMovie[]> => {
    try {
      const res = await fetch(
        `${BASE}/search?` +
        `key=${API_KEY}` +
        `&q=${encodeURIComponent(channelTitle + ' full movie')}` +
        `&type=video` +
        `&part=snippet` +
        `&maxResults=${max + 5}` +
        `&videoDuration=long` +
        `&videoEmbeddable=true` +
        `&order=viewCount`,
      )
      if (!res.ok) throw new Error('channel search failed')
      const data = await res.json()
      if (!data.items?.length) return []

      const ids = data.items
        .map((i: Record<string, unknown>) => (i.id as Record<string, string>)?.videoId)
        .filter(Boolean)
        .join(',')

      if (!ids) return []

      const detailRes = await fetch(
        `${BASE}/videos?` +
        `key=${API_KEY}` +
        `&id=${ids}` +
        `&part=snippet,contentDetails,statistics`,
      )
      if (!detailRes.ok) throw new Error('channel detail failed')
      const detail = await detailRes.json()

      const videos: YouTubeMovie[] = detail.items
        .map((v: Record<string, unknown>) => {
          const formatted = formatVideo(v)
          const cd = (v as Record<string, Record<string, string>>)?.contentDetails
          const sec = parseDuration(cd?.duration || '')
          return { ...formatted, durationSec: sec }
        })
        .filter((m: YouTubeMovie) => isMovie(m.title, m.durationSec))
        .slice(0, max)

      if (videos.length > 0) cacheSet(cacheKey, videos)
      return videos
    } catch {
      return []
    } finally {
      pendingRequests.delete(cacheKey)
    }
  })()

  pendingRequests.set(cacheKey, fetchPromise)
  return fetchPromise
}

// ── FETCH RECOMMENDED ──
// Gets recommended movies by genre, excluding the current movie
// cache → fetchMoviesByCategory → fallback

export const fetchRecommended = async (
  genre: string,
  excludeId: string,
  max = 10,
): Promise<YouTubeMovie[]> => {
  const cacheKey = `pn_rec_${genre}`
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) {
    return cached.filter(m => m.id !== excludeId).slice(0, max)
  }

  try {
    const movies = await fetchMoviesByCategory(genre, max + 5)
    const filtered = movies.filter(m => m.id !== excludeId)
    return filtered.slice(0, max)
  } catch {
    return getFallbackByCategory(genre)
      .filter(m => m.id !== excludeId)
      .slice(0, max)
  }
}
