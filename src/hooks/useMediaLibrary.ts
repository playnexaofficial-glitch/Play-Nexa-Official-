'use client'

// ── Play Nexa Media Library Scanner ───────────────────────────
// NO mock data · NO hardcoded arrays · NO placeholder URLs
// Dual-mode engine: Web file picker vs APK native auto-scan
// URL.createObjectURL with garbage collection for 2GB RAM
// 3-layer cache: Memory → localStorage (5min TTL) → Fresh scan

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  isNativePlatform,
  getFileExtension,
  extractAudioMetadata,
  lsGet,
  lsSet,
  generateId,
} from '@/lib/mediaUtils'
import type { Song, VideoFile } from '@/lib/mediaUtils'

// ══════════════════════════════════════════════════════════════
// STORAGE KEYS
// ══════════════════════════════════════════════════════════════

const MUSIC_SCAN_CACHE = 'pn_music_scan_cache'
const VIDEO_SCAN_CACHE = 'pn_video_scan_cache'
const MUSIC_SCAN_TS = 'pn_music_scan_ts'
const VIDEO_SCAN_TS = 'pn_video_scan_ts'
const MUSIC_SORT_KEY = 'pn_music_sort'
const VIDEO_VIEW_KEY = 'pn_video_view'
const VIDEO_HISTORY_KEY = 'pn_video_history'
const MUSIC_PERMISSION_KEY = 'pn_music_permission_granted'

// ══════════════════════════════════════════════════════════════
// SORT TYPES
// ══════════════════════════════════════════════════════════════

export type MusicSortMode = 'name' | 'date' | 'duration' | 'artist' | 'size'
export type VideoViewMode = 'grid' | 'list'

// ══════════════════════════════════════════════════════════════
// MODULE-LEVEL MEMORY CACHE (survives re-renders, lost on app close)
// ══════════════════════════════════════════════════════════════

let musicCacheMemory: Song[] | null = null
let videoCacheMemory: VideoFile[] | null = null
let musicScanTimestamp: number = 0
let videoScanTimestamp: number = 0

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ══════════════════════════════════════════════════════════════
// FILE EXTENSION VALIDATION
// ══════════════════════════════════════════════════════════════

const AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma', 'amr'])
const VIDEO_EXTS = new Set(['mp4', 'mkv', 'avi', 'webm', '3gp', 'mov', 'flv', 'wmv', 'm4v', 'ts', 'mpg', 'mpeg'])

function isValidAudioExt(ext: string): boolean {
  return AUDIO_EXTS.has(ext.toLowerCase())
}

function isValidVideoExt(ext: string): boolean {
  return VIDEO_EXTS.has(ext.toLowerCase())
}

function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(0, dot) : filename
}

// ══════════════════════════════════════════════════════════════
// NATIVE PATH → WEB-VIEW URL CONVERSION
// ══════════════════════════════════════════════════════════════

function convertFileSrc(filePath: string): string {
  try {
    const w = window as any
    if (w.Capacitor?.convertFileSrc) {
      return w.Capacitor.convertFileSrc(filePath)
    }
  } catch {}
  return filePath
}

// ══════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════

