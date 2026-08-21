interface Movie {
  id: string; youtube_id: string; title: string
  thumbnail: string; channel_name: string
  watch_count?: number; watchPercent?: number
  badge?: string | null; isNew?: boolean
}
interface Props {
  movie: Movie
  variant: 'portrait' | 'landscape'
  onPress: () => void
}

export default function MovieCard({
  movie, variant, onPress
}: Props) {
  const isPortrait = variant === 'portrait'

  return (
    <button
      onClick={onPress}
      className={`flex-shrink-0 text-left
        active:opacity-60 transition-opacity duration-150
        ${isPortrait ? 'w-36' : 'w-56'}`}>
      <div className={`relative bg-[#1A1A2E]
        rounded-xl overflow-hidden mb-2
        ${isPortrait
          ? 'w-36' : 'w-56 aspect-video'}`}
        style={{
          aspectRatio: isPortrait
            ? '2/3' : '16/9'
        }}>
        <img
          src={movie.thumbnail}
          alt={movie.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2
          flex flex-col gap-1">
          {movie.badge && (
            <span className="px-2 py-0.5
              rounded-md text-[10px] font-bold
              text-white leading-none"
              style={{
                backgroundColor: '#7C3AED'
              }}>
              {movie.badge}
            </span>
          )}
          {movie.isNew && (
            <span className="px-2 py-0.5
              rounded-md text-[10px] font-bold
              text-black bg-white leading-none">
              New
            </span>
          )}
        </div>
      </div>

      <p className="text-white text-xs
        font-medium line-clamp-2 leading-tight">
        {movie.title}
      </p>
      <p className="text-[#9CA3AF] text-[10px]
        mt-0.5 truncate">
        {movie.channel_name}
      </p>
    </button>
  )
}
