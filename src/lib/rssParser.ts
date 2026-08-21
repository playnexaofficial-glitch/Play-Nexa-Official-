// ── Play Nexa — YouTube RSS Parser ────────────────────────────
// Fetches and parses YouTube channel RSS feeds
// No API key required — uses YouTube's public RSS endpoint
// Handles UC... channel IDs only (channel-info route resolves @handles)
// Enhanced: tries uploads playlist (UC→UU) to get more than 15 videos
// Deduplicates videos across RSS + playlist fetch
// Exports parseRSSXML for use by other modules

export interface RSSVideo {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  description: string
  viewCount: number
  channelName: string
  channelId: string
}

/**
 * Standard RSS fetch — returns up to 15 most recent videos.
 * YouTube RSS has a hard limit of 15 entries per feed.
 * channelId must be a UC... format channel ID.
 */
export async function fetchChannelRSS(
  channelId: string
): Promise<RSSVideo[]> {
  const url =
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`

  try {
    console.log('[RSS Parser] Fetching:', url)
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      throw new Error(`RSS fetch failed: HTTP ${res.status}`)
    }

    const xml = await res.text()
    if (!xml.includes('<entry>')) {
      console.log('[RSS Parser] No entries found in RSS feed')
      return []
    }

    return parseRSSXML(xml)
  } catch (err: any) {
    throw new Error(
      `RSS fetch failed for channel: ${channelId}. ${err.message}`
    )
  }
}

/**
 * Enhanced fetcher — tries multiple methods to get more videos:
 * 1. Standard RSS (15 videos max)
 * 2. Uploads playlist RSS (UC→UU conversion, another 15 videos)
 * Deduplicates by videoId across both sources.
 */
export async function fetchChannelVideosEnhanced(
  channelId: string
): Promise<RSSVideo[]> {
  const allVideos: RSSVideo[] = []
  const seenIds = new Set<string>()

  // Method 1: Standard RSS
  try {
    const rssVideos = await fetchChannelRSS(channelId)
    for (const v of rssVideos) {
      if (!seenIds.has(v.videoId)) {
        seenIds.add(v.videoId)
        allVideos.push(v)
      }
    }
    console.log('[RSS Parser] Standard RSS:', rssVideos.length, 'videos')
  } catch (err: any) {
    console.log('[RSS Parser] Standard RSS failed:', err.message)
  }

  // Method 2: Uploads playlist RSS
  // YouTube's uploads playlist ID = UC channel ID with "UU" prefix
  // e.g. UCqzdYl5MkJwhse_kSt0bgcg → UUqzdYl5MkJwhse_kSt0bgcg
  if (channelId.startsWith('UC')) {
    const playlistId = 'UU' + channelId.slice(2)
    try {
      const playlistUrl =
        `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`

      console.log('[RSS Parser] Trying uploads playlist:', playlistId)
      const res = await fetch(playlistUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok) {
        const xml = await res.text()
        if (xml.includes('<entry>')) {
          const playlistVideos = parseRSSXML(xml)
          let added = 0
          for (const v of playlistVideos) {
            if (!seenIds.has(v.videoId)) {
              seenIds.add(v.videoId)
              allVideos.push(v)
              added++
            }
          }
          console.log(
            '[RSS Parser] Playlist RSS:',
            playlistVideos.length,
            'fetched,',
            added,
            'new (deduped)'
          )
        }
      }
    } catch (err: any) {
      console.log('[RSS Parser] Playlist RSS failed:', err.message)
    }
  }

  console.log(
    '[RSS Parser] Enhanced total:',
    allVideos.length,
    'unique videos'
  )
  return allVideos
}

/**
 * Parse YouTube RSS XML into structured RSSVideo objects.
 * Handles HTML entities, missing fields, and edge cases.
 * Extracts the real UC... channel ID from <yt:channelId> tag.
 * Exported for use by other modules (e.g. gemini-scan fallback).
 */
export function parseRSSXML(xml: string): RSSVideo[] {
  const videos: RSSVideo[] = []

  // Extract channel-level metadata
  const channelIdMatch = xml.match(
    /<yt:channelId>(.*?)<\/yt:channelId>/
  )
  const channelNameMatch = xml.match(
    /<author>\s*<name>(.*?)<\/name>/
  )

  const channelId = channelIdMatch?.[1]?.trim() || ''
  const channelName = channelNameMatch?.[1]?.trim() || ''

  // Decode common HTML entities
  const decode = (s: string) =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&apos;/g, "'")

  // Match each <entry> block
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]

    const videoIdMatch = entry.match(
      /<yt:videoId>(.*?)<\/yt:videoId>/
    )
    const titleMatch = entry.match(/<title>(.*?)<\/title>/)
    const publishedMatch = entry.match(
      /<published>(.*?)<\/published>/
    )
    const thumbMatch = entry.match(
      /url="(https:\/\/i\.ytimg\.com[^"]+)"/
    )
    const descMatch = entry.match(
      /<media:description>([\s\S]*?)<\/media:description>/
    )
    const viewMatch = entry.match(
      /<media:statistics views="(\d+)"/
    )

    if (!videoIdMatch || !titleMatch) continue

    const videoId = videoIdMatch[1].trim()

    videos.push({
      videoId,
      title: decode(titleMatch[1]).trim(),
      thumbnail:
        thumbMatch?.[1] ||
        `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      publishedAt: publishedMatch?.[1] || new Date().toISOString(),
      description: descMatch?.[1]?.trim().slice(0, 500) || '',
      viewCount: viewMatch ? parseInt(viewMatch[1]) : 0,
      channelName: decode(channelName),
      channelId,
    })
  }

  console.log(`[RSS Parser] Parsed ${videos.length} videos`)
  return videos
}
