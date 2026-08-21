// ── Play Nexa Bulletproof Full-Movie Authenticator ───────────────
// Server-side ISO 8601 duration parser with STRICT 70-min gate
// NEVER trusts title or description — only raw contentDetails
// Fake videos claiming 2-3 hours but actually 2-3 minutes are REJECTED
// Used by API routes and cron jobs to verify before storing

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3'

// ── Constants ────────────────────────────────────────────────

/** Minimum duration in seconds for a video to be a verified full movie — 70 minutes */
export const MOVIE_MIN_DURATION_SEC = 4200 // 70 minutes — strict, no exceptions

// ── Types ────────────────────────────────────────────────────

export interface VerificationResult {
  videoId: string
  isVerified: boolean
  durationSec: number
  durationFormatted: string
  reason?: string
  title?: string
  channel?: string
}

export interface BulkVerificationResult {
  verified: VerificationResult[]
  rejected: VerificationResult[]
  totalChecked: number
  totalVerified: number
  totalRejected: number
}

// ── ISO 8601 Duration Parser ────────────────────────────────

/**
 * Parse ISO 8601 duration string to total seconds.
 * Examples: PT1H45M → 6300, PT2H30M15S → 9015, PT45M → 2700
 *
 * This is the BULLETPROOF parser — it does NOT rely on title text,
 * description, or any user-editable metadata. It only reads the
 * raw contentDetails.duration field from YouTube's Video API,
 * which YouTube calculates from the actual video file.
 *
 * Format: PT[nH][nM][nS]
 * P = Period, T = Time, H = Hours, M = Minutes, S = Seconds
 */
export function parseISO8601Duration(iso: string): number {
  if (!iso || typeof iso !== 'string') return 0

  // Match PT followed by optional hours, optional minutes, optional seconds
  const match = iso.match(/^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/)
  if (!match) return 0

  const hours = parseFloat(match[1] || '0')
  const minutes = parseFloat(match[2] || '0')
  const seconds = parseFloat(match[3] || '0')

  return Math.floor(hours * 3600 + minutes * 60 + seconds)
}

/**
 * Format seconds into human-readable duration string.
 * 6300 → "1h 45m", 2700 → "45m", 9015 → "2h 30m"
 */
