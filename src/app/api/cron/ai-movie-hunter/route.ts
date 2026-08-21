// ── Play Nexa AI Movie Hunter — Nightly Cron Route ──────────────
// Pipeline: Gemini suggests → YouTube fetches → Gemini verifies → Supabase saves
// Called by cron job (e.g. Vercel Cron, Supabase pg_cron, or external scheduler)
// Server-side ONLY — zero client overhead
// STRICT 60-minute movie filter — nothing under 60 min is ever saved

import { NextRequest, NextResponse } from 'next/server'
import { callGemini, callGeminiJSON, isGeminiReady, getKeyPoolStatus } from '@/lib/gemini'
import { getSupabase, isSupabaseReady } from '@/lib/supabase'
import { parseDuration } from '@/lib/youtube'

// ════════════════════════════════════════════════════════════
//  CONFIGURATION
// ════════════════════════════════════════════════════════════

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || ''
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3'
const MOVIE_MIN_DURATION_SEC = 3600  // 60 minutes — strict, no exceptions

const CATEGORIES_TO_HUNT = [
  { category: 'Trending', query: 'popular full movies 2024 2025 free on YouTube', genre: ['Action', 'Drama'] },
  { category: 'Hollywood', query: 'hollywood full movie english free YouTube', genre: ['Action', 'Thriller'] },
  { category: 'Bollywood', query: 'bollywood full movie hindi free YouTube', genre: ['Drama', 'Action'] },
  { category: 'Hindi Dubbed', query: 'hindi dubbed full movie free YouTube', genre: ['Action', 'Sci-Fi'] },
  { category: 'Anime', query: 'anime full movie english dubbed free YouTube', genre: ['Anime', 'Action'] },
  { category: 'Korean', query: 'korean full movie english subtitles free YouTube', genre: ['Thriller', 'Drama'] },
  { category: 'Sci-Fi', query: 'sci fi full movie free english YouTube', genre: ['Sci-Fi', 'Adventure'] },
  { category: 'Horror', query: 'horror full movie free english YouTube', genre: ['Horror', 'Thriller'] },
]

// Blacklist keywords — these are NEVER full movies
const TITLE_BLACKLIST = [
  'trailer', 'teaser', 'clip', 'song', 'music', 'interview',
  'reaction', 'review', 'behind', 'shorts', 'bts', 'promo',
  'deleted', 'bloopers', 'scene', 'highlight', 'recap',
  'preview', 'episode', 'season', 'ep ', 'e0',
  'part 1', 'part 2', 'part 3', 'ost', 'soundtrack',
  'lyric', 'cover', 'explained', 'breakdown', 'analysis',
  'top 10', 'top 5', 'fan made', 'fan edit', 'amv',
  'opening', 'ending', 'credits',
]

// ════════════════════════════════════════════════════════════
//  STEP A: Gemini generates movie search queries
// ════════════════════════════════════════════════════════════

interface MovieSuggestion {
  title: string
  searchQuery: string
  genre: string[]
  language: string
  year?: string
}

/**
 * Ask Gemini to suggest high-quality, full-length movie titles
 * that are likely available for free on YouTube.
 */
const generateMovieQueries = async (): Promise<MovieSuggestion[]> => {
  const prompt = `You are a movie discovery expert. Suggest 20 high-quality, full-length movies that are very likely available for FREE on YouTube (uploaded by official channels like MX Player, Goldmines, Shemaroo, or public domain channels).

Requirements:
- Only suggest movies that are FULL LENGTH (at least 60 minutes)
- Focus on movies available on YouTube for free (not paid rentals)
- Mix of Hollywood, Bollywood, Hindi Dubbed, Korean, and Anime
- Include the exact search query a user would type on YouTube to find the full movie
- Do NOT suggest trailers, clips, songs, reviews, or short films

Respond in JSON format:
{
  "movies": [
    {
      "title": "Movie Title Here",
      "searchQuery": "exact YouTube search query for full movie",
      "genre": ["Action", "Sci-Fi"],
      "language": "English",
      "year": "2020"
    }
  ]
}`

  try {
    const result = await callGeminiJSON<{ movies: MovieSuggestion[] }>(prompt, {
      temperature: 0.9,  // Creative — different movies each run
      maxTokens: 3000,
    })
    return result.movies || []
  } catch (err) {
    console.error('Play Nexa AI Hunter: Step A failed (Gemini query generation)', err)
    return []
  }
}

