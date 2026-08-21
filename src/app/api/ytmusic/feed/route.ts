import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseReady } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const FALLBACK_TRACKS = [
  {
    id: 'track-1',
    youtube_id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up - Rick Astley',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    channel_name: 'Rick Astley',
    channel_id: 'UCuAXFkgsw1L7xaCfnd5JJOw',
    created_at: new Date().toISOString(),
  },
  {
    id: 'track-2',
    youtube_id: '9bZkp7q19f0',
    title: 'GANGNAM STYLE - PSY',
    thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
    channel_name: 'officialpsy',
    channel_id: 'UCrDkAvwZum-UTjHmzDY2iIw',
    created_at: new Date().toISOString(),
  },
  {
    id: 'track-3',
    youtube_id: 'JGwWNGJdvx8',
    title: 'Shape of You - Ed Sheeran',
    thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    channel_name: 'Ed Sheeran',
    channel_id: 'UC0C-w0YjGpqDXGB8IHb662A',
    created_at: new Date().toISOString(),
  },
  {
    id: 'track-4',
    youtube_id: 'kJQP7kiw5Fk',
    title: 'Despacito - Luis Fonsi ft. Daddy Yankee',
    thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    channel_name: 'Luis Fonsi',
    channel_id: 'UCztwznqvZBRc2u38R0Fp5wQ',
    created_at: new Date().toISOString(),
  }
]