export function formatDurationFromSec(sec: number): string {
  if (sec <= 0) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Title Blacklist ─────────────────────────────────────────

/**
 * These keywords in the title indicate the video is NOT a full movie.
 * Even if the duration passes the 70-min gate, titles containing
 * these words are still rejected as extra protection.
 */
const TITLE_BLACKLIST = [
  'trailer', 'teaser', 'clip', 'song', 'music video',
  'interview', 'reaction', 'review', 'behind the scenes',
  'shorts', 'bts', 'promo', 'deleted scene', 'bloopers',
  'scene', 'highlight', 'recap', 'preview', 'preview',
  'episode', 'season', 'ep ', 'e01', 'e02', 'e03',
  'part 1', 'part 2', 'part 3', 'part 4',
  'ost', 'soundtrack', 'lyric video', 'cover',
  'explained', 'breakdown', 'analysis', 'analysis',
  'top 10', 'top 5', 'list of', 'comparison',
  'fan made', 'fan edit', 'amv', 'edit',
  'opening', 'ending', 'credits',
  'compilation', 'mix', 'mashup', 'medley',
  'how to', 'tutorial', 'guide', 'tips',
  'gameplay', 'walkthrough', 'let\'s play',
  'podcast', 'livestream', 'live stream',
]

/**
 * Check if a title contains blacklisted keywords.
 * Returns true if the title is suspicious (contains blacklisted words).
 */
export function isTitleBlacklisted(title: string): boolean {
  const t = title.toLowerCase().trim()
  return TITLE_BLACKLIST.some(keyword => t.includes(keyword))
}

// ── Single Video Verification ───────────────────────────────

/**
 * Verify a single YouTube video by its ID.
 * Fetches the actual contentDetails from YouTube Video API,
 * parses the ISO 8601 duration, and enforces the 70-minute minimum.
 *
 * This is the GATEKEEPER — it does NOT trust titles or descriptions.
 * Only the raw duration from contentDetails is used.
 */
export async function verifySingleVideo(videoId: string): Promise<VerificationResult> {
  if (!videoId || !YOUTUBE_API_KEY) {
    return {
      videoId,
      isVerified: false,
      durationSec: 0,
      durationFormatted: '0m',
      reason: 'Missing video ID or API key',
    }
  }

  try {
    // Fetch contentDetails from YouTube Video API — the ONLY trusted source
    const res = await fetch(
      `${YOUTUBE_BASE}/videos?` +
      `key=${YOUTUBE_API_KEY}` +
      `&id=${videoId}` +
      `&part=snippet,contentDetails`,
      { next: { revalidate: 3600 } }, // Cache for 1 hour on server
    )

    if (!res.ok) {
      return {
        videoId,
        isVerified: false,
        durationSec: 0,
        durationFormatted: '0m',
        reason: `YouTube API error: ${res.status}`,
      }
    }

    const data = await res.json()
    if (!data.items || data.items.length === 0) {
      return {
        videoId,
        isVerified: false,
        durationSec: 0,
        durationFormatted: '0m',
        reason: 'Video not found on YouTube',
      }
    }

    const item = data.items[0]
    const snippet = item.snippet || {}
    const contentDetails = item.contentDetails || {}

    // ── BULLETPROOF DURATION CHECK ──
    // Parse the raw ISO 8601 duration string from YouTube
    // This is the ACTUAL video duration — cannot be faked by title
    const isoDuration = contentDetails.duration as string
    const durationSec = parseISO8601Duration(isoDuration)
    const durationFormatted = formatDurationFromSec(durationSec)

    // ── STRICT 70-MINUTE GATE ──
    if (durationSec < MOVIE_MIN_DURATION_SEC) {
      return {
        videoId,
        isVerified: false,
        durationSec,
        durationFormatted,
        reason: `Duration ${durationFormatted} (${durationSec}s) is below 70-minute minimum (${MOVIE_MIN_DURATION_SEC}s)`,
        title: snippet.title,
        channel: snippet.channelTitle,
      }
    }

    // ── TITLE BLACKLIST CHECK (secondary defense) ──
    if (isTitleBlacklisted(snippet.title || '')) {
      return {
        videoId,
        isVerified: false,
        durationSec,
        durationFormatted,
        reason: `Title contains blacklisted keyword — likely not a full movie`,
        title: snippet.title,
        channel: snippet.channelTitle,
      }
    }

    // VERIFIED — this is a legitimate full-length movie
    return {
      videoId,
      isVerified: true,
      durationSec,
      durationFormatted,
      title: snippet.title,
      channel: snippet.channelTitle,
    }

  } catch (error) {
    return {
      videoId,
      isVerified: false,
      durationSec: 0,
      durationFormatted: '0m',
      reason: `Verification error: ${error instanceof Error ? error.message : 'Unknown'}`,
    }
  }
}

// ── Bulk Verification ───────────────────────────────────────

/**
 * Verify multiple YouTube video IDs in bulk.
 * Uses YouTube Videos API with comma-separated IDs (max 50 per request).
 * Returns separate arrays of verified and rejected videos.
 */
export async function verifyBulkVideos(videoIds: string[]): Promise<BulkVerificationResult> {
  if (!videoIds.length || !YOUTUBE_API_KEY) {
    return {
      verified: [],
      rejected: [],
      totalChecked: 0,
      totalVerified: 0,
      totalRejected: 0,
    }
  }

  // Process in batches of 50 (YouTube API limit)
  const allVerified: VerificationResult[] = []
  const allRejected: VerificationResult[] = []

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const idsParam = batch.join(',')

    try {
      const res = await fetch(
        `${YOUTUBE_BASE}/videos?` +
        `key=${YOUTUBE_API_KEY}` +
        `&id=${idsParam}` +
        `&part=snippet,contentDetails`,
        { next: { revalidate: 3600 } },
      )

      if (!res.ok) continue

      const data = await res.json()
      if (!data.items) continue

      const foundIds = new Set<string>()

      for (const item of data.items) {
        const vid = item.id as string
        foundIds.add(vid)

        const snippet = item.snippet || {}
        const contentDetails = item.contentDetails || {}
        const isoDuration = contentDetails.duration as string
        const durationSec = parseISO8601Duration(isoDuration)
        const durationFormatted = formatDurationFromSec(durationSec)

        const result: VerificationResult = {
          videoId: vid,
          durationSec,
          durationFormatted,
          title: snippet.title,
          channel: snippet.channelTitle,
          isVerified: false,
        }

        // Apply both checks
        if (durationSec < MOVIE_MIN_DURATION_SEC) {
          result.reason = `Duration ${durationFormatted} below 70-min gate`
          allRejected.push(result)
        } else if (isTitleBlacklisted(snippet.title || '')) {
          result.reason = 'Title contains blacklisted keyword'
          allRejected.push(result)
        } else {
          result.isVerified = true
          allVerified.push(result)
        }
      }

      // IDs not found in response are also rejected
      for (const vid of batch) {
        if (!foundIds.has(vid)) {
          allRejected.push({
            videoId: vid,
            isVerified: false,
            durationSec: 0,
            durationFormatted: '0m',
            reason: 'Video not found on YouTube',
          })
        }
      }
    } catch {
      // Batch failed — mark all as rejected
      for (const vid of batch) {
        allRejected.push({
          videoId: vid,
          isVerified: false,
          durationSec: 0,
          durationFormatted: '0m',
          reason: 'API request failed',
        })
      }
    }
  }

  return {
    verified: allVerified,
    rejected: allRejected,
    totalChecked: videoIds.length,
    totalVerified: allVerified.length,
    totalRejected: allRejected.length,
  }
}

