'use client'

// ── Play Nexa Local Video Grid ──────────────────────────────
// Google Files (GG) inspired visual grid layout
// Component header: < Video Player back + + Add button
// 3-col mobile · 4-col md · gap-2
// Chronological sectioning by date metadata
// Glassmorphism play icon · Size overlay · content-visibility: auto
// Three-dot actions: Play, Convert to MP3, Delete
//
// ENGINE: useDeviceMedia hook — auto-scan on native, file/folder pick on web
// UI: 100% unchanged from original

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Plus, Trash2, Play, Film, ChevronLeft,
  MoreVertical, FileAudio, FolderOpen, RefreshCw
} from 'lucide-react'
import { useDeviceMedia } from '@/lib/useDeviceMedia'
import type { MediaFile } from '@/lib/useDeviceMedia'

export interface LocalVideo {
  id: string
  name: string
  url: string
  size: number
  duration: number
  file: File | null
  folder: string
  addedAt?: number
  lastPlayed?: number
}

interface VideoGridViewProps {
  searchQuery: string
  onPlay: (video: LocalVideo) => void
  onConvertToMp3: (video: LocalVideo) => void
  onBack: () => void
}

// ── Chronological date group helper ──
function getDateGroup(timestamp: number): string {
  const now = new Date()
  const date = new Date(timestamp)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const fileDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - fileDay.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' })
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

/** Convert MediaFile from hook → LocalVideo for parent compatibility */
function toLocalVideo(mf: MediaFile): LocalVideo {
  return {
    id: mf.id,
    name: mf.name,
    url: mf.url,
    size: mf.size,
    duration: mf.duration,
    file: mf.file || null,
    folder: mf.folder,
    addedAt: mf.addedAt,
    lastPlayed: mf.lastPlayed,
  }
}

export default function VideoGridView({
  searchQuery, onPlay, onConvertToMp3, onBack
}: VideoGridViewProps) {
  const {
    files: mediaFiles,
    scanning,
    isNative,
    scanProgress,
    pickFiles,
    pickFolder,
    refreshScan,
    removeFile,
    getPlayableUrl,
  } = useDeviceMedia('video')

  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({})
  const menuRef = useRef<HTMLDivElement>(null)

  // Map MediaFile[] → LocalVideo[] for parent compatibility
  const videos: LocalVideo[] = mediaFiles.map(toLocalVideo)

  // ── Generate thumbnails for videos with URLs ──
  useEffect(() => {
    const pendingThumbnails: string[] = []

    mediaFiles.forEach(v => {
      if (v.url && !thumbnailMap[v.id]) pendingThumbnails.push(v.id)
    })

    // Limit concurrent thumbnail generation for 2GB RAM
    const toProcess = pendingThumbnails.slice(0, 6)

    toProcess.forEach(vidId => {
      const v = mediaFiles.find(x => x.id === vidId)
      if (!v?.url) return
      const vid = document.createElement('video')
      vid.preload = 'metadata'
      vid.src = v.url
      vid.currentTime = 1
      vid.onloadeddata = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 240
          canvas.height = 135
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(vid, 0, 0, 240, 135)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5)
            setThumbnailMap(prev => ({ ...prev, [vidId]: dataUrl }))
          }
        } catch {}
        // Clean up the video element
        vid.src = ''
        vid.load()
      }
    })
   
  }, [mediaFiles.length])

  // ── Close menu on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // ── Play video ──
  const handlePlay = useCallback((video: LocalVideo) => {
    const mf = mediaFiles.find(f => f.id === video.id)
    if (!mf) return

    const playUrl = getPlayableUrl(mf)
    if (playUrl) {
      onPlay({ ...video, url: playUrl, lastPlayed: Date.now() })
    }
  }, [mediaFiles, getPlayableUrl, onPlay])

  // ── Remove video ──
  const handleRemove = useCallback((id: string) => {
    removeFile(id)
    setMenuOpen(null)
  }, [removeFile])

  // ── Format helpers ──
  const fmtSize = (b: number) => {
    if (b > 1073741824) return `${(b / 1073741824).toFixed(1)} GB`
    if (b > 1048576) return `${(b / 1048576).toFixed(2)} MB`
    return `${(b / 1048576).toFixed(0)} MB`
  }

  const fmtDur = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── Filter by search ──
  const filtered = videos.filter(v =>
    !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Group by chronological date ──
  const dateGroups = filtered.reduce<Record<string, LocalVideo[]>>((acc, v) => {
    const timestamp = v.addedAt || v.lastPlayed || Date.now()
    const group = getDateGroup(timestamp)
    if (!acc[group]) acc[group] = []
    acc[group].push(v)
    return acc
  }, {})

  const sortedGroups = Object.entries(dateGroups).sort(([, a], [, b]) => {
    const aTime = Math.max(...a.map(v => v.addedAt || v.lastPlayed || 0))
    const bTime = Math.max(...b.map(v => v.addedAt || v.lastPlayed || 0))
    return bTime - aTime
  })

  return (
    <div>
      {/* ════════════════════════════════════════════════════════
          COMPONENT HEADER — "< Video Player" + actions
          ════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 h-12">
        <button
          onClick={onBack}
          className="flex items-center gap-1 active:scale-95 transition-transform duration-100"
        >
          <ChevronLeft size={20} className="text-white" />
          <span className="text-white text-sm font-semibold">Video Player</span>
        </button>
        <div className="flex items-center gap-1.5">
          {/* Refresh scan (native only) */}
          {isNative && (
            <button
              onClick={refreshScan}
              disabled={scanning}
              className="flex items-center gap-1 px-2.5 h-8 rounded-lg
                         bg-neutral-900 border border-neutral-800
                         text-neutral-400 text-[10px] font-semibold
                         active:scale-95 transition-transform duration-100"
            >
              <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
            </button>
          )}
          {/* Folder picker */}
          <button
            onClick={pickFolder}
            className="flex items-center gap-1 px-2.5 h-8 rounded-lg
                       bg-neutral-900 border border-neutral-800
                       text-neutral-400 text-[10px] font-semibold
                       active:scale-95 transition-transform duration-100"
          >
            <FolderOpen size={12} />
          </button>
          {/* Add files */}
          <button
            onClick={pickFiles}
            className="flex items-center gap-1 px-3 h-8 rounded-lg
                       bg-[#7C5CFF]/10 border border-[#7C5CFF]/20
                       text-[#7C5CFF] text-[11px] font-semibold
                       active:scale-95 transition-transform duration-100"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* ── Scan progress bar ── */}
      {scanning && scanProgress && (
        <div className="px-3 mb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                          bg-[#7C5CFF]/5 border border-[#7C5CFF]/10">
            <RefreshCw size={12} className="text-[#7C5CFF] animate-spin" />
            <span className="text-[#7C5CFF] text-[10px] font-medium">
              {scanProgress}
            </span>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="px-2 space-y-5">
        {/* Empty state */}
        {filtered.length === 0 && !scanning && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4">
              <Film size={28} className="text-neutral-600" />
            </div>
            <p className="text-neutral-500 text-sm font-medium mb-1">No videos found</p>
            <p className="text-neutral-700 text-xs text-center">
              {searchQuery ? 'Try a different search term' : isNative ? 'Pull down to scan device storage' : 'Tap "+ Add" or folder icon to pick videos'}
            </p>
            {/* Folder picker CTA for web */}
            {!isNative && !searchQuery && (
              <button
                onClick={pickFolder}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl
                           bg-[#7C5CFF]/10 border border-[#7C5CFF]/20
                           text-[#7C5CFF] text-xs font-semibold
                           active:scale-95 transition-transform duration-150"
              >
                <FolderOpen size={16} />
                Select Video Folder
              </button>
            )}
          </div>
        )}

        {/* ── Chronological video grid ── */}
        {sortedGroups.map(([dateLabel, vids]) => (
          <div key={dateLabel}>
            {/* Date sub-header */}
            <p className="text-neutral-400 text-[11px] font-semibold tracking-wide px-1 mb-2">
              {dateLabel}
            </p>

            {/* ═══ GG Visual Grid: 3-col mobile, 4-col md ═══ */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {vids.map(video => (
                <div
                  key={video.id}
                  className="relative rounded-lg overflow-hidden
                             active:scale-[0.97] transition-transform duration-150"
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 160px' }}
                >
                  {/* ── Thumbnail area ── */}
                  <button
                    onClick={() => handlePlay(video)}
                    className="relative w-full aspect-square bg-neutral-900 flex items-center justify-center block"
                  >
                    {/* Thumbnail image or placeholder */}
                    {thumbnailMap[video.id] ? (
                      <img
                        src={thumbnailMap[video.id]}
                        alt={video.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Film size={18} className="text-neutral-700 z-10" />
                    )}

                    {/* ── Glassmorphism play icon ── */}
                    <div className="absolute inset-0 flex items-center justify-center
                                    active:opacity-100">
                      <div className="w-9 h-9 rounded-full bg-white/15
                                      flex items-center justify-center
                                      border border-white/20
                                      shadow-[0_0_12px_rgba(0,0,0,0.5)]">
                        <Play size={14} className="text-white ml-0.5" fill="white" />
                      </div>
                    </div>

                    {/* ── File size overlay ── */}
                    <span className="absolute top-1.5 right-1.5 bg-black/65 text-neutral-200
                                   text-[7px] font-semibold px-1.5 py-[3px] rounded
                                   leading-none">
                      {fmtSize(video.size)}
                    </span>

                    {/* ── Duration badge ── */}
                    {video.duration > 0 && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/75 text-white
                                     text-[8px] font-mono font-medium px-1 py-0.5 rounded
                                     leading-none">
                        {fmtDur(video.duration)}
                      </span>
                    )}

                    {/* ── Re-pick indicator ── */}
                    {!video.url && (
                      <span className="absolute top-1.5 left-1.5 bg-yellow-500/25 text-yellow-400
                                     text-[6px] font-bold px-1 py-0.5 rounded-full uppercase
                                     leading-none">
                        Re-pick
                      </span>
                    )}
                  </button>

                  {/* ── File name ── */}
                  <div className="px-1 pt-1.5 pb-1 relative">
                    <p className="text-white text-[10px] font-medium truncate leading-tight pr-5">
                      {video.name}
                    </p>

                    {/* Three-dot menu trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpen(menuOpen === video.id ? null : video.id)
                      }}
                      className="absolute top-1 right-0 p-1 rounded-full
                                 active:scale-90 transition-transform duration-100"
                    >
                      <MoreVertical size={12} className="text-neutral-500" />
                    </button>
                  </div>

                  {/* ── Context menu ── */}
                  {menuOpen === video.id && (
                    <div
                      ref={menuRef}
                      className="absolute left-0 right-0 top-full z-30 min-w-[150px]
                                 bg-neutral-900 border border-neutral-700 rounded-xl
                                 overflow-hidden shadow-lg shadow-black/60
                                 animate-[fade-in_100ms_ease-out]"
                    >
                      <button
                        onClick={() => { handlePlay(video); setMenuOpen(null) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-white text-[11px]
                                   font-medium active:bg-neutral-800 transition-colors duration-100"
                      >
                        <Play size={12} className="text-[#7C5CFF]" />
                        Play
                      </button>
                      <button
                        onClick={() => { onConvertToMp3(video); setMenuOpen(null) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-white text-[11px]
                                   font-medium active:bg-neutral-800 transition-colors duration-100"
                      >
                        <FileAudio size={12} className="text-[#00D4FF]" />
                        Convert to MP3
                      </button>
                      <div className="border-t border-neutral-800" />
                      <button
                        onClick={() => handleRemove(video.id)}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-red-400 text-[11px]
                                   font-medium active:bg-neutral-800 transition-colors duration-100"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
