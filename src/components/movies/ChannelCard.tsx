// ── Play Nexa Channel Card ───────────────────────────────────
// Tapping channel opens INTERNAL /channel/[id] page
// NOT YouTube external — keeps users in Play Nexa

'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

interface Props {
  channelTitle: string
}

export default function ChannelCard({ channelTitle }: Props) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(
        `/channel/${encodeURIComponent(channelTitle)}`,
      )}
      type="button"
      className="w-full flex items-center gap-3
                 bg-pn-card border border-pn-border
                 rounded-2xl p-4 mx-4
                 active:scale-[0.97]
                 transition-transform duration-150"
      style={{ width: 'calc(100% - 2rem)' }}
    >
      {/* Channel avatar */}
      <div
        className="w-12 h-12 rounded-full flex-shrink-0
                   flex items-center justify-center
                   text-white font-bold text-lg"
        style={{
          background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)',
        }}
      >
        {channelTitle.charAt(0).toUpperCase()}
      </div>

      {/* Channel info */}
      <div className="flex-1 text-left">
        <p className="text-white font-semibold text-sm">
          {channelTitle}
        </p>
        <p className="text-pn-muted text-xs mt-0.5">
          YouTube Channel • Tap to explore
        </p>
      </div>

      {/* Arrow — indicates internal navigation */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-pn-purple font-medium">
          PLAY NEXA
        </span>
        <ChevronRight size={16} className="text-pn-purple" />
      </div>
    </button>
  )
}
