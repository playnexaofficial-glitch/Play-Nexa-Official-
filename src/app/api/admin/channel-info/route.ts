import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Try multiple RSS URL formats
async function tryAllRSSFormats(
  channelId: string | null,
  handle: string | null
): Promise<{
  channelId: string
  name: string
  videoCount: number
  xml: string
} | null> {
  const urls: string[] = []

  if (channelId) {
    urls.push(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
    )
    // UU playlist (uploads playlist)
    urls.push(
      `https://www.youtube.com/feeds/videos.xml?playlist_id=UU${channelId.slice(2)}`
    )
  }

  if (handle) {
    urls.push(
      `https://www.youtube.com/feeds/videos.xml?user=${handle}`
    )
  }

  for (const url of urls) {
    try {
      console.log('[RSS] Trying:', url)
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'application/xml,text/xml,*/*',
        },
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      })

      if (!res.ok) {
        console.log('[RSS] Status:', res.status, url)
        continue
      }

      const xml = await res.text()

      if (!xml.includes('<entry>') && !xml.includes('<feed')) {
        console.log('[RSS] No entries in:', url)
        continue
      }

      const idMatch = xml.match(/<yt:channelId>(UC[\w-]+)<\/yt:channelId>/)
      const nameMatch = xml.match(/<author>\s*<name>(.*?)<\/name>/)
      const count = (xml.match(/<entry>/g) || []).length

      console.log('[RSS] Success! Videos:', count)

      return {
        channelId: idMatch?.[1] || channelId || '',
        name: nameMatch?.[1]?.trim() || 'Unknown',
        videoCount: count,
        xml,
      }
    } catch (e: any) {
      console.log('[RSS] Error:', e.message, url)
      continue
    }
  }
  return null
}

// Scrape YouTube page for channel ID
async function scrapeChannelId(
  handle: string
): Promise<{
  channelId: string
  name: string
} | null> {
  const urlsToTry = [
    `https://www.youtube.com/@${handle}`,
    `https://www.youtube.com/c/${handle}`,
    `https://www.youtube.com/user/${handle}`,
  ]

  for (const pageUrl of urlsToTry) {
    try {
      console.log('[SCRAPE] Trying:', pageUrl)
      const res = await fetch(pageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      })

      if (!res.ok) continue
      const html = await res.text()

      const patterns = [
        /"channelId":"(UC[\w-]{20,})"/,
        /"externalId":"(UC[\w-]{20,})"/,
        /"browseId":"(UC[\w-]{20,})"/,
        /\/channel\/(UC[\w-]{20,})/,
      ]

      let foundId: string | null = null
      for (const p of patterns) {
        const m = html.match(p)
        if (m?.[1]) {
          foundId = m[1]
          break
        }
      }

      if (!foundId) continue

      // Try to get channel name
      const namePatterns = [
        /"title":"([^"]+)","description"/,
        /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i,
        /"channelMetadataRenderer":\{"title":"([^"]+)"/,
      ]

      let foundName = handle
      for (const p of namePatterns) {
        const m = html.match(p)
        if (m?.[1] && m[1].length < 100) {
          foundName = m[1].trim()
          break
        }
      }

      console.log('[SCRAPE] Found:', foundId, foundName)
      return { channelId: foundId, name: foundName }
    } catch (e: any) {
      console.log('[SCRAPE] Error:', e.message)
      continue
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  const rawInput = req.nextUrl.searchParams.get('id') || ''

  if (!rawInput.trim()) {
    return NextResponse.json(
      { error: 'No channel URL provided' },
      { status: 400 }
    )
  }

  // Clean URL — remove ALL query params
  let clean = rawInput.trim()
  try {
    const u = new URL(clean)
    clean = u.origin + u.pathname
  } catch {
    clean = clean.split('?')[0].trim()
  }
  clean = clean.replace(/\/$/, '')
  console.log('[channel-info] Input:', clean)

  // Extract channel identifier
  let channelId: string | null = null
  let handle: string | null = null

  // /channel/UC...
  const ucM = clean.match(/\/channel\/(UC[\w-]{10,})/)
  if (ucM) channelId = ucM[1]

  // /@handle
  if (!channelId) {
    const atM = clean.match(/\/@([\w.-]+)/)
    if (atM) handle = atM[1]
  }

  // /c/name or /user/name
  if (!channelId && !handle) {
    const cM = clean.match(/\/(?:c|user)\/([\w.-]+)/)
    if (cM) handle = cM[1]
  }

  // Plain UC... ID
  if (!channelId && !handle && /^UC[\w-]{20,}$/.test(clean)) {
    channelId = clean
  }

  // Plain handle or @handle
  if (!channelId && !handle) {
    handle = clean.replace(/^@/, '').trim()
    if (handle.includes('/') || handle.includes('.com')) {
      handle = null
    }
  }

  console.log(
    '[channel-info] channelId:',
    channelId,
    'handle:',
    handle
  )

  if (!channelId && !handle) {
    return NextResponse.json(
      {
        error:
          'Cannot extract channel ID. Use: youtube.com/@channelname',
      },
      { status: 400 }
    )
  }

  // Try RSS first
  let rssResult = await tryAllRSSFormats(channelId, handle)

  // If RSS failed and we have handle, scrape
  if (!rssResult && handle) {
    const scraped = await scrapeChannelId(handle)
    if (scraped) {
      channelId = scraped.channelId
      // Try RSS again with real channelId
      rssResult = await tryAllRSSFormats(channelId, null)
      if (!rssResult) {
        // Channel found via scrape but RSS empty
        // Return the scraped info with 0 videos
        // (scan will still work via different method)
        rssResult = {
          channelId: scraped.channelId,
          name: scraped.name,
          videoCount: 0,
          xml: '',
        }
      }
    }
  }

  // If channelId found but no RSS, return minimal
  if (!rssResult && channelId) {
    rssResult = {
      channelId,
      name: handle || channelId.slice(0, 15),
      videoCount: 0,
      xml: '',
    }
  }

  if (!rssResult) {
    return NextResponse.json(
      {
        error:
          'Channel not found. Please try: youtube.com/@channelname',
      },
      { status: 404 }
    )
  }

  const avatar = rssResult.channelId
    ? `https://unavatar.io/youtube/` + rssResult.channelId
    : null

  return NextResponse.json({
    success: true,
    name: rssResult.name,
    channelId: rssResult.channelId,
    avatar,
    videoCount: rssResult.videoCount,
    hasVideos: rssResult.videoCount > 0,
  })
}
