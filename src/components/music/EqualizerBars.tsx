'use client'

import React from 'react'

interface EqualizerBarsProps {
  isPlaying: boolean
  className?: string
}

export default function EqualizerBars({ isPlaying, className = '' }: EqualizerBarsProps) {
  return (
    <div
      className={`flex items-end gap-[2px] h-5 ${className}`}
      style={{ ['--eq-state' as string]: isPlaying ? 'running' : 'paused' }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="music-eq-bar" />
      ))}
    </div>
  )
}
