import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase admin client not initialized' }, { status: 500 })
  }

  try {
    const [historyRes, dailyRes, likesRes, moviesRes, activityRes] = await Promise.allSettled([
      // Top watched movies
      supabaseAdmin
        .from('user_history')
        .select('movie_id, watch_count, movies(title)')
        .order('watch_count', { ascending: false })
        .limit(10),

      // Daily activity (last 30 days)
      supabaseAdmin
        .from('user_history')
        .select('watched_at, movie_id, movies(title, channel_name)')
        .gte('watched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('watched_at', { ascending: false }),

      // Likes per channel
      supabaseAdmin
        .from('user_likes')
        .select('movie_id, movies(channel_name)'),

      // Movies per channel
      supabaseAdmin
        .from('movies')
        .select('id, title, channel_name'),

      // Activity log
      supabaseAdmin
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    // Top watched
    let topWatched: Array<{ name: string; watch_count: number }> = []
    if (historyRes.status === 'fulfilled' && historyRes.value.data) {
      topWatched = historyRes.value.data.map((r: any) => ({
        name: r.movies?.title
          ? r.movies.title.length > 14
            ? r.movies.title.slice(0, 14) + '…'
            : r.movies.title
          : 'Unknown',
        watch_count: r.watch_count || 0,
      }))
    }

    // Daily records
    const dailyRecords: any[] =
      dailyRes.status === 'fulfilled' && dailyRes.value.data ? dailyRes.value.data : []

    // Channel likes
    const likesMap = new Map<string, number>()
    if (likesRes.status === 'fulfilled' && likesRes.value.data) {
      likesRes.value.data.forEach((r: any) => {
        const ch = r.movies?.channel_name
        if (ch) likesMap.set(ch, (likesMap.get(ch) || 0) + 1)
      })
    }
    const channelLikes = Array.from(likesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Genre/Channel data
    const moviesMap = new Map<string, number>()
    if (moviesRes.status === 'fulfilled' && moviesRes.value.data) {
      moviesRes.value.data.forEach((r: any) => {
        const ch = r.channel_name
        if (ch) moviesMap.set(ch, (moviesMap.get(ch) || 0) + 1)
      })
    }
    const genreData = Array.from(moviesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Activity log
    const activityLog =
      activityRes.status === 'fulfilled' && activityRes.value.data ? activityRes.value.data : []

    return NextResponse.json({
      success: true,
      topWatched,
      dailyRecords,
      channelLikes,
      genreData,
      activityLog,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
