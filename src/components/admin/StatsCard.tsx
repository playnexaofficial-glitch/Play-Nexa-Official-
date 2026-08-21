// ── Play Nexa Admin — Stats Card ──────────────────────────────
// Animated count-up, icon, trend indicator
// AMOLED dark theme, content-visibility: auto

'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: number
  icon: ReactNode
  color: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export default function StatsCard({ title, value, icon, color, trend, trendValue }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const hasAnimated = useRef(false)

  // Animated count-up on mount
  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    const duration = 800
    const steps = 30
    const increment = value / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  const formatNumber = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toLocaleString()
  }

  return (
    <div
      className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-5 transition-colors duration-150 hover:border-[#2D2D2D]"
      style={{ contentVisibility: 'auto' } as React.CSSProperties}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: color + '22' }}
        >
          <span style={{ color }} className="text-lg">{icon}</span>
        </div>
        <span className="text-[#9CA3AF] text-sm font-medium">{title}</span>
      </div>
      <p className="text-white font-bold text-3xl mb-1">{formatNumber(displayValue)}</p>
      {trend && trendValue && (
        <p className={`text-xs font-medium ${trend === 'up' ? 'text-[#10B981]' : trend === 'down' ? 'text-[#EF4444]' : 'text-[#9CA3AF]'}`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
        </p>
      )}
    </div>
  )
}
