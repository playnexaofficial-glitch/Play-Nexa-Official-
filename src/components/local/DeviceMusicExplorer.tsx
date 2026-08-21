// ── Play Nexa Device Music Explorer & Player ────────────────────────
// Real native Android storage scanner via @capacitor/filesystem
// Web browser fallback: HTML5 <input type="file" accept="audio/*">
// Premium AMOLED dark audio player with full controls
// Operates INDEPENDENTLY — never conflicts with Movie Hub or YT Music
// NO mock data, NO hardcoded audio paths, NO fake setTimeout
// 2GB RAM safe · 44px touch targets · Capacitor 6.x compatible

'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react'
import {
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Search,
  X,
  FolderOpen,
  RefreshCw,
  Headphones,
  ChevronRight,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  Trash2,
  MoreVertical,
  Smartphone,
  HardDrive,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface DeviceAudioTrack {
  id: string
  name: string          // Display title (filename without extension)
  path: string          // Native file URI or blob URL
  url: string           // Playback-ready URL (converted for Capacitor or objectURL)
  size: number
  duration: number
  format: string        // 'mp3' | 'wav' | 'm4a' | 'aac' | 'flac' | 'ogg' | 'opus'
  source: 'native' | 'browser'
  folder: string        // Parent directory name
  addedAt: number
  file?: File           // Only available for browser-uploaded tracks
}

type RepeatMode = 'off' | 'one' | 'all'
type SortOrder = 'name' | 'date' | 'size'

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus'])

const NATIVE_SCAN_DIRS = [
  '/storage/emulated/0/Music',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Downloads',
  '/storage/emulated/0/Audio',
  '/storage/emulated/0/Recordings',
  '/storage/emulated/0/Android/media',
]

const LS_KEY_TRACKS = 'pn_device_tracks_v3'
const LS_KEY_VOLUME = 'pn_device_music_volume'
const LS_KEY_REPEAT = 'pn_device_music_repeat'
const LS_KEY_SHUFFLE = 'pn_device_music_shuffle'

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  if (w.Capacitor?.isNativePlatform?.()) return true
  if (w.Capacitor?.getPlatform?.() === 'android') return true
  return false
}

function convertFileSrc(filePath: string): string {
  try {
    const { Capacitor } = require('@capacitor/core')
    return Capacitor.convertFileSrc(filePath)
  } catch {
    return filePath
  }
}

function generateId(): string {
  return `dat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${bytes} B`
}

function getFileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.([^.]+)$/)
  return match ? match[1] : ''
}

function isAudioFile(filename: string): boolean {
  return AUDIO_EXTENSIONS.has(getFileExtension(filename))
}

function extractFolder(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  return parts.length > 1 ? parts[parts.length - 2] : 'Root'
}

function cleanTrackName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) as T : fallback
  } catch { return fallback }
}

function lsSet(key: string, value: any): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

// ═══════════════════════════════════════════════════════════════
// NATIVE DEVICE SCANNER
// ═══════════════════════════════════════════════════════════════

async function scanNativeDirectory(dirPath: string): Promise<DeviceAudioTrack[]> {
  const { Filesystem } = require('@capacitor/filesystem')
  const tracks: DeviceAudioTrack[] = []

  try {
    const result = await Filesystem.readdir({
      path: dirPath,
      directory: undefined as any,
    })

    for (const entry of result.files) {
      if (entry.type === 'file' && isAudioFile(entry.name)) {
        const fullPath = `${dirPath}/${entry.name}`
        const ext = getFileExtension(entry.name)
        const size = (entry as any).size || 0

        tracks.push({
          id: generateId(),
          name: cleanTrackName(entry.name),
          path: fullPath,
          url: convertFileSrc(fullPath),
          size,
          duration: 0,
          format: ext,
          source: 'native',
          folder: extractFolder(fullPath),
          addedAt: Date.now(),
        })
      } else if (entry.type === 'directory' && !entry.name.startsWith('.')) {
        // Recurse one level deep into subdirectories
        try {
          const subPath = `${dirPath}/${entry.name}`
          const subResult = await Filesystem.readdir({
            path: subPath,
            directory: undefined as any,
          })
          for (const subEntry of subResult.files) {
            if (subEntry.type === 'file' && isAudioFile(subEntry.name)) {
              const fullPath = `${subPath}/${subEntry.name}`
              const ext = getFileExtension(subEntry.name)
              const size = (subEntry as any).size || 0

              tracks.push({
                id: generateId(),
                name: cleanTrackName(subEntry.name),
                path: fullPath,
                url: convertFileSrc(fullPath),
                size,
                duration: 0,
                format: ext,
                source: 'native',
                folder: entry.name,
                addedAt: Date.now(),
              })
            }
          }
        } catch {
          // Subdirectory permission denied — skip silently
        }
      }
    }
  } catch {
    // Directory doesn't exist or permission denied — skip
  }

  return tracks
}

