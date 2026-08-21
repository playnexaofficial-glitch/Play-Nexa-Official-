// ── Play Nexa — Gemini AI Video Classifier ────────────────────
// Uses Google Gemini 1.5 Flash to classify YouTube videos
// as movie, music, or skip — with enhanced keyword fallback
// Netflix-aware: defaults Netflix channel content to skip (trailers/clips)
// Only promotes Netflix content as movie if strong full-content signals
// Merges fallback + Gemini results using confidence comparison
// Uses /api/admin/gemini-rotate for smart key rotation

import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_KEY = process.env.GEMINI_API_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace('/supabase.co', '').replace('https://', '')
  : ''

export interface ScanResult {
  type: 'movie' | 'music' | 'skip'
  confidence: number
  reason: string
}

// ── Smart key fetcher with auto-rotate support ──

async function getActiveGeminiKey(): Promise<{
  key: string
  keyId: string | null
}> {
  try {
    // Try the rotate API first (supports DB keys + auto-rotate)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    if (baseUrl) {
      const res = await fetch(`${baseUrl}/api/admin/gemini-rotate`, {
        next: { revalidate: 0 },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.key) {
          return {
            key: data.key,
            keyId: data.keyId || null,
          }
        }
      }
    }
  } catch {
    // Rotate API not available — fall through to env key
  }

  // Fallback to env key
  return {
    key: GEMINI_KEY,
    keyId: null,
  }
}

// ── Update key usage after API call ──

