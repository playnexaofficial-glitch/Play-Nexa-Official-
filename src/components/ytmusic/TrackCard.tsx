interface Props {
  track: { id:string; youtube_id:string
    title:string; thumbnail:string
    channel_name:string }
  isPlaying?: boolean
  onPress: () => void
}
export default function TrackCard({
  track, isPlaying, onPress
}: Props) {
  return (
    <button
      onClick={onPress}
      className="flex-shrink-0 w-36 text-left
        active:opacity-70">
      <div className="relative w-36 h-36
        rounded-xl overflow-hidden bg-[#1A1A2E]
        mb-2">
        <img
          src={track.thumbnail}
          alt={track.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {/* Now playing indicator */}
        {isPlaying && (
          <div className="absolute inset-0
            bg-black/40 flex items-center
            justify-center">
            <div className="flex items-end gap-0.5
              h-5">
              {[1,2,3].map(i => (
                <div key={i}
                  className="w-1 bg-[#7C3AED]
                    rounded-full"
                  style={{
                    height: `${[60,100,40][i-1]}%`,
                    animation: 'none',
                  }}/>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-white text-xs
        font-medium line-clamp-2 leading-tight">
        {track.title}
      </p>
      <p className="text-[#9CA3AF] text-[10px]
        mt-0.5 truncate">
        {track.channel_name}
      </p>
    </button>
  )
}
