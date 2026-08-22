// ── Play Nexa Admin — YouTube Auto Importer API ───────────────────
// Fetches uploads from a YouTube channel using Data API v3
// Filters by duration > 60 mins + Bengali/English movie keywords
// Uses Gemini AI for smart classification on uncertain videos
// Upserts to Supabase movies table with onConflict: youtube_id
// Verifies pna_admin_token cookie for every request

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as adminClient } from '@/lib/supabaseAdmin'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ── Env vars ──

const YOUTUBE_API_KEY = 
  process.env.YOUTUBE_API_KEY || 
  process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || 
  ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

// ── Auth check ──
function verifyAdmin(req: NextRequest): boolean {
  const token = req.cookies.get('pna_admin_token')?.value
  return !!token && token.length > 10
}

// ── Types ──

interface YTVideoItem {
  id: string
  snippet: {
    title: string
    description: string
    channelTitle: string
    channelId: string
    publishedAt: string
    thumbnails: {
      high?: { url: string }
      maxres?: { url: string }
      standard?: { url: string }
      default?: { url: string }
    }
  }
  contentDetails?: {
    duration: string
  }
}

interface ImportResult {
  youtube_id: string
  title: string
  thumbnail: string
  channel_name: string
  channel_id: string
  description: string
  duration: string
  published_at: string
  view_count: number
  is_hidden: boolean
  source_channel_id: string
  language: string
}

interface FilterResult {
  passed: boolean
  reason: string
  confidence: number
}

// ── Parse ISO 8601 duration to seconds ──

function parseDuration(iso: string): number {
  if (!iso) return 0
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

// ── Format seconds to HH:MM:SS or MM:SS ──

function formatDuration(totalSec: number): string {
  if (totalSec <= 0) return '0:00'
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Detect language from title/description ──

function detectLanguage(title: string, description: string): string {
  const bengaliRegex = /[\u0980-\u09FF]/
  const text = `${title} ${description}`
  if (bengaliRegex.test(text)) return 'Bangla'
  const hindiRegex = /[\u0900-\u097F]/
  if (hindiRegex.test(text)) return 'Hindi'
  return 'English'
}

// ── Keyword-based movie filter (fast, free) ──

function keywordFilter(title: string, description: string, channelName: string): FilterResult {
  const text = `${title} ${description} ${channelName}`.toLowerCase()
  const titleLower = title.toLowerCase()

  // SKIP: trailers, clips, shorts, music
  const skipWords = [
    'official trailer', 'trailer', 'teaser', 'sneak peek', 'exclusive clip',
    '#shorts', 'behind the scenes', 'making of', 'interview', 'featurette',
    'b-roll', 'bloopers', 'deleted scene', 'clip', 'promo', 'preview',
    'announcement', 'coming soon', 'first look', 'official song',
    'official audio', 'music video', 'lyrics', 'lyric video', 'new song',
    'full song', 'song ft.', 'feat.', 'album', 'single',
  ]

  if (skipWords.some(w => titleLower.includes(w))) {
    return { passed: false, reason: 'Skip keyword in title', confidence: 0.9 }
  }

  // PASS: strong movie keywords (Bangla + English)
  const movieKeywords = [
    'movie', 'সিনেমা', 'নাটক', 'film', 'natok', 'telefilm',
    'web series', 'drama', 'bangla movie', 'bengali movie',
    'full movie', 'official movie', 'full film', 'complete movie',
    'feature film', 'full length', 'bangla film', 'bengali film',
    'eid natok', 'special natok', 'tele drama',
  ]

  if (movieKeywords.some(w => text.includes(w))) {
    return { passed: true, reason: 'Movie keyword found', confidence: 0.85 }
  }

  return { passed: false, reason: 'No clear movie signal', confidence: 0.4 }
}

// ── Gemini AI filter for uncertain videos ──

async function geminiFilter(
  title: string,
  description: string,
  channelName: string
): Promise<FilterResult> {
  try {
    // Try to get key from gemini_keys table first
    let key = GEMINI_API_KEY

    const supabaseAdmin = adminClient

    const { data: activeKeyData } = await supabaseAdmin
      .from('gemini_keys')
      .select('api_key, id, usage_count')
      .eq('is_active', true)
      .order('usage_count', { ascending: true })
      .limit(1)
      .maybeSingle()

    const activeKey = activeKeyData as { api_key: string; id: string; usage_count: number } | null

    if (activeKey?.api_key) key = activeKey.api_key
    if (!key) return { passed: false, reason: 'No Gemini key', confidence: 0 }

    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are a movie classifier for a Bengali/English streaming app called Play Nexa.

Classify this YouTube video:
Title: "${title}"
Description: "${description.slice(0, 300)}"
Channel: "${channelName}"

Rules:
- PASS if it's a full movie, telefilm, natok (Bengali drama), web series episode, or feature film
- PASS for Bengali content with "সিনেমা" (cinema), "নাটক" (drama) in title
- FAIL if it's a trailer, teaser, clip, music video, song, or short content
- FAIL if duration seems under 60 minutes

Respond ONLY with valid JSON:
{"pass": true/false, "reason": "short explanation", "confidence": 0.0-1.0}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) return { passed: false, reason: 'Gemini parse fail', confidence: 0 }

    const parsed = JSON.parse(jsonMatch[0])

    // Update key usage
    if (activeKey?.id) {
      await supabaseAdmin
        .from('gemini_keys')
        .update({
          usage_count: activeKey.usage_count ? activeKey.usage_count + 1 : 1,
          last_used: new Date().toISOString(),
        })
        .eq('id', activeKey.id)
    }

    return {
      passed: !!parsed.pass,
      reason: parsed.reason || 'Gemini classified',
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
    }
  } catch (err: any) {
    console.warn('[YT Import] Gemini filter error:', err?.message)
    return { passed: false, reason: 'Gemini error', confidence: 0 }
  }
}

// ── Extract channel ID from URL ──

function extractChannelId(input: string): { type: 'channel' | 'handle' | 'custom' | 'video'; value: string } | null {
  const trimmed = input.trim()

  // Direct channel ID: UC...
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { type: 'channel', value: trimmed }
  }

  // youtube.com/channel/UC...
  const channelMatch = trimmed.match(/youtube\.com\/channel\/(UC[\w-]+)/)
  if (channelMatch) return { type: 'channel', value: channelMatch[1] }

  // youtube.com/@handle
  const handleMatch = trimmed.match(/youtube\.com\/@([\w-]+)/)
  if (handleMatch) return { type: 'handle', value: handleMatch[1] }

  // youtube.com/c/customname
  const customMatch = trimmed.match(/youtube\.com\/c\/([\w-]+)/)
  if (customMatch) return { type: 'custom', value: customMatch[1] }

  // youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID
  const videoMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
  if (videoMatch) return { type: 'video', value: videoMatch[1] }

  // Bare handle without URL
  if (/^@?[\w-]+$/.test(trimmed)) {
    return { type: 'handle', value: trimmed.replace('@', '') }
  }

  return null
}

