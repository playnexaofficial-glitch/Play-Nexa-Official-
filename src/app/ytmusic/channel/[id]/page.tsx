'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function YTMusicChannelPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = use(params)
  const router = useRouter()
  const [tracks, setTracks] = useState<any[]>([])
  const [channelName, setChannelName] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!supabase) { setIsLoading(false); return }
      const { data } = await supabase
        .from('music_tracks')
        .select('id,youtube_id,title,thumbnail,channel_name,channel_id,created_at')
        .eq('channel_id', id)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data && data.length > 0) {
        setChannelName(data[0].channel_name)
        setTracks(data)
      }
      setIsLoading(false)
    }
    load()
  }, [id])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0D0D0D', paddingBottom: 96 }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 16px 8px', position: 'sticky',
        top: 0, zIndex: 40, backgroundColor: '#0D0D0D',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            backgroundColor: '#1A1A2E', border: 'none',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} color="#FFFFFF" />
        </button>
        <div>
          <h1 style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 18, fontFamily: 'system-ui, sans-serif' }}>
            {channelName || 'Channel'}
          </h1>
          <p style={{ color: '#9CA3AF', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>
            {tracks.length} tracks
          </p>
        </div>
      </div>

      {/* Channel avatar */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 24px' }}>
        <img
          src={`https://unavatar.io/youtube/${id}`}
          alt={channelName}
          loading="lazy"
          style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #7C3AED', backgroundColor: '#1A1A2E' }}
        />
      </div>

      {/* Track list */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid #2D2D44', borderTopColor: '#7C3AED',
            animation: 'pn-spin 0.7s linear infinite',
          }} />
        </div>
      ) : tracks.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <p style={{ color: '#9CA3AF', fontFamily: 'system-ui, sans-serif' }}>No tracks found</p>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {tracks.map((track, i) => (
            <div
              key={track.id}
              onClick={() => {
                localStorage.setItem('pn_play_track', JSON.stringify(track))
                router.push('/ytmusic')
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', cursor: 'pointer',
                borderBottom: i < tracks.length - 1 ? '1px solid #1A1A2E' : 'none',
              }}
            >
              <img
                src={track.thumbnail}
                alt={track.title}
                loading="lazy"
                style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', backgroundColor: '#1A1A2E', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  color: '#FFFFFF', fontSize: 14, fontWeight: 500,
                  fontFamily: 'system-ui, sans-serif',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {track.title}
                </p>
                <p style={{ color: '#9CA3AF', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>
                  {track.channel_name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
