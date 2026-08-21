// ── Play Nexa — Channel Sync API Route (Phase 2) ────────────────
// Triggers a manual sync for a specific YouTube channel.
// Fetches recent videos from RSS, classifies by keywords,
// and upserts into movies / music_tracks tables.
// All results logged to sync_logs. Uses shared supabaseAdmin.
//
// POST /api/admin/sync-channel
// Body: { channelId: string }
// Returns: { success, found, added, skipped, error? }

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { fetchChannelRSS } from '@/lib/rssParser'
import { classifyVideo, buildMovieRecord, buildMusicRecord } from '@/lib/videoFilter'

export async function POST(req: NextRequest) {
  // ── 1. Validate input ──
  let channelId: string | undefined
  try {
    const body = await req.json()
    channelId = body.channelId
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!channelId || typeof channelId !== 'string') {
    return NextResponse.json(
      { error: 'channelId is required' },
      { status: 400 }
    )
  }

  // ── 2. Check Supabase admin client ──
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server not configured — Supabase admin unavailable' },
      { status: 500 }
    )
  }

  // ── 3. Fetch channel config from yt_channels ──
  const { data: channel, error: chErr } = await supabaseAdmin
    .from('yt_channels')
    .select('*')
    .eq('id', channelId)
    .single()

  if (chErr || !channel) {
    return NextResponse.json(
      { error: 'Channel not found in database' },
      { status: 404 }
    )
  }

  // ── 4. Initialize counters ──
  let videosFound = 0
  let videosAdded = 0
  let videosSkipped = 0
  let errorMessage: string | null = null
  let status: 'success' | 'failed' | 'partial' = 'success'

  try {
    // ── 5. Fetch RSS feed ──
    const videos = await fetchChannelRSS(channel.channel_id)
    videosFound = videos.length

    // ── 6. Classify and insert each video ──
    for (const video of videos) {
      const { isMovie, isMusic } = classifyVideo(
        video,
        channel.channel_type,
        channel.filter_keywords || [],
        channel.exclude_keywords || []
      )

      if (!isMovie && !isMusic) {
        videosSkipped++
        continue
      }

      // Insert into movies table
      if (isMovie) {
        const record = buildMovieRecord(video, channelId)
        const { error } = await supabaseAdmin
          .from('movies')
          .upsert([record], {
            onConflict: 'youtube_id',
            ignoreDuplicates: true,
          })

        if (!error) {
          videosAdded++
        } else {
          // Duplicate via upsert = expected, count as skipped
          if (error.code === '23505') {
            videosSkipped++
          } else {
            console.error(
              `[Sync] Movie insert error for ${video.videoId}:`,
              error.message
            )
            videosSkipped++
          }
        }
      }

      // Insert into music_tracks table
      if (isMusic) {
        const record = buildMusicRecord(video, channelId)
        const { error } = await supabaseAdmin
          .from('music_tracks')
          .upsert([record], {
            onConflict: 'youtube_id',
            ignoreDuplicates: true,
          })

        if (!error) {
          // Avoid double-counting if a video goes into both tables
          if (!isMovie) videosAdded++
        } else {
          if (error.code === '23505') {
            if (!isMovie) videosSkipped++
          } else {
            console.error(
              `[Sync] Music insert error for ${video.videoId}:`,
              error.message
            )
            if (!isMovie) videosSkipped++
          }
        }
      }
    }

    // Determine final status
    if (videosAdded === 0 && videosFound > 0) {
      status = 'partial'
    }

    // ── 7. Update channel last_synced_at + total_imported ──
    await supabaseAdmin
      .from('yt_channels')
      .update({
        last_synced_at: new Date().toISOString(),
        total_imported: channel.total_imported + videosAdded,
        updated_at: new Date().toISOString(),
      })
      .eq('id', channelId)

  } catch (err: any) {
    status = 'failed'
    errorMessage = err.message || 'Unknown error during sync'
    console.error('[Sync Channel] Error:', errorMessage)
  }

  // ── 8. Log sync result to sync_logs ──
  try {
    await supabaseAdmin.from('sync_logs').insert([{
      channel_id: channelId,
      channel_name: channel.channel_name,
      videos_found: videosFound,
      videos_added: videosAdded,
      videos_skipped: videosSkipped,
      status,
      error_message: errorMessage,
      synced_at: new Date().toISOString(),
    }])
  } catch (logErr: any) {
    // Log failure should never crash the sync response
    console.error('[Sync] Failed to write sync_log:', logErr.message)
  }

  // ── 9. Return result ──
  return NextResponse.json({
    success: status !== 'failed',
    found: videosFound,
    added: videosAdded,
    skipped: videosSkipped,
    total: channel.total_imported + videosAdded,
    error: errorMessage,
  })
}
