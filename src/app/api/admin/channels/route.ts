import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('yt_channels')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ channels: data || [] })
  } catch (err: any) {
    console.error('[channels GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('yt_channels')
      .upsert([{
        channel_url: body.channel_url || '',
        channel_id: body.channel_id,
        channel_name: body.channel_name,
        channel_avatar: body.channel_avatar || null,
        channel_type: body.channel_type || 'movies',
        is_active: true,
        total_imported: 0,
        scan_status: 'idle',
        scanned_video_ids: [],
        videos_imported: 0,
        total_videos_on_channel: 0,
        scan_batch: 0,
      }], { onConflict: 'channel_id' })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ channel: data })
  } catch (err: any) {
    console.error('[channels POST]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // First clear scanned data from movies/music for this channel
    await supabaseAdmin.from('movies')
      .update({ source_channel_id: null })
      .eq('source_channel_id', id)

    await supabaseAdmin.from('music_tracks')
      .update({ source_channel_id: null })
      .eq('source_channel_id', id)

    // Delete channel
    const { error } = await supabaseAdmin
      .from('yt_channels')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[channels DELETE]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
