import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  if (!userId || !supabase) {
    return NextResponse.json({
      downloads: 0,
      saved: 0,
      played: 0,
      liked: 0,
      isAdmin: false,
    })
  }

  try {
    const [
      { count: watchlistCount },
      { count: musicSavedCount },
      { count: movieHistoryCount },
      { count: musicHistoryCount },
      { count: musicLikedCount },
      { data: gameData },
      { data: adminData },
    ] = await Promise.all([
      supabase.from('user_watchlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('music_saved')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('user_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('music_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('music_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('user_game_data')
        .select('plays')
        .eq('user_id', userId),
      supabase.from('admin_users')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    // Calculate total game plays
    const gamePlays = gameData?.reduce((acc, curr) => acc + (curr.plays || 0), 0) || 0

    return NextResponse.json({
      saved: (watchlistCount || 0) + (musicSavedCount || 0),
      played: (movieHistoryCount || 0) + (musicHistoryCount || 0),
      liked: musicLikedCount || 0,
      gamePlays,
      isAdmin: !!adminData,
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      downloads: 0,
      saved: 0,
      played: 0,
      liked: 0,
      isAdmin: false,
    })
  }
}
