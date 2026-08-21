'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (msg: string) => {
    // Clear any in-flight auto-dismiss timer so a rapid second tap
    // doesn't get cut short by the first tap's timer.
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }
    setToast(msg)
    toastTimerRef.current = setTimeout(() => {
      setToast('')
      toastTimerRef.current = null
    }, 2500)
  }

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const features = [
    {
      icon: (
        <svg width="28" height="28"
          viewBox="0 0 24 24" fill="none"
          stroke="#7C3AED" strokeWidth="2"
          strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5
            a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      ),
      title: 'Smart Download',
      subtitle: 'Videos & Audio',
      route: '/download',
    },
    {
      icon: (
        <svg width="28" height="28"
          viewBox="0 0 24 24" fill="none"
          stroke="#7C3AED" strokeWidth="2"
          strokeLinecap="round">
          <rect x="2" y="2" width="20"
            height="20" rx="2.18" ry="2.18"/>
          <line x1="7" y1="2" x2="7" y2="22"/>
          <line x1="17" y1="2" x2="17" y2="22"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <line x1="2" y1="7" x2="7" y2="7"/>
          <line x1="2" y1="17" x2="7" y2="17"/>
          <line x1="17" y1="17" x2="22" y2="17"/>
          <line x1="17" y1="7" x2="22" y2="7"/>
        </svg>
      ),
      title: 'Movie Hub',
      subtitle: 'Watch Free Movies',
      route: '/movies',
    },
    {
      icon: (
        <svg width="28" height="28"
          viewBox="0 0 24 24" fill="none"
          stroke="#7C3AED" strokeWidth="2"
          strokeLinecap="round">
          <rect x="6" y="11" width="2" height="2"/>
          <rect x="10" y="11" width="2" height="2"/>
          <path d="M6 7h12l1 5H5L6 7z"/>
          <circle cx="9" cy="17" r="2"/>
          <circle cx="15" cy="17" r="2"/>
        </svg>
      ),
      title: 'Offline Games',
      subtitle: 'Play Anytime',
      route: '/games',
    },
    {
      icon: (
        <svg width="28" height="28"
          viewBox="0 0 24 24" fill="none"
          stroke="#7C3AED" strokeWidth="2"
          strokeLinecap="round">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      ),
      title: 'Music Player',
      subtitle: 'Listen & Enjoy',
      route: '/music',
    },
    {
      icon: (
        <svg width="28" height="28"
          viewBox="0 0 24 24" fill="none"
          stroke="#7C3AED" strokeWidth="2"
          strokeLinecap="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      ),
      title: 'Video Player',
      subtitle: 'Custom Player',
      route: '/video',
    },
    {
      icon: (
        <svg width="28" height="28"
          viewBox="0 0 24 24" fill="none"
          stroke="#7C3AED" strokeWidth="2"
          strokeLinecap="round">
          <rect x="4" y="4" width="7" height="7" rx="1.5"/>
          <rect x="13" y="4" width="7" height="7" rx="1.5"/>
          <rect x="4" y="13" width="7" height="7" rx="1.5"/>
          <rect x="13" y="13" width="7" height="7" rx="1.5"/>
        </svg>
      ),
      title: 'More Tools',
      subtitle: 'Coming Soon',
      route: null, // no navigation — shows toast instead
    },
  ]

  return (
    <div className="flex flex-col min-h-screen
      bg-[#0D0D0D] pb-20">

      {/* HEADER */}
      <div className="flex items-center
        justify-between px-5 pt-5 pb-3">
        <div className="flex items-baseline gap-0">
          <span className="text-[#7C3AED]
            font-bold text-2xl">Play</span>
          <span className="text-white
            font-bold text-2xl">Nexa</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/search')}
            className="w-11 h-11 rounded-full
              bg-[#1A1A2E] flex items-center
              justify-center active:opacity-70">
            <svg width="20" height="20"
              viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="w-11 h-11 rounded-full
              bg-[#1A1A2E] flex items-center
              justify-center active:opacity-70">
            <svg width="20" height="20"
              viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0
                .33 1.82l.06.06a2 2 0 0 1-2.83
                2.83l-.06-.06a1.65 1.65 0 0 0
                -1.82-.33 1.65 1.65 0 0 0-1
                1.51V21a2 2 0 0 1-4 0v-.09A1.65
                1.65 0 0 0 9 19.4a1.65 1.65 0 0
                0-1.82.33l-.06.06a2 2 0 0 1-2.83
                -2.83l.06-.06A1.65 1.65 0 0 0
                4.68 15a1.65 1.65 0 0 0-1.51-1H3
                a2 2 0 0 1 0-4h.09A1.65 1.65 0 0
                0 4.6 9a1.65 1.65 0 0 0-.33-1.82
                l-.06-.06a2 2 0 0 1 2.83-2.83
                l.06.06A1.65 1.65 0 0 0 9 4.68
                a1.65 1.65 0 0 0 1-1.51V3a2 2
                0 0 1 4 0v.09a1.65 1.65 0 0 0
                1 1.51 1.65 1.65 0 0 0 1.82-.33
                l.06-.06a2 2 0 0 1 2.83 2.83
                l-.06.06A1.65 1.65 0 0 0 19.4
                9a1.65 1.65 0 0 0 1.51 1H21
                a2 2 0 0 1 0 4h-.09a1.65 1.65
                0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* HERO TEXT */}
      <div className="px-5 pt-4 pb-8">
        <h1 className="text-[#7C3AED] font-bold
          text-4xl leading-tight">
          Your Ultimate Media{' '}
          <span className="text-[#06B6D4]">
            Universe
          </span>
          {' '}
          <span className="inline-block w-6 h-6
            bg-[#06B6D4] rounded-sm align-middle
            mb-1"/>
        </h1>
        <p className="text-[#9CA3AF] text-base
          mt-3 leading-relaxed">
          Download, watch, play and manage
          entertainment — all in one place.
        </p>
      </div>

      {/* FEATURE CARDS GRID */}
      <div className="px-4 grid grid-cols-2
        gap-3">
        {features.map((feature) => (
          <button
            key={feature.title}
            onClick={() => {
              if (feature.route) {
                router.push(feature.route)
              } else {
                showToast('🚀 More tools coming soon! Stay tuned.')
              }
            }}
            className={`bg-[#12121C] rounded-2xl
              p-5 text-left flex flex-col gap-4
              min-h-[120px] border border-[#1E1E2E]
              active:scale-95 transition-transform
              duration-150
              ${feature.route ? '' : 'opacity-70'}`}
          >
            <div className="w-11 h-11 rounded-xl
              bg-[#7C3AED]/10 flex items-center
              justify-center">
              {feature.icon}
            </div>
            <div>
              <p className="text-white font-semibold
                text-[15px] leading-tight">
                {feature.title}
              </p>
              <p className="text-[#9CA3AF] text-xs
                mt-0.5">
                {feature.subtitle}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* TOAST (for More Tools card) */}
      {toast && (
        <div className="fixed bottom-24 left-1/2
          -translate-x-1/2 z-[70] bg-[#1A1A1A]
          border border-[#2D2D2D] rounded-full
          px-5 py-3 shadow-lg">
          <p className="text-white text-sm
            whitespace-nowrap">{toast}</p>
        </div>
      )}

      {/* QUICK TOOLS */}
      <div className="px-5 mt-8">
        <h2 className="text-white font-bold
          text-lg mb-4">
          ⚡ Quick Tools
        </h2>
        <div className="flex gap-3 overflow-x-auto
          scrollbar-hide pb-2">
          {[
            { emoji: '🚀', label: 'Speed Mode' },
            { emoji: '🗑️', label: 'Clear Cache' },
            { emoji: '🌙', label: 'Dark Mode' },
          ].map((tool) => (
            <button
              key={tool.label}
              className="flex items-center gap-2
                px-4 py-3 bg-[#12121C] rounded-full
                border border-[#1E1E2E]
                whitespace-nowrap min-h-[44px]
                active:opacity-70 flex-shrink-0"
            >
              <span>{tool.emoji}</span>
              <span className="text-white text-sm
                font-medium">
                {tool.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
