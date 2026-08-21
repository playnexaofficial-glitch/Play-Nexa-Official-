import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || ''

  if (!q.trim() || q.trim().length < 2) {
    return NextResponse.json({
      movies: [],
      music: [],
      games: [],
      query: q,
    })
  }

  const search = q.trim()

  if (!supabase) {
    return NextResponse.json({
      movies: [],
      music: [],
      games: [],
      query: search,
    })
  }

  const [moviesRes, musicRes, gamesRes] = await Promise.allSettled([
    supabase
      .from('movies')
      .select('id,title,thumbnail,channel_name,view_count')
      .ilike('title', `%${search}%`)
      .eq('is_hidden', false)
      .limit(10),
    supabase
      .from('music_tracks')
      .select('id,title,thumbnail,channel_name,view_count')
      .ilike('title', `%${search}%`)
      .eq('is_hidden', false)
      .limit(10),
    supabase
      .from('games')
      .select('id,name,cover_url,category,game_type')
      .ilike('name', `%${search}%`)
      .eq('is_hidden', false)
      .limit(5),
  ])

  return NextResponse.json({
    movies: moviesRes.status === 'fulfilled' ? moviesRes.value.data || [] : [],
    music: musicRes.status === 'fulfilled' ? musicRes.value.data || [] : [],
    games: gamesRes.status === 'fulfilled' ? gamesRes.value.data || [] : [],
    query: search,
  })
}