export function useMediaLibrary() {
  const [songs, setSongs] = useState<Song[]>([])
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [scanning, setScanning] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(() =>
    lsGet(MUSIC_PERMISSION_KEY, false)
  )
  const [musicSort, setMusicSort] = useState<MusicSortMode>(() =>
    lsGet<MusicSortMode>(MUSIC_SORT_KEY, 'name')
  )
  const [videoView, setVideoView] = useState<VideoViewMode>(() =>
    lsGet<VideoViewMode>(VIDEO_VIEW_KEY, 'grid')
  )

  // ── Pending import state — drives the FileImportPreviewModal ──
  // User picks files → preview modal opens → user clicks "Import All" → files added
  const [pendingImport, setPendingImport] = useState<{
    files: File[]
    type: 'music' | 'video'
  } | null>(null)

  const abortRef = useRef(false)

  // ── Object URL tracking for garbage collection (2GB RAM safe) ──
  const objectUrlsRef = useRef<Set<string>>(new Set())

  // ── File object storage (survives re-renders) ──
  const songFileMap = useRef<Map<string, File>>(new Map())
  const videoFileMap = useRef<Map<string, File>>(new Map())

  // ── Environment detection ──
  const isNative = typeof window !== 'undefined' && isNativePlatform()

  // ── Register an object URL for later cleanup ──
  const registerUrl = useCallback((url: string) => {
    if (url.startsWith('blob:')) {
      objectUrlsRef.current.add(url)
    }
  }, [])

  // ── Revoke a single object URL ──
  const revokeUrl = useCallback((url: string) => {
    if (url.startsWith('blob:')) {
      try { URL.revokeObjectURL(url) } catch {}
      objectUrlsRef.current.delete(url)
    }
  }, [])

  // ── Revoke all object URLs for a list of items ──
  const revokeUrlsForItems = useCallback((items: { url: string }[]) => {
    items.forEach(item => revokeUrl(item.url))
  }, [revokeUrl])

  // ── Cleanup ALL object URLs on unmount ──
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url) } catch {}
      })
      objectUrlsRef.current.clear()
      songFileMap.current.clear()
      videoFileMap.current.clear()
    }
  }, [])

  // ── Save sort/view preferences ──
  useEffect(() => {
    lsSet(MUSIC_SORT_KEY, musicSort)
  }, [musicSort])

  useEffect(() => {
    lsSet(VIDEO_VIEW_KEY, videoView)
  }, [videoView])

  // ── Sort songs ──
  const sortSongs = useCallback(
    (list: Song[], mode: MusicSortMode): Song[] => {
      const sorted = [...list]
      switch (mode) {
        case 'name':
          sorted.sort((a, b) => a.name.localeCompare(b.name))
          break
        case 'date':
          sorted.sort((a, b) => b.id.localeCompare(a.id))
          break
        case 'duration':
          sorted.sort((a, b) => b.duration - a.duration)
          break
        case 'artist':
          sorted.sort((a, b) => a.artist.localeCompare(b.artist))
          break
        case 'size':
          sorted.sort((a, b) => b.size - a.size)
          break
      }
      return sorted
    },
    []
  )

  // ════════════════════════════════════════════════════════════
  // REQUEST MEDIA PERMISSION
  // ════════════════════════════════════════════════════════════

  const requestMediaPermission = useCallback(async (): Promise<boolean> => {
    if (isNativePlatform()) {
      try {
        const { Permissions } = (window as any).Capacitor?.Plugins || {}
        if (Permissions) {
          const result = await Permissions.request({ name: 'storage' })
          const granted = result?.state === 'granted'
          setPermissionGranted(granted)
          lsSet(MUSIC_PERMISSION_KEY, granted)
          return granted
        }
      } catch {
        // Permission request failed
      }
      // On newer Android, try READ_MEDIA_AUDIO / READ_MEDIA_VIDEO
      try {
        const { Permissions } = (window as any).Capacitor?.Plugins || {}
        if (Permissions) {
          const result = await Permissions.request({
            name: 'READ_MEDIA_AUDIO',
          })
          const granted = result?.state === 'granted'
          setPermissionGranted(granted)
          lsSet(MUSIC_PERMISSION_KEY, granted)
          return granted
        }
      } catch {
        // Fallback permission request failed
      }
      return false
    }
    // Web: no permission needed
    setPermissionGranted(true)
    lsSet(MUSIC_PERMISSION_KEY, true)
    return true
  }, [])

  // ════════════════════════════════════════════════════════════
  // SCAN MUSIC FILES — 3-layer cache
  // ════════════════════════════════════════════════════════════

  const scanMusicFiles = useCallback(async (forceRefresh = false): Promise<Song[]> => {
    const now = Date.now()

    // ── Layer 1: Memory cache (instant, survives re-renders) ──
    if (
      !forceRefresh &&
      musicCacheMemory !== null &&
      musicCacheMemory.length > 0 &&
      (now - musicScanTimestamp) < CACHE_TTL_MS
    ) {
      setSongs(musicCacheMemory)
      return sortSongs(musicCacheMemory, musicSort)
    }

    // ── Layer 2: localStorage cache with TTL ──
    if (!forceRefresh) {
      try {
        const stored = lsGet<Song[] | null>(MUSIC_SCAN_CACHE, null)
        const ts = lsGet<string | null>(MUSIC_SCAN_TS, null)
        if (stored && stored.length > 0 && ts) {
          const age = now - parseInt(ts)
          if (age < CACHE_TTL_MS) {
            musicCacheMemory = stored
            musicScanTimestamp = parseInt(ts)
            setSongs(stored)
            return sortSongs(stored, musicSort)
          }
        }
      } catch {
        // localStorage read failed — proceed to fresh scan
      }
    }

    // ── Layer 3: Fresh scan (native only — web returns empty) ──
    setScanning(true)
    abortRef.current = false

    try {
      let result: Song[]

      if (isNativePlatform()) {
        result = await runMusicScan()
      } else {
        // ── WEB MODE: Return empty array — user must pick files manually ──
        // NO mock data. Real files come from pickMusicFiles() / pickMusicFolder()
        result = []
      }

      // Save to both memory + localStorage caches
      const previousCount = musicCacheMemory?.length ?? 0
      musicCacheMemory = result
      musicScanTimestamp = now
      try {
        lsSet(MUSIC_SCAN_CACHE, result)
        lsSet(MUSIC_SCAN_TS, String(now))
      } catch {
        // localStorage quota exceeded
      }

      // Dispatch event if file count changed
      const newCount = result.length
      if (newCount !== previousCount) {
        window.dispatchEvent(new CustomEvent('pn-library-updated', {
          detail: {
            type: 'music',
            count: newCount,
            added: newCount - previousCount,
          }
        }))
      }

      const sorted = sortSongs(result, musicSort)
      setSongs(sorted)
      return sorted
    } catch {
      return []
    } finally {
      setScanning(false)
    }
  }, [musicSort, sortSongs])

  // ════════════════════════════════════════════════════════════
  // COMPLETE NATIVE MUSIC SCAN
  // Recursive directory scan with Promise.allSettled
  // ════════════════════════════════════════════════════════════

  async function runMusicScan(): Promise<Song[]> {
    if (!isNativePlatform()) return []

    const { Filesystem } = (window as any).Capacitor?.Plugins || {}
    if (!Filesystem) return []

    const songs: Song[] = []
    const audioExts = ['.mp3', '.aac', '.flac', '.ogg', '.wav', '.m4a', '.opus']

    const scanDir = async (path: string, directory: string, depth = 0) => {
      if (abortRef.current) return
      try {
        const result = await Filesystem.readdir({ path, directory })

        for (const file of result.files) {
          if (abortRef.current) return
          const fullPath = `${path}/${file.name}`
          const nameLower = file.name.toLowerCase()

          if (file.type === 'directory') {
            // Recurse into subdirectories (max 3 levels deep)
            if (depth < 3) {
              await scanDir(fullPath, directory, depth + 1)
            }
          } else if (audioExts.some(ext => nameLower.endsWith(ext))) {
            const nameNoExt = file.name.replace(/\.[^.]+$/, '')
            const parts = nameNoExt.split(' - ')
            const nativeUrl = convertFileSrc(fullPath)

            // Try to extract metadata lazily
            let meta = { title: '', artist: 'Unknown Artist', album: 'Unknown Album', duration: 0, artwork: null as string | null }
            try {
              meta = await extractAudioMetadata(fullPath)
            } catch {
              // Metadata extraction failed — use filename parsing
            }

            songs.push({
              id: `song_${fullPath}`,
              path: fullPath,
              name: meta.title || parts[1]?.trim() || parts[0]?.trim() || nameNoExt,
              artist: meta.artist || parts[0]?.trim() || 'Unknown Artist',
              album: meta.album || 'Unknown Album',
              url: nativeUrl,
              size: file.size || 0,
              duration: meta.duration,
              cover: meta.artwork,
              format: getFileExtension(file.name),
            })
          }
        }
      } catch {
        // Directory not accessible — skip silently
      }
    }

    // Scan common Android music locations
    const scanTargets = [
      { path: 'Music',     dir: 'EXTERNAL_STORAGE' },
      { path: 'Downloads', dir: 'EXTERNAL_STORAGE' },
      { path: 'Download',  dir: 'EXTERNAL_STORAGE' },
      { path: 'DCIM',      dir: 'EXTERNAL_STORAGE' },
      { path: 'WhatsApp/Media/WhatsApp Audio',   dir: 'EXTERNAL_STORAGE' },
      { path: 'Telegram/Telegram Audio',          dir: 'EXTERNAL_STORAGE' },
    ]

    // Use Promise.allSettled so one failing dir won't crash the entire scan
    await Promise.allSettled(
      scanTargets.map(t => scanDir(t.path, t.dir, 0))
    )

    // Remove duplicates by path
    const unique = songs.filter((song, index, self) =>
      index === self.findIndex(s => s.path === song.path)
    )

    return unique.sort((a, b) => a.name.localeCompare(b.name))
  }

  // ════════════════════════════════════════════════════════════
  // WEB FILE PICKER — Music Files (opens preview modal)
  // Picker → user selects → preview modal opens → user clicks Import All
  // NO metadata extraction here — that happens in background after import
  // ════════════════════════════════════════════════════════════

  const pickMusicFiles = useCallback(() => {
    if (isNative) return // Hidden in APK mode — auto-scan handles it

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'audio/*'

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const fileList = Array.from(target.files || [])
      if (fileList.length === 0) return

      // Filter to valid audio extensions only
      const audioFiles = fileList.filter(f => isValidAudioExt(getFileExtension(f.name)))
      if (audioFiles.length === 0) return

      // Open preview modal — no import yet
      setPendingImport({ files: audioFiles, type: 'music' })
    }

    // Append to body for iOS Safari compatibility, then remove
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }, [isNative])

  // ════════════════════════════════════════════════════════════
  // WEB FOLDER PICKER — Music (opens preview modal)
  // ════════════════════════════════════════════════════════════

  const pickMusicFolder = useCallback(() => {
    if (isNative) return

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'audio/*'
    // @ts-ignore — webkitdirectory is non-standard but widely supported
    input.webkitdirectory = true
    // @ts-ignore
    input.directory = true

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const fileList = Array.from(target.files || [])
      if (fileList.length === 0) return

      const audioFiles = fileList.filter(f => isValidAudioExt(getFileExtension(f.name)))
      if (audioFiles.length === 0) return

      setPendingImport({ files: audioFiles, type: 'music' })
    }

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }, [isNative])

  // ════════════════════════════════════════════════════════════
  // SCAN VIDEO FILES — 3-layer cache
  // ════════════════════════════════════════════════════════════

  const scanVideoFiles = useCallback(async (forceRefresh = false): Promise<VideoFile[]> => {
    const now = Date.now()

    // ── Layer 1: Memory cache (instant) ──
    if (
      !forceRefresh &&
      videoCacheMemory !== null &&
      videoCacheMemory.length > 0 &&
      (now - videoScanTimestamp) < CACHE_TTL_MS
    ) {
      setVideos(videoCacheMemory)
      return videoCacheMemory
    }

    // ── Layer 2: localStorage cache with TTL ──
    if (!forceRefresh) {
      try {
        const stored = lsGet<VideoFile[] | null>(VIDEO_SCAN_CACHE, null)
        const ts = lsGet<string | null>(VIDEO_SCAN_TS, null)
        if (stored && stored.length > 0 && ts) {
          const age = now - parseInt(ts)
          if (age < CACHE_TTL_MS) {
            videoCacheMemory = stored
            videoScanTimestamp = parseInt(ts)
            setVideos(stored)
            return stored
          }
        }
      } catch {
        // localStorage read failed — proceed to fresh scan
      }
    }

    // ── Layer 3: Fresh scan (native only — web returns empty) ──
    setScanning(true)
    abortRef.current = false

    try {
      let result: VideoFile[]

      if (isNativePlatform()) {
        result = await runVideoScan()
      } else {
        // ── WEB MODE: Return empty array — user must pick files manually ──
        // NO mock data. Real files come from pickVideoFiles() / pickVideoFolder()
        result = []
      }

      // Save to both caches
      const previousCount = videoCacheMemory?.length ?? 0
      videoCacheMemory = result
      videoScanTimestamp = now
      try {
        lsSet(VIDEO_SCAN_CACHE, result)
        lsSet(VIDEO_SCAN_TS, String(now))
      } catch {
        // localStorage quota exceeded
      }

      // Dispatch event if file count changed
      const newCount = result.length
      if (newCount !== previousCount) {
        window.dispatchEvent(new CustomEvent('pn-library-updated', {
          detail: {
            type: 'video',
            count: newCount,
            added: newCount - previousCount,
          }
        }))
      }

      setVideos(result)
      return result
    } catch {
      return []
    } finally {
      setScanning(false)
    }
  }, [])

  // ════════════════════════════════════════════════════════════
  // COMPLETE NATIVE VIDEO SCAN
  // Recursive directory scan with Promise.allSettled
  // ════════════════════════════════════════════════════════════

  async function runVideoScan(): Promise<VideoFile[]> {
    if (!isNativePlatform()) return []

    const { Filesystem } = (window as any).Capacitor?.Plugins || {}
    if (!Filesystem) return []

    const videoFiles: VideoFile[] = []
    const videoExts = ['.mp4', '.mkv', '.avi', '.webm', '.3gp', '.mov', '.m4v', '.ts']

    const scanDir = async (path: string, directory: string, depth = 0) => {
      if (abortRef.current) return
      try {
        const result = await Filesystem.readdir({ path, directory })

        for (const file of result.files) {
          if (abortRef.current) return
          const fullPath = `${path}/${file.name}`
          const nameLower = file.name.toLowerCase()

          if (file.type === 'directory') {
            // Recurse into subdirectories (max 3 levels deep)
            if (depth < 3) {
              await scanDir(fullPath, directory, depth + 1)
            }
          } else if (videoExts.some(ext => nameLower.endsWith(ext))) {
            const nativeUrl = convertFileSrc(fullPath)
            videoFiles.push({
              id: `vid_${fullPath}`,
              path: fullPath,
              name: file.name.replace(/\.[^.]+$/, ''),
              url: nativeUrl,
              size: file.size || 0,
              duration: 0,
              thumbnail: null,
              format: getFileExtension(file.name),
              width: 0,
              height: 0,
              lastPlayed: null,
              progress: 0,
            })
          }
        }
      } catch {
        // Directory not accessible — skip silently
      }
    }

    // Scan common Android video locations
    const scanTargets = [
      { path: 'DCIM',      dir: 'EXTERNAL_STORAGE' },
      { path: 'Movies',    dir: 'EXTERNAL_STORAGE' },
      { path: 'Videos',    dir: 'EXTERNAL_STORAGE' },
      { path: 'Downloads', dir: 'EXTERNAL_STORAGE' },
      { path: 'Download',  dir: 'EXTERNAL_STORAGE' },
      { path: 'WhatsApp/Media/WhatsApp Video',   dir: 'EXTERNAL_STORAGE' },
      { path: 'Telegram/Telegram Video',          dir: 'EXTERNAL_STORAGE' },
    ]

    // Use Promise.allSettled so one failing dir won't crash the entire scan
    await Promise.allSettled(
      scanTargets.map(t => scanDir(t.path, t.dir, 0))
    )

    // Remove duplicates by path
    const unique = videoFiles.filter((v, i, self) =>
      i === self.findIndex(x => x.path === v.path)
    )

    return unique.sort((a, b) => a.name.localeCompare(b.name))
  }

  // ════════════════════════════════════════════════════════════
  // WEB FILE PICKER — Video Files (opens preview modal)
  // Picker → user selects → preview modal opens → user clicks Import All
  // ════════════════════════════════════════════════════════════

  const pickVideoFiles = useCallback(() => {
    if (isNative) return

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'video/*'

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const fileList = Array.from(target.files || [])
      if (fileList.length === 0) return

      const videoFiles = fileList.filter(f => isValidVideoExt(getFileExtension(f.name)))
      if (videoFiles.length === 0) return

      setPendingImport({ files: videoFiles, type: 'video' })
    }

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }, [isNative])

  // ════════════════════════════════════════════════════════════
  // WEB FOLDER PICKER — Video (opens preview modal)
  // ════════════════════════════════════════════════════════════

  const pickVideoFolder = useCallback(() => {
    if (isNative) return

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'video/*'
    // @ts-ignore — webkitdirectory is non-standard but widely supported
    input.webkitdirectory = true
    // @ts-ignore
    input.directory = true

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const fileList = Array.from(target.files || [])
      if (fileList.length === 0) return

      const videoFiles = fileList.filter(f => isValidVideoExt(getFileExtension(f.name)))
      if (videoFiles.length === 0) return

      setPendingImport({ files: videoFiles, type: 'video' })
    }

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }, [isNative])

  // ════════════════════════════════════════════════════════════
  // GET PLAYABLE URL — Re-create object URL from stored File if needed
  // ════════════════════════════════════════════════════════════

  const getPlayableSongUrl = useCallback((song: Song): string | null => {
    if (song.url) return song.url

    // Try to re-create from stored File
    const file = song.file || songFileMap.current.get(song.id)
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      registerUrl(objectUrl)
      // Update song in state
      setSongs(prev => prev.map(s =>
        s.id === song.id ? { ...s, url: objectUrl, file } : s
      ))
      return objectUrl
    }

    // Native path: re-convert
    if (isNative && song.path) {
      const nativeUrl = convertFileSrc(song.path)
      setSongs(prev => prev.map(s =>
        s.id === song.id ? { ...s, url: nativeUrl } : s
      ))
      return nativeUrl
    }

    return null
  }, [isNative, registerUrl])

  const getPlayableVideoUrl = useCallback((video: VideoFile): string | null => {
    if (video.url) return video.url

    const file = video.file || videoFileMap.current.get(video.id)
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      registerUrl(objectUrl)
      setVideos(prev => prev.map(v =>
        v.id === video.id ? { ...v, url: objectUrl, file } : v
      ))
      return objectUrl
    }

    if (isNative && video.path) {
      const nativeUrl = convertFileSrc(video.path)
      setVideos(prev => prev.map(v =>
        v.id === video.id ? { ...v, url: nativeUrl } : v
      ))
      return nativeUrl
    }

    return null
  }, [isNative, registerUrl])

  // ════════════════════════════════════════════════════════════
  // VIDEO HISTORY — save/restore watch positions
  // ════════════════════════════════════════════════════════════

  interface VideoHistoryEntry {
    id: string
    path: string
    name: string
    position: number
    timestamp: number
  }

  const getVideoHistory = useCallback((): VideoHistoryEntry[] => {
    return lsGet<VideoHistoryEntry[]>(VIDEO_HISTORY_KEY, [])
  }, [])

  const saveVideoPosition = useCallback(
    (videoId: string, path: string, name: string, position: number) => {
      const history = lsGet<VideoHistoryEntry[]>(VIDEO_HISTORY_KEY, [])
      const existing = history.findIndex((h) => h.id === videoId)
      const entry: VideoHistoryEntry = {
        id: videoId,
        path,
        name,
        position,
        timestamp: Date.now(),
      }
      if (existing >= 0) {
        history[existing] = entry
      } else {
        history.unshift(entry)
      }
      // Keep last 50 entries
      lsSet(VIDEO_HISTORY_KEY, history.slice(0, 50))
    },
    []
  )

  const getVideoPosition = useCallback(
    (videoId: string): number => {
      const history = lsGet<VideoHistoryEntry[]>(VIDEO_HISTORY_KEY, [])
      const entry = history.find((h) => h.id === videoId)
      return entry?.position || 0
    },
    []
  )

  // ════════════════════════════════════════════════════════════
  // ADD / REMOVE — with URL cleanup
  // ════════════════════════════════════════════════════════════

  const addSong = useCallback((song: Song) => {
    setSongs((prev) => {
      const updated = [...prev, song]
      lsSet(MUSIC_SCAN_CACHE, updated.map(s => ({ ...s, url: '', file: undefined })))
      musicCacheMemory = updated
      return updated
    })
  }, [])

  const addVideo = useCallback((video: VideoFile) => {
    setVideos((prev) => {
      const updated = [...prev, video]
      lsSet(VIDEO_SCAN_CACHE, updated.map(v => ({ ...v, url: '', file: undefined, thumbnail: null })))
      videoCacheMemory = updated
      return updated
    })
  }, [])

  const removeSong = useCallback((id: string) => {
    setSongs((prev) => {
      const song = prev.find((s) => s.id === id)
      if (song?.url) revokeUrl(song.url)
      songFileMap.current.delete(id)
      const updated = prev.filter((s) => s.id !== id)
      lsSet(MUSIC_SCAN_CACHE, updated.map(s => ({ ...s, url: '', file: undefined })))
      musicCacheMemory = updated
      return updated
    })
  }, [revokeUrl])

  const removeVideo = useCallback((id: string) => {
    setVideos((prev) => {
      const video = prev.find((v) => v.id === id)
      if (video?.url) revokeUrl(video.url)
      videoFileMap.current.delete(id)
      const updated = prev.filter((v) => v.id !== id)
      lsSet(VIDEO_SCAN_CACHE, updated.map(v => ({ ...v, url: '', file: undefined, thumbnail: null })))
      videoCacheMemory = updated
      return updated
    })
  }, [revokeUrl])

  const abortScan = useCallback(() => {
    abortRef.current = true
  }, [])

  // ── Invalidate memory cache (for external refresh triggers) ──
  const invalidateCache = useCallback((type: 'music' | 'video' | 'all') => {
    if (type === 'music' || type === 'all') {
      musicCacheMemory = null
      musicScanTimestamp = 0
    }
    if (type === 'video' || type === 'all') {
      videoCacheMemory = null
      videoScanTimestamp = 0
    }
  }, [])

  // ── Background duration extractor for songs ──
  // Uses lightweight <audio> element, no jsmediatags (which can hang on slow imports)
  const extractSongDurationInBackground = useCallback((songId: string, file: File) => {
    try {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      const url = URL.createObjectURL(file)
      audio.src = url

      const cleanup = () => {
        try {
          audio.removeAttribute('src')
          audio.load()
          URL.revokeObjectURL(url)
        } catch {}
      }

      audio.onloadedmetadata = () => {
        const duration = audio.duration
        if (Number.isFinite(duration) && duration > 0) {
          setSongs(prev => {
            const updated = prev.map(s =>
              s.id === songId ? { ...s, duration } : s
            )
            // Update memory cache too
            if (musicCacheMemory) {
              musicCacheMemory = musicCacheMemory.map(s =>
                s.id === songId ? { ...s, duration } : s
              )
            }
            try {
              lsSet(MUSIC_SCAN_CACHE, updated.map(s => ({ ...s, url: '', file: undefined })))
            } catch {}
            return updated
          })
        }
        cleanup()
      }

      audio.onerror = () => cleanup()

      // Timeout after 5 seconds — don't leak audio elements
      setTimeout(() => {
        if (audio.readyState === 0) cleanup()
      }, 5000)
    } catch {
      // Background extraction failed — leave duration as 0
    }
  }, [])

  // ── Background metadata extractor for videos ──
  // Extracts duration, width, height (no thumbnail — that's done lazily in UI)
  const extractVideoMetadataInBackground = useCallback((videoId: string, file: File) => {
    try {
      const video = document.createElement('video')
      video.preload = 'metadata'
      const url = URL.createObjectURL(file)
      video.src = url

      const cleanup = () => {
        try {
          video.removeAttribute('src')
          video.load()
          URL.revokeObjectURL(url)
        } catch {}
      }

      video.onloadedmetadata = () => {
        const duration = video.duration
        const width = video.videoWidth || 0
        const height = video.videoHeight || 0

        if (Number.isFinite(duration) || width > 0) {
          setVideos(prev => {
            const updated = prev.map(v =>
              v.id === videoId
                ? {
                    ...v,
                    duration: Number.isFinite(duration) ? duration : 0,
                    width,
                    height,
                  }
                : v
            )
            if (videoCacheMemory) {
              videoCacheMemory = videoCacheMemory.map(v =>
                v.id === videoId
                  ? {
                      ...v,
                      duration: Number.isFinite(duration) ? duration : 0,
                      width,
                      height,
                    }
                  : v
              )
            }
            try {
              lsSet(VIDEO_SCAN_CACHE, updated.map(v => ({ ...v, url: '', file: undefined, thumbnail: null })))
            } catch {}
            return updated
          })
        }
        cleanup()
      }

      video.onerror = () => cleanup()

      setTimeout(() => {
        if (video.readyState === 0) cleanup()
      }, 5000)
    } catch {
      // Background extraction failed
    }
  }, [])



  // ════════════════════════════════════════════════════════════
  // CONFIRM IMPORT — called when user clicks "Import All" in preview modal
  // Adds ALL pending files INSTANTLY with placeholder metadata
  // Metadata (duration, artist, album) extracted in BACKGROUND afterwards
  // ════════════════════════════════════════════════════════════

  const confirmImport = useCallback(() => {
    if (!pendingImport) return

    const { files, type } = pendingImport
    const now = Date.now()

    if (type === 'music') {
      // ── Add all music files INSTANTLY with placeholder metadata ──
      const newSongs: Song[] = files.map(file => {
        const ext = getFileExtension(file.name)
        const objectUrl = URL.createObjectURL(file)
        registerUrl(objectUrl)

        // Parse filename for "Artist - Title" pattern (synchronous, no await)
        const nameNoExt = stripExtension(file.name)
        const nameClean = nameNoExt.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
        let artist = 'Unknown Artist'
        let title = nameClean
        if (nameClean.includes(' - ')) {
          const parts = nameClean.split(' - ')
          artist = parts[0].trim()
          title = parts.slice(1).join(' - ').trim() || nameClean
        }

        const id = generateId('song')
        songFileMap.current.set(id, file)

        return {
          id,
          name: title,
          artist,
          album: 'Unknown Album',
          url: objectUrl,
          size: file.size,
          duration: 0, // Will be filled by background extractor
          cover: null,
          path: file.webkitRelativePath || file.name,
          format: ext,
          file,
        }
      })

      setSongs(prev => {
        const existingKeys = new Set(prev.map(s => `${s.name}_${s.size}`))
        const unique = newSongs.filter(s => !existingKeys.has(`${s.name}_${s.size}`))
        const updated = [...unique, ...prev]
        musicCacheMemory = updated
        musicScanTimestamp = now
        try {
          lsSet(MUSIC_SCAN_CACHE, updated.map(s => ({ ...s, url: '', file: undefined })))
          lsSet(MUSIC_SCAN_TS, String(now))
        } catch {}
        return updated
      })

      // ── Background: extract duration for each song, one at a time ──
      // Use setTimeout chunking — yields to UI thread between each file (2GB RAM safe)
      newSongs.forEach((song, idx) => {
        setTimeout(() => {
          extractSongDurationInBackground(song.id, song.file!)
        }, idx * 50) // 50ms gap = ~20 files/sec, no UI blocking
      })
    } else {
      // ── Add all video files INSTANTLY ──
      const newVideos: VideoFile[] = files.map(file => {
        const ext = getFileExtension(file.name)
        const objectUrl = URL.createObjectURL(file)
        registerUrl(objectUrl)

        const id = generateId('vid')
        videoFileMap.current.set(id, file)

        const folder = file.webkitRelativePath
          ? file.webkitRelativePath.split('/').slice(0, -1).join('/')
          : 'Browser'

        return {
          id,
          name: stripExtension(file.name),
          url: objectUrl,
          size: file.size,
          duration: 0,
          thumbnail: null,
          path: folder,
          format: ext,
          width: 0,
          height: 0,
          lastPlayed: null,
          progress: 0,
          file,
        }
      })

      setVideos(prev => {
        const existingKeys = new Set(prev.map(v => `${v.name}_${v.size}`))
        const unique = newVideos.filter(v => !existingKeys.has(`${v.name}_${v.size}`))
        const updated = [...unique, ...prev]
        videoCacheMemory = updated
        videoScanTimestamp = now
        try {
          lsSet(VIDEO_SCAN_CACHE, updated.map(v => ({ ...v, url: '', file: undefined, thumbnail: null })))
          lsSet(VIDEO_SCAN_TS, String(now))
        } catch {}
        return updated
      })

      // Background: extract video duration + dimensions, one at a time
      newVideos.forEach((video, idx) => {
        setTimeout(() => {
          extractVideoMetadataInBackground(video.id, video.file!)
        }, idx * 80) // 80ms gap — videos are heavier than audio
      })
    }

    // Clear pending import — closes the preview modal
    setPendingImport(null)
  }, [pendingImport, registerUrl, extractSongDurationInBackground, extractVideoMetadataInBackground])

  // ── Cancel import — discard pending files ──
  const cancelImport = useCallback(() => {
    setPendingImport(null)
  }, [])

  return {
    songs,
    videos,
    scanning,
    permissionGranted,
    musicSort,
    videoView,
    isNative,
    scanMusicFiles,
    scanVideoFiles,
    requestMediaPermission,
    setMusicSort,
    setVideoView,
    sortSongs,
    addSong,
    addVideo,
    removeSong,
    removeVideo,
    abortScan,
    invalidateCache,
    getVideoHistory,
    saveVideoPosition,
    getVideoPosition,
    // Web file pickers — hidden in APK mode
    pickMusicFiles,
    pickMusicFolder,
    pickVideoFiles,
    pickVideoFolder,
    // Preview modal + import flow
    pendingImport,
    confirmImport,
    cancelImport,
    // Playable URL re-creation
    getPlayableSongUrl,
    getPlayableVideoUrl,
    // URL cleanup
    revokeUrl,
    revokeUrlsForItems,
  }
}
