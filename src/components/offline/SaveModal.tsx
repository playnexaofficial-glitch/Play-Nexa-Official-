'use client'

import { X, HardDrive } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getStorageInfo } from '@/lib/db'

type Quality = 'auto' | 'low' | 'medium' | 'hd'

const QUALITY_OPTIONS = [
  { value: 'auto' as Quality, label: 'Auto', size: '~320 MB', desc: 'Best for connection' },
  { value: 'low' as Quality, label: 'Low', size: '~180 MB', desc: 'Saves storage' },
  { value: 'medium' as Quality, label: 'Medium', size: '~320 MB', desc: 'Recommended' },
  { value: 'hd' as Quality, label: 'HD', size: '~800 MB', desc: 'Best quality' },
]

interface SaveModalProps {
  isOpen: boolean
  onClose: () => void
  media: {
    id: string
    title: string
    thumbnail: string
    videoId: string
    duration: string
    durationSec: number
    type: 'movie' | 'short'
    language: string
    channel: string
    genre: string[]
    source: string
  }
  quality: Quality
  onQualityChange: (q: Quality) => void
  onConfirm: () => void
}

export default function SaveModal({
  isOpen,
  onClose,
  media,
  quality,
  onQualityChange,
  onConfirm,
}: SaveModalProps) {
  const [storage, setStorage] = useState({ usedMB: 0, totalMB: 4096 })

  useEffect(() => {
    if (isOpen) getStorageInfo().then(setStorage)
  }, [isOpen])

  if (!isOpen) return null

  const freeMB = storage.totalMB - storage.usedMB
  const usedPct = Math.min(Math.round((storage.usedMB / storage.totalMB) * 100), 100)

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full bg-pn-card border-t border-pn-border rounded-t-3xl p-6 z-10">
        {/* Handle */}
        <div className="w-10 h-1 bg-pn-border rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg">
            Save Offline
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-full bg-pn-border"
          >
            <X size={16} className="text-pn-muted" />
          </button>
        </div>

        {/* Media info */}
        <div className="flex gap-3 mb-5 bg-pn-bg rounded-2xl p-3">
          <img
            src={media.thumbnail}
            alt={media.title}
            className="w-20 h-14 object-cover rounded-xl flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm line-clamp-2">
              {media.title}
            </p>
            <p className="text-pn-muted text-xs mt-1">
              {media.duration} &bull; {media.language}
            </p>
          </div>
        </div>

        {/* Quality selector */}
        <p className="text-pn-muted text-xs font-medium mb-3 uppercase tracking-wide">
          Select Quality
        </p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onQualityChange(opt.value)}
              type="button"
              className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                quality === opt.value
                  ? 'bg-pn-purple/10 border-pn-purple'
                  : 'bg-pn-bg border-pn-border'
              }`}
            >
              <p
                className={`font-semibold text-sm ${
                  quality === opt.value ? 'text-pn-purple' : 'text-white'
                }`}
              >
                {opt.label}
              </p>
              <p className="text-pn-muted text-xs">{opt.size}</p>
              <p className="text-pn-muted text-[10px]">{opt.desc}</p>
            </button>
          ))}
        </div>

        {/* Storage info */}
        <div className="bg-pn-bg rounded-2xl p-3 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={14} className="text-pn-purple" />
            <p className="text-white text-xs font-medium">
              Storage Available
            </p>
            <p className="text-pn-muted text-xs ml-auto">
              {freeMB} MB free
            </p>
          </div>
          <div className="w-full h-1.5 bg-pn-border rounded-full">
            <div
              className="h-1.5 bg-pn-purple rounded-full transition-all duration-300"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="text-pn-muted text-[10px] mt-1">
            Used: {storage.usedMB} MB / {storage.totalMB} MB
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            type="button"
            className="flex-1 h-12 rounded-xl border border-pn-border text-pn-muted text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            type="button"
            className="flex-1 h-12 rounded-xl bg-pn-purple text-white text-sm font-semibold active:scale-95 transition-transform duration-150"
          >
            Save Now &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
