interface Props {
  track: { id:string; youtube_id:string
    title:string; thumbnail:string
    channel_name:string }
  isPlaying?: boolean
  onPress: () => void
}
export default function TrackRow({
  track, isPlaying, onPress
}: Props) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3
        py-2.5 px-2 rounded-xl active:opacity-70
        active:bg-[#1A1A2E] transition-colors
        duration-150">
      <div className="w-12 h-12 rounded-xl
        overflow-hidden bg-[#1A1A2E] flex-shrink-0
        relative">
        <img
          src={track.thumbnail}
          alt={track.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {isPlaying && (
          <div className="absolute inset-0
            bg-black/40 flex items-center
            justify-center">
            <div className="w-2 h-2 rounded-full
              bg-[#7C3AED]"/>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-sm font-medium
          truncate
          ${isPlaying
            ? 'text-[#7C3AED]' : 'text-white'}`}>
          {track.title}
        </p>
        <p className="text-[#9CA3AF] text-xs
          mt-0.5 truncate">
          {track.channel_name}
        </p>
      </div>
    </button>
  )
}
