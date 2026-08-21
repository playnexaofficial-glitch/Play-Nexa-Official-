'use client'

// ═══════════════════════════════════════════════════════════════
// Play Nexa — Platform Browser (Full-Screen Sheet)
// Browse all 30+ download platforms with search & filters
// Collapsible categories, content-visibility: auto
// Min 44px touch targets, AMOLED dark, 2GB RAM friendly
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react'
import {
  DOWNLOAD_PLATFORMS,
  buildDownloadUrl,
  DownloadPlatform,
} from '@/lib/platforms'
import PlatformCard from './PlatformCard'

interface PlatformBrowserProps {
  onClose: () => void
  onOpen: (url: string) => void
  currentUrl?: string
  videoId?: string
  detectedPlatform?: string
}

const FILTERS = [
  { id: 'all', label: '🌍 All' },
  { id: 'youtube', label: '▶️ YouTube' },
  { id: 'tiktok', label: '🎵 TikTok' },
  { id: 'instagram', label: '📸 Instagram' },
  { id: 'facebook', label: '📘 Facebook' },
  { id: 'twitter', label: '🐦 Twitter' },
  { id: 'music', label: '🎵 Music' },
  { id: 'other', label: '🎬 Other' },
] as const

const CATEGORY_LABELS: Record<string, string> = {
  universal: '🌍 Universal Downloaders',
  youtube: '▶️ YouTube Downloaders',
  tiktok: '🎵 TikTok Downloaders',
  instagram: '📸 Instagram Downloaders',
  facebook: '📘 Facebook Downloaders',
  twitter: '🐦 Twitter Downloaders',
  music: '🎵 Music Downloaders',
  other: '🎬 Other Platforms',
}

const CATEGORY_ORDER = ['universal', 'youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'music', 'other']

export default function PlatformBrowserSheet({
  onClose,
  onOpen,
  currentUrl,
  videoId,
  detectedPlatform,
}: PlatformBrowserProps) {
  const [activeFilter, setActiveFilter] = useState(
    detectedPlatform || 'all'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] =
    useState<Record<string, boolean>>({
      universal: true,
      youtube: false,
      tiktok: false,
      instagram: false,
      facebook: false,
      twitter: false,
      music: false,
      other: false,
    })

  // Filter and search platforms
  const filteredPlatforms = useMemo(() => {
    let platforms = DOWNLOAD_PLATFORMS

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      platforms = platforms.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.features.some(f => f.toLowerCase().includes(q))
      )
    }

    if (activeFilter !== 'all') {
      platforms = platforms.filter(
        p =>
          p.supports.includes(activeFilter) ||
          p.category === activeFilter
      )
    }

    return platforms
  }, [activeFilter, searchQuery])

  // Group by category
  const grouped = useMemo(() => {
    return filteredPlatforms.reduce(
      (acc, p) => {
        if (!acc[p.category]) acc[p.category] = []
        acc[p.category].push(p)
        return acc
      },
      {} as Record<string, DownloadPlatform[]>
    )
  }, [filteredPlatforms])

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat],
    }))
  }

  const handlePlatformAction = (
    platform: DownloadPlatform,
    mode: 'select' | 'open'
  ) => {
    if (mode === 'select' && currentUrl) {
      const url = buildDownloadUrl(platform, currentUrl, videoId)
      onOpen(url)
    } else {
      onOpen(platform.openUrl)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55] bg-black/80"
        onClick={onClose}
      />

      {/* Full-screen sheet */}
      <div className="fixed inset-0 z-[56] bg-[#0D0D0D] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#1A1A1A] flex-shrink-0">
          <h2 className="text-white font-bold text-lg">
            🌍 All Platforms
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[#9CA3AF] text-xs">
              {filteredPlatforms.length} downloaders
            </span>
            <button
              onClick={onClose}
              className="w-9 h-9 bg-[#1A1A1A] rounded-xl text-[#9CA3AF] flex items-center justify-center active:bg-[#2D2D2D] min-h-[44px] min-w-[44px] transition-colors duration-150"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3 bg-[#141414] rounded-xl px-4 h-11 border border-[#1E1E1E] focus-within:border-[#7C3AED] transition-colors duration-150">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search downloaders..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-[#4B5563]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[#9CA3AF] text-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-[#1A1A1A]">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap min-h-[36px] flex-shrink-0 transition-colors duration-150 ${
                  activeFilter === filter.id
                    ? 'bg-[#7C3AED] text-white'
                    : 'bg-[#141414] text-[#9CA3AF] border border-[#1E1E1E]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform List */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{ contentVisibility: 'auto' }}
        >
          {CATEGORY_ORDER.map(cat => {
            const platforms = grouped[cat]
            if (!platforms || platforms.length === 0) return null

            return (
              <div key={cat}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between py-3 min-h-[44px]"
                >
                  <span className="text-white font-semibold text-sm">
                    {CATEGORY_LABELS[cat] || cat}
                    <span className="text-[#9CA3AF] text-xs ml-2">
                      ({platforms.length})
                    </span>
                  </span>
                  <span className="text-[#9CA3AF] text-sm">
                    {expandedCategories[cat] ? '▲' : '▼'}
                  </span>
                </button>

                {/* Category Platforms */}
                {expandedCategories[cat] && (
                  <div className="space-y-3 mb-2">
                    {platforms
                      .sort((a, b) => {
                        if (a.isRecommended && !b.isRecommended) return -1
                        if (!a.isRecommended && b.isRecommended) return 1
                        return b.rating - a.rating
                      })
                      .map(platform => (
                        <PlatformCard
                          key={platform.id}
                          platform={platform}
                          onSelect={() =>
                            handlePlatformAction(platform, 'select')
                          }
                          onOpen={() =>
                            handlePlatformAction(platform, 'open')
                          }
                          showSelectLabel={!!currentUrl}
                          compact={false}
                        />
                      ))}
                  </div>
                )}
              </div>
            )
          })}

          {filteredPlatforms.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#4B5563] text-4xl mb-3">🔍</p>
              <p className="text-[#9CA3AF] text-sm">
                No downloaders found
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
