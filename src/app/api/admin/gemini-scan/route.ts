// ── Play Nexa — Gemini AI Scan API Route ──────────────────────
// Scans a YouTube channel's RSS feed using Gemini 1.5 Flash
// Classifies each video as movie/music/skip
// Routes content based on channel_type: movies | music | mixed
// Upserts into `movies` and `music_tracks` with onConflict: 'youtube_id'
// Enhanced: tries uploads playlist (UC→UU) for more than 15 videos
// Rate limits Gemini calls (4s delay every 14 req = stays under 15/min)
// Soft error handling: returns 200 + error message (UI shows msg, not crash)
// Tracks progress in `ai_scan_jobs` table
// Ensures channel_display entry exists with correct visibility

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { fetchChannelVideosEnhanced, fetchChannelRSS, parseRSSXML } from '@/lib/rssParser'
import { classifyVideo } from '@/lib/geminiScanner'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { channelDbId } = body

  if (!channelDbId) {
    return NextResponse.json(
      { error: 'channelDbId is required' },
      { status: 400 }
    )
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server not configured — Supabase admin client unavailable' },
      { status: 500 }
    )
  }

  // ── Get channel from Supabase ──
  const { data: channel, error: chErr } = await supabaseAdmin
    .from('yt_channels')
    .select('*')
    .eq('id', channelDbId)
    .single()

  if (chErr || !channel) {
    return NextResponse.json(
      { error: 'Channel not found in database' },
      { status: 404 }
    )
  }

  console.log('=== GEMINI SCAN START ===')
  console.log('Channel:', channel.channel_name)
  console.log('Channel ID:', channel.channel_id)
  console.log('Channel Type:', channel.channel_type || 'mixed')

  // ── Create scan job ──
  const { data: job, error: jobErr } = await supabaseAdmin
    .from('ai_scan_jobs')
    .insert([
      {
        channel_name: channel.channel_name,
        status: 'scanning',
        started_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  // If ai_scan_jobs table doesn't exist, continue without tracking
  const jobId = job?.id || null
  const trackProgress = !!jobId && !jobErr

  if (jobErr) {
    console.log('[SCAN] Warning: scan job tracking unavailable:', jobErr?.message)
  }

  let moviesFound = 0
  let musicFound = 0
  let skipped = 0
  let processed = 0
  let errorMessage: string | null = null
  let videos: any[] = []

  try {
    // ── Fetch videos — enhanced fetcher tries RSS + uploads playlist ──
    try {
      videos = await fetchChannelVideosEnhanced(channel.channel_id)
    } catch (rssErr: any) {
      // If enhanced fetch fails completely, try uploads playlist directly
      console.log('[SCAN] Enhanced fetch failed, trying playlist fallback:', rssErr.message)

      if (channel.channel_id.startsWith('UC')) {
        const playlistId = 'UU' + channel.channel_id.slice(2)
        try {
          const playlistUrl =
            `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`
          const res = await fetch(playlistUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
            signal: AbortSignal.timeout(10000),
          })
          if (res.ok) {
            const xml = await res.text()
            if (xml.includes('<entry>')) {
              videos = parseRSSXML(xml)
            }
          }
        } catch (playlistErr: any) {
          console.log('[SCAN] Playlist fallback also failed:', playlistErr.message)
        }
      }

      // If still no videos, fail with a helpful error
      if (videos.length === 0) {
        throw new Error(
          `RSS fetch failed for channel: ${channel.channel_id}. ` +
            `Try using a direct channel URL (UC... format).`
        )
      }
    }

    console.log(`[SCAN] Channel: ${channel.channel_name}`)
    console.log(`[SCAN] Videos found: ${videos.length}`)

    // Update total count
    if (trackProgress) {
      await supabaseAdmin
        .from('ai_scan_jobs')
        .update({ total_videos: videos.length })
        .eq('id', jobId)
    }

    // Get channel_type for routing (default: mixed)
    const channelType: string = channel.channel_type || 'mixed'

    // ── Classify each video with Gemini AI ──
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i]

      try {
        // Rate limit: wait 4s every 14 videos
        // Keeps under Gemini free tier limit of 15 req/min
        if (i > 0 && i % 14 === 0) {
          console.log('[SCAN] Rate limit pause — 4s cooldown')
          await new Promise(r => setTimeout(r, 4000))
        }

        const result = await classifyVideo(
          video.title,
          video.description,
          channel.channel_name
        )

        processed++

        console.log(
          `[SCAN] ${video.title.slice(0, 40)}` +
            ` → ${result.type} (${result.confidence})`
        )

        // ── Route based on channel_type ──
        const shouldInsertMovie =
          result.type === 'movie' &&
          result.confidence >= 0.6 &&
          (channelType === 'movies' || channelType === 'mixed')

        const shouldInsertMusic =
          result.type === 'music' &&
          result.confidence >= 0.6 &&
          (channelType === 'music' || channelType === 'mixed')

        if (shouldInsertMovie) {
          const { error: movieErr } = await supabaseAdmin
            .from('movies')
            .upsert(
              [
                {
                  youtube_id: video.videoId,
                  title: video.title,
                  thumbnail: video.thumbnail,
                  channel_name: channel.channel_name,
                  channel_id: channel.channel_id,
                  description: video.description || '',
                  published_at: video.publishedAt,
                  view_count: video.viewCount || 0,
                  source_channel_id: channelDbId,
                  language: 'Bangla',
                  is_hidden: false,
                },
              ],
              { onConflict: 'youtube_id' }
            )

          if (!movieErr) {
            moviesFound++
            console.log(
              `[SCAN] Movie upserted: ${video.title.slice(0, 30)}`
            )
          } else {
            console.error(
              `[SCAN] Movie upsert error: ${movieErr.message}`
            )
          }
        } else if (shouldInsertMusic) {
          const { error: musicErr } = await supabaseAdmin
            .from('music_tracks')
            .upsert(
              [
                {
                  youtube_id: video.videoId,
                  title: video.title,
                  thumbnail: video.thumbnail,
                  channel_name: channel.channel_name,
                  channel_id: channel.channel_id,
                  description: video.description || '',
                  published_at: video.publishedAt,
                  view_count: video.viewCount || 0,
                  source_channel_id: channelDbId,
                  language: '',
                  is_hidden: false,
                },
              ],
              { onConflict: 'youtube_id' }
            )

          if (!musicErr) {
            musicFound++
            console.log(
              `[SCAN] Music upserted: ${video.title.slice(0, 30)}`
            )
          } else {
            console.error(
              `[SCAN] Music upsert error: ${musicErr.message}`
            )
          }
        } else {
          skipped++
        }
      } catch (videoErr: any) {
        // Individual video classification failed — skip it
        console.error(
          '[SCAN] Video processing error:',
          videoErr?.message || 'unknown'
        )
        skipped++
        processed++
      }

      // Update progress every 5 videos
      if (trackProgress && processed % 5 === 0) {
        await supabaseAdmin
          .from('ai_scan_jobs')
          .update({
            processed,
            movies_found: moviesFound,
            music_found: musicFound,
            skipped,
          })
          .eq('id', jobId)
      }
    }

    // ── Update channel last synced ──
    await supabaseAdmin
      .from('yt_channels')
      .update({
        last_synced_at: new Date().toISOString(),
        total_imported:
          (channel.total_imported || 0) + moviesFound + musicFound,
      })
      .eq('id', channelDbId)

    // ── Ensure channel_display entry exists ──
    // Use channel.id (UUID from yt_channels) — NOT channel.channel_id (UC... string)
    // This prevents duplicate entries in channel_display
    // Only mark visible if content was actually found
    await supabaseAdmin.from('channel_display').upsert(
      [
        {
          channel_id: channel.id,
          display_name: channel.channel_name,
          logo_url: channel.channel_avatar || '',
          badge_color: '#7C3AED',
          border_color: '#7C3AED',
          is_visible: moviesFound > 0 || musicFound > 0,
          sort_order: 0,
        },
      ],
      {
        onConflict: 'channel_id',
        ignoreDuplicates: false,
      }
    )

    console.log('=== SCAN COMPLETE ===')
    console.log(`Movies added: ${moviesFound}`)
    console.log(`Music added: ${musicFound}`)
    console.log(`Skipped: ${skipped}`)
  } catch (err: any) {
    errorMessage = err.message || 'Unknown error during scan'
    console.error('[SCAN] Failed:', errorMessage)
  }

  // ── Finalize job ──
  if (trackProgress) {
    await supabaseAdmin
      .from('ai_scan_jobs')
      .update({
        status: errorMessage ? 'failed' : 'completed',
        processed,
        movies_found: moviesFound,
        music_found: musicFound,
        skipped,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }

  // Soft error: return 200 so UI shows error message instead of network error
  if (errorMessage) {
    return NextResponse.json({
      success: false,
      error: errorMessage,
      moviesFound: 0,
      musicFound: 0,
    })
  }

  return NextResponse.json({
    success: true,
    moviesFound,
    musicFound,
    skipped,
    processed,
    note:
      videos.length <= 15
        ? 'YouTube RSS limited to 15 videos. Re-scan periodically to get new content.'
        : undefined,
  })
}
