'use client'

import React from 'react'

interface VinylDiscProps {
  artwork: string | null
  isPlaying: boolean
  onTogglePlay: () => void
}

export default function VinylDisc({ artwork, isPlaying, onTogglePlay }: VinylDiscProps) {
  return (
    <button
      onClick={onTogglePlay}
      className="relative w-[260px] h-[260px] rounded-full mx-auto focus:outline-none music-btn-press"
      style={{ ['--vinyl-state' as string]: isPlaying ? 'running' : 'paused' }}
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      {/* Vinyl disc body */}
      <div className="music-vinyl-spin w-full h-full rounded-full relative overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, transparent 28%, rgba(30,30,30,0.9) 29%, rgba(30,30,30,0.9) 30%, transparent 30.5%),
            radial-gradient(circle at 50% 50%, transparent 38%, rgba(30,30,30,0.6) 39%, rgba(30,30,30,0.6) 40%, transparent 40.5%),
            radial-gradient(circle at 50% 50%, transparent 48%, rgba(30,30,30,0.4) 49%, rgba(30,30,30,0.4) 50%, transparent 50.5%),
            radial-gradient(circle at 50% 50%, transparent 58%, rgba(30,30,30,0.3) 59%, rgba(30,30,30,0.3) 60%, transparent 60.5%),
            radial-gradient(circle at 50% 50%, transparent 68%, rgba(30,30,30,0.2) 69%, rgba(30,30,30,0.2) 70%, transparent 70.5%),
            radial-gradient(circle at 50% 50%, #1A1A1A 0%, #111111 100%)
          `,
        }}
      >
        {/* Shine effect */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%)',
          }}
        />

        {/* Center label / artwork */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] h-[55%] rounded-full overflow-hidden border-2 border-[#222222]">
          {artwork ? (
            <img
              src={artwork}
              alt="Album artwork"
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1A0A3E 0%, #0A1A3E 100%)',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}
          {/* Center hole */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0A0A0A] border border-[#333333]" />
        </div>
      </div>
    </button>
  )
}
