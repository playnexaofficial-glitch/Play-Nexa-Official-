// ═══════════════════════════════════════════════════════════════
// Play Nexa — Device Media Scanner Hook
// Smart environment detection: Web fallback vs APK auto-scan
// Full URL lifecycle management with garbage collection
// Duration extraction pipeline · 2GB RAM optimized
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────

export interface MediaFile {
  id: string
  name: string           // Display name (filename without extension)
  url: string            // Object URL or native file URL for playback
  size: number
  duration: number       // Seconds, extracted from metadata
  file?: File            // Only available for browser-picked files
  folder: string         // Parent directory name
  addedAt: number        // Timestamp for chronological grouping
  lastPlayed?: number
  source: 'native' | 'browser'  // Where the file came from
  nativePath?: string    // Original file:// path (native only)
}

type MediaType = 'video' | 'audio'

interface UseDeviceMediaReturn {
  files: MediaFile[]
  scanning: boolean
  isNative: boolean
  scanProgress: string
  pickFiles: () => void
  pickFolder: () => void
  refreshScan: () => void
  removeFile: (id: string) => void
  getPlayableUrl: (file: MediaFile) => string | null
  extractDuration: (file: MediaFile) => void
}

// ── Constants ──────────────────────────────────────────────────

const VIDEO_EXTENSIONS = new Set(['mp4', 'mkv', '3gp', 'webm', 'avi', 'mov', 'flv', 'wmv', 'm4v', 'ts', 'mpg', 'mpeg'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wma', 'amr'])

const NATIVE_VIDEO_DIRS = [
  '/storage/emulated/0/Movies',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Downloads',
  '/storage/emulated/0/DCIM',
  '/storage/emulated/0/DCIM/Camera',
  '/storage/emulated/0/Video',
  '/storage/emulated/0/Android/media',
]

const NATIVE_AUDIO_DIRS = [
  '/storage/emulated/0/Music',
  '/storage/emulated/0/Download',
  '/storage/emulated/0/Downloads',
  '/storage/emulated/0/Audio',
  '/storage/emulated/0/Recordings',
  '/storage/emulated/0/Android/media',
  '/storage/emulated/0/WhatsApp/Media/WhatsApp Audio',
]

const LS_KEYS = {
  video: 'pn_local_videos_v3',
  audio: 'pn_local_tracks_v3',
}

// ── Environment Detection ──────────────────────────────────────

function detectNative(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  if (w.Capacitor?.isNativePlatform?.()) return true
  if (w.Capacitor?.getPlatform?.() === 'android') return true
  if (w.Capacitor?.Plugins && document.referrer?.includes('android')) return true
  return false
}

/** Convert a native file:// path to a Capacitor-safe web-view URL */
function convertFileSrc(filePath: string): string {
  try {
    // Capacitor.convertFileSrc makes file:// readable in WebView
    const w = window as any
    if (w.Capacitor?.convertFileSrc) {
      return w.Capacitor.convertFileSrc(filePath)
    }
  } catch {}
  // Fallback: return as-is (may not work in WebView)
  return filePath
}

// ── Helpers ────────────────────────────────────────────────────

function generateId(): string {
  return `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : ''
}

function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(0, dot) : filename
}

function matchesType(ext: string, mediaType: MediaType): boolean {
  if (mediaType === 'video') return VIDEO_EXTENSIONS.has(ext)
  return AUDIO_EXTENSIONS.has(ext)
}

function getFolderName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  // Return the parent directory name
  return parts.length >= 2 ? parts[parts.length - 2] : 'Unknown'
}

// ── Native Scanner (Capacitor Filesystem) ──────────────────────

interface NativeFileEntry {
  name: string
  path: string
  size: number
  type: string
  mtime?: number
}

async function scanNativeDirectory(
  dirPath: string,
  mediaType: MediaType,
  onProgress?: (msg: string) => void
): Promise<MediaFile[]> {
  const results: MediaFile[] = []
  onProgress?.(`Scanning ${dirPath.split('/').pop() || dirPath}...`)

  try {
    // Dynamic require — @capacitor/filesystem may not be installed in web builds
     
    const { Filesystem } = require('@capacitor/filesystem')

    let entries: NativeFileEntry[] = []
    try {
      const result = await Filesystem.readdir({
        path: dirPath,
        directory: undefined as any,
      })
      entries = (result?.files || []).map((f: any) => ({
        name: f.name,
        path: `${dirPath}/${f.name}`,
        size: f.size || 0,
        type: f.type || '',
        mtime: f.mtime ? new Date(f.mtime).getTime() : Date.now(),
      }))
    } catch {
      // Directory doesn't exist or no permission — skip silently
      return results
    }

    for (const entry of entries) {
      const ext = getExtension(entry.name)

      if (matchesType(ext, mediaType)) {
        const nativeUrl = convertFileSrc(entry.path)
        results.push({
          id: generateId(),
          name: stripExtension(entry.name),
          url: nativeUrl,
          size: entry.size,
          duration: 0,
          folder: getFolderName(entry.path),
          addedAt: entry.mtime || Date.now(),
          source: 'native',
          nativePath: entry.path,
        })
      }
    }

    // Recurse into subdirectories (max depth 2 to avoid infinite recursion)
    const subdirs = entries.filter(e =>
      !e.name.startsWith('.') &&
      e.type === 'directory' &&
      !e.name.includes('Android/data')
    )

    if (subdirs.length > 0) {
      for (const subdir of subdirs.slice(0, 10)) {
        const subResults = await scanNativeDirectory(
          subdir.path, mediaType, onProgress
        )
        results.push(...subResults)
      }
    }
  } catch {
    // @capacitor/filesystem not available — return empty
  }

  return results
}

async function fullNativeScan(
  mediaType: MediaType,
  onProgress?: (msg: string) => void
): Promise<MediaFile[]> {
  const dirs = mediaType === 'video' ? NATIVE_VIDEO_DIRS : NATIVE_AUDIO_DIRS
  const allFiles: MediaFile[] = []
  const seenPaths = new Set<string>()

  for (const dir of dirs) {
    const files = await scanNativeDirectory(dir, mediaType, onProgress)
    for (const f of files) {
      // Deduplicate by path
      const key = f.nativePath || f.name
      if (!seenPaths.has(key)) {
        seenPaths.add(key)
        allFiles.push(f)
      }
    }
  }

  // Sort: newest first
  allFiles.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))
  return allFiles
}

// ── The Hook ───────────────────────────────────────────────────

export function useDeviceMedia(mediaType: MediaType): UseDeviceMediaReturn {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState('')
  const isNative = detectNative()

  // Track object URLs for cleanup
  const objectUrlsRef = useRef<Set<string>>(new Set())

  // File input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const folderInputRef = useRef<HTMLInputElement | null>(null)

  // ── Load metadata from localStorage on mount ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEYS[mediaType])
      if (saved) {
        const meta = JSON.parse(saved) as MediaFile[]
        setFiles(meta.map(f => ({
          ...f,
          url: '', // Object URLs are gone after reload
          file: undefined, // File objects can't survive reload
        })))
      }
    } catch {}
  }, [mediaType])

  // ── Cleanup all object URLs on unmount ──
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url) } catch {}
      })
      objectUrlsRef.current.clear()
    }
  }, [])

  // ── Save metadata (without blob URLs or File objects) ──
  const saveMeta = useCallback((list: MediaFile[]) => {
    const meta = list.map(f => ({
      id: f.id,
      name: f.name,
      url: '', // Never persist object URLs
      size: f.size,
      duration: f.duration,
      folder: f.folder,
      addedAt: f.addedAt,
      lastPlayed: f.lastPlayed,
      source: f.source,
      nativePath: f.nativePath,
    }))
    try {
      localStorage.setItem(LS_KEYS[mediaType], JSON.stringify(meta))
    } catch {}
  }, [mediaType])

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

  // ── Process browser-picked files ──
  const processBrowserFiles = useCallback((fileList: File[]) => {
    const now = Date.now()
    const newFiles: MediaFile[] = fileList
      .filter(file => {
        const ext = getExtension(file.name)
        return matchesType(ext, mediaType)
      })
      .map((file, i) => {
        const objectUrl = URL.createObjectURL(file)
        registerUrl(objectUrl)
        return {
          id: generateId(),
          name: stripExtension(file.name),
          url: objectUrl,
          size: file.size,
          duration: 0,
          file,
          folder: file.webkitRelativePath
            ? file.webkitRelativePath.split('/').slice(0, -1).join('/')
            : 'Browser',
          addedAt: now - i,
          source: 'browser' as const,
        }
      })

    if (newFiles.length === 0) return

    setFiles(prev => {
      // Deduplicate by name+size
      const existingKeys = new Set(prev.map(f => `${f.name}_${f.size}`))
      const unique = newFiles.filter(f => !existingKeys.has(`${f.name}_${f.size}`))
      const updated = [...unique, ...prev]
      saveMeta(updated)
      return updated
    })
  }, [mediaType, saveMeta, registerUrl])

  // ── Pick individual files ──
  const pickFiles = useCallback(() => {
    // Create and trigger file input
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = mediaType === 'video' ? 'video/*' : 'audio/*'
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const fileList = Array.from(target.files || [])
      processBrowserFiles(fileList)
    }
    input.click()
  }, [mediaType, processBrowserFiles])

  // ── Pick entire folder (webkitdirectory) ──
  const pickFolder = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = mediaType === 'video' ? 'video/*' : 'audio/*'
    // @ts-ignore — webkitdirectory is non-standard but widely supported
    input.webkitdirectory = true
    // @ts-ignore
    input.directory = true
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const fileList = Array.from(target.files || [])
      processBrowserFiles(fileList)
    }
    input.click()
  }, [mediaType, processBrowserFiles])

  // ── Refresh / Auto-scan ──
  const refreshScan = useCallback(async () => {
    if (scanning) return
    setScanning(true)
    setScanProgress('Starting scan...')

    try {
      if (isNative) {
        // ── Native: Scan device storage ──
        const nativeFiles = await fullNativeScan(mediaType, (msg) => {
          setScanProgress(msg)
        })

        setFiles(prev => {
          // Merge: keep browser-picked files, add native discovered files
          const browserFiles = prev.filter(f => f.source === 'browser')
          const existingNativePaths = new Set(
            prev.filter(f => f.source === 'native').map(f => f.nativePath)
          )
          const newNative = nativeFiles.filter(
            f => !existingNativePaths.has(f.nativePath)
          )
          const merged = [...browserFiles, ...prev.filter(f => f.source === 'native'), ...newNative]
          // Deduplicate native paths
          const seen = new Set<string>()
          const deduped = merged.filter(f => {
            const key = f.source === 'native' ? (f.nativePath || f.id) : f.id
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          saveMeta(deduped)
          return deduped
        })
      }
      // Web: no auto-scan, user must pick files manually
    } catch (err) {
      console.error('Media scan failed:', err)
    } finally {
      setScanning(false)
      setScanProgress('')
    }
  }, [scanning, isNative, mediaType, saveMeta])

  // ── Auto-scan on native mount ──
  useEffect(() => {
    if (isNative) {
      refreshScan()
    }
     
  }, [isNative])

  // ── Remove file and cleanup URL ──
  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.url) revokeUrl(file.url)
      const updated = prev.filter(f => f.id !== id)
      saveMeta(updated)
      return updated
    })
  }, [saveMeta, revokeUrl])

  // ── Get a playable URL (re-create if needed) ──
  const getPlayableUrl = useCallback((file: MediaFile): string | null => {
    // Already has a URL
    if (file.url) return file.url

    // Browser file: re-create object URL from File object
    if (file.file) {
      const objectUrl = URL.createObjectURL(file.file)
      registerUrl(objectUrl)
      // Update the file in state
      setFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, url: objectUrl } : f
      ))
      return objectUrl
    }

    // Native file: re-convert path
    if (file.nativePath) {
      const nativeUrl = convertFileSrc(file.nativePath)
      setFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, url: nativeUrl } : f
      ))
      return nativeUrl
    }

    return null
  }, [registerUrl])

  // ── Extract duration from media file ──
  const extractDuration = useCallback((file: MediaFile) => {
    if (file.duration > 0 || !file.url) return

    const element = mediaType === 'video'
      ? document.createElement('video')
      : document.createElement('audio')

    element.preload = 'metadata'
    element.src = file.url

    element.onloadedmetadata = () => {
      const dur = element.duration
      if (Number.isFinite(dur) && dur > 0) {
        setFiles(prev => {
          const updated = prev.map(f =>
            f.id === file.id ? { ...f, duration: dur } : f
          )
          saveMeta(updated)
          return updated
        })
      }
    }

    // Cleanup: don't revoke the URL since it may still be in use
    // URLs are cleaned up on unmount or explicit remove
  }, [mediaType, saveMeta])

  // ── Extract durations for files that don't have them ──
  useEffect(() => {
    files.forEach(f => {
      if (f.url && f.duration === 0) extractDuration(f)
    })
     
  }, [files.length])

  return {
    files,
    scanning,
    isNative,
    scanProgress,
    pickFiles,
    pickFolder,
    refreshScan,
    removeFile,
    getPlayableUrl,
    extractDuration,
  }
}