// ════════════════════════════════════════════════════════════
//  STEP B: YouTube API — fetch video results for queries
// ════════════════════════════════════════════════════════════

interface YouTubeCandidate {
  videoId: string
  title: string
  channel: string
  thumbnail: string
  durationSec: number
  rawDuration: string
  views: number
  description: string
  tags: string[]
}

/**
 * Search YouTube for a specific movie query and return candidate videos.
 * Uses videoDuration=long as a pre-filter, then validates duration_sec.
 */
const searchYouTubeForMovie = async (
  query: string,
  maxResults = 5,
): Promise<YouTubeCandidate[]> => {
  if (!YOUTUBE_API_KEY) return []

  try {
    // Step B1: Search for videos
    const searchUrl = `${YOUTUBE_BASE}/search?` +
      `key=${YOUTUBE_API_KEY}` +
      `&q=${encodeURIComponent(query)}` +
      `&type=video` +
      `&part=snippet` +
      `&maxResults=${maxResults + 3}` +  // Over-fetch, filter later
      `&videoDuration=long` +             // Pre-filter: YouTube says >20 min
      `&videoEmbeddable=true` +
      `&order=relevance` +
      `&safeSearch=moderate`

    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10_000) })
    if (!searchRes.ok) return []

    const searchData = await searchRes.json()
    if (!searchData.items?.length) return []

    const ids = searchData.items
      .map((i: Record<string, unknown>) => (i.id as Record<string, string>)?.videoId)
      .filter(Boolean)
      .join(',')

    if (!ids) return []

    // Step B2: Get video details (duration, stats)
    const detailUrl = `${YOUTUBE_BASE}/videos?` +
      `key=${YOUTUBE_API_KEY}` +
      `&id=${ids}` +
      `&part=snippet,contentDetails,statistics`

    const detailRes = await fetch(detailUrl, { signal: AbortSignal.timeout(10_000) })
    if (!detailRes.ok) return []

    const detailData = await detailRes.json()
    if (!detailData.items?.length) return []

    return detailData.items
      .map((v: Record<string, unknown>) => {
        const snippet = v.snippet as Record<string, unknown>
        const cd = v.contentDetails as Record<string, string>
        const stats = v.statistics as Record<string, string>
        const thumbnails = snippet?.thumbnails as Record<string, Record<string, string>>
        const sec = parseDuration(cd?.duration || '')

        return {
          videoId: v.id as string,
          title: (snippet?.title as string) || '',
          channel: (snippet?.channelTitle as string) || '',
          thumbnail:
            thumbnails?.maxres?.url ||
            thumbnails?.high?.url ||
            thumbnails?.medium?.url ||
            '',
          durationSec: sec,
          rawDuration: cd?.duration || '',
          views: parseInt(stats?.viewCount || '0'),
          description: ((snippet?.description as string) || '').slice(0, 500),
          tags: (snippet?.tags as string[]) || [],
        }
      })
      // Pre-filter: anything under 60 min is immediately discarded
      .filter((v: YouTubeCandidate) => v.durationSec >= MOVIE_MIN_DURATION_SEC)
      .slice(0, maxResults)

  } catch (err) {
    console.warn('Play Nexa AI Hunter: YouTube search failed for query:', query, err)
    return []
  }
}

// ════════════════════════════════════════════════════════════
//  STEP C: Gemini verifies — is this a FULL MOVIE or a clip?
// ════════════════════════════════════════════════════════════

interface VerificationResult {
  isFullMovie: boolean
  confidence: number  // 0.0 – 1.0
  reason: string
  detectedGenre: string[]
  detectedLanguage: string
}

/**
 * Send YouTube results to Gemini for strict verification.
 * Gemini acts as the ultimate judge — it inspects title, channel,
 * duration, and metadata to determine if this is truly a full movie
 * or just a trailer/clip/song/review disguised as one.
 */
