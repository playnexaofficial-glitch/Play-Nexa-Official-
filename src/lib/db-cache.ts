// ── Play Nexa Supabase Hybrid Cache ─────────────────────────────
// Data flow: Supabase DB → LocalStorage → Fallback
// Zero YouTube Data API calls — RSS + Gemini only
// Optimized for 2GB RAM — 3s timeout, no memory leaks

import { getSupabase, isSupabaseReady } from './supabase'
import { cacheGet, cacheSet } from './cache'
import {
  formatDurationLong,
  formatViews,
  isRealMovie,
  detectMovieRegion,
  detectDubbedTags,
  type YouTubeMovie,
  type MovieRegion,
} from './types'
import { FALLBACK_MOVIES, getFallbackByCategory, getFallbackByRegion } from './fallback'

// ── Constants ────────────────────────────────────────────────

const MOVIE_MIN_DURATION_SEC = 4200

// ── Types ────────────────────────────────────────────────────

interface SupabaseVideoRow {
  id: number
  yt_video_id: string
  title: string
  thumbnail_url: string | null
  category: string
  genre: string[]
  duration_sec: number
  channel: string
  language: string
  views: number
  created_at: string
}

// ── Helpers ──────────────────────────────────────────────────

const rowToMovie = (row: SupabaseVideoRow): YouTubeMovie => {
  const region = detectMovieRegion(row.language, row.title, row.channel)
  const dubbedTags = detectDubbedTags(row.title, row.language)

  return {
    id: row.yt_video_id,
    videoId: row.yt_video_id,
    title: row.title,
    thumbnail: row.thumbnail_url || `https://img.youtube.com/vi/${row.yt_video_id}/hqdefault.jpg`,
    duration: formatDurationLong(row.duration_sec),
    durationSec: row.duration_sec,
    channel: row.channel,
    channelId: '',
    description: '',
    publishedAt: row.created_at,
    views: formatViews(row.views),
    likes: '',
    comments: '',
    rawViews: row.views,
    language: row.language,
    genre: row.genre,
    category: row.category,
    free: true,
    source: 'Supabase',
    trending: false,
    viral: false,
    region,
    dubbedTags,
  }
}

// ════════════════════════════════════════════════════════════
//  MOVIE HUB FETCH — Supabase-first with 70-min filter
// ════════════════════════════════════════════════════════════

export const fetchMoviesFromDB = async (
  category: string,
  limit = 15,
): Promise<YouTubeMovie[]> => {
  const cacheKey = `pn_db_cat_${category}`
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  if (isSupabaseReady()) {
    try {
      const sb = getSupabase()
      if (!sb) throw new Error('no client')

      let query = sb
        .from('movies')
        .select('*')
        .eq('is_hidden', false)
        .order('view_count', { ascending: false })
        .limit(limit + 5)

      if (category !== 'Trending' && category !== 'All') {
        // Search by language or channel
        query = query.or(`language.ilike.%${category}%,channel_name.ilike.%${category}%`)
      }

      const { data, error } = await query

      if (!error && data && data.length > 0) {
        const movies = (data as any[])
          .map((row: any) => ({
            id: row.youtube_id,
            videoId: row.youtube_id,
            title: row.title,
            thumbnail: row.thumbnail || `https://img.youtube.com/vi/${row.youtube_id}/hqdefault.jpg`,
            duration: row.duration || '',
            durationSec: 0,
            channel: row.channel_name || '',
            channelId: row.channel_id || '',
            description: row.description || '',
            publishedAt: row.published_at || '',
            views: formatViews(row.view_count || 0),
            likes: '',
            comments: '',
            rawViews: row.view_count || 0,
            language: row.language || 'English',
            genre: [],
            category: 'movie',
            free: true,
            source: 'Supabase',
            trending: (row.view_count || 0) > 10000,
            viral: false,
            region: detectMovieRegion(row.language || 'English', row.title, row.channel_name || ''),
            dubbedTags: detectDubbedTags(row.title, row.language || 'English'),
          }))
          .slice(0, limit)

        if (movies.length > 0) {
          cacheSet(cacheKey, movies)
          return movies
        }
      }
    } catch {
      console.warn('Play Nexa: Supabase fetch failed, using fallback')
    }
  }

  return getFallbackByCategory(category)
}

// ════════════════════════════════════════════════════════════
//  GEO-TARGETED FETCH
// ════════════════════════════════════════════════════════════

