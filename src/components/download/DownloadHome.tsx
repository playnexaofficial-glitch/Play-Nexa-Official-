'use client'

// ═══════════════════════════════════════════════════════════════
// Play Nexa — Smart Download Home Screen
// URL input → auto-detect → compatible downloaders → open
// 100% client-side, zero API calls, works offline
// Min 44px touch targets, AMOLED dark, 2GB RAM optimized
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { detectPlatform, isValidUrl } from '@/lib/urlDetector'
import {
  DOWNLOAD_PLATFORMS,
  getPlatformsForSource,
  buildDownloadUrl,
} from '@/lib/platforms'
import PlatformCard from './PlatformCard'
import VideoPreview from './VideoPreview'
import CompatibleList from './CompatibleList'
import PlatformBrowserSheet from './PlatformBrowser'

export default function DownloadHome() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [detected, setDetected] = useState<ReturnType<typeof detectPlatform> | null>(null)
  const [showPlatformBrowser, setShowPlatformBrowser] = useState(false)
  const [recentUrls, setRecentUrls] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pn_dl_history') || '[]')
    } catch {
      return []
    }
  })

  // ── Handle URL change with auto-detect ──
  const handleUrlChange = useCallback((value: string) => {
    setUrl(value)
    if (!value.trim()) {
      setDetected(null)
      return
    }
    if (isValidUrl(value.trim())) {
      const result = detectPlatform(value.trim())
      setDetected(result)
    }
  }, [])

  // ── Paste from clipboard ──
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      handleUrlChange(text)
    } catch {
      // Clipboard API not available or permission denied
    }
  }, [handleUrlChange])

  // ── Clear URL input ──
  const clearUrl = useCallback(() => {
    setUrl('')
    setDetected(null)
  }, [])

  // ── Open a download platform ──
  const openPlatform = useCallback(
    (platformId: string, mode: 'select' | 'open') => {
      const platforms = detected?.platform
        ? getPlatformsForSource(detected.platform.id)
        : []
      const platform = platforms.find(p => p.id === platformId)
      if (!platform) return

      let targetUrl: string
      if (mode === 'select' && detected) {
        targetUrl = buildDownloadUrl(
          platform,
          detected.cleanUrl,
          detected.videoId || undefined
        )
      } else {
        targetUrl = platform.openUrl
      }

      // Save to recent history
      if (detected?.cleanUrl) {
        const updated = [
          detected.cleanUrl,
          ...recentUrls.filter(u => u !== detected.cleanUrl),
        ].slice(0, 5)
        setRecentUrls(updated)
        localStorage.setItem('pn_dl_history', JSON.stringify(updated))
      }

      // Open in browser
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    },
    [detected, recentUrls]
  )

  // ── Computed values ──
  const compatiblePlatforms = detected?.platform
    ? getPlatformsForSource(detected.platform.id)
    : []

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 h-14">
        <button
          onClick={() => router.back()}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white active:opacity-70"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-white font-bold text-lg absolute left-1/2 -translate-x-1/2">
          Smart Download
        </h1>
        <div className="min-w-[44px]" />
      </div>

      <div className="px-4 space-y-5 pt-2">
        {/* ── URL INPUT CARD ── */}
        <div className="bg-[#141414] rounded-2xl border border-[#1E1E1E] p-4">
          <p className="text-[#9CA3AF] text-xs mb-3 font-medium">
            🔗 Paste any video link
          </p>

          <div className="flex items-center gap-2 bg-[#0D0D0D] border border-[#2D2D2D] rounded-xl px-4 h-12 focus-within:border-[#7C3AED] transition-colors duration-150">
            <input
              type="url"
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-[#4B5563]"
            />
            {url ? (
              <button
                onClick={clearUrl}
                className="w-8 h-8 flex items-center justify-center text-[#9CA3AF] active:text-white text-lg min-h-[44px] min-w-[44px]"
              >
                ✕
              </button>
            ) : (
              <button
                onClick={handlePaste}
                className="flex items-center gap-1 text-[#7C3AED] text-xs font-semibold px-2 py-1 rounded-lg active:bg-[#7C3AED]/20 min-h-[44px] transition-colors duration-150"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Paste
              </button>
            )}
          </div>

          {/* Detected Platform Badge */}
          {detected?.platform && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#1A1A1A] rounded-full px-3 py-1.5 border border-[#2D2D2D]">
                <span className="text-sm">{detected.platform.emoji}</span>
                <span
                  className="text-sm font-medium"
                  style={{ color: detected.platform.color }}
                >
                  {detected.platform.name} detected
                </span>
                <span className="text-green-400 text-xs">✓</span>
              </div>
            </div>
          )}

          {/* Invalid URL warning */}
          {url && !isValidUrl(url) && (
            <p className="text-red-400 text-xs mt-2">
              ⚠️ Valid URL দাও (https:// দিয়ে শুরু হতে হবে)
            </p>
          )}
        </div>

        {/* ── VIDEO PREVIEW (YouTube only) ── */}
        {detected?.platform?.id === 'youtube' && detected.videoId && (
          <VideoPreview videoId={detected.videoId} />
        )}

        {/* ── COMPATIBLE DOWNLOADERS ── */}
        {detected?.platform && compatiblePlatforms.length > 0 && (
          <CompatibleList
            platforms={compatiblePlatforms}
            hasUrl={!!url}
            onSelect={id => openPlatform(id, 'select')}
            onOpen={id => openPlatform(id, 'open')}
          />
        )}

        {/* ── NO COMPATIBLE PLATFORM ── */}
        {detected && !detected.platform && isValidUrl(url) && (
          <div className="bg-[#141414] rounded-2xl border border-[#1E1E1E] p-4">
            <p className="text-[#9CA3AF] text-sm text-center">
              🔍 Platform detected but not in our list yet.
            </p>
            <p className="text-[#6B7280] text-xs text-center mt-1">
              Browse all downloaders below
            </p>
          </div>
        )}

        {/* ── DIVIDER ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#1E1E1E]" />
          <span className="text-[#4B5563] text-xs">অথবা</span>
          <div className="flex-1 h-px bg-[#1E1E1E]" />
        </div>

        {/* ── VIEW ALL PLATFORMS BUTTON ── */}
        <button
          onClick={() => setShowPlatformBrowser(true)}
          className="w-full py-4 bg-[#141414] border border-[#7C3AED]/30 rounded-2xl flex items-center justify-between px-5 min-h-[64px] active:bg-[#7C3AED]/10 transition-colors duration-150"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
              <span className="text-xl">🌍</span>
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">
                View All Platforms
              </p>
              <p className="text-[#9CA3AF] text-xs">
                {DOWNLOAD_PLATFORMS.length}+ downloaders worldwide
              </p>
            </div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7C3AED"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* ── RECENT HISTORY ── */}
        {recentUrls.length > 0 && !url && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#9CA3AF] text-xs font-medium">
                🕐 Recent
              </p>
              <button
                onClick={() => {
                  setRecentUrls([])
                  localStorage.removeItem('pn_dl_history')
                }}
                className="text-[10px] text-red-400 font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {recentUrls.map((recent, i) => (
                <button
                  key={i}
                  onClick={() => handleUrlChange(recent)}
                  className="w-full flex items-center gap-3 py-3 px-4 bg-[#141414] rounded-xl text-left active:bg-[#1E1E1E] min-h-[44px] transition-colors duration-150"
                >
                  <span className="text-sm">🔗</span>
                  <span className="text-[#9CA3AF] text-xs truncate flex-1">
                    {recent}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── HOW TO USE GUIDE ── */}
        {!url && (
          <div className="bg-[#141414] rounded-2xl border border-[#1E1E1E] p-4">
            <p className="text-white font-semibold text-sm mb-3">
              📖 কীভাবে ব্যবহার করবে?
            </p>
            {[
              { step: '1', text: 'যেকোনো ভিডিও লিংক copy করো' },
              { step: '2', text: 'উপরে Paste করো' },
              { step: '3', text: 'Platform auto-detect হবে' },
              { step: '4', text: 'Downloader select করো' },
              { step: '5', text: '"Select" → Auto-download ready!' },
            ].map(item => (
              <div
                key={item.step}
                className="flex items-start gap-3 mb-2 last:mb-0"
              >
                <div className="w-5 h-5 rounded-full bg-[#7C3AED]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#7C3AED] text-xs font-bold">
                    {item.step}
                  </span>
                </div>
                <p className="text-[#9CA3AF] text-xs leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── SECURITY NOTE ── */}
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-green-400 text-xs">🛡️</span>
          <p className="text-[10px] text-[#9CA3AF]">
            Client-side only • URL sanitized • No data sent to servers
          </p>
        </div>
      </div>

      {/* ── PLATFORM BROWSER SHEET ── */}
      {showPlatformBrowser && (
        <PlatformBrowserSheet
          onClose={() => setShowPlatformBrowser(false)}
          onOpen={url => window.open(url, '_blank', 'noopener,noreferrer')}
          currentUrl={detected?.cleanUrl || url}
          videoId={detected?.videoId || undefined}
          detectedPlatform={detected?.platform?.id}
        />
      )}
    </div>
  )
}
