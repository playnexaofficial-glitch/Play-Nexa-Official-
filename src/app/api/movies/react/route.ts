import { NextRequest, NextResponse }
  from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

export async function POST(req: NextRequest) {
  try {
    const {
      action, userId, movieId, youtubeId,
      reaction, playlistId, playlistName,
      channelId, channelName
    } = await req.json()

    if (!userId || !movieId) {
      return NextResponse.json(
        { error: 'userId and movieId required' },
        { status: 400 })
    }

    switch (action) {

      case 'like': {
        const { data: existing } = await supabase
          .from('user_likes')
          .select('id')
          .eq('user_id', userId)
          .eq('movie_id', movieId)
          .maybeSingle()

        if (existing) {
          await supabase.from('user_likes')
            .delete()
            .eq('id', existing.id)
          return NextResponse.json(
            { liked: false })
        } else {
          await supabase.from('user_likes')
            .insert([{
              user_id: userId,
              movie_id: movieId,
              youtube_id: youtubeId,
            }])
          return NextResponse.json(
            { liked: true })
        }
      }

      case 'save': {
        const { data: existing } = await supabase
          .from('user_watchlist')
          .select('id')
          .eq('user_id', userId)
          .eq('movie_id', movieId)
          .maybeSingle()

        if (existing) {
          await supabase.from('user_watchlist')
            .delete()
            .eq('id', existing.id)
          return NextResponse.json(
            { saved: false })
        } else {
          await supabase.from('user_watchlist')
            .insert([{
              user_id: userId,
              movie_id: movieId,
              youtube_id: youtubeId,
            }])
          return NextResponse.json(
            { saved: true })
        }
      }

      case 'react': {
        // reaction: 'like' | 'dislike'
        const { data: existing } = await supabase
          .from('movie_reactions')
          .select('id,reaction')
          .eq('user_id', userId)
          .eq('video_id', movieId)
          .maybeSingle()

        if (existing && existing.reaction === reaction) {
          // Toggle off
          await supabase.from('movie_reactions')
            .delete()
            .eq('id', existing.id)
          return NextResponse.json(
            { reaction: null })
        } else {
          await supabase.from('movie_reactions')
            .upsert([{
              user_id: userId,
              video_id: movieId,
              reaction,
            }], {
              onConflict: 'user_id,video_id'
            })
          return NextResponse.json({ reaction })
        }
      }

      case 'subscribe': {
        if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })
        const { data: existing } = await supabase
          .from('followed_channels')
          .select('id')
          .eq('user_id', userId)
          .eq('channel_id', channelId)
          .maybeSingle()
        if (existing) {
          await supabase.from('followed_channels').delete().eq('id', existing.id)
          return NextResponse.json({ subscribed: false })
        } else {
          await supabase.from('followed_channels').insert([{
            user_id: userId,
            channel_id: channelId,
            channel_name: channelName || '',
          }])
          return NextResponse.json({ subscribed: true })
        }
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message }, { status: 500 })
  }
}