// ── Region-Aware Detection ──────────────────────────────────

export type MovieRegion = 'bangladesh' | 'india' | 'international'

/**
 * Detect the region/origin of a movie based on its metadata.
 * Uses language, title keywords, and channel name for detection.
 */
export function detectMovieRegion(
  language: string,
  title: string,
  channel: string,
): MovieRegion {
  const t = title.toLowerCase()
  const l = language.toLowerCase()
  const c = channel.toLowerCase()

  // Bangladesh indicators
  if (
    l === 'bangla' || l === 'bengali' ||
    t.includes('bangla') || t.includes('bengali') ||
    t.includes('dhaka') || t.includes('bangladesh') ||
    c.includes('bangla') || c.includes('bengali') ||
    c.includes('dhaka') || c.includes('bangladesh')
  ) {
    return 'bangladesh'
  }

  // India indicators
  if (
    l === 'hindi' || l === 'tamil' || l === 'telugu' ||
    l === 'marathi' || l === 'gujarati' || l === 'punjabi' ||
    t.includes('hindi') || t.includes('bollywood') ||
    t.includes('tamil') || t.includes('telugu') ||
    t.includes('dubbed') ||
    c.includes('bollywood') || c.includes('hindi') ||
    c.includes('yash raj') || c.includes('utv') ||
    c.includes('viacom18') || c.includes('t-series')
  ) {
    return 'india'
  }

  // Default to international (English, Korean, Japanese, etc.)
  return 'international'
}

/**
 * Detect dubbed language tags from title and description.
 * Returns an array of language badges to display.
 * e.g., ["Bangla Dubbed"], ["Bangla Sub"], ["Hindi Dubbed"]
 */
export function detectDubbedTags(
  title: string,
  language: string,
): string[] {
  const tags: string[] = []
  const t = title.toLowerCase()

  // Bangla dubbed/subbed
  if (t.includes('bangla dubbed') || t.includes('bengali dubbed')) {
    tags.push('Bangla Dubbed')
  } else if (t.includes('bangla sub') || t.includes('bengali sub')) {
    tags.push('Bangla Sub')
  }

  // Hindi dubbed/subbed
  if (t.includes('hindi dubbed')) {
    tags.push('Hindi Dubbed')
  } else if (t.includes('hindi sub')) {
    tags.push('Hindi Sub')
  }

  // English dubbed/subbed (for anime/foreign films)
  if (t.includes('english dubbed') || t.includes('eng dub')) {
    tags.push('English Dubbed')
  } else if (t.includes('english sub') || t.includes('eng sub')) {
    tags.push('English Sub')
  }

  // Tamil/Telugu dubbed
  if (t.includes('tamil dubbed')) tags.push('Tamil Dubbed')
  if (t.includes('telugu dubbed')) tags.push('Telugu Dubbed')

  // If language is different from the dubbed indicator
  if (tags.length === 0 && language !== 'English') {
    // Auto-detect: if language is Hindi and title doesn't already say dubbed
    if (language === 'Hindi' && !t.includes('hindi')) {
      tags.push('Hindi')
    }
    if (language === 'Bangla' && !t.includes('bangla')) {
      tags.push('Bangla')
    }
  }

  return tags
}