export const fetchMoviesByRegion = async (
  region: MovieRegion,
  limit = 15,
): Promise<YouTubeMovie[]> => {
  const cacheKey = `pn_db_region_${region}`
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  if (isSupabaseReady()) {
    try {
      const sb = getSupabase()
      if (!sb) throw new Error('no client')

      const langMap: Record<string, string[]> = {
        bangladesh: ['Bangla', 'Bengali'],
        india: ['Hindi', 'Tamil', 'Telugu', 'Marathi', 'Punjabi'],
        international: ['English', 'Korean', 'Japanese'],
      }

      const { data, error } = await sb
        .from('movies')
        .select('*')
        .eq('is_hidden', false)
        .in('language', langMap[region] || ['English'])
        .order('view_count', { ascending: false })
        .limit(limit + 10)

      if (!error && data && data.length > 0) {
        const movies = (data as any[]).map((row: any) => ({
          id: row.youtube_id,
          videoId: row.youtube_id,
          title: row.title,
          thumbnail: row.thumbnail || `https://img.youtube.com/vi/${row.youtube_id}/hqdefault.jpg`,
          duration: row.duration || '',
          durationSec: 0,
          channel: row.channel_name || '',
          channelId: row.channel_id || '',
          description: row.description || '',
          publishedAt: row.published_at || '',
          views: formatViews(row.view_count || 0),
          likes: '',
          comments: '',
          rawViews: row.view_count || 0,
          language: row.language || 'English',
          genre: [],
          category: 'movie',
          free: true,
          source: 'Supabase',
          trending: false,
          viral: false,
          region,
          dubbedTags: detectDubbedTags(row.title, row.language || 'English'),
        })).slice(0, limit)

        if (movies.length > 0) {
          cacheSet(cacheKey, movies)
          return movies
        }
      }
    } catch {
      console.warn('Play Nexa: Supabase region fetch failed')
    }
  }

  return getFallbackByRegion(region)
}

// ════════════════════════════════════════════════════════════
//  TRENDING
// ════════════════════════════════════════════════════════════

export const fetchTrendingFromDB = async (limit = 16): Promise<YouTubeMovie[]> => {
  const cacheKey = 'pn_db_trending'
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  if (isSupabaseReady()) {
    try {
      const sb = getSupabase()
      if (!sb) throw new Error('no client')

      const { data, error } = await sb
        .from('movies')
        .select('*')
        .eq('is_hidden', false)
        .order('view_count', { ascending: false })
        .limit(limit + 5)

      if (!error && data && data.length > 0) {
        const movies = (data as any[]).map((row: any) => ({
          id: row.youtube_id,
          videoId: row.youtube_id,
          title: row.title,
          thumbnail: row.thumbnail || `https://img.youtube.com/vi/${row.youtube_id}/hqdefault.jpg`,
          duration: row.duration || '',
          durationSec: 0,
          channel: row.channel_name || '',
          channelId: row.channel_id || '',
          description: row.description || '',
          publishedAt: row.published_at || '',
          views: formatViews(row.view_count || 0),
          likes: '',
          comments: '',
          rawViews: row.view_count || 0,
          language: row.language || 'English',
          genre: [],
          category: 'movie',
          free: true,
          source: 'Supabase',
          trending: true,
          viral: (row.view_count || 0) > 50000,
          region: detectMovieRegion(row.language || 'English', row.title, row.channel_name || ''),
          dubbedTags: detectDubbedTags(row.title, row.language || 'English'),
        })).slice(0, limit)

        if (movies.length > 0) {
          cacheSet(cacheKey, movies)
          return movies
        }
      }
    } catch {
      console.warn('Play Nexa: Supabase trending fetch failed')
    }
  }

  return FALLBACK_MOVIES.filter(m => m.trending)
}

// ════════════════════════════════════════════════════════════
//  SEARCH — Supabase-first
// ════════════════════════════════════════════════════════════

export const searchMoviesFromDB = async (
  query: string,
  maxResults = 20,
): Promise<YouTubeMovie[]> => {
  if (!query.trim()) return []

  const cacheKey = `pn_db_search_${query.toLowerCase().trim()}`
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  if (isSupabaseReady()) {
    try {
      const sb = getSupabase()
      if (!sb) throw new Error('no client')

      const { data, error } = await sb
        .from('movies')
        .select('*')
        .eq('is_hidden', false)
        .ilike('title', `%${query}%`)
        .limit(maxResults)

      if (!error && data && data.length > 0) {
        const movies = (data as any[]).map((row: any) => ({
          id: row.youtube_id,
          videoId: row.youtube_id,
          title: row.title,
          thumbnail: row.thumbnail || `https://img.youtube.com/vi/${row.youtube_id}/hqdefault.jpg`,
          duration: row.duration || '',
          durationSec: 0,
          channel: row.channel_name || '',
          channelId: row.channel_id || '',
          description: row.description || '',
          publishedAt: row.published_at || '',
          views: formatViews(row.view_count || 0),
          likes: '',
          comments: '',
          rawViews: row.view_count || 0,
          language: row.language || 'English',
          genre: [],
          category: 'movie',
          free: true,
          source: 'Supabase',
          trending: false,
          viral: false,
          region: detectMovieRegion(row.language || 'English', row.title, row.channel_name || ''),
          dubbedTags: detectDubbedTags(row.title, row.language || 'English'),
        }))

        if (movies.length > 0) {
          cacheSet(cacheKey, movies)
          return movies
        }
      }
    } catch {
      console.warn('Play Nexa: Supabase search failed')
    }
  }

  return FALLBACK_MOVIES.filter(m =>
    m.title.toLowerCase().includes(query.toLowerCase()),
  )
}

