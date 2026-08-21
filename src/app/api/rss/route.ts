// ── Play Nexa RSS Proxy API ──────────────────────────────────
// Fetches YouTube RSS feeds server-side (avoids CORS issues)
// Caches for 1 hour via Next.js revalidation
// Zero paid API keys — public RSS feeds only
// Returns 200 with empty array on error to prevent UI crashes

import { NextRequest, NextResponse } from 'next/server'

interface VideoItem {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
  description: string
  viewCount: number
  channelId: string
}

function parseYouTubeRSS(xml: string, channelId: string): VideoItem[] {
  const videos: VideoItem[] = []

  // Extract all <entry> blocks from Atom feed
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]

    // Extract video ID from yt:videoId
    const videoIdMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)
    // Extract title (first <title> in entry is the video title)
    const titleMatch = entry.match(/<title>(.*?)<\/title>/)
    // Extract published date
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/)
    // Extract thumbnail from media:group media:thumbnail
    const thumbMatch = entry.match(/url="(https:\/\/i\.ytimg\.com[^"]+)"/)
    // Extract description from media:description
    const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)
    // Extract view count from media:statistics
    const viewMatch = entry.match(/<media:statistics views="(\d+)"/)

    if (videoIdMatch && titleMatch) {
      const videoId = videoIdMatch[1].trim()
      videos.push({
        id: videoId,
        title: titleMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim(),
        thumbnail: thumbMatch?.[1] ||
          `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt: publishedMatch?.[1] || '',
        description: descMatch?.[1]?.trim() || '',
        viewCount: viewMatch ? parseInt(viewMatch[1]) : 0,
        channelId,
      })
    }
  }

  return videos
}

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get('channelId')

  if (!channelId) {
    return NextResponse.json(
      { error: 'channelId required' },
      { status: 400 }
    )
  }

  // Validate channel ID format: UC + 22 characters
  if (!/^UC[\w-]{22}$/.test(channelId)) {
    return NextResponse.json(
      { error: 'Invalid channelId format', videos: [] },
      { status: 200 } // Return 200 with empty array to not crash UI
    )
  }

  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`

  try {
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlayNexa/1.0)',
        'Accept': 'application/xml, text/xml, */*',
      },
      next: { revalidate: 3600 }, // Cache 1 hour on server
    })

    if (!res.ok) throw new Error(`RSS fetch failed with status ${res.status}`)

    const xmlText = await res.text()

    // Verify it looks like valid XML before parsing
    if (!xmlText.includes('<entry>') && !xmlText.includes('<?xml')) {
      throw new Error('Invalid RSS response')
    }

    const videos = parseYouTubeRSS(xmlText, channelId)

    return NextResponse.json({ videos }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    // Return 200 with empty videos array — UI handles gracefully
    console.error(`[RSS Proxy] Failed for channel ${channelId}:`, err)
    return NextResponse.json(
      { error: 'Failed to fetch RSS', videos: [] },
      { status: 200 }
    )
  }
}
