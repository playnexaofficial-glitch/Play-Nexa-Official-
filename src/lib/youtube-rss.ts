// ── Play Nexa YouTube RSS Feed Parser ────────────────────────────
// Zero YouTube Data API v3 — uses public RSS feeds only
// RSS URL: https://www.youtube.com/feeds/videos.xml?channel_id={id}
// Each feed entry has: <id>, <title>, <link>, <published>, <media:thumbnail>, <author>
// Server-side API route proxies requests to avoid CORS issues
// 2GB RAM safe — no heavy XML libraries, native DOMParser on client

// ── Types ──────────────────────────────────────────────────────

export interface YouTubeChannel {
  id: string              // YouTube channel ID (UC...)
  name: string            // Display name
  logo: string            // Logo URL (avatar)
  color: string           // Accent color for badge styling
  emoji: string           // Emoji prefix for badge
  category: string        // Category tag (e.g., "Bangla", "Hindi", "Bollywood")
}

export interface RSSVideoItem {
  videoId: string         // YouTube video ID (11 chars)
  title: string           // Video title
  thumbnail: string       // Thumbnail URL (hqdefault)
  channelName: string     // Channel name from feed
  channelId: string       // Channel ID from feed
  publishedAt: string     // ISO 8601 date string
  description: string     // Video description (truncated)
}

export interface ChannelFeedResult {
  channel: YouTubeChannel
  videos: RSSVideoItem[]
  fetchedAt: number       // Unix timestamp
}

// ── Official Channel Mapping ──────────────────────────────────
// Hardcoded major official production & OTT channels
// Categories: Bangla, Hindi, Bollywood, Regional
// Channel IDs verified from YouTube public pages

export const YOUTUBE_CHANNELS: YouTubeChannel[] = [
  // ── Official Bangla OTT / Production Channels ──
  {
    id: 'UCn11G1_FR-5tYGxCJcYhYrA',
    name: 'G-Series Movies',
    logo: 'https://yt3.googleusercontent.com/ytc/AIdro_nT7G2pEM6S9GO3mJHM5cGb6dJGbT2QLzWMqsHR=s68-c-k-c0x00ffffff-no-rj',
    color: '#FF6B35',
    emoji: '🎬',
    category: 'Bangla',
  },
  {
    id: 'UCq-Fj5C5MacJvxTMTSoO8aw',
    name: 'Eagle Movies',
    logo: 'https://yt3.googleusercontent.com/ytc/AIdro_l2knNzq2XVUZOFgE_MdG9pnOvGHnMBIb2Xiqz3=s68-c-k-c0x00ffffff-no-rj',
    color: '#FFD700',
    emoji: '🍿',
    category: 'Bangla',
  },
  {
    id: 'UCiH0iUjl3PO5_SctD5PukxQ',
    name: 'Chorki',
    logo: 'https://yt3.googleusercontent.com/ytc/AIdro_nSq4S4y4Y4gLmVOGqS5QdA1iMeH3MvfxDPjX3F=s68-c-k-c0x00ffffff-no-rj',
    color: '#E91E63',
    emoji: '⚡',
    category: 'Bangla',
  },
  {
    id: 'UCtTL0ib0C9mOOm4a9PQfQ0A',
    name: 'BongoBD',
    logo: 'https://yt3.googleusercontent.com/ytc/AIdro_kfuP6q8y4gMFkIHjzOqCq4QGfkOFDZwY8eGvQP=s68-c-k-c0x00ffffff-no-rj',
    color: '#00BCD4',
    emoji: '📺',
    category: 'Bangla',
  },
]

// ── RSS XML Parser ────────────────────────────────────────────
// Parses YouTube RSS XML into structured RSSVideoItem[]
// Uses DOMParser on client, or manual string parsing on server

/**
 * Parse a YouTube RSS XML string into an array of RSSVideoItem.
 * Works both client-side (DOMParser) and server-side (regex fallback).
 */