// ════════════════════════════════════════════════════════════
//  VIDEO DETAIL
// ════════════════════════════════════════════════════════════

export const fetchDetailFromDB = async (
  videoId: string,
): Promise<YouTubeMovie | null> => {
  const cacheKey = `pn_db_video_${videoId}`
  const cached = cacheGet<YouTubeMovie>(cacheKey)
  if (cached) return cached

  if (isSupabaseReady()) {
    try {
      const sb = getSupabase()
      if (!sb) throw new Error('no client')

      const { data, error } = await sb
        .from('movies')
        .select('*')
        .eq('youtube_id', videoId)
        .single()

      if (!error && data) {
        const row = data as any
        const movie: YouTubeMovie = {
          id: row.youtube_id,
          videoId: row.youtube_id,
          title: row.title,
          thumbnail: row.thumbnail || `https://img.youtube.com/vi/${row.youtube_id}/hqdefault.jpg`,
          duration: row.duration || '',
          durationSec: 0,
          channel: row.channel_name || '',
          channelId: row.channel_id || '',
          description: row.description || '',
          publishedAt: row.published_at || '',
          views: formatViews(row.view_count || 0),
          likes: '',
          comments: '',
          rawViews: row.view_count || 0,
          language: row.language || 'English',
          genre: [],
          category: 'movie',
          free: true,
          source: 'Supabase',
          trending: false,
          viral: false,
          region: detectMovieRegion(row.language || 'English', row.title, row.channel_name || ''),
          dubbedTags: detectDubbedTags(row.title, row.language || 'English'),
        }
        cacheSet(cacheKey, movie)
        return movie
      }
    } catch {
      // fall through
    }
  }

  return FALLBACK_MOVIES.find(m => m.videoId === videoId) || null
}

// ════════════════════════════════════════════════════════════
//  RELATED MOVIES
// ════════════════════════════════════════════════════════════

export const fetchRelatedFromDB = async (
  videoId: string,
  genre: string[],
  category: string,
  limit = 5,
): Promise<YouTubeMovie[]> => {
  const cacheKey = `pn_db_related_${videoId}`
  const cached = cacheGet<YouTubeMovie[]>(cacheKey)
  if (cached && cached.length > 0) return cached

  if (isSupabaseReady()) {
    try {
      const sb = getSupabase()
      if (!sb) throw new Error('no client')

      const { data, error } = await sb
        .from('movies')
        .select('*')
        .eq('is_hidden', false)
        .neq('youtube_id', videoId)
        .order('view_count', { ascending: false })
        .limit(limit + 5)

      if (!error && data && data.length > 0) {
        const movies = (data as any[]).map((row: any) => ({
          id: row.youtube_id,
          videoId: row.youtube_id,
          title: row.title,
          thumbnail: row.thumbnail || `https://img.youtube.com/vi/${row.youtube_id}/hqdefault.jpg`,
          duration: row.duration || '',
          durationSec: 0,
          channel: row.channel_name || '',
          channelId: row.channel_id || '',
          description: row.description || '',
          publishedAt: row.published_at || '',
          views: formatViews(row.view_count || 0),
          likes: '',
          comments: '',
          rawViews: row.view_count || 0,
          language: row.language || 'English',
          genre: [],
          category: 'movie',
          free: true,
          source: 'Supabase',
          trending: false,
          viral: false,
          region: detectMovieRegion(row.language || 'English', row.title, row.channel_name || ''),
          dubbedTags: detectDubbedTags(row.title, row.language || 'English'),
        })).slice(0, limit)

        if (movies.length > 0) {
          cacheSet(cacheKey, movies)
          return movies
        }
      }
    } catch {
      console.warn('Play Nexa: Supabase related fetch failed')
    }
  }

  return FALLBACK_MOVIES
    .filter(m => m.videoId !== videoId && m.genre?.some(g => genre.includes(g)))
    .slice(0, limit)
}

// ════════════════════════════════════════════════════════════
//  MISSING REQUEST LOGGER
// ════════════════════════════════════════════════════════════

export const logMissingRequest = async (
  searchQuery: string,
  category = 'movie',
): Promise<void> => {
  if (!isSupabaseReady()) return
  try {
    const sb = getSupabase()
    if (!sb) return
    await sb.rpc('upsert_missing_request', {
      p_query: searchQuery,
      p_category: category,
    })
  } catch {
    // Silent fail — non-critical
  }
}
