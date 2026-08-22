import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseReady } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 60

const FALLBACK_MOVIES = [
  {
    id: 'movie-1',
    youtube_id: 'ScMzIvxBSi4',
    title: 'Big Buck Bunny - Animated Short Film',
    thumbnail: 'https://i.ytimg.com/vi/ScMzIvxBSi4/hqdefault.jpg',
    channel_name: 'Blender Foundation',
    channel_id: 'UC32J4vznHnlgexzgk8m1uOA',
    view_count: 1000000,
    watch_count: 50000,
    created_at: new Date().toISOString(),
    genre: ['Animation', 'Comedy'],
  },
  {
    id: 'movie-2',
    youtube_id: 'YE7VzlLtp-4',
    title: 'Sintel - Blender Open Movie',
    thumbnail: 'https://i.ytimg.com/vi/YE7VzlLtp-4/hqdefault.jpg',
    channel_name: 'Blender Foundation',
    channel_id: 'UC32J4vznHnlgexzgk8m1uOA',
    view_count: 800000,
    watch_count: 40000,
    created_at: new Date().toISOString(),
    genre: ['Action', 'Fantasy'],
  }
]

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || null
  const channel = req.nextUrl.searchParams.get('channel') || 'all'

  try {
    if (!isSupabaseReady() || !supabase) {
      console.log('[movies/feed] Supabase not configured, serving fallback movies')
      return NextResponse.json({
        featured: FALLBACK_MOVIES,
        trending: FALLBACK_MOVIES,
        newReleases: FALLBACK_MOVIES,
        channelSections: [{ channelId: 'UC32J4vznHnlgexzgk8m1uOA', channelName: 'Blender Foundation', movies: FALLBACK_MOVIES }],
        channels: [{ id: 'UC32J4vznHnlgexzgk8m1uOA', name: 'Blender Foundation' }],
      }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } })
    }

    // Test basic connection first
    const { count, error: connError } =
      await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })

    if (connError) {
      console.log('[movies/feed] Movies count query failed:', connError.message)
      return NextResponse.json({
        featured: FALLBACK_MOVIES,
        trending: FALLBACK_MOVIES,
        newReleases: FALLBACK_MOVIES,
        channelSections: [{ channelId: 'UC32J4vznHnlgexzgk8m1uOA', channelName: 'Blender Foundation', movies: FALLBACK_MOVIES }],
        channels: [{ id: 'UC32J4vznHnlgexzgk8m1uOA', name: 'Blender Foundation' }],
      }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } })
    }

    console.log('[movies/feed] Movies count:', count)

    let baseQuery = supabase
      .from('movies')
      .select('id,youtube_id,title,thumbnail,channel_name,channel_id,view_count,watch_count,created_at,genre')
      .eq('is_hidden', false)

    if (channel !== 'all') {
      baseQuery = baseQuery.eq('channel_id', channel)
    }

    const { data: featured } = await supabase
      .from('movies')
      .select('id,youtube_id,title,thumbnail,channel_name,channel_id,view_count,watch_count,created_at,genre')
      .eq('is_hidden', false)
      .order('watch_count', { ascending: false })
      .limit(10)

    const { data: trending } = await supabase
      .from('movies')
      .select('id,youtube_id,title,thumbnail,channel_name,channel_id,view_count,watch_count,created_at,genre')
      .eq('is_hidden', false)
      .order('watch_count', { ascending: false })
      .limit(20)

    const { data: newReleases } = await supabase
      .from('movies')
      .select('id,youtube_id,title,thumbnail,channel_name,channel_id,view_count,watch_count,created_at,genre')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: allMovies } = await supabase
      .from('movies')
      .select('channel_id,channel_name')
      .eq('is_hidden', false)
      .limit(500)

    const channelMap = new Map<string, string>()
    for (const m of allMovies || []) {
      if (!channelMap.has(m.channel_id)) {
        channelMap.set(m.channel_id, m.channel_name)
      }
    }

    const channels = [...channelMap.entries()].map(([id, name]) => ({ id, name }))

    const channelSections: any[] = []
    for (const [chId, chName] of [...channelMap.entries()].slice(0, 3)) {
      const { data: chMovies } = await supabase
        .from('movies')
        .select('id,youtube_id,title,thumbnail,channel_name,channel_id,view_count,watch_count,created_at')
        .eq('is_hidden', false)
        .eq('channel_id', chId)
        .order('watch_count', { ascending: false })
        .limit(10)
      if (chMovies && chMovies.length > 0) {
        channelSections.push({
          channelId: chId,
          channelName: chName,
          movies: chMovies,
        })
      }
    }

    const maxWatch = Math.max(
      ...(trending || []).map(m => m.watch_count || 0),
      1
    )

    const addBadges = (movies: any[]) =>
      (movies || []).map(m => {
        const pct = Math.round(((m.watch_count || 0) / maxWatch) * 100)
        return {
          ...m,
          watchPercent: pct,
          badge: pct >= 70 ? `Most Watched ${pct}%` : null,
          isNew: (() => {
            if (!m.created_at) return false
            const diff = Date.now() - new Date(m.created_at).getTime()
            return diff < 7 * 24 * 60 * 60 * 1000
          })()
        }
      })

    const finalFeatured = featured && featured.length > 0 ? addBadges(featured.slice(0, 5)) : addBadges(FALLBACK_MOVIES)
    const finalTrending = trending && trending.length > 0 ? addBadges(trending) : addBadges(FALLBACK_MOVIES)
    const finalNewReleases = newReleases && newReleases.length > 0 ? addBadges(newReleases) : addBadges(FALLBACK_MOVIES)
    const finalChannelSections = channelSections.length > 0 ? channelSections : [{ channelId: 'UC32J4vznHnlgexzgk8m1uOA', channelName: 'Blender Foundation', movies: addBadges(FALLBACK_MOVIES) }]
    const finalChannels = channels.length > 0 ? channels : [{ id: 'UC32J4vznHnlgexzgk8m1uOA', name: 'Blender Foundation' }]

    return NextResponse.json({
      featured: finalFeatured,
      trending: finalTrending,
      newReleases: finalNewReleases,
      channelSections: finalChannelSections,
      channels: finalChannels,
    }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } })
  } catch (err: any) {
    console.log('[movies/feed] Exception, serving fallback:', err?.message)
    return NextResponse.json({
      featured: FALLBACK_MOVIES,
      trending: FALLBACK_MOVIES,
      newReleases: FALLBACK_MOVIES,
      channelSections: [{ channelId: 'UC32J4vznHnlgexzgk8m1uOA', channelName: 'Blender Foundation', movies: FALLBACK_MOVIES }],
      channels: [{ id: 'UC32J4vznHnlgexzgk8m1uOA', name: 'Blender Foundation' }],
    }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } })
  }
}
