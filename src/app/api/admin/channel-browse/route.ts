import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

function parseRSS(xml: string) {
  const videos: any[] = []
  const regex = /<entry>([\s\S]*?)<\/entry>/g
  const chIdM = xml.match(/<yt:channelId>(.*?)<\/yt:channelId>/)
  const chNameM = xml.match(/<author>\s*<name>(.*?)<\/name>/)
  let m
  while ((m = regex.exec(xml)) !== null) {
    const e = m[1]
    const vidId = e.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1]
    const title = e.match(/<title>(.*?)<\/title>/)?.[1]
      ?.replace(/&amp;/g, '&')
      ?.replace(/&lt;/g, '<')
      ?.replace(/&gt;/g, '>')
      ?.trim()
    const pub = e.match(/<published>(.*?)<\/published>/)?.[1]
    const thumb = e.match(/url="(https:\/\/i\.ytimg\.com[^"]+)"/)?.[1]
    const views = e.match(/<media:statistics views="(\d+)"/)?.[1]
    if (!vidId || !title) continue
    videos.push({
      videoId: vidId.trim(),
      title,
      thumbnail: thumb || `https://i.ytimg.com/vi/${vidId}/mqdefault.jpg`,
      publishedAt: pub,
      viewCount: views ? parseInt(views) : 0,
      channelId: chIdM?.[1]?.trim() || '',
      channelName: chNameM?.[1]?.trim() || 'Unknown',
    })
  }
  return videos
}

export async function POST(req: NextRequest) {
  try {
    const { channelUrl, searchQuery } = await req.json()
    if (!channelUrl?.trim() && !searchQuery) {
      return NextResponse.json(
        { error: 'Channel URL required' },
        { status: 400 }
      )
    }

    if (!channelUrl?.trim()) {
      return NextResponse.json(
        { error: 'Channel URL required' },
        { status: 400 }
      )
    }

    let clean = channelUrl.trim().split('?')[0]
    let channelId: string | null = null
    let handle: string | null = null

    const ucM = clean.match(/\/channel\/(UC[\w-]{10,})/)
    if (ucM) channelId = ucM[1]

    if (!channelId) {
      const hM = clean.match(/\/@([\w.-]+)/)
      if (hM) handle = hM[1]
    }

    if (!channelId && !handle) {
      const cM = clean.match(/\/(?:c|user)\/([\w.-]+)/)
      if (cM) handle = cM[1]
    }

    if (!channelId && !handle) {
      if (clean.startsWith('UC')) channelId = clean
      else handle = clean.replace('@', '').trim()
    }

    let xml = ''
    let realChannelId = channelId || ''
    let channelName = handle || 'Channel'
    let channelAvatar = ''

    const rssUrls: string[] = []
    if (channelId) {
      rssUrls.push(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
      )
    }
    if (handle) {
      rssUrls.push(
        `https://www.youtube.com/feeds/videos.xml?user=${handle}`
      )
    }

    for (const url of rssUrls) {
      try {
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000),
        })
        if (!r.ok) continue
        const text = await r.text()
        if (!text.includes('<entry>')) continue
        xml = text
        const idM = text.match(/<yt:channelId>(UC[\w-]+)<\/yt:channelId>/)
        if (idM) realChannelId = idM[1]
        const nM = text.match(/<author>\s*<name>(.*?)<\/name>/)
        if (nM) channelName = nM[1].trim()
        break
      } catch {
        continue
      }
    }

    if (!xml && handle) {
      try {
        const pr = await fetch(`https://www.youtube.com/@${handle}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          },
          signal: AbortSignal.timeout(10000),
        })
        if (pr.ok) {
          const html = await pr.text()
          const idM = html.match(/"channelId":"(UC[\w-]{20,})"/)
          if (idM?.[1]) {
            realChannelId = idM[1]
            const rr = await fetch(
              `https://www.youtube.com/feeds/videos.xml?channel_id=${realChannelId}`,
              {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(8000),
              }
            )
            if (rr.ok) xml = await rr.text()
          }
        }
      } catch {}
    }

    if (!xml) {
      return NextResponse.json(
        {
          error:
            'Could not load channel. Try: youtube.com/@channelname or youtube.com/channel/UC...',
        },
        { status: 404 }
      )
    }

    const videos = parseRSS(xml)
    if (realChannelId) {
      channelAvatar = `https://unavatar.io/youtube/${realChannelId}`
    }

    // Get already imported youtube_ids
    const [{ data: moviIds }, { data: musicIds }] = await Promise.all([
      supabaseAdmin.from('movies').select('youtube_id'),
      supabaseAdmin.from('music_tracks').select('youtube_id'),
    ])

    const importedSet = new Set<string>([
      ...(moviIds || []).map((m: any) => m.youtube_id),
      ...(musicIds || []).map((m: any) => m.youtube_id),
    ])

    const filteredVideos = searchQuery?.trim()
      ? videos.filter((v: any) =>
          v.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : videos

    return NextResponse.json({
      success: true,
      channelId: realChannelId,
      channelName,
      channelAvatar,
      videoCount: videos.length,
      videos: filteredVideos.map((v: any) => ({
        ...v,
        isImported: importedSet.has(v.videoId),
      })),
      totalFound: videos.length,
      filtered: filteredVideos.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
