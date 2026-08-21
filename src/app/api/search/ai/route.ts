// ── Play Nexa AI Smart Search — Natural Language Route ──────────
// Users search with natural language (e.g. "Space movies with a sad ending")
// Gemini interprets mood/intent → converts to DB query tags
// Searches Supabase movies/music_tracks tables
// Zero YouTube Data API calls — RSS + Gemini only
// Server-side ONLY — zero client overhead

import { NextRequest, NextResponse } from 'next/server'
import { callGeminiJSON, isGeminiReady } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { searchMoviesFromDB } from '@/lib/db-cache'
import { formatDurationLong, formatViews, type YouTubeMovie } from '@/lib/types'

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

interface SearchRequest {
  query: string
  limit?: number
  type?: string
}

interface ParsedIntent {
  genres: string[]
  moods: string[]
  languages: string[]
  timePeriods: string[]
  searchKeywords: string[]
  isMovieSearch: boolean
  interpretedIntent: string
}

// ════════════════════════════════════════════════════════════
//  STEP 1: Gemini parses natural language into structured intent
// ════════════════════════════════════════════════════════════

const parseUserIntent = async (query: string): Promise<ParsedIntent> => {
  const prompt = `You are a smart search interpreter for a movie/music app called Play Nexa. The user is searching with natural language. Convert their query into structured search parameters.

USER QUERY: "${query}"

Analyze the query and extract:
1. Genres they're looking for (Action, Sci-Fi, Horror, Romance, Comedy, Drama, Thriller, Anime, Adventure, Bollywood, Korean, etc.)
2. Moods (sad, happy, dark, uplifting, scary, romantic, nostalgic, intense, etc.)
3. Languages (English, Hindi, Korean, Japanese, Bangla, Tamil, Telugu, etc.)
4. Time periods (classic, 80s, 90s, 2000s, 2010s, 2020s, recent, new, etc.)
5. Whether they're specifically looking for full movies vs music/shorts
6. Optimized search keywords that would work well in a database search

IMPORTANT: Be generous with keywords — include synonyms and related terms to maximize search recall.

Respond in JSON format:
{
  "genres": ["Genre1", "Genre2"],
  "moods": ["mood1", "mood2"],
  "languages": ["Language1"],
  "timePeriods": ["period1"],
  "searchKeywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "isMovieSearch": true/false,
  "interpretedIntent": "One sentence explaining what the user wants"
}`

  try {
    const result = await callGeminiJSON<ParsedIntent>(prompt, {
      temperature: 0.3,
      maxTokens: 500,
    })
    return result
  } catch (err) {
    console.warn('Play Nexa AI Search: Gemini intent parsing failed, using fallback', err)
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    return {
      genres: [],
      moods: [],
      languages: [],
      timePeriods: [],
      searchKeywords: words,
      isMovieSearch: query.toLowerCase().includes('movie') || query.toLowerCase().includes('film'),
      interpretedIntent: query,
    }
  }
}

// ════════════════════════════════════════════════════════════
//  STEP 2: Search Supabase with parsed intent
// ════════════════════════════════════════════════════════════

const searchSupabase = async (
  intent: ParsedIntent,
  limit = 20,
  type = 'all',
): Promise<YouTubeMovie[]> => {
  if (!supabaseAdmin) return []

  const results: YouTubeMovie[] = []
  const seenIds = new Set<string>()

  const addResult = (row: any) => {
    if (seenIds.has(row.youtube_id)) return
    seenIds.add(row.youtube_id)
    results.push({
      id: row.youtube_id,
      videoId: row.youtube_id,
      title: row.title || '',
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
      source: 'AI-Search',
      trending: false,
      viral: false,
    })
  }

  // Strategy 1: Keyword search on title
  if (intent.searchKeywords.length > 0) {
    try {
      const searchQuery = intent.searchKeywords.slice(0, 3).join(' | ')
      let query = supabaseAdmin
        .from('movies')
        .select('*')
        .eq('is_hidden', false)
        .ilike('title', `%${searchQuery.split('|')[0].trim()}%`)
        .limit(limit)

      const { data } = await query
      if (data) data.forEach(addResult)
    } catch { /* continue */ }
  }

  // Strategy 2: Language filter
  if (intent.languages.length > 0) {
    try {
      const { data } = await supabaseAdmin
        .from('movies')
        .select('*')
        .eq('is_hidden', false)
        .in('language', intent.languages)
        .order('view_count', { ascending: false })
        .limit(limit)

      if (data) data.forEach(addResult)
    } catch { /* continue */ }
  }

  // Strategy 3: Music search
  if (type === 'all' || type === 'music') {
    try {
      const keywords = intent.searchKeywords.slice(0, 3).join(' ')
      const { data } = await supabaseAdmin
        .from('music_tracks')
        .select('*')
        .ilike('title', `%${keywords}%`)
        .limit(limit / 2)

      if (data) data.forEach((row: any) => {
        if (seenIds.has(row.youtube_id)) return
        seenIds.add(row.youtube_id)
        results.push({
          id: row.youtube_id,
          videoId: row.youtube_id,
          title: row.title || '',
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
          category: 'music',
          free: true,
          source: 'AI-Search',
          trending: false,
          viral: false,
        })
      })
    } catch { /* continue */ }
  }

  return results.slice(0, limit)
}

// ════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ════════════════════════════════════════════════════════════

export const POST = async (req: NextRequest) => {
  const startTime = Date.now()

  // Rate limiting
  const now = Date.now()
  if (!globalThis._pnSearchTimestamps) {
    globalThis._pnSearchTimestamps = []
  }
  const timestamps = globalThis._pnSearchTimestamps as number[]
  const recentTimestamps = timestamps.filter(t => now - t < 60_000)
  if (recentTimestamps.length >= 30) {
    return NextResponse.json({
      error: 'Rate limit exceeded',
      message: 'Too many AI searches. Please try again in a minute.',
      retryAfter: 60,
    }, { status: 429 })
  }
  recentTimestamps.push(now)
  globalThis._pnSearchTimestamps = recentTimestamps

  let body: SearchRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { query, limit = 20, type = 'all' } = body

  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  if (query.length > 500) {
    return NextResponse.json({ error: 'Query too long (max 500 characters)' }, { status: 400 })
  }

  // If Gemini is not ready, fall back to direct DB search
  if (!isGeminiReady()) {
    const dbResults = await searchMoviesFromDB(query, limit)
    return NextResponse.json({
      query,
      interpretedIntent: query,
      results: dbResults,
      source: 'supabase-fallback',
      aiPowered: false,
    })
  }

  // Pipeline: Parse intent → Search DB
  const intent = await parseUserIntent(query)
  const results = await searchSupabase(intent, limit, type)

  const duration = Date.now() - startTime

  return NextResponse.json({
    query,
    interpretedIntent: intent.interpretedIntent,
    genres: intent.genres,
    moods: intent.moods,
    results,
    totalResults: results.length,
    source: results.length > 0 ? 'supabase' : 'none',
    aiPowered: true,
    duration_ms: duration,
  })
}

// GET endpoint for health check
export const GET = async () => {
  return NextResponse.json({
    service: 'Play Nexa AI Smart Search',
    status: isGeminiReady() ? 'ready' : 'not_configured',
    hint: 'Send POST with {"query": "Space movies with a sad ending"} to search',
    parameters: {
      query: 'Natural language search query (required)',
      limit: 'Max results (default 20)',
      type: '"movie" | "music" | "all" (default "all")',
    },
  })
}

declare global {
  var _pnSearchTimestamps: number[] | undefined
}
