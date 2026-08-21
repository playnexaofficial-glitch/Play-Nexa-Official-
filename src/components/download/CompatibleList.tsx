'use client'

// ═══════════════════════════════════════════════════════════════
// Play Nexa — Compatible List Component
// Shows compatible downloaders for a detected platform
// Top 3 by default, "View All" expands full list
// content-visibility: auto for 2GB RAM optimization
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { DownloadPlatform } from '@/lib/platforms'
import PlatformCard from './PlatformCard'

interface CompatibleListProps {
  platforms: DownloadPlatform[]
  hasUrl: boolean
  onSelect: (platformId: string) => void
  onOpen: (platformId: string) => void
}

export default function CompatibleList({
  platforms,
  hasUrl,
  onSelect,
  onOpen,
}: CompatibleListProps) {
  const [showAll, setShowAll] = useState(false)

  const displayPlatforms = showAll
    ? platforms
    : platforms.slice(0, 3)

  if (platforms.length === 0) return null

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-semibold text-sm">
          ⚡ Compatible Downloaders
          <span className="text-[#9CA3AF] text-xs ml-2">
            ({platforms.length})
          </span>
        </p>
      </div>

      {/* Platform cards */}
      <div className="space-y-3">
        {displayPlatforms.map(platform => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            onSelect={() => onSelect(platform.id)}
            onOpen={() => onOpen(platform.id)}
            showSelectLabel={hasUrl}
          />
        ))}
      </div>

      {/* Show More / Show Less */}
      {platforms.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 py-3 bg-[#141414] border border-[#1E1E1E] rounded-xl text-[#7C3AED] text-sm font-semibold min-h-[44px] active:opacity-80 transition-opacity duration-150"
        >
          {showAll
            ? '▲ Show Less'
            : `View All ${platforms.length} Downloaders ▼`}
        </button>
      )}
    </div>
  )
}
