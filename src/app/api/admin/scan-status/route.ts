import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin not configured' },
      { status: 500 }
    )
  }

  const channelId = req.nextUrl.searchParams.get('channelId')
  if (!channelId) {
    return NextResponse.json({ error: 'channelId required' }, { status: 400 })
  }

  const { data: ch } = await supabaseAdmin
    .from('yt_channels')
    .select(
      'id,scan_status,total_videos_on_channel,videos_imported,scan_batch,last_synced_at,channel_type,scanned_video_ids'
    )
    .eq('id', channelId)
    .single()

  if (!ch) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { count: movieCount } = await supabaseAdmin
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('source_channel_id', channelId)

  const { count: musicCount } = await supabaseAdmin
    .from('music_tracks')
    .select('*', { count: 'exact', head: true })
    .eq('source_channel_id', channelId)

  const imported = (movieCount || 0) + (musicCount || 0)
  const total = ch.total_videos_on_channel || 0
  const progress = total > 0 ? Math.round((imported / total) * 100) : 0

  return NextResponse.json({
    status: ch.scan_status || 'idle',
    totalOnChannel: total,
    imported,
    movieCount: movieCount || 0,
    musicCount: musicCount || 0,
    remaining: Math.max(0, total - imported),
    progress,
    batchNumber: ch.scan_batch || 0,
    lastSynced: ch.last_synced_at,
    scannedCount: (ch.scanned_video_ids || []).length,
  })
}