async function updateKeyUsage(keyId: string | null, increment: number = 2) {
  if (!keyId) return

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')

    if (baseUrl) {
      fetch(`${baseUrl}/api/admin/gemini-rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, usageIncrement: increment }),
      }).catch(() => {})
    }
  } catch {
    // Non-blocking — usage update failure should not break scanning
  }
}

/**
 * Classify a YouTube video using Gemini 1.5 Flash.
 * Always runs the fast free fallback classifier first.
 * If fallback confidence >= 0.85, skip Gemini (saves API calls + money).
 * For uncertain cases, uses Gemini for a second opinion.
 * Merges results: picks whichever (fallback or Gemini) has higher confidence.
 */
export async function classifyVideo(
  title: string,
  description: string,
  channelName: string
): Promise<ScanResult> {
  // Always try fallback first (fast + free)
  const fallback = fallbackClassify(title, description, channelName)

  // If very confident from fallback, use it directly — no Gemini call needed
  if (fallback.confidence >= 0.85) {
    console.log(
      `[Scanner] Fallback confident (${fallback.confidence}):`,
      title.slice(0, 40),
      '→',
      fallback.type
    )
    return fallback
  }

  // Use Gemini for uncertain cases
  try {
    const { key, keyId } = await getActiveGeminiKey()

    if (!key || key === 'your_gemini_api_key_here') {
      console.log('[Scanner] No Gemini key available, using fallback')
      return fallback
    }

    const genAI = new GoogleGenerativeAI(key)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    })

    const prompt = `Classify this YouTube video for a streaming app.

Title: "${title}"
Description: "${description.slice(0, 200)}"
Channel: "${channelName}"

Rules:
- MOVIE: Full movies, films, web series episodes,
  telefilms, dramas. Any language.
  Duration hints: "full movie", "official movie",
  hour-long content, "full film", "complete movie"
  International: "now streaming", "watch now",
  "full episode", "season", "episode"

- MUSIC: Songs, music videos, audio tracks,
  lyrics videos, music concerts

- SKIP: Trailers (< 3 min hints), teasers,
  "official trailer", "teaser trailer",
  behind scenes, interviews, clips,
  "sneak peek", "exclusive clip", "#shorts"

Respond ONLY valid JSON, nothing else:
{"type":"movie","confidence":0.9,"reason":"full movie"}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Update key usage (non-blocking)
    updateKeyUsage(keyId, 2)

    // Extract JSON safely — Gemini sometimes wraps in markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (!jsonMatch) return fallback

    const parsed = JSON.parse(jsonMatch[0])

    // Validate parsed result
    const validTypes = ['movie', 'music', 'skip']
    const type = validTypes.includes(parsed.type) ? parsed.type : 'skip'
    const confidence =
      typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0
    const reason = typeof parsed.reason === 'string' ? parsed.reason : ''

    // If Gemini has higher confidence than fallback, use Gemini
    if (confidence > fallback.confidence) {
      console.log(
        `[Scanner] Gemini wins (${confidence} > ${fallback.confidence}):`,
        title.slice(0, 40),
        '→',
        type
      )
      return { type, confidence, reason }
    }

    // Otherwise fallback wins
    console.log(
      `[Scanner] Fallback wins (${fallback.confidence} >= ${confidence}):`,
      title.slice(0, 40),
      '→',
      fallback.type
    )
    return fallback
  } catch (err: any) {
    console.warn(
      '[Scanner] Gemini failed:',
      err?.message || 'unknown',
      '— using fallback'
    )
    return fallback
  }
}

/**
 * Enhanced keyword-based fallback classifier.
 * Prioritizes: SKIP (trailers/clips) > MUSIC > MOVIE
 * Netflix-specific logic: defaults to skip unless strong movie signals.
 * Channel name is used for channel-specific classification logic.
 */
function fallbackClassify(
  title: string,
  description: string,
  channelName: string
): ScanResult {
  const text = `${title} ${description} ${channelName}`.toLowerCase()
  const titleLower = title.toLowerCase()

  // ── SKIP check first — trailers and promos should never be imported ──
  const skipWords = [
    'official trailer',
    'trailer',
    'teaser',
    'sneak peek',
    'exclusive clip',
    '#shorts',
    'behind the scenes',
    'making of',
    'interview',
    'featurette',
    'b-roll',
    'bloopers',
    'deleted scene',
    'clip',
    'promo',
    'preview',
    'announcement',
    'coming soon',
    'first look',
  ]

  // Check title specifically for skip keywords (highest priority)
  if (skipWords.some(w => titleLower.includes(w))) {
    return {
      type: 'skip',
      confidence: 0.92,
      reason: 'Trailer/clip keyword in title',
    }
  }

  // ── MUSIC check ──
  const musicWords = [
    'official song',
    'official audio',
    'music video',
    'lyrics',
    'lyric video',
    'audio song',
    'new song',
    'full song',
    'song ft.',
    'ft.',
    'feat.',
    'album',
    'single',
    'ep release',
    'music official',
  ]
  if (musicWords.some(w => text.includes(w))) {
    return {
      type: 'music',
      confidence: 0.88,
      reason: 'Music keyword found',
    }
  }

  // ── MOVIE check ──
  const movieWords = [
    // Bangla / Bengali
    'full movie',
    'official movie',
    'bangla movie',
    'bengali movie',
    'full film',
    'natok',
    'telefilm',
    'web series',
    'short film',
    'eid natok',
    'special natok',
    'full drama',
    'bangla film',
    'bengali film',
    'tele drama',
    // International
    'now streaming',
    'watch now on',
    'only on netflix',
    'only on amazon',
    'full episode',
    'season',
    'episode',
    'complete movie',
    'entire movie',
    'full length',
    '| official movie',
    'feature film',
  ]
  if (movieWords.some(w => text.includes(w))) {
    return {
      type: 'movie',
      confidence: 0.85,
      reason: 'Movie keyword found',
    }
  }

  // ── Netflix-specific logic ──
  if (channelName.toLowerCase().includes('netflix')) {
    if (
      titleLower.includes('full') ||
      titleLower.includes('episode') ||
      titleLower.includes('season')
    ) {
      return {
        type: 'movie',
        confidence: 0.7,
        reason: 'Netflix full content signal',
      }
    }
    return {
      type: 'skip',
      confidence: 0.8,
      reason: 'Netflix channel — likely trailer/clip',
    }
  }

  // ── Default: skip uncertain content ──
  return {
    type: 'skip',
    confidence: 0.5,
    reason: 'No clear category match',
  }
}
