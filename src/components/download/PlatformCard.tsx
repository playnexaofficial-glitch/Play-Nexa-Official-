'use client'

// ═══════════════════════════════════════════════════════════════
// Play Nexa — Platform Card Component
// Renders a single download platform with rating, speed, features
// Min 44px touch targets, AMOLED dark, max 200ms transitions
// ═══════════════════════════════════════════════════════════════

import {
  DownloadPlatform,
  getSpeedLabel,
  getSpeedColor,
} from '@/lib/platforms'

interface PlatformCardProps {
  platform: DownloadPlatform
  onSelect: () => void
  onOpen: () => void
  showSelectLabel: boolean
  compact?: boolean
}

export default function PlatformCard({
  platform,
  onSelect,
  onOpen,
  showSelectLabel,
  compact = false,
}: PlatformCardProps) {
  const speedColor = getSpeedColor(platform.speed)

  return (
    <div
      className="bg-[#141414] rounded-2xl border border-[#1E1E1E] p-4"
      style={{ contentVisibility: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ backgroundColor: platform.logoBg || '#1A1A2E' }}
          >
            <img
              src={platform.logo}
              alt={platform.name}
              width={36}
              height={36}
              loading="lazy"
              className="w-9 h-9 object-contain rounded-lg"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = `<span style="color:#7C3AED;font-weight:bold;font-size:18px">${platform.name[0].toUpperCase()}</span>`
                }
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm truncate">
                {platform.name}
              </p>
              {platform.isRecommended && (
                <span className="text-xs px-1.5 py-0.5 bg-[#7C3AED]/20 text-[#A78BFA] rounded-full flex-shrink-0">
                  ⭐ Best
                </span>
              )}
              {platform.isVerified && (
                <span className="text-xs text-green-400 flex-shrink-0">✓</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-yellow-400 text-xs">
                {'★'.repeat(Math.floor(platform.rating))}
                {'☆'.repeat(5 - Math.floor(platform.rating))}
              </span>
              <span className="text-[#9CA3AF] text-xs">
                {platform.rating}
              </span>
            </div>
          </div>
        </div>

        {/* Speed badge */}
        <span
          className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
          style={{
            backgroundColor: speedColor + '20',
            color: speedColor,
          }}
        >
          {getSpeedLabel(platform.speed)}
        </span>
      </div>

      {/* Features */}
      {!compact && (
        <div className="flex flex-wrap gap-2 mb-3">
          {platform.features.slice(0, 4).map(feature => (
            <span
              key={feature}
              className="text-xs px-2 py-1 bg-[#1E1E1E] text-[#9CA3AF] rounded-full"
            >
              {feature}
            </span>
          ))}
          {platform.isFree && (
            <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded-full border border-green-800/50">
              Free
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] active:opacity-80 transition-opacity duration-150"
          style={{
            backgroundColor: showSelectLabel ? '#7C3AED' : '#7C3AED20',
            color: showSelectLabel ? '#FFFFFF' : '#A78BFA',
            border: showSelectLabel ? 'none' : '1px solid #7C3AED40',
          }}
        >
          {showSelectLabel ? '⚡ Select & Download' : '✓ Select'}
        </button>

        <button
          onClick={onOpen}
          className="px-4 py-2.5 rounded-xl bg-[#1E1E1E] text-[#9CA3AF] text-sm min-h-[44px] active:bg-[#2D2D2D] flex items-center gap-1 whitespace-nowrap transition-colors duration-150"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open
        </button>
      </div>
    </div>
  )
}
