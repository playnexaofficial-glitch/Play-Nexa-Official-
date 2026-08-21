'use client'

// ── Play Nexa Local Music List ──────────────────────────────
// List of local audio tracks with title, duration, metadata
// URL.createObjectURL() for zero-memory-bloat streaming
// Virtualized-friendly list for 60 FPS on 2GB RAM

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Music, Plus, Play, Pause, Trash2,
  Headphones, MoreVertical, Clock
} from 'lucide-react'

export interface LocalTrack {
  id: string
  name: string
  url: string        // Object URL — ephemeral
  size: number
  duration: number
  file: File
  artist?: string
  lastPlayed?: number
}

interface MusicListProps {
  currentTrackId: string | null
  isPlaying: boolean
  onPlay: (track: LocalTrack) => void
  onPause: () => void
}

export default function MusicList({ currentTrackId, isPlaying, onPlay, onPause }: MusicListProps) {
  const [tracks, setTracks] = useState<LocalTrack[]>([])
  const [contextMenu, setContextMenu] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load metadata from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pn_local_tracks')
      if (saved) {
        const meta = JSON.parse(saved) as Array<{
          id: string; name: string; size: number; duration: number
        }>
        setTracks(meta.map(t => ({
          ...t,
          url: '',
          file: null as any,
          duration: t.duration || 0,
        })))
      }
    } catch {}
  }, [])

  // Save metadata
  const saveMeta = useCallback((list: LocalTrack[]) => {
    const meta = list.map(t => ({
      id: t.id, name: t.name, size: t.size, duration: t.duration
    }))
    localStorage.setItem('pn_local_tracks', JSON.stringify(meta))
  }, [])

  // ── Pick audio files ──
  const pickTracks = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[]
    if (!files.length) return

    const newTracks: LocalTrack[] = files.map(file => ({
      id: `lt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: file.name.replace(/\.[^.]+$/, ''),
      url: URL.createObjectURL(file),
      size: file.size,
      duration: 0,
      file,
    }))

    setTracks(prev => {
      const updated = [...newTracks, ...prev]
      saveMeta(updated)
      return updated
    })
    e.target.value = ''
  }, [saveMeta])

  // ── Get duration ──
  const getDuration = useCallback((track: LocalTrack) => {
    if (track.duration > 0) return
    const el = document.createElement('audio')
    el.preload = 'metadata'
    el.src = track.url
    el.onloadedmetadata = () => {
      const dur = el.duration
      setTracks(prev => {
        const updated = prev.map(t =>
          t.id === track.id ? { ...t, duration: dur } : t
        )
        saveMeta(updated)
        return updated
      })
    }
  }, [saveMeta])

  useEffect(() => {
    tracks.forEach(t => {
      if (t.url && t.duration === 0) getDuration(t)
    })
  }, [tracks, getDuration])

  // ── Remove track ──
  const removeTrack = useCallback((id: string) => {
    setTracks(prev => {
      const track = prev.find(t => t.id === id)
      if (track?.url) try { URL.revokeObjectURL(track.url) } catch {}
      const updated = prev.filter(t => t.id !== id)
      saveMeta(updated)
      return updated
    })
    setContextMenu(null)
  }, [saveMeta])

  // ── Play / Pause ──
  const handlePlay = useCallback((track: LocalTrack) => {
    let playUrl = track.url
    if (!playUrl && track.file) {
      playUrl = URL.createObjectURL(track.file)
      setTracks(prev => prev.map(t =>
        t.id === track.id ? { ...t, url: playUrl } : t
      ))
    }
    if (playUrl) {
      onPlay({ ...track, url: playUrl, lastPlayed: Date.now() })
    }
  }, [onPlay])

  // ── Format helpers ──
  const fmtSize = (b: number) => {
    if (b > 1024 * 1024 * 1024) return `${(b / 1073741824).toFixed(1)} GB`
    if (b > 1024 * 1024) return `${(b / 1048576).toFixed(0)} MB`
    return `${(b / 1024).toFixed(0)} KB`
  }

  const fmtDur = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {/* Add Music Button */}
      <button
        onClick={pickTracks}
        className="w-full h-14 rounded-2xl border-2 border-dashed border-[#7C5CFF]/40
                   flex items-center justify-center gap-3
                   text-[#7C5CFF] text-sm font-semibold
                   active:scale-[0.98] active:bg-[#7C5CFF]/5
                   transition-all duration-150"
      >
        <Plus size={20} />
        Add Music from Device
      </button>

      {/* Empty state */}
      {tracks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-[#111827] flex items-center justify-center mb-4">
            <Headphones size={28} className="text-[#94A3B8]" />
          </div>
          <p className="text-[#94A3B8] text-sm font-medium mb-1">No music yet</p>
          <p className="text-[#94A3B8]/60 text-xs">Tap above to add audio files</p>
        </div>
      )}

      {/* Track List */}
      <div className="space-y-2">
        {tracks.map((track, idx) => {
          const isCurrent = currentTrackId === track.id
          return (
            <div
              key={track.id}
              className={`flex items-center gap-3 p-3 rounded-xl border
                         transition-all duration-150
                         ${isCurrent
                           ? 'bg-[#7C5CFF]/10 border-[#7C5CFF]/30'
                           : 'bg-[#111827] border-[#1E293B] active:scale-[0.98]'
                         }`}
            >
              {/* Track number / Play button */}
              <button
                onClick={() => {
                  if (isCurrent && isPlaying) onPause()
                  else handlePlay(track)
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                           active:scale-90 transition-transform duration-100
                           ${isCurrent
                             ? 'bg-[#7C5CFF] text-white'
                             : 'bg-[#1E293B] text-[#94A3B8]'
                           }`}
              >
                {isCurrent && isPlaying
                  ? <Pause size={16} />
                  : <Play size={16} className="ml-0.5" />
                }
              </button>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate
                              ${isCurrent ? 'text-[#7C5CFF]' : 'text-white'}`}>
                  {track.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {track.duration > 0 && (
                    <span className="text-[#94A3B8] text-[10px]">
                      {fmtDur(track.duration)}
                    </span>
                  )}
                  <span className="text-[#94A3B8]/50 text-[10px]">
                    {fmtSize(track.size)}
                  </span>
                  {track.lastPlayed && (
                    <span className="text-[#94A3B8]/40 text-[10px] flex items-center gap-0.5">
                      <Clock size={7} />
                      {new Date(track.lastPlayed).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Context menu */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setContextMenu(contextMenu === track.id ? null : track.id)
                }}
                className="p-2 active:scale-90 transition-transform duration-100"
              >
                <MoreVertical size={14} className="text-[#94A3B8]" />
              </button>

              {/* Delete dropdown */}
              {contextMenu === track.id && (
                <div className="absolute right-12 z-20
                                bg-[#1E293B] border border-[#334155] rounded-xl
                                overflow-hidden shadow-lg animate-[fade-in_100ms_ease-out]">
                  <button
                    onClick={() => removeTrack(track.id)}
                    className="flex items-center gap-2 px-4 py-3 text-red-400 text-xs
                               font-medium w-full active:bg-[#334155] transition-colors duration-100"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
