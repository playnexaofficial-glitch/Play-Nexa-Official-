// ── Play Nexa Zero-API Search Engine ──────────────────────────
// Filters local JSON only — zero API calls
// Instant results — no network needed
// useMemo-friendly — pure functions, no side effects

import movies from '@/data/movies.json'
import shorts from '@/data/shorts.json'

// ── Types ──────────────────────────────────────────────────

export interface Movie {
  id: string
  title: string
  videoId: string
  thumbnail: string
  duration: string
  language: string
  genre: string[]
  category: string
  dubbed: boolean
  rating: string
  year: string
  channel: string
  description: string
  trending: boolean
  viral: boolean
  free: boolean
}

export interface Short {
  id: string
  title: string
  videoId: string
  thumbnail: string
  channel: string
  likes: number
  category: string
  language: string
}

// ── Duration parser — extracts minutes from "2h 49m" format ──

const parseDurationToMin = (d: string): number => {
  const h = d.match(/(\d+)h/)
  const m = d.match(/(\d+)m/)
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0)
}

// ── Title blacklist — these are NEVER full movies ──

const TITLE_BLACKLIST = [
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
 * STRICT movie filter: Only passes if the movie is 70+ minutes
 * AND doesn't contain trailer/clip/song keywords in the title.
 * This is the GATE KEEPER — nothing under 70 min reaches the UI.
 * Prevents fake videos that claim long durations but are actually short.
 */
const MOVIE_MIN_DURATION_MIN = 70 // 70 minutes — strict, no exceptions

const isVerifiedFullMovie = (m: Movie): boolean => {
  const durationMin = parseDurationToMin(m.duration)
  if (durationMin < MOVIE_MIN_DURATION_MIN) return false
  const t = m.title.toLowerCase()
  return !TITLE_BLACKLIST.some(w => t.includes(w))
}

// ── Cast data — FILTERED: only verified full-length movies ──

export const allMovies: Movie[] = (movies as Movie[]).filter(isVerifiedFullMovie)
export const allShorts: Short[] = shorts as Short[]

// ── Search filters interface ───────────────────────────────

export interface SearchFilters {
  genre?: string
  language?: string
  category?: string
  dubbed?: boolean
}

// ── Core search — instant, zero API ────────────────────────

export const searchMovies = (
  query: string,
  filters: SearchFilters = {},
): Movie[] => {
  let results = [...allMovies]

  // Text search — matches title, channel, genre, category
  if (query.trim()) {
    const q = query.toLowerCase()
    results = results.filter(
      m =>
        m.title.toLowerCase().includes(q) ||
        m.channel.toLowerCase().includes(q) ||
        m.genre.some(g => g.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q) ||
        m.language.toLowerCase().includes(q),
    )
  }

  // Genre filter
  if (filters.genre && filters.genre !== 'All') {
    results = results.filter(m => m.genre.includes(filters.genre!))
  }

  // Language filter
  if (filters.language && filters.language !== 'All') {
    results = results.filter(m => m.language === filters.language)
  }

  // Category filter
  if (filters.category && filters.category !== 'All') {
    results = results.filter(
      m =>
        m.category === filters.category ||
        m.genre.includes(filters.category!),
    )
  }

  // Dubbed filter
  if (filters.dubbed) {
    results = results.filter(m => m.dubbed)
  }

  return results
}

// ── Get movies by category ─────────────────────────────────

export const getByCategory = (category: string): Movie[] => {
  if (category === 'Trending') return allMovies.filter(m => m.trending)
  if (category === 'All') return allMovies
  return allMovies.filter(
    m => m.category === category || m.genre.includes(category),
  )
}

// ── Get related movies ─────────────────────────────────────

export const getRelated = (
  movieId: string,
  genre: string[],
  limit = 10,
): Movie[] => {
  return allMovies
    .filter(m => m.id !== movieId && m.genre.some(g => genre.includes(g)))
    .slice(0, limit)
}

// ── Get trending movies ────────────────────────────────────

export const getTrending = (limit = 16): Movie[] =>
  allMovies.filter(m => m.trending).slice(0, limit)

// ── Get movie by ID (supports both JSON id and videoId) ────

export const getMovieById = (id: string): Movie | undefined => {
  // First try JSON id (like "1", "2", etc.)
  const byId = allMovies.find(m => m.id === id)
  if (byId) return byId

  // Fallback: try videoId (for old library links)
  return allMovies.find(m => m.videoId === id)
}

// ── Get movies by channel ──────────────────────────────────

export const getByChannel = (channelName: string): Movie[] => {
  return allMovies.filter(
    m => m.channel.toLowerCase() === channelName.toLowerCase(),
  )
}

// ── Search shorts ──────────────────────────────────────────

export const searchShorts = (query: string): Short[] => {
  if (!query.trim()) return allShorts
  const q = query.toLowerCase()
  return allShorts.filter(
    s =>
      s.title.toLowerCase().includes(q) ||
      s.channel.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q),
  )
}
