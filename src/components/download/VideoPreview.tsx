'use client'

// ═══════════════════════════════════════════════════════════════
// Play Nexa — Video Preview Component
// Shows YouTube thumbnail with play overlay
// Lazy-loaded image, 2GB RAM friendly
// ═══════════════════════════════════════════════════════════════

interface VideoPreviewProps {
  videoId: string
}

export default function VideoPreview({ videoId }: VideoPreviewProps) {
  return (
    <div className="bg-[#141414] rounded-2xl border border-[#1E1E1E] overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <img
          src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>
        {/* YouTube badge */}
        <div className="absolute top-2 left-2 bg-red-600 rounded px-2 py-0.5 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <polygon points="5,3 19,12 5,21" />
          </svg>
          <span className="text-white text-xs font-bold">YouTube</span>
        </div>
      </div>

      {/* Video ID info */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white text-xs font-medium">Video Preview</p>
          <p className="text-[#9CA3AF] text-xs font-mono mt-0.5">{videoId}</p>
        </div>
        <button
          onClick={() =>
            window.open(
              `https://youtube.com/watch?v=${videoId}`,
              '_blank',
              'noopener,noreferrer'
            )
          }
          className="text-[#7C3AED] text-xs font-semibold active:opacity-70 min-h-[44px] min-w-[44px] flex items-center justify-center transition-opacity duration-150"
        >
          Watch ↗
        </button>
      </div>
    </div>
  )
}