const verifyWithGemini = async (
  candidate: YouTubeCandidate,
): Promise<VerificationResult> => {
  const prompt = `You are a strict movie verification AI. Your job is to determine if this YouTube video is a FULL MOVIE (at least 60 minutes long) or just a trailer/clip/song/review/short film.

VIDEO DETAILS:
- Title: "${candidate.title}"
- Channel: "${candidate.channel}"
- Duration: ${Math.floor(candidate.durationSec / 60)} minutes ${candidate.durationSec % 60} seconds
- Views: ${candidate.views.toLocaleString()}
- Description: "${candidate.description.slice(0, 300)}"
- Tags: ${candidate.tags.slice(0, 10).join(', ')}

ANALYSIS RULES:
1. If the title contains words like "trailer", "teaser", "clip", "song", "music video", "review", "reaction", "bts", "behind the scenes", "preview", "recap", "highlight", "scene", "opening", "ending", "credits" — it is NOT a full movie.
2. If the video is under 60 minutes — it is NOT a full movie.
3. If the channel is a known review/reaction channel — it is NOT a full movie.
4. If the title says "full movie" or "complete movie" and is over 60 minutes — it IS likely a full movie.
5. Check the description for clues about whether it's the complete film.

Respond in JSON format:
{
  "isFullMovie": true/false,
  "confidence": 0.0-1.0,
  "reason": "Brief explanation",
  "detectedGenre": ["Genre1", "Genre2"],
  "detectedLanguage": "Language"
}`

  try {
    const result = await callGeminiJSON<VerificationResult>(prompt, {
      temperature: 0.1,  // Low temperature — we want strict, consistent judgments
      maxTokens: 500,
    })
    return result
  } catch {
    // If Gemini fails, fall back to our local blacklist filter
    const titleLower = candidate.title.toLowerCase()
    const hasBlacklistWord = TITLE_BLACKLIST.some(w => titleLower.includes(w))
    return {
      isFullMovie: !hasBlacklistWord && candidate.durationSec >= MOVIE_MIN_DURATION_SEC,
      confidence: hasBlacklistWord ? 0.1 : 0.5,
      reason: hasBlacklistWord ? 'Blacklist keyword detected (Gemini fallback)' : 'Duration check passed (Gemini fallback)',
      detectedGenre: [],
      detectedLanguage: 'English',
    }
  }
}

// ════════════════════════════════════════════════════════════
//  STEP D: Save verified movies to Supabase
// ════════════════════════════════════════════════════════════

interface SaveResult {
  saved: number
  duplicates: number
  rejected: number
  errors: number
}

/**
 * Save a batch of verified movies to the Supabase videos table.
 * Uses UPSERT (ON CONFLICT) to avoid duplicates — if a video already
 * exists, it updates the views count instead of failing.
 */
const saveToSupabase = async (
  movies: Array<{
    videoId: string
    title: string
    thumbnail: string
    durationSec: number
    channel: string
    genre: string[]
    language: string
    category: string
    views: number
  }>,
): Promise<SaveResult> => {
  const result: SaveResult = { saved: 0, duplicates: 0, rejected: 0, errors: 0 }

  if (!isSupabaseReady() || movies.length === 0) return result

  const sb = getSupabase()
  if (!sb) return result

  // Process in batches of 5 to avoid overloading
  for (let i = 0; i < movies.length; i += 5) {
    const batch = movies.slice(i, i + 5)

    await Promise.allSettled(
      batch.map(async (movie) => {
        try {
          // Double-check: reject if under 60 minutes
          if (movie.durationSec < MOVIE_MIN_DURATION_SEC) {
            result.rejected++
            return
          }

          // Double-check: reject if title contains blacklist words
          const titleLower = movie.title.toLowerCase()
          if (TITLE_BLACKLIST.some(w => titleLower.includes(w))) {
            result.rejected++
            return
          }

          // UPSERT — insert new, update existing
          const { error } = await sb
            .from('videos')
            .upsert({
              yt_video_id: movie.videoId,
              title: movie.title,
              thumbnail_url: movie.thumbnail,
              category: 'movie',
              genre: movie.genre,
              duration_sec: movie.durationSec,
              channel: movie.channel,
              language: movie.language,
              views: movie.views,
            }, {
              onConflict: 'yt_video_id',
              ignoreDuplicates: false,  // Update existing rows
            })

          if (error) {
            if (error.code === '23505') {
              // Unique constraint violation = duplicate
              result.duplicates++
            } else {
              console.warn('Play Nexa AI Hunter: Supabase save error:', error.message)
              result.errors++
            }
          } else {
            result.saved++
          }
        } catch {
          result.errors++
        }
      }),
    )
  }

  return result
}