const FALLBACK_CHANNELS = [
  { channel_id: 'UCuAXFkgsw1L7xaCfnd5JJOw', channel_name: 'Rick Astley', count: 12 },
  { channel_id: 'UCrDkAvwZum-UTjHmzDY2iIw', channel_name: 'officialpsy', count: 10 },
  { channel_id: 'UC0C-w0YjGpqDXGB8IHb662A', channel_name: 'Ed Sheeran', count: 8 },
]

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || null
  const mood = req.nextUrl.searchParams.get('mood') || 'all'

  try {
    if (!isSupabaseReady() || !supabase) {
      console.log('[ytmusic/feed] Supabase not configured, serving fallback tracks')
      return NextResponse.json({
        quickPicks: FALLBACK_TRACKS,
        topChannels: FALLBACK_CHANNELS,
        newReleases: FALLBACK_TRACKS,
        recommended: FALLBACK_TRACKS,
        recentlyPlayed: [],
      })
    }

    // Test basic connection first
    const { data: testData, error: testError } =
      await supabase
        .from('music_tracks')
        .select('count', { count: 'exact', head: true })

    if (testError) {
      console.log('[ytmusic/feed] Connection test: FAILED: ' + testError.message)
      return NextResponse.json({
        quickPicks: FALLBACK_TRACKS,
        topChannels: FALLBACK_CHANNELS,
        newReleases: FALLBACK_TRACKS,
        recommended: FALLBACK_TRACKS,
        recentlyPlayed: [],
      })
    }

    console.log('[ytmusic/feed] Connection test: OK, count:', (testData ? (testData as any).count : 'unknown'))

    // Section 1: Quick Picks
    let quickQuery = supabase
      .from('music_tracks')
      .select('id,youtube_id,title,thumbnail,channel_name,channel_id,created_at')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (mood !== 'all') {
      quickQuery = quickQuery.ilike('title', `%${mood}%`)
    }
    const { data: quickPicks } = await quickQuery

    // Section 2: Top Channels
    let topChannels: any[] = []
    if (userId) {
      const { data: history } = await supabase
        .from('music_history')
        .select('track_id, music_tracks(channel_id, channel_name)')
        .eq('user_id', userId)
        .limit(100)

      const channelCount: Record<string, {
        channel_id: string
        channel_name: string
        count: number
      }> = {}

      for (const h of history || []) {
        const track = (h as any).music_tracks
        if (!track?.channel_id) continue
        const key = track.channel_id
        if (!channelCount[key]) {
          channelCount[key] = {
            channel_id: track.channel_id,
            channel_name: track.channel_name,
            count: 0,
          }
        }
        channelCount[key].count++
      }

      topChannels = Object.values(channelCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    }

    if (topChannels.length === 0) {
      const { data: tracks } = await supabase
        .from('music_tracks')
        .select('channel_id,channel_name')
        .eq('is_hidden', false)
        .limit(200)

      const seen = new Set<string>()
      const channels: any[] = []
      for (const t of tracks || []) {
        if (!seen.has(t.channel_id)) {
          seen.add(t.channel_id)
          channels.push({
            channel_id: t.channel_id,
            channel_name: t.channel_name,
            count: 0,
          })
        }
      }
      topChannels = channels.length > 0 ? channels.slice(0, 8) : FALLBACK_CHANNELS
    }

    // Section 3: New Releases
    let newReleases: any[] = []
    const { data: newTracks } = await supabase
      .from('music_tracks')
      .select('id,youtube_id,title,thumbnail,channel_name,channel_id,created_at')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (userId && topChannels.length > 0) {
      const preferredChannelIds = topChannels.slice(0, 3).map((c: any) => c.channel_id)
      const { data: preferred } = await supabase
        .from('music_tracks')
        .select('id,youtube_id,title,thumbnail,channel_name,channel_id,created_at')
        .in('channel_id', preferredChannelIds)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(10)

      const newSet = (newTracks || []).slice(0, 6)
      const prefSet = (preferred || []).slice(0, 4)

      const seen = new Set<string>()
      for (const t of [...newSet, ...prefSet]) {
        if (!seen.has(t.id)) {
          seen.add(t.id)
          newReleases.push(t)
        }
      }
    } else {
      newReleases = newTracks && newTracks.length > 0 ? newTracks : FALLBACK_TRACKS
    }

    // Section 4: Recommended
    let recommended: any[] = []
    if (userId) {
      const { data: likes } = await supabase
        .from('music_likes')
        .select('track_id, music_tracks(channel_id, genre)')
        .eq('user_id', userId)
        .limit(20)

      const likedChannels = new Set<string>()
      for (const l of likes || []) {
        const t = (l as any).music_tracks
        if (t?.channel_id) likedChannels.add(t.channel_id)
      }

      if (likedChannels.size > 0) {
        const { data: recTracks } = await supabase
          .from('music_tracks')
          .select('id,youtube_id,title,thumbnail,channel_name,channel_id')
          .in('channel_id', Array.from(likedChannels))
          .eq('is_hidden', false)
          .limit(30)

        const { data: history } = await supabase
          .from('music_history')
          .select('track_id')
          .eq('user_id', userId)
          .limit(50)

        const playedTrackIds = new Set((history || []).map((h: any) => h.track_id))
        const unplayed = (recTracks || []).filter(t => !playedTrackIds.has(t.id))
        const played = (recTracks || []).filter(t => playedTrackIds.has(t.id))

        recommended = [
          ...shuffle(unplayed).slice(0, 12),
          ...shuffle(played).slice(0, 4),
        ].slice(0, 16)
      }
    }

    if (recommended.length < 4) {
      const { data: fallback } = await supabase
        .from('music_tracks')
        .select('id,youtube_id,title,thumbnail,channel_name,channel_id')
        .eq('is_hidden', false)
        .order('view_count', { ascending: false })
        .limit(16)
      recommended = shuffle(fallback && fallback.length > 0 ? fallback : FALLBACK_TRACKS).slice(0, 16)
    }

    // Section 5: Recently Played
    let recentlyPlayed: any[] = []
    if (userId) {
      const { data: recent } = await supabase
        .from('music_history')
        .select('played_at, music_tracks(id,youtube_id,title,thumbnail,channel_name,channel_id)')
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(10)

      recentlyPlayed = (recent || [])
        .map((r: any) => r.music_tracks)
        .filter(Boolean)
    }

    return NextResponse.json({
      quickPicks: quickPicks && quickPicks.length > 0 ? quickPicks : FALLBACK_TRACKS,
      topChannels: topChannels.length > 0 ? topChannels : FALLBACK_CHANNELS,
      newReleases: newReleases.length > 0 ? newReleases : FALLBACK_TRACKS,
      recommended: recommended.length > 0 ? recommended : FALLBACK_TRACKS,
      recentlyPlayed,
    })
  } catch (err: any) {
    console.log('[ytmusic/feed] Exception, serving fallback:', err?.message)
    return NextResponse.json({
      quickPicks: FALLBACK_TRACKS,
      topChannels: FALLBACK_CHANNELS,
      newReleases: FALLBACK_TRACKS,
      recommended: FALLBACK_TRACKS,
      recentlyPlayed: [],
    })
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
