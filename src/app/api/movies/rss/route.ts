// ── Play Nexa RSS Feed Proxy API Route ──────────────────────────
// Fetches YouTube RSS XML server-side (avoids CORS)
// Parses XML → JSON using regex (no external XML libraries needed)
// Returns { videos: RSSVideoItem[] } or { error: string }
// 10-second server timeout, 15 items max per channel

import { NextRequest, NextResponse } from 'next/server'

interface ParsedVideo {
  videoId: string
  title: string
  thumbnail: string
  channelName: string
  channelId: string
  publishedAt: string
  description: string
}

/**
 * Parse YouTube RSS XML using regex (server-side, no DOMParser needed).
 * Extracts video entries from Atom-formatted YouTube RSS feeds.
 */
function parseRSSXML(xml: string, channelId: string): ParsedVideo[] {
  const items: ParsedVideo[] = []

  // Extract channel name from feed <title>
  const feedTitleMatch = xml.match(/<title[^>]*>([^<]+)<\/title>/)
  const channelName = feedTitleMatch?.[1]?.trim() || 'Unknown Channel'

  // Extract each <entry> block
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g
  let match: RegExpExecArray | null

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1]

    // Extract video ID: <id>yt:video:VIDEO_ID</id>
    const idMatch = block.match(/<id[^>]*>yt:video:([^<]+)<\/id>/)
    // Extract title (may be in <title type="text">)
    const titleMatch = block.match(/<title[^>]*>([^<]+)<\/title>/)
    // Extract publish date
    const publishedMatch = block.match(/<published[^>]*>([^<]+)<\/published>/)
    // Extract thumbnail URL from media:thumbnail
    const thumbMatch = block.match(/<media:thumbnail[^>]*url="([^"]+)"/)
    // Extract description from media:group/media:description
    const descMatch = block.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>/)

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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const channelId = searchParams.get('channel_id')
  const maxItems = Math.min(parseInt(searchParams.get('max') || '15'), 25)

  if (!channelId) {
    return NextResponse.json(
      { error: 'Missing channel_id parameter' },
      { status: 400 }
    )
  }

  // Validate channel ID format (starts with UC, 24 chars)
  if (!/^UC[\w-]{22}$/.test(channelId)) {
    return NextResponse.json(
      { error: 'Invalid channel_id format' },
      { status: 400 }
    )
  }

  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`

  try {
    // Fetch RSS XML from YouTube server-side (no CORS)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PlayNexa/1.0 (RSS Feed Reader)',
        'Accept': 'application/atom+xml, application/xml, text/xml',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes on server
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return NextResponse.json(
        { error: `YouTube returned ${response.status}`, videos: [] },
        { status: 502 }
      )
    }

    const xml = await response.text()

    // Parse XML to structured JSON
    const videos = parseRSSXML(xml, channelId).slice(0, maxItems)

    return NextResponse.json({
      videos,
      channelId,
      count: videos.length,
      fetchedAt: Date.now(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'RSS fetch failed'
    return NextResponse.json(
      { error: message, videos: [] },
      { status: 504 }
    )
  }
}
