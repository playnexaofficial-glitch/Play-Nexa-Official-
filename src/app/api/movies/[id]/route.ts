import { NextRequest, NextResponse }
  from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = req.nextUrl.searchParams
    .get('userId') || null

  try {
    // Simpler watch count increment:
    const { data: movie } = await supabase
      .from('movies')
      .select('*')
      .eq('id', id)
      .single()

    if (movie) {
      await supabase.from('movies')
        .update({
          watch_count: (movie.watch_count || 0) + 1
        })
        .eq('id', id)
    }

    if (!movie) return NextResponse.json(
      { error: 'Movie not found' }, { status: 404 })

    // User state (liked, saved, reaction, subscribed)
    let userState = {
      liked: false, saved: false,
      reaction: null as string | null,
      subscribed: false
    }

    if (userId) {
      const [{ data: likeData },
        { data: saveData },
        { data: reactionData },
        { data: subscribedData }] =
        await Promise.all([
          supabase.from('user_likes')
            .select('id')
            .eq('user_id', userId)
            .eq('movie_id', id)
            .maybeSingle(),
          supabase.from('user_watchlist')
            .select('id')
            .eq('user_id', userId)
            .eq('movie_id', id)
            .maybeSingle(),
          supabase.from('movie_reactions')
            .select('reaction')
            .eq('user_id', userId)
            .eq('video_id', id)
            .maybeSingle(),
          supabase.from('followed_channels')
            .select('id')
            .eq('user_id', userId)
            .eq('channel_id', movie.channel_id)
            .maybeSingle(),
        ])

      userState = {
        liked: !!likeData,
        saved: !!saveData,
        reaction: reactionData?.reaction || null,
        subscribed: !!subscribedData,
      }

      // Record watch history
      await supabase.from('user_history')
        .upsert([{
          user_id: userId,
          movie_id: id,
          youtube_id: movie.youtube_id,
          watched_at: new Date().toISOString(),
        }], { onConflict: 'user_id,movie_id' })
    }

    // Recommendations: same channel + genre mix
    const { data: sameChannel } = await supabase
      .from('movies')
      .select('id,youtube_id,title,thumbnail,' +
        'channel_name,watch_count')
      .eq('is_hidden', false)
      .eq('channel_id', movie.channel_id)
      .neq('id', id)
      .order('watch_count', { ascending: false })
      .limit(10)

    return NextResponse.json({
      movie,
      userState,
      recommendations: sameChannel || [],
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message }, { status: 500 })
  }
}
