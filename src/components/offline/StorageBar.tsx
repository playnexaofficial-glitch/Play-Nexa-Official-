'use client'

import { HardDrive, Trash2 } from 'lucide-react'

interface StorageBarProps {
  usedMB: number
  totalMB: number
  moviesMB: number
  shortsMB: number
  cacheMB: number
  onClearCache: () => void
}

export default function StorageBar({
  usedMB,
  totalMB,
  moviesMB,
  shortsMB,
  cacheMB,
  onClearCache,
}: StorageBarProps) {
  const pct = Math.min(Math.round((usedMB / totalMB) * 100), 100)
  const barColor =
    pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#7C5CFF'

  return (
    <div className="bg-pn-card border border-pn-border rounded-2xl p-4 mx-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <HardDrive size={16} className="text-pn-purple" />
        <p className="text-white font-semibold text-sm">Storage</p>
        <p className="text-pn-muted text-xs ml-auto">
          {usedMB} MB / {totalMB} MB
        </p>
      </div>

      {/* Main bar */}
      <div className="w-full h-2 bg-pn-border rounded-full mb-3">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Movies', value: moviesMB, color: '#7C5CFF' },
          { label: 'Shorts', value: shortsMB, color: '#00D4FF' },
          { label: 'Cache', value: cacheMB, color: '#F59E0B' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-pn-bg rounded-xl p-2 text-center"
          >
            <div
              className="w-2 h-2 rounded-full mx-auto mb-1"
              style={{ backgroundColor: item.color }}
            />
            <p className="text-white text-xs font-semibold">
              {item.value} MB
            </p>
            <p className="text-pn-muted text-[10px]">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Clear cache button */}
      <button
        onClick={onClearCache}
        type="button"
        className="w-full h-10 rounded-xl border border-pn-border text-pn-muted text-xs font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform duration-150"
      >
        <Trash2 size={13} />
        Clear Cache
      </button>
    </div>
  )
}
