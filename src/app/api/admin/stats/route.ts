import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const results = await Promise.allSettled([
      supabaseAdmin.from('movies').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('music_tracks').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('yt_channels').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('games').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_feedback').select('*', { count: 'exact', head: true }),
    ])

    const [movies, music, users, channels, games, feedback] = results.map((r) =>
      r.status === 'fulfilled' ? r.value.count || 0 : 0
    )

    return NextResponse.json({
      movies,
      music,
      users,
      channels,
      games,
      feedback,
    })
  } catch (err: any) {
    console.error('[stats]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
