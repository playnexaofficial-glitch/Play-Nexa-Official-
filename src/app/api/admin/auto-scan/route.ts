import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { GoogleGenerativeAI } from '@google/generative-ai'

function parseRSS(xml: string) {
  const videos: any[] = []
  const regex = /<entry>([\s\S]*?)<\/entry>/g
  const chId = xml.match(/<yt:channelId>(.*?)<\/yt:channelId>/)?.[1]
  const chName = xml.match(/<author>\s*<name>(.*?)<\/name>/)?.[1]
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
      publishedAt: pub || new Date().toISOString(),
      viewCount: views ? parseInt(views) : 0,
      channelId: chId?.trim() || '',
      channelName: chName?.trim() || '',
      description: '',
    })
  }
  return videos
}

function fallbackClassify(
  title: string,
  description: string,
  _channelName: string
): { type: string; confidence: number } {
  const text = `${title} ${description}`.toLowerCase()

  const skipWords = [
    'trailer',
    'teaser',
    '#shorts',
    'shorts',
    'making of',
    'interview',
    'promo',
    'preview',
    'behind the scenes',
    'official trailer',
    'clip',
    'sneak peek',
  ]
  if (skipWords.some((w) => text.includes(w)))
    return { type: 'skip', confidence: 0.9 }

  const musicWords = [
    'official song',
    'official audio',
    'music video',
    'lyrics',
    'audio song',
    'new song',
    'full song',
    'official music',
    'lyric video',
  ]
  if (musicWords.some((w) => text.includes(w)))
    return { type: 'music', confidence: 0.85 }

  const movieWords = [
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
    'full drama',
    'full episode',
  ]
  if (movieWords.some((w) => text.includes(w)))
    return { type: 'movie', confidence: 0.85 }

  return { type: 'skip', confidence: 0.5 }
}

async function classifyVideo(
  title: string,
  description: string,
  channelName: string
): Promise<{ type: string; confidence: number }> {
  const fb = fallbackClassify(title, description, channelName)
  if (fb.confidence >= 0.85) return fb

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return fb

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const res = await model.generateContent(
      `Classify this YouTube video.
Title: "${title}"
Description: "${description.slice(0, 150)}"
Channel: "${channelName}"
Reply ONLY JSON: {"type":"movie","confidence":0.9}
Options: movie | music | skip
movie = full movie,natok,drama,web series,film
music = song,music video,audio
skip = trailer,teaser,shorts,interview,clip`
    )
    const text = res.response.text()
    const json = text.match(/\{[\s\S]*?\}/)
    if (!json) return fb
    const parsed = JSON.parse(json[0])
    return {
      type: parsed.type || 'skip',
      confidence: parsed.confidence || 0.5,
    }
  } catch {
    return fb
  }
}

async function fetchChannelVideos(
  channel_id: string,
  channel_name: string
): Promise<any[]> {
  const allVideos: any[] = []
  const seenIds = new Set<string>()

  const rssUrls = [
    // Standard channel feed
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channel_id}`,
    // Uploads playlist (UU prefix)
    `https://www.youtube.com/feeds/videos.xml?playlist_id=UU${channel_id.slice(2)}`,
  ]

  for (const url of rssUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible)',
          'Accept': 'application/xml,*/*',
        },
        signal: AbortSignal.timeout(12000),
        cache: 'no-store',
      })

      if (!res.ok) continue
      const xml = await res.text()
      if (!xml.includes('<entry>')) continue

      const videos = parseRSS(xml)
      for (const v of videos) {
        if (!seenIds.has(v.videoId)) {
          seenIds.add(v.videoId)
          allVideos.push(v)
        }
      }

      console.log(`[SCAN] ${url} → ${videos.length} videos`)
    } catch (e: any) {
      console.log('[SCAN RSS] Error:', e.message)
      continue
    }
  }

  console.log(`[SCAN] Total unique: ${allVideos.length}`)
  return allVideos
}