async function scanDeviceAudio(): Promise<DeviceAudioTrack[]> {
  if (!isNativePlatform()) return []

  const allTracks: DeviceAudioTrack[] = []
  const seenPaths = new Set<string>()

  // Scan all known audio directories in parallel
  const results = await Promise.allSettled(
    NATIVE_SCAN_DIRS.map(dir => scanNativeDirectory(dir))
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const track of result.value) {
        if (!seenPaths.has(track.path)) {
          seenPaths.add(track.path)
          allTracks.push(track)
        }
      }
    }
  }

  return allTracks
}

// ═══════════════════════════════════════════════════════════════
// SEEK BAR COMPONENT
// ═══════════════════════════════════════════════════════════════

function SeekBar({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number
  duration: number
  onSeek: (seconds: number) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const percent = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleInteraction = useCallback((clientX: number) => {
    const bar = barRef.current
    if (!bar || duration <= 0) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onSeek(ratio * duration)
  }, [duration, onSeek])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    handleInteraction(e.clientX)
    const onMove = (ev: PointerEvent) => handleInteraction(ev.clientX)
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [handleInteraction])

  return (
    <div className="w-full">
      <div
        ref={barRef}
        className="relative w-full h-6 flex items-center touch-none cursor-pointer"
        onPointerDown={handlePointerDown}
      >
        {/* Track background */}
        <div className="absolute left-0 right-0 h-1 bg-[#2D2D44] rounded-full" />
        {/* Progress fill */}
        <div
          className="absolute left-0 h-1 rounded-full"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #7C3AED, #06B6D4)',
          }}
        />
        {/* Thumb */}
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-[#7C3AED] shadow-lg"
          style={{
            left: `${percent}%`,
            transform: 'translate(-50%, 0)',
            boxShadow: '0 0 8px rgba(124, 58, 237, 0.5)',
          }}
        />
      </div>
      <div className="flex justify-between mt-0.5 px-0.5">
        <span className="text-[10px] text-[#9CA3AF] tabular-nums">
          {formatDuration(currentTime)}
        </span>
        <span className="text-[10px] text-[#9CA3AF] tabular-nums">
          {formatDuration(duration)}
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// FORMAT BADGE
// ═══════════════════════════════════════════════════════════════

const FORMAT_COLORS: Record<string, string> = {
  mp3: '#22C55E',
  wav: '#3B82F6',
  m4a: '#F59E0B',
  aac: '#EF4444',
  flac: '#8B5CF6',
  ogg: '#EC4899',
  opus: '#06B6D4',
}

function FormatBadge({ format }: { format: string }) {
  const color = FORMAT_COLORS[format] || '#7C3AED'
  return (
    <span
      className="text-[8px] font-bold rounded px-1.5 py-0.5 uppercase"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {format}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function DeviceMusicExplorer() {
  // ── Track state ──
  const [tracks, setTracks] = useState<DeviceAudioTrack[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('name')
  const [isNative, setIsNative] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  // ── Player state ──
  const [currentTrack, setCurrentTrack] = useState<DeviceAudioTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => lsGet<number>(LS_KEY_VOLUME, 1))
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => lsGet<RepeatMode>(LS_KEY_REPEAT, 'off'))
  const [isShuffle, setIsShuffle] = useState(() => lsGet<boolean>(LS_KEY_SHUFFLE, false))
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  // ── Refs ──
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const playlistRef = useRef<DeviceAudioTrack[]>([])
  const currentTrackRef = useRef<DeviceAudioTrack | null>(null)
  const repeatRef = useRef<RepeatMode>('off')
  const shuffleRef = useRef(false)
  const playRef = useRef<(track: DeviceAudioTrack) => void>(() => {})

  // ── Create single Audio element ONCE ──
  if (!audioRef.current && typeof window !== 'undefined') {
    audioRef.current = new Audio()
    audioRef.current.preload = 'metadata'
  }

  // ── Keep refs in sync ──
  useEffect(() => { playlistRef.current = tracks }, [tracks])
  useEffect(() => { currentTrackRef.current = currentTrack }, [currentTrack])
  useEffect(() => { repeatRef.current = repeatMode }, [repeatMode])
  useEffect(() => { shuffleRef.current = isShuffle }, [isShuffle])

  // ── Audio event listeners ──
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const onDurationChange = () => {
      const d = audio.duration
      if (Number.isFinite(d)) setDuration(d)
    }

    const onEnded = () => {
      handleTrackEnd()
    }

    const onError = () => {
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
   
  }, [])

  // ── Sync volume to audio element ──
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    lsSet(LS_KEY_VOLUME, volume)
  }, [volume])

  // ── Sync repeat/shuffle to localStorage ──
  useEffect(() => { lsSet(LS_KEY_REPEAT, repeatMode) }, [repeatMode])
  useEffect(() => { lsSet(LS_KEY_SHUFFLE, isShuffle) }, [isShuffle])

  // ── Close context menu on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    if (menuOpenId) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpenId])

  // ═══════════════════════════════════════════════════════════════
  // NATIVE SCANNING
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    const native = isNativePlatform()
    setIsNative(native)

    if (native) {
      // Auto-scan on native platform
      handleScanDevice()
    } else {
      // Browser: restore metadata from localStorage
      const saved = lsGet<DeviceAudioTrack[]>(LS_KEY_TRACKS, [])
      if (saved.length > 0) {
        setTracks(saved.map(t => ({
          ...t,
          url: '',       // Blob URLs don't persist — must re-upload
          file: undefined,
        })))
      }
    }
   
  }, [])

  const handleScanDevice = useCallback(async () => {
    setScanning(true)
    setScanError(null)

    try {
      const nativeTracks = await scanDeviceAudio()
      if (nativeTracks.length > 0) {
        setTracks(nativeTracks)
        lsSet(LS_KEY_TRACKS, nativeTracks.map(t => ({
          id: t.id, name: t.name, path: t.path, size: t.size,
          duration: t.duration, format: t.format, source: t.source,
          folder: t.folder, addedAt: t.addedAt,
        })))
      } else {
        setScanError('No audio files found. Make sure MP3/WAV/M4A files exist in Music or Download folders.')
      }
    } catch (err: any) {
      setScanError(err?.message || 'Failed to scan device storage. Check storage permissions.')
    } finally {
      setScanning(false)
    }
  }, [])

  // ═══════════════════════════════════════════════════════════════
  // BROWSER FILE UPLOAD
  // ═══════════════════════════════════════════════════════════════

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const now = Date.now()
    const newTracks: DeviceAudioTrack[] = files
      .filter(f => isAudioFile(f.name))
      .map((file, i) => {
        const ext = getFileExtension(file.name)
        const blobUrl = URL.createObjectURL(file)
        return {
          id: generateId(),
          name: cleanTrackName(file.name),
          path: file.name,
          url: blobUrl,
          size: file.size,
          duration: 0,
          format: ext,
          source: 'browser' as const,
          folder: 'Uploads',
          addedAt: now - i,
          file,
        }
      })

    setTracks(prev => {
      const updated = [...newTracks, ...prev]
      lsSet(LS_KEY_TRACKS, updated.map(t => ({
        id: t.id, name: t.name, path: t.path, size: t.size,
        duration: t.duration, format: t.format, source: t.source,
        folder: t.folder, addedAt: t.addedAt,
      })))
      return updated
    })

    // Extract durations asynchronously
    newTracks.forEach(track => {
      if (track.url && track.duration === 0) {
        const el = document.createElement('audio')
        el.preload = 'metadata'
        el.src = track.url
        el.onloadedmetadata = () => {
          const dur = el.duration
          setTracks(prev => prev.map(t =>
            t.id === track.id ? { ...t, duration: Number.isFinite(dur) ? dur : 0 } : t
          ))
        }
      }
    })

    e.target.value = ''
  }, [])

  // ═══════════════════════════════════════════════════════════════
  // PLAYBACK ENGINE
  // ═══════════════════════════════════════════════════════════════

  const playTrack = useCallback((track: DeviceAudioTrack) => {
    const audio = audioRef.current
    if (!audio) return

    // Pause current
    audio.pause()

    // Resolve playback URL
    let playUrl = track.url
    if (!playUrl && track.file) {
      playUrl = URL.createObjectURL(track.file)
      setTracks(prev => prev.map(t =>
        t.id === track.id ? { ...t, url: playUrl } : t
      ))
    }
    if (!playUrl && track.source === 'native') {
      playUrl = convertFileSrc(track.path)
    }

    if (!playUrl) return

    audio.src = playUrl
    audio.volume = volume
    audio.load()
    audio.play().catch(() => setIsPlaying(false))

    setCurrentTrack(track)
    setCurrentTime(0)
    setDuration(track.duration || 0)
    setIsPlaying(true)

    // Update Media Session
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.name,
          artist: track.folder,
          artwork: [{ src: '/icons/music-default.png', sizes: '512x512', type: 'image/png' }],
        })
        navigator.mediaSession.setActionHandler('play', () => {
          audio.play().catch(() => {})
          setIsPlaying(true)
          navigator.mediaSession.playbackState = 'playing'
        })
        navigator.mediaSession.setActionHandler('pause', () => {
          audio.pause()
          setIsPlaying(false)
          navigator.mediaSession.playbackState = 'paused'
        })
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious())
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
      } catch { /* MediaSession not available */ }
    }
   
  }, [volume])

  // Keep playRef in sync
  useEffect(() => { playRef.current = playTrack }, [playTrack])

  const pauseTrack = useCallback(() => {
    const audio = audioRef.current
    if (audio) audio.pause()
    setIsPlaying(false)
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'paused' } catch {}
    }
  }, [])

  const resumeTrack = useCallback(() => {
    const audio = audioRef.current
    if (audio && currentTrackRef.current) {
      audio.play().catch(() => setIsPlaying(false))
      setIsPlaying(true)
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'playing' } catch {}
      }
    }
  }, [])

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pauseTrack()
    else resumeTrack()
  }, [isPlaying, pauseTrack, resumeTrack])

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (audio && Number.isFinite(seconds)) {
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0))
      setCurrentTime(audio.currentTime)
    }
  }, [])

  const getCurrentIndex = useCallback((): number => {
    if (!currentTrackRef.current) return -1
    return playlistRef.current.findIndex(t => t.id === currentTrackRef.current!.id)
  }, [])

  const playNext = useCallback(() => {
    const list = playlistRef.current
    if (list.length === 0) return

    const currentIdx = getCurrentIndex()

    let nextIdx: number
    if (shuffleRef.current) {
      if (list.length === 1) { nextIdx = 0 }
      else {
        nextIdx = Math.floor(Math.random() * list.length)
        let attempt = 0
        while (nextIdx === currentIdx && attempt < 10) {
          nextIdx = Math.floor(Math.random() * list.length)
          attempt++
        }
      }
    } else {
      if (currentIdx < list.length - 1) {
        nextIdx = currentIdx + 1
      } else if (repeatRef.current === 'all') {
        nextIdx = 0
      } else {
        // Last song, repeat off
        pauseTrack()
        return
      }
    }

    playRef.current(list[nextIdx])
  }, [getCurrentIndex, pauseTrack])

  const playPrevious = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      setCurrentTime(0)
      return
    }

    const list = playlistRef.current
    if (list.length === 0) return

    const currentIdx = getCurrentIndex()

    let prevIdx: number
    if (shuffleRef.current) {
      if (list.length === 1) { prevIdx = 0 }
      else {
        prevIdx = Math.floor(Math.random() * list.length)
        let attempt = 0
        while (prevIdx === currentIdx && attempt < 10) {
          prevIdx = Math.floor(Math.random() * list.length)
          attempt++
        }
      }
    } else {
      if (currentIdx > 0) {
        prevIdx = currentIdx - 1
      } else if (repeatRef.current === 'all') {
        prevIdx = list.length - 1
      } else {
        if (audio) audio.currentTime = 0
        setCurrentTime(0)
        return
      }
    }

    playRef.current(list[prevIdx])
  }, [getCurrentIndex])

  const handleTrackEnd = useCallback(() => {
    const mode = repeatRef.current
    const audio = audioRef.current
    if (!audio) return

    if (mode === 'one') {
      audio.currentTime = 0
      audio.play().catch(() => setIsPlaying(false))
      return
    }

    const list = playlistRef.current
    if (list.length === 0) {
      setIsPlaying(false)
      return
    }

    const currentIdx = list.findIndex(t => t.id === currentTrackRef.current?.id)

    let nextIdx: number
    if (shuffleRef.current) {
      if (list.length === 1) {
        audio.currentTime = 0
        audio.play().catch(() => setIsPlaying(false))
        return
      }
      nextIdx = Math.floor(Math.random() * list.length)
      let attempt = 0
      while (nextIdx === currentIdx && attempt < 10) {
        nextIdx = Math.floor(Math.random() * list.length)
        attempt++
      }
    } else if (mode === 'all') {
      nextIdx = currentIdx < list.length - 1 ? currentIdx + 1 : 0
    } else {
      if (currentIdx < list.length - 1) {
        nextIdx = currentIdx + 1
      } else {
        setIsPlaying(false)
        setCurrentTime(0)
        return
      }
    }

    playRef.current(list[nextIdx])
   
  }, [])

  // ── Remove track ──
  const removeTrack = useCallback((id: string) => {
    setTracks(prev => {
      const track = prev.find(t => t.id === id)
      if (track?.url && track.source === 'browser') {
        try { URL.revokeObjectURL(track.url) } catch {}
      }
      const updated = prev.filter(t => t.id !== id)
      lsSet(LS_KEY_TRACKS, updated.map(t => ({
        id: t.id, name: t.name, path: t.path, size: t.size,
        duration: t.duration, format: t.format, source: t.source,
        folder: t.folder, addedAt: t.addedAt,
      })))
      return updated
    })
    setMenuOpenId(null)
  }, [])

  // ── Cycle repeat mode ──
  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'one'
      if (prev === 'one') return 'all'
      return 'off'
    })
  }, [])

  // ═══════════════════════════════════════════════════════════════
  // DERIVED: filtered + sorted tracks
  // ═══════════════════════════════════════════════════════════════

  const displayedTracks = useMemo(() => {
    let list = tracks

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.folder.toLowerCase().includes(q) ||
        t.format.toLowerCase().includes(q)
      )
    }

    // Sort
    const sorted = [...list].sort((a, b) => {
      switch (sortOrder) {
        case 'name': return a.name.localeCompare(b.name)
        case 'date': return b.addedAt - a.addedAt
        case 'size': return b.size - a.size
        default: return 0
      }
    })

    return sorted
  }, [tracks, searchQuery, sortOrder])

  // ── Folder grouping ──
  const folderGroups = useMemo(() => {
    const groups: Record<string, DeviceAudioTrack[]> = {}
    for (const track of displayedTracks) {
      const folder = track.folder || 'Unknown'
      if (!groups[folder]) groups[folder] = []
      groups[folder].push(track)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [displayedTracks])

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#050510] pb-28 relative">
      {/* Hidden file input for browser uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* ═════════════════════════════════════════════════════════
          STICKY HEADER
          ═════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-[#050510]/95 border-b border-[#1A1A2E] px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-[#7C3AED]" />
          <h1 className="text-lg font-bold text-white">Device Music</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-medium text-[#9CA3AF] bg-[#1A1A2E] border border-[#2D2D44] rounded-full px-2 py-0.5">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
          </span>
        </div>
      </header>

      {/* ═════════════════════════════════════════════════════════
          SOURCE BADGE (Native / Browser)
          ═════════════════════════════════════════════════════════ */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          {isNative ? (
            <div className="flex items-center gap-1.5 bg-[#22C55E]/10 border border-[#22C55E]/25 rounded-full px-3 py-1.5">
              <Smartphone size={12} className="text-[#22C55E]" />
              <span className="text-[10px] font-semibold text-[#22C55E]">Native Storage</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#3B82F6]/10 border border-[#3B82F6]/25 rounded-full px-3 py-1.5">
              <HardDrive size={12} className="text-[#3B82F6]" />
              <span className="text-[10px] font-semibold text-[#3B82F6]">Browser Upload</span>
            </div>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════
          ACTION BAR: Scan / Upload / Sort
          ═════════════════════════════════════════════════════════ */}
      <div className="px-4 pt-2 pb-1">
        <div className="flex items-center gap-2">
          {isNative ? (
            <button
              onClick={handleScanDevice}
              disabled={scanning}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/25 text-[#7C3AED] text-xs font-semibold active:scale-95 transition-all duration-150 min-h-[44px] disabled:opacity-40"
            >
              <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning...' : 'Scan Device'}
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7C3AED]/10 border border-[#7C3AED]/25 text-[#7C3AED] text-xs font-semibold active:scale-95 transition-all duration-150 min-h-[44px]"
            >
              <FolderOpen size={14} />
              Upload Audio
            </button>
          )}

          {/* Sort dropdown */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="bg-[#1A1A2E] border border-[#2D2D44] text-[#9CA3AF] text-[10px] rounded-lg px-2.5 py-2 outline-none focus:border-[#7C3AED] min-h-[44px] cursor-pointer"
          >
            <option value="name">A-Z</option>
            <option value="date">Recent</option>
            <option value="size">Size</option>
          </select>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════
          SEARCH BAR
          ═════════════════════════════════════════════════════════ */}
      <div className="px-4 pt-2 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracks, folders, formats..."
            className="w-full bg-[#1A1A2E] border border-[#2D2D44] rounded-xl pl-10 pr-4 py-2.5 text-white text-xs placeholder-[#4B5563] focus:outline-none focus:border-[#7C3AED] transition-colors min-h-[44px]"
            maxLength={100}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#2D2D44] flex items-center justify-center"
            >
              <X size={10} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════
          SCAN ERROR
          ═════════════════════════════════════════════════════════ */}
      {scanError && (
        <div className="mx-4 mb-3 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
          <p className="text-red-400 text-xs font-medium">{scanError}</p>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          SCANNING SKELETON
          ═════════════════════════════════════════════════════════ */}
      {scanning && (
        <div className="px-4 py-8 flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full animate-spin mb-3" />
          <p className="text-[#9CA3AF] text-xs">Scanning device storage...</p>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          EMPTY STATE
          ═════════════════════════════════════════════════════════ */}
      {!scanning && displayedTracks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 rounded-2xl bg-[#1A1A2E] flex items-center justify-center mb-4">
            <Music size={32} className="text-[#4B5563]" />
          </div>
          <p className="text-white font-semibold mb-1">
            {searchQuery ? 'No matches found' : 'No audio files yet'}
          </p>
          <p className="text-[#9CA3AF] text-sm text-center max-w-[260px] mb-4">
            {searchQuery
              ? 'Try a different search term.'
              : isNative
                ? 'Tap "Scan Device" to find MP3, WAV, and M4A files on your phone.'
                : 'Upload audio files from your computer to start playing.'}
          </p>
          {isNative ? (
            <button
              onClick={handleScanDevice}
              className="px-6 py-3 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold active:scale-95 transition-transform duration-150 min-h-[44px]"
            >
              Scan Device
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold active:scale-95 transition-transform duration-150 min-h-[44px]"
            >
              Upload Audio Files
            </button>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          TRACK LIST (grouped by folder)
          ═════════════════════════════════════════════════════════ */}
      {!scanning && displayedTracks.length > 0 && (
        <div className="px-3 space-y-4">
          {folderGroups.map(([folder, folderTracks]) => (
            <div key={folder}>
              {/* Folder header */}
              <div className="flex items-center gap-2 px-1 mb-2">
                <FolderOpen size={12} className="text-[#7C3AED]" />
                <p className="text-[#9CA3AF] text-[11px] font-semibold tracking-wide uppercase">
                  {folder}
                </p>
                <span className="text-[#4B5563] text-[10px]">
                  ({folderTracks.length})
                </span>
              </div>

              {/* Track rows */}
              <div className="space-y-0.5">
                {folderTracks.map(track => {
                  const isCurrent = currentTrack?.id === track.id
                  const isCurrentPlaying = isCurrent && isPlaying

                  return (
                    <div
                      key={track.id}
                      className={`relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-all duration-150 ${
                        isCurrent
                          ? 'bg-[#7C3AED]/8 border border-[#7C3AED]/12'
                          : 'active:bg-[#1A1A2E]'
                      }`}
                    >
                      {/* Left: Play/Music icon */}
                      <button
                        onClick={() => {
                          if (isCurrent && isPlaying) pauseTrack()
                          else playTrack(track)
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-90 transition-transform duration-100 ${
                          isCurrent
                            ? 'bg-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.2)]'
                            : 'bg-[#1A1A2E]'
                        }`}
                      >
                        {isCurrentPlaying ? (
                          <div className="flex items-center gap-[2px]">
                            {[1, 2, 3].map(i => (
                              <div
                                key={i}
                                className="w-[2.5px] bg-white rounded-full animate-eq-bar"
                                style={{ height: '10px', animationDelay: `${i * 0.15}s` }}
                              />
                            ))}
                          </div>
                        ) : isCurrent ? (
                          <Pause size={14} className="text-white" fill="white" />
                        ) : (
                          <Play size={14} className="text-[#9CA3AF] ml-0.5" fill="currentColor" />
                        )}
                      </button>

                      {/* Center: Track info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold truncate leading-tight ${
                          isCurrent ? 'text-[#7C3AED]' : 'text-white'
                        }`}>
                          {track.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <FormatBadge format={track.format} />
                          <span className="text-[#4B5563] text-[10px]">
                            {formatFileSize(track.size)}
                          </span>
                          {track.duration > 0 && (
                            <>
                              <span className="text-[#2D2D44] text-[10px]">·</span>
                              <span className="text-[#4B5563] text-[10px]">
                                {formatDuration(track.duration)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Three-dot menu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === track.id ? null : track.id)
                        }}
                        className="p-1.5 active:scale-90 transition-transform duration-100 flex-shrink-0"
                      >
                        <MoreVertical size={14} className="text-[#4B5563]" />
                      </button>

                      {/* Context menu */}
                      {menuOpenId === track.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-2 top-12 z-30 min-w-[140px] bg-[#1A1A2E] border border-[#2D2D44] rounded-xl overflow-hidden shadow-lg shadow-black/60"
                        >
                          <button
                            onClick={() => {
                              playTrack(track)
                              setMenuOpenId(null)
                            }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-white text-[11px] font-medium active:bg-[#2D2D44] transition-colors"
                          >
                            <Play size={12} className="text-[#7C3AED]" />
                            Play
                          </button>
                          <button
                            onClick={() => {
                              if (track.url && track.source === 'browser') {
                                try { URL.revokeObjectURL(track.url) } catch {}
                              }
                              playTrack(track)
                              setMenuOpenId(null)
                            }}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-white text-[11px] font-medium active:bg-[#2D2D44] transition-colors"
                          >
                            <RefreshCw size={12} className="text-[#06B6D4]" />
                            Replay
                          </button>
                          <div className="border-t border-[#2D2D44]" />
                          <button
                            onClick={() => removeTrack(track.id)}
                            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-red-400 text-[11px] font-medium active:bg-[#2D2D44] transition-colors"
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          PROMO BANNER: Online YT Music
          ═════════════════════════════════════════════════════════ */}
      <div className="px-4 mt-6">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#7C3AED]/10 to-[#06B6D4]/5 border border-[#7C3AED]/15">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center flex-shrink-0">
            <Headphones size={20} className="text-[#7C3AED]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold">YT Music Library</p>
            <p className="text-[#4B5563] text-[10px] mt-0.5">Stream millions of songs online</p>
          </div>
          <ChevronRight size={16} className="text-[#4B5563] flex-shrink-0" />
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════
          BOTTOM PLAYER BAR
          Shows when a track is loaded — independent from Movie Hub
          ═════════════════════════════════════════════════════════ */}
      {currentTrack && (
        <div className="fixed bottom-16 left-0 right-0 z-[9998] px-2 animate-[slide-up_300ms_ease-out]">
          <div className="bg-[#0A0A1A] border border-[#2D2D44] rounded-2xl overflow-hidden shadow-[0_-4px_24px_rgba(0,0,0,0.8)]">
            {/* Thin progress bar */}
            <div className="h-[2px] bg-[#2D2D44] w-full">
              <div
                className="h-full transition-all duration-300 ease-linear"
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #7C3AED, #06B6D4)',
                }}
              />
            </div>

            <div className="flex items-center gap-3 px-3 py-2.5">
              {/* Track icon */}
              <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/15 flex items-center justify-center flex-shrink-0">
                {isPlaying ? (
                  <div className="flex items-center gap-[2px]">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="w-[2px] bg-[#7C3AED] rounded-full animate-eq-bar"
                        style={{ height: '8px', animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  <Music size={16} className="text-[#7C3AED]" />
                )}
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{currentTrack.name}</p>
                <p className="text-[#4B5563] text-[10px]">
                  {isPlaying ? formatDuration(currentTime) : 'Paused'} · {currentTrack.format.toUpperCase()}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={playPrevious}
                  className="w-8 h-8 flex items-center justify-center active:scale-90 transition-transform duration-100"
                  aria-label="Previous"
                >
                  <SkipBack size={14} className="text-[#9CA3AF]" fill="currentColor" />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center active:scale-90 transition-transform duration-100"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={16} className="text-white" fill="white" />
                  ) : (
                    <Play size={16} className="text-white ml-0.5" fill="white" />
                  )}
                </button>
                <button
                  onClick={playNext}
                  className="w-8 h-8 flex items-center justify-center active:scale-90 transition-transform duration-100"
                  aria-label="Next"
                >
                  <SkipForward size={14} className="text-[#9CA3AF]" fill="currentColor" />
                </button>
              </div>
            </div>

            {/* Seek bar inside player */}
            <div className="px-3 pb-2">
              <SeekBar
                currentTime={currentTime}
                duration={duration}
                onSeek={seekTo}
              />
            </div>

            {/* Secondary controls row */}
            <div className="flex items-center justify-between px-4 pb-2.5">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150 ${
                  isShuffle ? 'text-[#7C3AED] bg-[#7C3AED]/10' : 'text-[#4B5563]'
                }`}
                aria-label="Shuffle"
              >
                <Shuffle size={12} />
              </button>

              <button
                onClick={() => setVolume(volume === 0 ? 1 : 0)}
                className="w-8 h-8 flex items-center justify-center text-[#4B5563]"
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              >
                {volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
              </button>

              <button
                onClick={cycleRepeat}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150 ${
                  repeatMode !== 'off' ? 'text-[#7C3AED] bg-[#7C3AED]/10' : 'text-[#4B5563]'
                }`}
                aria-label={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 size={12} /> : <Repeat size={12} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
