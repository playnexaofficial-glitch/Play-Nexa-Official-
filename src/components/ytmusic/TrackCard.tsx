export interface MusicTrack {
  id: string | number
  youtube_id: string
  title: string
  thumbnail: string
  channel_name: string
  channel_id?: string
  duration?: string
  view_count?: number
  published_at?: string
  mood?: string
  language?: string
}

export interface ChannelDisplay {
  id?: number | string
  channel_id?: string
  display_name?: string
  name?: string
  avatar_url?: string | null
  logo_url?: string | null
  badge_color?: string
  border_color?: string
  [key: string]: any
}

export function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) return ''
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`
  return `${Math.floor(diffInSeconds / 31536000)}y ago`
}

interface Props {
  track: MusicTrack | { id: string | number; youtube_id: string; title: string; thumbnail: string; channel_name: string }
  isPlaying?: boolean
  onPress?: () => void
  onTap?: (track: any) => void
  channelDisplay?: ChannelDisplay
  view?: 'grid' | 'list' | 'carousel' | string
}

export default function TrackCard({
  track,
  isPlaying,
  onPress,
  onTap,
  channelDisplay,
  view = 'grid',
}: Props) {
  const handleClick = () => {
    if (onTap) {
      onTap(track)
    } else if (onPress) {
      onPress()
    }
  }

  if (view === 'list') {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-3 w-full p-2 rounded-xl text-left hover:bg-white/5 active:bg-white/10 transition-colors"
      >
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#1A1A2E] flex-shrink-0">
          <img
            src={track.thumbnail}
            alt={track.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {isPlaying && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex items-end gap-0.5 h-4">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="w-0.5 bg-[#E50000] rounded-full"
                    style={{ height: `${[60, 100, 40][i - 1]}%` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">{track.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {channelDisplay?.badge_color && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: channelDisplay.badge_color }}
              />
            )}
            <p className="text-[#9CA3AF] text-[11px] truncate">
              {channelDisplay?.display_name || track.channel_name}
            </p>
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="flex-shrink-0 w-full text-left active:opacity-75 transition-opacity group"
    >
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#1A1A2E] mb-2 border border-white/5 group-hover:border-white/15 transition-colors">
        <img
          src={track.thumbnail}
          alt={track.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Now playing indicator */}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-1 bg-[#E50000] rounded-full"
                  style={{
                    height: `${[60, 100, 40][i - 1]}%`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
        {track.title}
      </p>
      <div className="flex items-center gap-1 mt-1">
        {channelDisplay?.badge_color && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: channelDisplay.badge_color }}
          />
        )}
        <p className="text-[#9CA3AF] text-[10px] truncate">
          {channelDisplay?.display_name || track.channel_name}
        </p>
      </div>
    </button>
  )
}

