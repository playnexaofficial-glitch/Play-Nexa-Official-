// ── Play Nexa Stealth Video Player ──────────────────────────────
// YouTube iframe with MAXIMUM branding removal
// Parameters: controls=1&modestbranding=1&rel=0&showinfo=0
//   &iv_load_policy=3&disablekb=1&playsinline=1
// Custom Tailwind overlay to crop/hide YouTube watermarks
// GPU-only animations (opacity) — no backdrop-blur, no filters
// 2GB RAM safe — iframe loads on mount, unloads on close

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface StealthPlayerProps {
  videoId: string
  title: string
  /** Called when the player should close */
  onClose?: () => void
  /** Show close button — default true for modal use */
  showClose?: boolean
  /** Show the Play Nexa NOW PLAYING badge */
  showBadge?: boolean
  /** Auto-start playback — default true */
  autoplay?: boolean
  /** Extra CSS class for the outer container */
  className?: string
}

export default function StealthPlayer({
  videoId,
  title,
  onClose,
  showClose = true,
  showBadge = true,
  autoplay = true,
  className = '',
}: StealthPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Build the YouTube embed URL with maximum branding removal
  const embedUrl = useCallback(() => {
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      controls: '1',           // Show player controls
      modestbranding: '1',     // Reduce YouTube branding
      rel: '0',                // Don't show related videos at end
      showinfo: '0',           // Hide video title/info bar
      iv_load_policy: '3',     // Hide annotations
      disablekb: '1',          // Disable keyboard controls (prevents YouTube shortcuts overlay)
      playsinline: '1',        // Play inline on mobile (no fullscreen auto)
      fs: '1',                 // Allow fullscreen button
      color: 'white',          // White progress bar (subtle)
      cc_load_policy: '0',     // Don't auto-show captions
      cc_lang_pref: 'en',      // Caption language preference
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    })

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
  }, [videoId, autoplay])

  // Handle iframe load
  const handleLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black rounded-xl overflow-hidden ${className}`}
    >
      {/* ── TOP WATERMARK OVERLAY ──
          Crops the top ~40px where YouTube sometimes shows a title bar
          Uses a gradient overlay that fades from black to transparent */}
      <div className="absolute top-0 left-0 right-0 h-[38px] z-10 pointer-events-none bg-gradient-to-b from-black/70 via-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />

      {/* ── BOTTOM WATERMARK OVERLAY ──
          Crops the bottom ~30px where YouTube shows the loading bar and links
          Only visible on hover to allow normal controls interaction */}
      <div className="absolute bottom-0 left-0 right-0 h-[28px] z-10 pointer-events-none bg-gradient-to-t from-black/50 via-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />

      {/* ── Play Nexa BADGE ── */}
      {showBadge && (
        <div className="absolute top-2.5 right-2.5 z-20 bg-pn-purple/90 rounded-lg px-2.5 py-1 pointer-events-none">
          <p className="text-white text-[11px] font-bold tracking-wide">Play Nexa</p>
        </div>
      )}

      {/* ── CLOSE BUTTON ── */}
      {showClose && onClose && (
        <button
          onClick={onClose}
          type="button"
          className="absolute top-2.5 left-2.5 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center transition-colors duration-150 min-h-[44px] min-w-[44px]"
          aria-label="Close player"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* ── LOADING SHIMMER ── */}
      {!isLoaded && (
        <div className="absolute inset-0 z-5 flex items-center justify-center bg-pn-card">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-pn-purple/20 flex items-center justify-center animate-pulse">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#7C5CFF">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-pn-muted text-xs">Loading player...</p>
          </div>
        </div>
      )}

      {/* ── YOUTUBE IFRAME ──
          Wrapped in an aspect-video container with slight negative margins
          to crop YouTube's top/bottom branding areas */}
      <div className="relative aspect-video overflow-hidden">
        {/* Crop top ~12px — hides YouTube's thin top bar */}
        <div className="absolute -top-[10px] left-0 right-0 bottom-0">
          <iframe
            src={embedUrl()}
            className="w-full h-[calc(100%+10px)]"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            style={{ border: 'none' }}
            title={title}
            loading="lazy"
            onLoad={handleLoad}
          />
        </div>
      </div>
    </div>
  )
}
