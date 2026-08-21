'use client'
import { Pause, Play, SkipForward } from
  'lucide-react'
interface Props {
  track: { title:string; thumbnail:string
    channel_name:string }
  isPlaying: boolean; progress: number
  onTogglePlay: () => void
  onNext: () => void
  onExpand: () => void
}
export default function MiniPlayer({
  track, isPlaying, progress,
  onTogglePlay, onNext, onExpand
}: Props) {
  return (
    <div className="fixed bottom-16 left-0 right-0
      z-50 bg-[#141420]
      border-t border-[#2D2D44]">
      {/* Progress line */}
      <div className="h-0.5 bg-[#2D2D44]">
        <div className="h-full bg-[#7C3AED]"
          style={{ width: `${progress}%` }}/>
      </div>
      <button
        onClick={onExpand}
        className="w-full flex items-center gap-3
          px-4 h-16 active:bg-[#1A1A2E]">
        <img
          src={track.thumbnail}
          alt={track.title}
          loading="lazy"
          className="w-11 h-11 rounded-xl
            object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white text-sm
            font-medium truncate">{track.title}</p>
          <p className="text-[#9CA3AF] text-xs
            truncate">{track.channel_name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={e => {
              e.stopPropagation()
              onTogglePlay()
            }}
            className="w-10 h-10 flex items-center
              justify-center active:opacity-60">
            {isPlaying
              ? <Pause size={20} color="#FFFFFF"/>
              : <Play size={20} color="#FFFFFF"/>}
          </button>
          <button
            onClick={e => {
              e.stopPropagation()
              onNext()
            }}
            className="w-10 h-10 flex items-center
              justify-center active:opacity-60">
            <SkipForward size={20} color="#FFFFFF"/>
          </button>
        </div>
      </button>
    </div>
  )
}
