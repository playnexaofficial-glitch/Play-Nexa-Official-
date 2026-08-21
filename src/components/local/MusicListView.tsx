'use client'

// ── Play Nexa Local Music List ──────────────────────────────
// Google Files (GG) inspired clean vertical list
// Component header: < Music Player back + + Add button
// Online Music promo banner · Square music note icon
// Bold title · Sub-metadata: [size] • [relative time] · Three-dot menu
// content-visibility: auto · 60 FPS scroll · 2GB RAM safe
//
// ENGINE: useDeviceMedia hook — auto-scan on native, file/folder pick on web
// UI: 100% unchanged from original

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Music, Plus, Play, Pause, Trash2, ChevronLeft,
  MoreVertical, FileAudio, Headphones, ChevronRight,
  FolderOpen, RefreshCw
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDeviceMedia } from '@/lib/useDeviceMedia'
import type { MediaFile } from '@/lib/useDeviceMedia'

export interface LocalTrack {
  id: string
  name: string
  url: string
  size: number
  duration: number
  file: File | null
  addedAt?: number
  lastPlayed?: number
}

interface MusicListViewProps {
  searchQuery: string
  currentTrackId: string | null
  isPlaying: boolean
  onPlay: (track: LocalTrack) => void
  onPause: () => void
  onConvertToMp3: (track: LocalTrack) => void
  onBack: () => void
}

// ── Relative time helper ──
function timeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short', day: '2-digit'
  })
}

/** Convert MediaFile from hook → LocalTrack for parent compatibility */
function toLocalTrack(mf: MediaFile): LocalTrack {
  return {
    id: mf.id,
    name: mf.name,
    url: mf.url,
    size: mf.size,
    duration: mf.duration,
    file: mf.file || null,
    addedAt: mf.addedAt,
    lastPlayed: mf.lastPlayed,
  }
}