async function runBatch(channel: any) {
  if (!supabaseAdmin) return
  const channelId = channel.id
  let moviesAdded = 0
  let musicAdded = 0
  let skipped = 0

  try {
    const scannedIds: string[] = channel.scanned_video_ids || []

    const allVideos = await fetchChannelVideos(channel.channel_id, channel.channel_name)

    const newVideos = allVideos.filter((v) => !scannedIds.includes(v.videoId))

    if (newVideos.length === 0) {
      await supabaseAdmin
        .from('yt_channels')
        .update({
          scan_status: 'completed',
          total_videos_on_channel: scannedIds.length,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', channelId)
      return
    }

    await supabaseAdmin
      .from('yt_channels')
      .update({
        total_videos_on_channel: scannedIds.length + newVideos.length,
      })
      .eq('id', channelId)

    const processedIds = [...scannedIds]

    for (let i = 0; i < newVideos.length; i++) {
      const video = newVideos[i]

      const { data: cur } = await supabaseAdmin
        .from('yt_channels')
        .select('scan_status')
        .eq('id', channelId)
        .single()

      if (cur?.scan_status !== 'scanning') {
        await supabaseAdmin
          .from('yt_channels')
          .update({
            scanned_video_ids: processedIds,
            videos_imported:
              (channel.videos_imported || 0) + moviesAdded + musicAdded,
          })
          .eq('id', channelId)
        return
      }

      if (i > 0 && i % 14 === 0) {
        await new Promise((r) => setTimeout(r, 4000))
      }

      const result = await classifyVideo(
        video.title,
        video.description || '',
        channel.channel_name
      )

      processedIds.push(video.videoId)

      const channelType = channel.channel_type || 'movies'

      // CRITICAL ROUTING:
      // movie classification → movies table
      // music classification → music_tracks table
      // NEVER cross-contaminate tables

      const insertAsMovie =
        result.type === 'movie' &&
        result.confidence >= 0.55 &&
        (channelType === 'movies' || channelType === 'mixed')

      const insertAsMusic =
        result.type === 'music' &&
        result.confidence >= 0.55 &&
        (channelType === 'music' || channelType === 'mixed')

      if (insertAsMovie) {
        const { error } = await supabaseAdmin.from('movies').insert([
          {
            youtube_id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            channel_name: channel.channel_name,
            channel_id: channel.channel_id,
            description: video.description || '',
            published_at: video.publishedAt,
            view_count: video.viewCount || 0,
            source_channel_id: channelId,
            is_hidden: false,
          },
        ])
        if (!error) {
          moviesAdded++
          await supabaseAdmin.from('channel_display').upsert(
            [
              {
                channel_id: channel.channel_id,
                display_name: channel.channel_name,
                logo_url: channel.channel_avatar || '',
                badge_color: '#7C3AED',
                border_color: '#7C3AED',
                is_visible: true,
                sort_order: 0,
              },
            ],
            {
              onConflict: 'channel_id',
            }
          )
        } else if (error.code === '23505') {
          // Already exists — skip, still mark as scanned
          console.log('[SCAN] Duplicate skipped:', video.videoId)
        } else {
          console.error('[SCAN] Insert error:', error.message)
        }
      } else if (insertAsMusic) {
        const { error } = await supabaseAdmin.from('music_tracks').insert([
          {
            youtube_id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            channel_name: channel.channel_name,
            channel_id: channel.channel_id,
            description: video.description || '',
            published_at: video.publishedAt,
            view_count: video.viewCount || 0,
            source_channel_id: channelId,
            is_hidden: false,
          },
        ])
        if (!error) musicAdded++
        else if (error.code === '23505') {
          // Already exists — skip, still mark as scanned
          console.log('[SCAN] Duplicate skipped:', video.videoId)
        } else {
          console.error('[SCAN] Insert error:', error.message)
        }
      } else {
        skipped++
      }

      if (i % 5 === 0 || i === newVideos.length - 1) {
        const newImported =
          (channel.videos_imported || 0) + moviesAdded + musicAdded
        await supabaseAdmin
          .from('yt_channels')
          .update({
            scanned_video_ids: processedIds,
            videos_imported: newImported,
            scan_batch: (channel.scan_batch || 0) + 1,
          })
          .eq('id', channelId)
      }
    }

    const mightHaveMore = allVideos.length >= 15

    await supabaseAdmin
      .from('yt_channels')
      .update({
        scan_status: mightHaveMore ? 'scanning' : 'completed',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', channelId)
  } catch (err: any) {
    console.error('[SCAN]', err.message)
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('yt_channels')
        .update({ scan_status: 'idle' })
        .eq('id', channelId)
    }
  }
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin not configured' },
      { status: 500 }
    )
  }

  const { channelDbId, action } = await req.json()

  if (!channelDbId) {
    return NextResponse.json(
      { error: 'channelDbId required' },
      { status: 400 }
    )
  }

  const { data: channel } = await supabaseAdmin
    .from('yt_channels')
    .select('*')
    .eq('id', channelDbId)
    .single()

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  if (action === 'pause') {
    await supabaseAdmin
      .from('yt_channels')
      .update({ scan_status: 'paused' })
      .eq('id', channelDbId)
    return NextResponse.json({ success: true, status: 'paused' })
  }

  if (action === 'stop') {
    await supabaseAdmin
      .from('yt_channels')
      .update({
        scan_status: 'idle',
        scan_batch: 0,
        scanned_video_ids: [],
        videos_imported: 0,
        total_videos_on_channel: 0,
      })
      .eq('id', channelDbId)
    return NextResponse.json({ success: true, status: 'stopped' })
  }

  if (action === 'start' || action === 'resume') {
    await supabaseAdmin
      .from('yt_channels')
      .update({ scan_status: 'scanning' })
      .eq('id', channelDbId)
    runBatch(channel).catch(console.error)
    return NextResponse.json({ success: true, status: 'scanning' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
