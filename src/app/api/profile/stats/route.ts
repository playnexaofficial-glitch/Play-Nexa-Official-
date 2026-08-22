import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  if (!userId || !supabase) {
    return NextResponse.json({
      saved: 0,
      played: 0,
      liked: 0,
      isAdmin: false,
    })
  }

  try {
    const [
      { count: watchlistCount },
      { count: historyCount },
      { count: userLikesCount },
      { count: musicLikesCount },
      { data: adminData },
    ] = await Promise.all([
      supabase.from('user_watchlist')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('user_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('user_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('music_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase.from('admin_users')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    return NextResponse.json({
      saved: watchlistCount || 0,
      played: historyCount || 0,
      liked: (userLikesCount || 0) + (musicLikesCount || 0),
      isAdmin: !!adminData,
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      saved: 0,
      played: 0,
      liked: 0,
      isAdmin: false,
    })
  }
}