export default function MusicListView({
  searchQuery, currentTrackId, isPlaying,
  onPlay, onPause, onConvertToMp3, onBack
}: MusicListViewProps) {
  const router = useRouter()
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
  } = useDeviceMedia('audio')

  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Map MediaFile[] → LocalTrack[] for parent compatibility
  const tracks: LocalTrack[] = mediaFiles.map(toLocalTrack)

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

  // ── Play / Pause ──
  const handlePlay = useCallback((track: LocalTrack) => {
    const mf = mediaFiles.find(f => f.id === track.id)
    if (!mf) return

    const playUrl = getPlayableUrl(mf)
    if (playUrl) {
      onPlay({ ...track, url: playUrl, lastPlayed: Date.now() })
    }
  }, [mediaFiles, getPlayableUrl, onPlay])

  // ── Remove track ──
  const handleRemove = useCallback((id: string) => {
    removeFile(id)
    setMenuOpen(null)
  }, [removeFile])

  // ── Format helpers ──
  const fmtSize = (b: number) => {
    if (b > 1048576) return `${(b / 1048576).toFixed(2)} MB`
    if (b > 1024) return `${(b / 1048576).toFixed(1)} MB`
    return `${(b / 1024).toFixed(0)} KB`
  }

  // ── Filter by search ──
  const filtered = tracks.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      {/* ════════════════════════════════════════════════════════
          COMPONENT HEADER — "< Music Player" + actions
          ════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 h-12">
        <button
          onClick={onBack}
          className="flex items-center gap-1 active:scale-95 transition-transform duration-100"
        >
          <ChevronLeft size={20} className="text-white" />
          <span className="text-white text-sm font-semibold">Music Player</span>
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

      {/* ════════════════════════════════════════════════════════
          ONLINE MUSIC PROMOTIONAL BANNER
          ════════════════════════════════════════════════════════ */}
      <div className="px-3 mb-3">
        <button
          onClick={() => router.push('/music')}
          className="w-full flex items-center gap-3 p-3 rounded-xl
                     bg-gradient-to-r from-[#7C5CFF]/15 to-[#00D4FF]/10
                     border border-[#7C5CFF]/15
                     active:scale-[0.98] transition-transform duration-150"
        >
          <div className="w-10 h-10 rounded-xl bg-[#7C5CFF]/20 flex items-center justify-center flex-shrink-0">
            <Headphones size={20} className="text-[#7C5CFF]" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-white text-xs font-semibold">Online Music</p>
            <p className="text-neutral-400 text-[10px] mt-0.5">Stream millions of songs</p>
          </div>
          <ChevronRight size={16} className="text-neutral-500 flex-shrink-0" />
        </button>
      </div>

      {/* ── Track list content ── */}
      <div className="px-2">
        {/* Empty state */}
        {filtered.length === 0 && !scanning && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center mb-4">
              <Music size={24} className="text-neutral-600" />
            </div>
            <p className="text-neutral-500 text-sm font-medium mb-1">No music found</p>
            <p className="text-neutral-700 text-xs text-center">
              {searchQuery ? 'Try a different search term' : isNative ? 'Pull down to scan device storage' : 'Tap "+ Add" or folder icon to add audio files'}
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
                Select Music Folder
              </button>
            )}
          </div>
        )}

        {/* ═══ GG Audio Style — Clean List Rows ═══ */}
        <div className="space-y-0.5">
          {filtered.map(track => {
            const isCurrent = currentTrackId === track.id
            const timestamp = track.addedAt || track.lastPlayed || Date.now()

            return (
              <div
                key={track.id}
                className={`relative flex items-center gap-3 px-2 py-2.5 rounded-xl
                           transition-all duration-150
                           ${isCurrent
                             ? 'bg-[#7C5CFF]/8 border border-[#7C5CFF]/12'
                             : 'active:bg-neutral-900/50'
                           }`}
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 52px' }}
              >
                {/* ── Left: Dark-gray rounded square with music note icon ── */}
                <div
                  onClick={() => {
                    if (isCurrent && isPlaying) onPause()
                    else handlePlay(track)
                  }}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                             cursor-pointer active:scale-90 transition-transform duration-100
                             ${isCurrent
                               ? 'bg-[#7C5CFF] shadow-[0_0_12px_rgba(124,92,255,0.2)]'
                               : 'bg-neutral-800/80'
                             }`}
                >
                  {isCurrent && isPlaying ? (
                    <div className="flex items-center gap-[2px]">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-[2.5px] bg-white rounded-full animate-eq-bar"
                             style={{ height: '10px', animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  ) : (
                    <Music size={16} className={isCurrent ? 'text-white' : 'text-neutral-500'} />
                  )}
                </div>

                {/* ── Center: Bold title + sub-metadata line ── */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold truncate leading-tight
                                ${isCurrent ? 'text-[#7C5CFF]' : 'text-white'}`}>
                    {track.name}
                  </p>
                  <p className="text-neutral-500 text-[10px] mt-0.5 leading-tight">
                    {fmtSize(track.size)} • {timeAgo(timestamp)}
                  </p>
                </div>

                {/* ── Right: Premium vertical three-dot option icon ── */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(menuOpen === track.id ? null : track.id)
                  }}
                  className="p-1.5 active:scale-90 transition-transform duration-100 flex-shrink-0"
                >
                  <MoreVertical size={14} className="text-neutral-600" />
                </button>

                {/* ── Context menu ── */}
                {menuOpen === track.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-2 top-12 z-30 min-w-[150px]
                                bg-neutral-900 border border-neutral-700 rounded-xl
                                overflow-hidden shadow-lg shadow-black/60
                                animate-[fade-in_100ms_ease-out]"
                  >
                    <button
                      onClick={() => {
                        if (isCurrent && isPlaying) onPause()
                        else handlePlay(track)
                        setMenuOpen(null)
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-white text-[11px]
                                 font-medium active:bg-neutral-800 transition-colors duration-100"
                    >
                      {isCurrent && isPlaying ? (
                        <>
                          <Pause size={12} className="text-[#7C5CFF]" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play size={12} className="text-[#7C5CFF]" />
                          Play
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => { onConvertToMp3(track); setMenuOpen(null) }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-white text-[11px]
                                 font-medium active:bg-neutral-800 transition-colors duration-100"
                    >
                      <FileAudio size={12} className="text-[#00D4FF]" />
                      Convert to MP3
                    </button>
                    <div className="border-t border-neutral-800" />
                    <button
                      onClick={() => handleRemove(track.id)}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-red-400 text-[11px]
                                 font-medium active:bg-neutral-800 transition-colors duration-100"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