// ── Resolve handle/custom URL to channel ID ──

async function resolveToChannelId(
  type: 'handle' | 'custom' | 'video',
  value: string
): Promise<string | null> {
  if (!YOUTUBE_API_KEY) return null

  try {
    if (type === 'video') {
      // Get channel ID from video
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${value}&key=${YOUTUBE_API_KEY}`
      )
      const data = await res.json()
      return data.items?.[0]?.snippet?.channelId || null
    }

    // Handle or custom URL
    const param = type === 'handle' ? 'forHandle' : 'forUsername'
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&${param}=${value}&key=${YOUTUBE_API_KEY}`
    )
    const data = await res.json()
    return data.items?.[0]?.id || null
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
//  POST /api/admin/yt-import
//  Body: { channelUrl: string, maxResults?: number, useGemini?: boolean }
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { channelUrl, maxResults = 50, useGemini = true } = body

    if (!channelUrl || typeof channelUrl !== 'string') {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      )
    }

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({
        error: 'YouTube API key not configured. In Vercel: add YOUTUBE_API_KEY to Environment Variables and redeploy.'
      }, { status: 500 })
    }

    // ── Step 1: Resolve channel URL to channel ID ──
    const parsed = extractChannelId(channelUrl)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid YouTube channel URL. Use format: youtube.com/@handle or youtube.com/channel/UC...' },
        { status: 400 }
      )
    }

    let channelId: string | null = null

    if (parsed.type === 'channel') {
      channelId = parsed.value
    } else {
      channelId = await resolveToChannelId(parsed.type, parsed.value)
    }

    if (!channelId) {
      return NextResponse.json(
        { error: 'Could not resolve channel. Check the URL and try again.' },
        { status: 404 }
      )
    }

    // ── Step 2: Get channel info ──
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`
    )
    const channelData = await channelRes.json()

    if (!channelData.items?.length) {
      return NextResponse.json(
        { error: 'Channel not found on YouTube' },
        { status: 404 }
      )
    }

    const channelInfo = channelData.items[0]
    const channelName = channelInfo.snippet?.title || 'Unknown'
    const uploadsPlaylistId = channelInfo.contentDetails?.relatedPlaylists?.uploads

    if (!uploadsPlaylistId) {
      return NextResponse.json(
        { error: 'Could not find uploads playlist for this channel' },
        { status: 404 }
      )
    }

    // ── Step 3: Fetch videos from uploads playlist ──
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${Math.min(maxResults, 50)}&key=${YOUTUBE_API_KEY}`
    )
    const videosData = await videosRes.json()

    if (!videosData.items?.length) {
      return NextResponse.json(
        { error: 'No videos found in this channel' },
        { status: 404 }
      )
    }

    const videoIds = videosData.items
      .map((item: any) => item.snippet?.resourceId?.videoId)
      .filter(Boolean)

    if (!videoIds.length) {
      return NextResponse.json(
        { error: 'No valid video IDs found' },
        { status: 404 }
      )
    }

    // ── Step 4: Get video details (duration + stats) ──
    const detailsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
    )
    const detailsData = await detailsRes.json()

    const videos: YTVideoItem[] = detailsData.items || []

    // ── Step 5: Filter videos ──
    const importResults: ImportResult[] = []
    const skipped: Array<{ title: string; reason: string }> = []
    const geminiChecked: Array<{ title: string; result: string }> = []

    for (const video of videos) {
      const videoId = video.id
      const snippet = video.snippet
      const durationIso = video.contentDetails?.duration || ''
      const durationSec = parseDuration(durationIso)

      // ── HARD FILTER: Duration must be > 60 minutes (3600 seconds) ──
      if (durationSec < 3600) {
        skipped.push({
          title: snippet?.title || videoId,
          reason: `Too short: ${formatDuration(durationSec)} (< 60 min)`,
        })
        continue
      }

      const title = snippet?.title || ''
      const description = snippet?.description || ''
      const channelTitle = snippet?.channelTitle || channelName

      // ── KEYWORD FILTER (fast, free) ──
      const kwResult = keywordFilter(title, description, channelTitle)

      if (kwResult.confidence >= 0.8) {
        if (kwResult.passed) {
          // High-confidence movie keyword match
          const thumb = snippet?.thumbnails?.maxres?.url
            || snippet?.thumbnails?.high?.url
            || snippet?.thumbnails?.standard?.url
            || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

          importResults.push({
            youtube_id: videoId,
            title,
            thumbnail: thumb,
            channel_name: channelTitle,
            channel_id: channelId,
            description: description.slice(0, 500),
            duration: formatDuration(durationSec),
            published_at: snippet?.publishedAt || new Date().toISOString(),
            view_count: parseInt(
              (detailsData.items?.find((v: any) => v.id === videoId) as any)
                ?.statistics?.viewCount || '0',
              10
            ),
            is_hidden: false,
            source_channel_id: channelId,
            language: detectLanguage(title, description),
          })
        } else {
          skipped.push({ title, reason: kwResult.reason })
        }
        continue
      }

      // ── UNCERTAIN: Use Gemini AI if enabled ──
      if (useGemini) {
        const aiResult = await geminiFilter(title, description, channelTitle)
        geminiChecked.push({ title, result: aiResult.passed ? 'PASS' : 'FAIL' })

        if (aiResult.passed && aiResult.confidence >= 0.6) {
          const thumb = snippet?.thumbnails?.maxres?.url
            || snippet?.thumbnails?.high?.url
            || snippet?.thumbnails?.standard?.url
            || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

          importResults.push({
            youtube_id: videoId,
            title,
            thumbnail: thumb,
            channel_name: channelTitle,
            channel_id: channelId,
            description: description.slice(0, 500),
            duration: formatDuration(durationSec),
            published_at: snippet?.publishedAt || new Date().toISOString(),
            view_count: parseInt(
              (detailsData.items?.find((v: any) => v.id === videoId) as any)
                ?.statistics?.viewCount || '0',
              10
            ),
            is_hidden: false,
            source_channel_id: channelId,
            language: detectLanguage(title, description),
          })
        } else {
          skipped.push({ title, reason: `Gemini: ${aiResult.reason}` })
        }
      } else {
        // No Gemini — skip uncertain
        skipped.push({ title, reason: 'Uncertain (no Gemini)' })
      }
    }

    // ── Step 6: Upsert to Supabase ──
    let upserted = 0
    let upsertError: string | null = null

    if (importResults.length > 0) {
      const supabaseAdmin = adminClient

      const { error } = await supabaseAdmin
        .from('movies')
        .upsert(importResults, { onConflict: 'youtube_id' })

      if (error) {
        console.error('[YT Import] Upsert error:', error)
        upsertError = error.message
      } else {
        upserted = importResults.length
      }
    }

    // ── Response ──
    return NextResponse.json({
      success: true,
      channel: {
        id: channelId,
        name: channelName,
      },
      stats: {
        totalFetched: videos.length,
        passed: importResults.length,
        skipped: skipped.length,
        geminiChecked: geminiChecked.length,
        upserted,
      },
      imported: importResults.map(v => ({
        youtube_id: v.youtube_id,
        title: v.title,
        duration: v.duration,
        language: v.language,
      })),
      skipped: skipped.slice(0, 20), // Limit skipped list
      geminiChecked: geminiChecked.slice(0, 10),
      error: upsertError,
    })
  } catch (err: any) {
    console.error('[YT Import] Fatal error:', err)
    return NextResponse.json(
      { error: err?.message || 'Import failed' },
      { status: 500 }
    )
  }
}

// ── GET: Check if YouTube API key is configured ──

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    configured: !!YOUTUBE_API_KEY,
    message: YOUTUBE_API_KEY
      ? 'YouTube API key is configured'
      : 'YouTube API key not configured. In Vercel: add YOUTUBE_API_KEY to Environment Variables and redeploy.',
  })
}
