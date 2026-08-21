import { NextRequest, NextResponse }
  from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
    .get('q') || ''

  if (!q.trim() || q.trim().length < 1) {
    return NextResponse.json({ results: [] })
  }

  const search = q.trim()

  try {
    // Search in title (highest priority)
    const { data: titleResults } = await supabase
      .from('music_tracks')
      .select('id,youtube_id,title,thumbnail,' +
        'channel_name,channel_id,description')
      .eq('is_hidden', false)
      .ilike('title', `%${search}%`)
      .limit(15)

    // Search in channel name
    const { data: channelResults } = await supabase
      .from('music_tracks')
      .select('id,youtube_id,title,thumbnail,' +
        'channel_name,channel_id,description')
      .eq('is_hidden', false)
      .ilike('channel_name', `%${search}%`)
      .limit(10)

    // Search in description (lyrics/content)
    const { data: descResults } = await supabase
      .from('music_tracks')
      .select('id,youtube_id,title,thumbnail,' +
        'channel_name,channel_id,description')
      .eq('is_hidden', false)
      .ilike('description', `%${search}%`)
      .limit(10)

    // Merge and deduplicate, prioritize title
    const seen = new Set<string>()
    const merged: any[] = []

    for (const t of [
      ...(titleResults || []),
      ...(channelResults || []),
      ...(descResults || []),
    ]) {
      if (!seen.has(t.id)) {
        seen.add(t.id)
        merged.push(t)
      }
    }

    return NextResponse.json({
      results: merged,
      total: merged.length,
      query: search,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message }, { status: 500 })
  }
}
