import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

// ─── YouTube API helpers ───

async function getUploadsPlaylistId(
  channelId: string,
  ytKey: string
): Promise<string | null> {
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/` +
      `channels?part=contentDetails` +
      `&id=${channelId}&key=${ytKey}`
    const res = await fetch(url)
    const data = await res.json()
    return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null
  } catch {
    return null
  }
}

async function getPlaylistVideos(
  playlistId: string,
  ytKey: string,
  onProgress?: (count: number) => void
): Promise<any[]> {
  const allItems: any[] = []
  let pageToken = ''
  let page = 0

  do {
    try {
      const url =
        `https://www.googleapis.com/youtube/v3/` +
        `playlistItems?part=snippet` +
        `&playlistId=${playlistId}` +
        `&maxResults=50` +
        `&key=${ytKey}` +
        (pageToken ? `&pageToken=${pageToken}` : '')

      const res = await fetch(url)
      const data = await res.json()

      if (data.error) {
        console.error('[YT API] Error:', data.error.message)
        break
      }

      const items = data.items || []
      for (const item of items) {
        const snippet = item.snippet
        if (!snippet?.resourceId?.videoId) continue
        if (
          snippet.title === 'Private video' ||
          snippet.title === 'Deleted video'
        )
          continue

        allItems.push({
          videoId: snippet.resourceId.videoId,
          title: snippet.title,
          thumbnail:
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${snippet.resourceId.videoId}/mqdefault.jpg`,
          publishedAt: snippet.publishedAt || new Date().toISOString(),
          description: (snippet.description || '').slice(0, 300),
          channelId: snippet.channelId || '',
          channelName: snippet.channelTitle || '',
        })
      }

      page++
      if (onProgress) onProgress(allItems.length)
      pageToken = data.nextPageToken || ''

      // Rate limit: small delay between pages
      if (pageToken) {
        await new Promise((r) => setTimeout(r, 200))
      }
    } catch (e: any) {
      console.error('[YT API] Page error:', e.message)
      break
    }
  } while (pageToken)

  return allItems
}

// ─── Gemini Classifier ───

function fallbackClassify(
  title: string,
  description: string
): { type: 'movie' | 'music' | 'skip'; confidence: number } {
  const text = `${title} ${description}`.toLowerCase()

  const skipWords = [
    'trailer',
    'teaser',
    '#shorts',
    'shorts',
    'interview',
    'promo',
    'preview',
    'clip',
    'behind the scenes',
    'making of',
    'official trailer',
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
    'video song',
    'music album',
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
    'hindi movie',
    'dubbed movie',
    'dubbed full',
  ]
  if (movieWords.some((w) => text.includes(w)))
    return { type: 'movie', confidence: 0.85 }

  return { type: 'skip', confidence: 0.4 }
}

async function classifyBatch(
  videos: any[],
  channelType: string,
  geminiKey: string
): Promise<
  Array<{
    videoId: string
    type: 'movie' | 'music' | 'skip'
    confidence: number
  }>
> {
  const results = []

  // Process in batches of 10 for Gemini
  const BATCH_SIZE = 10
  for (let i = 0; i < videos.length; i += BATCH_SIZE) {
    const batch = videos.slice(i, i + BATCH_SIZE)

    // First pass: fallback classifier
    const needsGemini: any[] = []
    const batchResults: any[] = []

    for (const v of batch) {
      const fb = fallbackClassify(v.title, v.description)
      if (fb.confidence >= 0.8) {
        batchResults.push({
          videoId: v.videoId,
          type: fb.type,
          confidence: fb.confidence,
        })
      } else {
        needsGemini.push(v)
      }
    }

    // Second pass: Gemini for uncertain ones
    if (needsGemini.length > 0 && geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
        })

        const prompt = `Classify these YouTube videos.
Channel type: ${channelType}
${needsGemini
  .map(
    (v, idx) =>
      `${idx + 1}. Title: "${v.title}"\n   Desc: "${v.description.slice(0, 100)}"`
  )
  .join('\n')}

For each, reply with index:type:confidence
Types: movie (full movies/dramas/web series), music (songs/music videos), skip (trailers/shorts/interviews/clips)
Example: 1:movie:0.9
2:music:0.85
3:skip:0.95`

        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const lines = text.trim().split('\n')

        for (const line of lines) {
          const match = line.match(/(\d+):(movie|music|skip):([\d.]+)/)
          if (match) {
            const idx = parseInt(match[1]) - 1
            if (idx >= 0 && idx < needsGemini.length) {
              batchResults.push({
                videoId: needsGemini[idx].videoId,
                type: match[2] as any,
                confidence: parseFloat(match[3]),
              })
            }
          }
        }

        // Fill any unclassified with fallback
        for (const v of needsGemini) {
          if (!batchResults.find((r) => r.videoId === v.videoId)) {
            const fb = fallbackClassify(v.title, v.description)
            batchResults.push({
              videoId: v.videoId,
              type: fb.type,
              confidence: Math.max(fb.confidence, 0.5),
            })
          }
        }
      } catch (e: any) {
        console.error('[Gemini batch]:', e.message)
        // Use fallback for all
        for (const v of needsGemini) {
          const fb = fallbackClassify(v.title, v.description)
          batchResults.push({
            videoId: v.videoId,
            type: fb.type,
            confidence: fb.confidence,
          })
        }
      }
    }

    results.push(...batchResults)

    // Rate limit between Gemini batches
    if (i + BATCH_SIZE < videos.length) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  return results
}

// ─── Main Import Handler ───

// Store progress in memory (per channel)
const importProgress = new Map<
  string,
  {
    status: string
    total: number
    processed: number
    moviesAdded: number
    musicAdded: number
    skipped: number
    duplicates: number
    error?: string
  }
>()

// Internal function, not exported as a Next.js route handler
function getImportProgress(channelDbId: string) {
  return importProgress.get(channelDbId)
}

async function runFullImport(channelDbId: string, channel: any) {
  const ytKey = process.env.YOUTUBE_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (!ytKey) {
    importProgress.set(channelDbId, {
      status: 'error',
      total: 0,
      processed: 0,
      moviesAdded: 0,
      musicAdded: 0,
      skipped: 0,
      duplicates: 0,
      error: 'YOUTUBE_API_KEY not set in .env.local',
    })
    return
  }

  const progress = {
    status: 'fetching_videos',
    total: 0,
    processed: 0,
    moviesAdded: 0,
    musicAdded: 0,
    skipped: 0,
    duplicates: 0,
  }
  importProgress.set(channelDbId, progress)

  try {
    // Step 1: Get uploads playlist ID
    const playlistId = await getUploadsPlaylistId(channel.channel_id, ytKey)

    if (!playlistId) {
      importProgress.set(channelDbId, {
        ...progress,
        status: 'error',
        error:
          'Could not get uploads playlist. Check if channel is public.',
      })
      return
    }

    // Step 2: Fetch ALL videos
    progress.status = 'fetching_videos'
    importProgress.set(channelDbId, { ...progress })

    const allVideos = await getPlaylistVideos(playlistId, ytKey, (count) => {
      progress.total = count
      importProgress.set(channelDbId, { ...progress })
    })

    progress.total = allVideos.length
    progress.status = 'classifying'
    importProgress.set(channelDbId, { ...progress })

    if (allVideos.length === 0) {
      importProgress.set(channelDbId, {
        ...progress,
        status: 'completed',
        error: 'No public videos found.',
      })
      return
    }

    // Step 3: Filter already imported
    const [{ data: existingMovies }, { data: existingMusic }] =
      await Promise.all([
        supabaseAdmin.from('movies').select('youtube_id'),
        supabaseAdmin.from('music_tracks').select('youtube_id'),
      ])

    const existingIds = new Set([
      ...(existingMovies || []).map((m: any) => m.youtube_id),
      ...(existingMusic || []).map((m: any) => m.youtube_id),
    ])

    const newVideos = allVideos.filter((v) => !existingIds.has(v.videoId))
    progress.duplicates = allVideos.length - newVideos.length

    // Step 4: Classify with Gemini
    const classifications = geminiKey
      ? await classifyBatch(
          newVideos,
          channel.channel_type || 'movies',
          geminiKey
        )
      : newVideos.map((v) => ({
          videoId: v.videoId,
          ...fallbackClassify(v.title, v.description || ''),
        }))

    // Step 5: Insert to database
    progress.status = 'importing'
    importProgress.set(channelDbId, { ...progress })

    const channelType = channel.channel_type || 'movies'

    for (let i = 0; i < newVideos.length; i++) {
      const video = newVideos[i]
      const cls = classifications.find((c) => c.videoId === video.videoId) || {
        type: 'skip',
        confidence: 0.5,
      }

      progress.processed = i + 1
      importProgress.set(channelDbId, { ...progress })

      const shouldMovie =
        cls.type === 'movie' &&
        cls.confidence >= 0.5 &&
        (channelType === 'movies' || channelType === 'mixed')

      const shouldMusic =
        cls.type === 'music' &&
        cls.confidence >= 0.5 &&
        (channelType === 'music' || channelType === 'mixed')

      if (shouldMovie) {
        const { error } = await supabaseAdmin.from('movies').insert([
          {
            youtube_id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            channel_name: channel.channel_name,
            channel_id: channel.channel_id,
            description: video.description || '',
            published_at: video.publishedAt,
            view_count: 0,
            source_channel_id: channelDbId,
            is_hidden: false,
          },
        ])
        if (!error) {
          progress.moviesAdded++
        } else if (error.code !== '23505') {
          console.error('[IMPORT movie]:', error.message)
        } else {
          progress.duplicates++
        }
      } else if (shouldMusic) {
        const { error } = await supabaseAdmin.from('music_tracks').insert([
          {
            youtube_id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            channel_name: channel.channel_name,
            channel_id: channel.channel_id,
            description: video.description || '',
            published_at: video.publishedAt,
            view_count: 0,
            source_channel_id: channelDbId,
            is_hidden: false,
          },
        ])
        if (!error) {
          progress.musicAdded++
        } else if (error.code !== '23505') {
          console.error('[IMPORT music]:', error.message)
        } else {
          progress.duplicates++
        }
      } else {
        progress.skipped++
      }

      importProgress.set(channelDbId, { ...progress })
    }

    // Step 6: Update channel_display
    if (progress.moviesAdded > 0 || progress.musicAdded > 0) {
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
        { onConflict: 'channel_id' }
      )
    }

    // Step 7: Update channel stats
    await supabaseAdmin
      .from('yt_channels')
      .update({
        total_imported:
          (channel.total_imported || 0) +
          progress.moviesAdded +
          progress.musicAdded,
        total_videos_on_channel: allVideos.length,
        videos_imported: progress.moviesAdded + progress.musicAdded,
        scan_status: 'completed',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', channelDbId)

    progress.status = 'completed'
    importProgress.set(channelDbId, { ...progress })
  } catch (err: any) {
    console.error('[FULL IMPORT]:', err.message)
    importProgress.set(channelDbId, {
      ...progress,
      status: 'error',
      error: err.message,
    })
    await supabaseAdmin
      .from('yt_channels')
      .update({ scan_status: 'idle' })
      .eq('id', channelDbId)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { channelDbId } = await req.json()

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

    // Update status to scanning
    await supabaseAdmin
      .from('yt_channels')
      .update({ scan_status: 'scanning' })
      .eq('id', channelDbId)

    // Run async (fire and forget)
    runFullImport(channelDbId, channel).catch(console.error)

    return NextResponse.json({
      success: true,
      message: 'Full import started',
      channelId: channelDbId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