export function parseYouTubeRSS(xml: string, channelId: string, channelName: string): RSSVideoItem[] {
  const items: RSSVideoItem[] = []

  // Try DOMParser first (client-side / modern runtimes)
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(xml, 'text/xml')
      const entries = doc.querySelectorAll('entry')

      entries.forEach(entry => {
        const videoId = entry.querySelector('id')?.textContent?.replace('yt:video:', '') || ''
        const title = entry.querySelector('title')?.textContent?.trim() || ''
        const link = entry.querySelector('link[href]')?.getAttribute('href') || ''
        const published = entry.querySelector('published')?.textContent || ''
        const thumbnail = entry.querySelector('media\\:thumbnail, thumbnail')?.getAttribute('url') || ''
        const description = entry.querySelector('media\\:description, description')?.textContent?.trim() || ''

        if (videoId && title) {
          items.push({
            videoId,
            title,
            thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            channelName,
            channelId,
            publishedAt: published,
            description: description.substring(0, 300),
          })
        }
      })

      if (items.length > 0) return items
    } catch {
      // DOMParser failed — fall through to regex parser
    }
  }

  // Fallback: regex-based XML parsing (server-side safe)
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g
  let match: RegExpExecArray | null

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1]

    const idMatch = block.match(/<id[^>]*>yt:video:([^<]+)<\/id>/)
    const titleMatch = block.match(/<title[^>]*>([^<]+)<\/title>/)
    const publishedMatch = block.match(/<published[^>]*>([^<]+)<\/published>/)
    const thumbMatch = block.match(/<media:thumbnail[^>]*url="([^"]+)"/)
      || block.match(/<thumbnail[^>]*url="([^"]+)"/)
    const descMatch = block.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>/)
      || block.match(/<description[^>]*>([\s\S]*?)<\/description>/)

    const videoId = idMatch?.[1] || ''
    const title = titleMatch?.[1]?.trim() || ''
    const published = publishedMatch?.[1] || ''
    const thumbnail = thumbMatch?.[1] || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    const description = descMatch?.[1]?.trim()?.substring(0, 300) || ''

    if (videoId && title) {
      items.push({
        videoId,
        title,
        thumbnail,
        channelName,
        channelId,
        publishedAt: published,
        description,
      })
    }
  }

  return items
}

// ── Server-side Fetch via API Route ───────────────────────────
// We use our own API route to proxy RSS feeds (avoids CORS)
// Client calls: /api/movies/rss?channel_id=UC...
// API route fetches YouTube RSS server-side, returns parsed JSON

const RSS_API_ROUTE = '/api/movies/rss'

/**
 * Fetch videos for a single channel via our API route.
 * Returns parsed RSSVideoItem[] or empty array on failure.
 */
export async function fetchChannelRSS(
  channel: YouTubeChannel,
  maxItems = 15,
): Promise<RSSVideoItem[]> {
  try {
    const url = `${RSS_API_ROUTE}?channel_id=${channel.id}&max=${maxItems}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000), // 8s timeout per channel
    })

    if (!res.ok) return []

    const data = await res.json()
    return Array.isArray(data?.videos) ? data.videos : []
  } catch {
    return []
  }
}

/**
 * Fetch videos from ALL channels in parallel, merge into master feed.
 * Sorted chronologically (newest first).
 * Returns ChannelFeedResult with combined videos.
 */
export async function fetchAllChannelsRSS(
  channels: YouTubeChannel[] = YOUTUBE_CHANNELS,
  perChannel = 15,
): Promise<ChannelFeedResult> {
  // Fetch all channels in parallel
  const results = await Promise.allSettled(
    channels.map(async (ch) => {
      const videos = await fetchChannelRSS(ch, perChannel)
      return { channel: ch, videos }
    })
  )

  // Merge successful results
  const allVideos: RSSVideoItem[] = []
  const now = Date.now()

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.videos.length > 0) {
      allVideos.push(...result.value.videos)
    }
  })

  // Sort by publishedAt descending (newest first)
  allVideos.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime()
    const dateB = new Date(b.publishedAt).getTime()
    return dateB - dateA
  })

  return {
    channel: { id: 'all', name: 'All Channels', logo: '', color: '#7C3AED', emoji: '🌍', category: 'All' },
    videos: allVideos,
    fetchedAt: now,
  }
}

/**
 * Filter RSSVideoItem[] by channel ID.
 * Returns only videos from the specified channel.
 */
export function filterByChannel(videos: RSSVideoItem[], channelId: string): RSSVideoItem[] {
  if (channelId === 'all') return videos
  return videos.filter(v => v.channelId === channelId)
}

/**
 * Search RSSVideoItem[] by title (case-insensitive).
 */
export function searchRSSVideos(videos: RSSVideoItem[], query: string): RSSVideoItem[] {
  if (!query.trim()) return videos
  const q = query.toLowerCase()
  return videos.filter(
    v => v.title.toLowerCase().includes(q) || v.channelName.toLowerCase().includes(q)
  )
}
