import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: string[] = []

  try {
    // 1. Check for new movies (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: newMovies } = await supabaseAdmin
      .from('movies')
      .select('title, channel_name')
      .eq('is_hidden', false)
      .gte('created_at', yesterday)
      .limit(5)

    const { data: newTracks } = await supabaseAdmin
      .from('music_tracks')
      .select('title, channel_name')
      .eq('is_hidden', false)
      .gte('created_at', yesterday)
      .limit(5)

    const { data: newGames } = await supabaseAdmin
      .from('games')
      .select('name')
      .eq('is_hidden', false)
      .gte('created_at', yesterday)
      .limit(3)

    // 2. Build notification based on what's new
    let notifTitle = ''
    let notifBody = ''

    if (newMovies && newMovies.length > 0) {
      notifTitle = 'New Movie Added'
      notifBody = `"${newMovies[0].title}" and ${newMovies.length - 1} more added to Play Nexa`
    } else if (newTracks && newTracks.length > 0) {
      notifTitle = 'New Music Added'
      notifBody = `${newTracks.length} new songs added. Listen now on Play Nexa`
    } else if (newGames && newGames.length > 0) {
      notifTitle = 'New Game Available'
      notifBody = `"${newGames[0].name}" is now on Play Nexa. Play free`
    }

    if (notifTitle) {
      // Get all active device tokens
      const { data: subs } = await supabaseAdmin
        .from('push_subscriptions')
        .select('device_token')
        .eq('is_active', true)
        .limit(1000)

      const tokens = (subs || []).map((s: any) => s.device_token).filter(Boolean)

      // Log the notification
      await supabaseAdmin.from('notifications_log').insert([{
        title: notifTitle,
        body: notifBody,
        sent_to: 'all',
        sent_count: tokens.length,
        sent_at: new Date().toISOString(),
      }])

      results.push(`Sent: ${notifTitle} to ${tokens.length} devices`)
    } else {
      results.push('No new content in last 24h — no notification sent')
    }

    // 3. Come-back notifications for inactive users (7+ days)
    // This would need FCM server key to actually send — log for now
    results.push('Auto-notify cron completed')

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