// ════════════════════════════════════════════════════════════
//  ALSO HUNT FROM MISSING_REQUESTS TABLE
// ════════════════════════════════════════════════════════════

/**
 * Fetch top pending missing requests from Supabase.
 * These are searches users made that didn't return results.
 * The AI hunter processes them with highest priority.
 */
const getMissingRequests = async (limit = 10): Promise<Array<{ search_query: string; category: string }>> => {
  if (!isSupabaseReady()) return []

  const sb = getSupabase()
  if (!sb) return []

  try {
    const { data, error } = await sb
      .from('missing_requests')
      .select('search_query, category')
      .eq('status', 'pending')
      .order('request_count', { ascending: false })
      .limit(limit)

    if (error || !data) return []
    return data as Array<{ search_query: string; category: string }>
  } catch {
    return []
  }
}

/**
 * Mark missing requests as processed (done or failed).
 */
const markMissingRequestsDone = async (queries: string[], status: 'done' | 'failed'): Promise<void> => {
  if (!isSupabaseReady() || queries.length === 0) return

  const sb = getSupabase()
  if (!sb) return

  try {
    await sb
      .from('missing_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .in('search_query', queries)
  } catch {
    // Silent fail — non-critical
  }
}

// ════════════════════════════════════════════════════════════
//  MAIN HANDLER — The complete 4-step pipeline
// ════════════════════════════════════════════════════════════

export const POST = async (req: NextRequest) => {
  const startTime = Date.now()

  // ── Auth check: simple bearer token or cron secret ──
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || ''
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Pre-flight checks ──
  if (!isGeminiReady()) {
    return NextResponse.json({
      error: 'Gemini API keys not configured',
      hint: 'Set GEMINI_KEY_1 through GEMINI_KEY_5 in .env',
    }, { status: 503 })
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({
      error: 'YouTube API key not configured',
      hint: 'Set NEXT_PUBLIC_YOUTUBE_API_KEY in .env',
    }, { status: 503 })
  }

  // ── Optional: override categories from request body ──
  let overrideCategories: string[] | null = null
  try {
    const body = await req.json()
    if (body?.categories && Array.isArray(body.categories)) {
      overrideCategories = body.categories
    }
  } catch {
    // No body or invalid JSON — use defaults
  }

  const categories = overrideCategories
    ? CATEGORIES_TO_HUNT.filter(c => overrideCategories!.includes(c.category))
    : CATEGORIES_TO_HUNT

  // ── Pipeline stats ──
  const stats = {
    queriesGenerated: 0,
    youTubeResults: 0,
    geminiVerified: 0,
    saved: 0,
    duplicates: 0,
    rejected: 0,
    errors: 0,
    missingProcessed: 0,
  }

  console.log('Play Nexa AI Hunter: Starting pipeline...')

  // ══════════════════════════════════════════════════════════
  //  PHASE 1: Gemini-generated movie queries
  // ══════════════════════════════════════════════════════════

  const suggestions = await generateMovieQueries()
  stats.queriesGenerated = suggestions.length
  console.log(`Play Nexa AI Hunter: Gemini suggested ${suggestions.length} movies`)

  // ══════════════════════════════════════════════════════════
  //  PHASE 2: YouTube search for each suggestion
  // ══════════════════════════════════════════════════════════

  const allCandidates: Array<YouTubeCandidate & { suggestedGenre: string[]; suggestedLanguage: string; suggestedCategory: string }> = []

  // Process Gemini suggestions
  for (const suggestion of suggestions) {
    const candidates = await searchYouTubeForMovie(suggestion.searchQuery, 3)
    for (const c of candidates) {
      allCandidates.push({
        ...c,
        suggestedGenre: suggestion.genre,
        suggestedLanguage: suggestion.language,
        suggestedCategory: 'movie',
      })
    }
    stats.youTubeResults += candidates.length

    // Small delay to avoid YouTube API burst
    await new Promise(r => setTimeout(r, 300))
  }

  // Also process category-based queries
  for (const cat of categories) {
    const candidates = await searchYouTubeForMovie(cat.query, 3)
    for (const c of candidates) {
      allCandidates.push({
        ...c,
        suggestedGenre: cat.genre,
        suggestedLanguage: 'English',
        suggestedCategory: cat.category,
      })
    }
    stats.youTubeResults += candidates.length
    await new Promise(r => setTimeout(r, 300))
  }

  // ══════════════════════════════════════════════════════════
  //  PHASE 2.5: Also process missing requests from users
  // ══════════════════════════════════════════════════════════

  const missingRequests = await getMissingRequests(10)
  const processedMissingQueries: string[] = []

  for (const mr of missingRequests) {
    const candidates = await searchYouTubeForMovie(mr.search_query + ' full movie', 3)
    for (const c of candidates) {
      allCandidates.push({
        ...c,
        suggestedGenre: [],
        suggestedLanguage: 'English',
        suggestedCategory: mr.category || 'movie',
      })
    }
    stats.youTubeResults += candidates.length
    stats.missingProcessed++
    processedMissingQueries.push(mr.search_query)
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`Play Nexa AI Hunter: Found ${allCandidates.length} YouTube candidates`)

  // ══════════════════════════════════════════════════════════
  //  PHASE 3: Gemini verification — strict judge
  // ══════════════════════════════════════════════════════════

  const verifiedMovies: Array<{
    videoId: string
    title: string
    thumbnail: string
    durationSec: number
    channel: string
    genre: string[]
    language: string
    category: string
    views: number
  }> = []

  // Deduplicate by videoId before verification
  const seenIds = new Set<string>()
  const uniqueCandidates = allCandidates.filter(c => {
    if (seenIds.has(c.videoId)) return false
    seenIds.add(c.videoId)
    return true
  })

  for (const candidate of uniqueCandidates) {
    const verification = await verifyWithGemini(candidate)
    stats.geminiVerified++

    if (verification.isFullMovie && verification.confidence >= 0.6) {
      verifiedMovies.push({
        videoId: candidate.videoId,
        title: candidate.title,
        thumbnail: candidate.thumbnail,
        durationSec: candidate.durationSec,
        channel: candidate.channel,
        genre: verification.detectedGenre.length > 0
          ? verification.detectedGenre
          : candidate.suggestedGenre,
        language: verification.detectedLanguage !== 'English'
          ? verification.detectedLanguage
          : candidate.suggestedLanguage,
        category: candidate.suggestedCategory,
        views: candidate.views,
      })
    } else {
      stats.rejected++
    }

    // Rate-limit awareness: small delay between Gemini calls
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`Play Nexa AI Hunter: Gemini verified ${verifiedMovies.length} movies (rejected ${stats.rejected})`)

  // ══════════════════════════════════════════════════════════
  //  PHASE 4: Save to Supabase
  // ══════════════════════════════════════════════════════════

  const saveResult = await saveToSupabase(verifiedMovies)
  stats.saved = saveResult.saved
  stats.duplicates = saveResult.duplicates
  stats.errors += saveResult.errors

  // Mark missing requests as done
  if (processedMissingQueries.length > 0) {
    await markMissingRequestsDone(processedMissingQueries, saveResult.saved > 0 ? 'done' : 'failed')
  }

  const duration = Date.now() - startTime
  const keyPool = getKeyPoolStatus()

  console.log(`Play Nexa AI Hunter: Complete in ${duration}ms. Saved: ${stats.saved}, Duplicates: ${stats.duplicates}, Rejected: ${stats.rejected}`)

  return NextResponse.json({
    success: true,
    duration_ms: duration,
    stats,
    keyPoolHealth: {
      totalKeys: keyPool.totalKeys,
      healthyKeys: keyPool.healthyKeys,
      rateLimitedKeys: keyPool.rateLimitedKeys,
    },
  })
}

// GET endpoint for health check / manual trigger via browser
export const GET = async () => {
  return NextResponse.json({
    service: 'Play Nexa AI Movie Hunter',
    status: isGeminiReady() ? 'ready' : 'not_configured',
    geminiKeys: getKeyPoolStatus().totalKeys,
    supabase: isSupabaseReady() ? 'connected' : 'not_configured',
    youtubeKey: YOUTUBE_API_KEY ? 'configured' : 'missing',
    hint: 'Send POST request to run the pipeline. Optionally include {"categories": ["Hollywood"]} in body.',
  })
}
