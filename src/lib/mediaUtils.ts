// ── Play Nexa Media Utilities ──────────────────────────────────
// Shared utilities for Music & Video players
// All functions are real, working — zero placeholders
// 2GB RAM safe · No external deps for core functions

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

export interface AudioMeta {
  title: string
  artist: string
  album: string
  duration: number
  artwork: string | null
}

export interface SubCue {
  start: number
  end: number
  text: string
}

export interface Song {
  id: string
  name: string
  artist: string
  album: string
  url: string
  size: number
  duration: number
  cover: string | null
  path: string
  format: string
  file?: File           // Only available for browser-picked files
}

export interface VideoFile {
  id: string
  name: string
  url: string
  size: number
  duration: number
  thumbnail: string | null
  path: string
  format: string
  width: number
  height: number
  lastPlayed: number | null
  progress: number
  file?: File           // Only available for browser-picked files
}

// ══════════════════════════════════════════════════════════════
// FORMAT DURATION — "3:24" or "1:24:30"
// ══════════════════════════════════════════════════════════════

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ══════════════════════════════════════════════════════════════
// FORMAT FILE SIZE — "45 MB" or "1.2 GB"
// ══════════════════════════════════════════════════════════════

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(0)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  return `${bytes} B`
}

// ══════════════════════════════════════════════════════════════
// EXTRACT AUDIO METADATA
// Parses filename for title/artist as fallback
// Uses jsmediatags if available for full metadata
// ══════════════════════════════════════════════════════════════

export async function extractAudioMetadata(
  filePath: string,
  file?: File
): Promise<AudioMeta> {
  const fallback: AudioMeta = {
    title: '',
    artist: 'Unknown Artist',
    album: 'Unknown Album',
    duration: 0,
    artwork: null,
  }

  // Parse filename for title/artist
  const fileName = filePath.split('/').pop() || filePath
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '')
  const nameClean = nameWithoutExt.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()

  // Try "Artist - Title" pattern
  if (nameClean.includes(' - ')) {
    const parts = nameClean.split(' - ')
    fallback.artist = parts[0].trim()
    fallback.title = parts.slice(1).join(' - ').trim()
  } else {
    fallback.title = nameClean
  }

  // Try to get duration from audio element
  if (file) {
    try {
      const duration = await getAudioDuration(file)
      fallback.duration = duration
    } catch {
      // Duration unavailable from file
    }
  }

  // Try jsmediatags for full metadata + artwork (browser build only)
  try {
    if (typeof window !== 'undefined' && file) {
      const jsmediatags = await import(
        /* webpackIgnore: true */ /* @vite-ignore */
        'jsmediatags/dist/jsmediatags.min.js'
      ).catch(() => null)
      if (jsmediatags) {
        const Reader = jsmediatags.default || jsmediatags
        const tags = await new Promise<any>((resolve, reject) => {
          Reader.read(file, {
            onSuccess: (tag: any) => resolve(tag),
            onError: (err: any) => reject(err),
          })
        })
        if (tags?.tags) {
          if (tags.tags.title) fallback.title = tags.tags.title
          if (tags.tags.artist) fallback.artist = tags.tags.artist
          if (tags.tags.album) fallback.album = tags.tags.album

          // Extract artwork
          const picture = tags.tags.picture
          if (picture?.data && picture.format) {
            const bytes = new Uint8Array(picture.data)
            let binary = ''
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i])
            }
            fallback.artwork = `data:${picture.format};base64,${btoa(binary)}`
          }
        }
      }
    }
  } catch {
    // jsmediatags not available or parsing failed — use fallback
  }

  return fallback
}

// ══════════════════════════════════════════════════════════════
// GET AUDIO DURATION from File object
// ══════════════════════════════════════════════════════════════

export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    const url = URL.createObjectURL(file)
    audio.src = url
    audio.onloadedmetadata = () => {
      const dur = audio.duration
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(dur) ? dur : 0)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load audio metadata'))
    }
  })
}

// ══════════════════════════════════════════════════════════════
// GENERATE VIDEO THUMBNAIL
// Seek to 1s, draw frame to canvas, return JPEG data URL
// ══════════════════════════════════════════════════════════════

export function generateVideoThumbnail(
  filePath: string,
  file?: File
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    const url = file ? URL.createObjectURL(file) : filePath
    video.src = url

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
      if (file) URL.revokeObjectURL(url)
    }

    video.onloadeddata = () => {
      // Seek to 1 second or 10% of duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1)
      video.currentTime = Math.max(0.1, seekTime)
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        const w = video.videoWidth || 320
        const h = video.videoHeight || 180
        // Scale down for performance — max 320px wide
        const scale = Math.min(1, 320 / w)
        canvas.width = Math.floor(w * scale)
        canvas.height = Math.floor(h * scale)

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          reject(new Error('Canvas context unavailable'))
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        cleanup()
        resolve(dataUrl)
      } catch (err) {
        cleanup()
        reject(err)
      }
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Failed to load video for thumbnail'))
    }

    // Timeout after 5 seconds
    setTimeout(() => {
      cleanup()
      reject(new Error('Thumbnail generation timed out'))
    }, 5000)
  })
}

// ══════════════════════════════════════════════════════════════
// PARSE SUBTITLE (.srt format)
// Regex-based SRT parser — handles timestamps and multi-line text
// ══════════════════════════════════════════════════════════════

export function parseSubtitle(content: string, format: 'srt' | 'ass'): SubCue[] {
  if (format === 'srt') {
    return parseSrt(content)
  }
  return parseAss(content)
}

function parseSrt(content: string): SubCue[] {
  const cues: SubCue[] = []
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Split by double newline (cue blocks)
  const blocks = normalized.split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue

    // Find the timestamp line
    let tsLine = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        tsLine = i
        break
      }
    }
    if (tsLine === -1) continue

    const tsMatch = lines[tsLine].match(
      /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/
    )
    if (!tsMatch) continue

    const start = parseTimestamp(
      parseInt(tsMatch[1]),
      parseInt(tsMatch[2]),
      parseInt(tsMatch[3]),
      tsMatch[4]
    )
    const end = parseTimestamp(
      parseInt(tsMatch[5]),
      parseInt(tsMatch[6]),
      parseInt(tsMatch[7]),
      tsMatch[8]
    )

    const text = lines
      .slice(tsLine + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '') // Strip HTML tags
      .trim()

    if (text) {
      cues.push({ start, end, text })
    }
  }

  return cues
}

function parseAss(content: string): SubCue[] {
  const cues: SubCue[] = []
  const lines = content.replace(/\r\n/g, '\n').split('\n')

  for (const line of lines) {
    if (!line.startsWith('Dialogue:')) continue
    const parts = line.substring(9).split(',')
    if (parts.length < 10) continue

    const start = parseAssTimestamp(parts[1].trim())
    const end = parseAssTimestamp(parts[2].trim())
    // Text is everything after the 9th comma
    const text = parts
      .slice(9)
      .join(',')
      .replace(/\{[^}]*\}/g, '') // Strip ASS overrides
      .replace(/\\N/g, '\n')
      .replace(/\\n/g, '\n')
      .trim()

    if (text && Number.isFinite(start) && Number.isFinite(end)) {
      cues.push({ start, end, text })
    }
  }

  return cues
}

function parseTimestamp(h: number, m: number, s: number, ms: string): number {
  const milliseconds = ms.length === 3 ? parseInt(ms) : parseInt(ms) * 10
  return h * 3600 + m * 60 + s + milliseconds / 1000
}

function parseAssTimestamp(ts: string): number {
  const match = ts.match(/(\d+):(\d{2}):(\d{2})\.(\d{2})/)
  if (!match) return NaN
  return (
    parseInt(match[1]) * 3600 +
    parseInt(match[2]) * 60 +
    parseInt(match[3]) +
    parseInt(match[4]) / 100
  )
}

// ══════════════════════════════════════════════════════════════
// GET VIDEO DIMENSIONS
// ══════════════════════════════════════════════════════════════

export function getVideoDimensions(
  filePath: string,
  file?: File
): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = file ? URL.createObjectURL(file) : filePath
    video.src = url

    video.onloadedmetadata = () => {
      const w = video.videoWidth || 0
      const h = video.videoHeight || 0
      if (file) URL.revokeObjectURL(url)
      resolve({ w, h })
    }

    video.onerror = () => {
      if (file) URL.revokeObjectURL(url)
      reject(new Error('Failed to load video for dimensions'))
    }

    setTimeout(() => {
      if (file) URL.revokeObjectURL(url)
      reject(new Error('Video dimensions timed out'))
    }, 5000)
  })
}

// ══════════════════════════════════════════════════════════════
// NATIVE PLATFORM DETECTION
// ══════════════════════════════════════════════════════════════

export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  if (w.Capacitor?.isNativePlatform?.()) return true
  if (w.Capacitor?.getPlatform?.() === 'android') return true
  return false
}

// ══════════════════════════════════════════════════════════════
// FILE EXTENSION HELPERS
// ══════════════════════════════════════════════════════════════

const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.aac', '.flac', '.ogg', '.wav', '.m4a', '.wma', '.opus',
])

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.webm', '.3gp', '.mov', '.ts', '.mpg', '.mpeg',
])

export function isAudioFile(filename: string): boolean {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || ''
  return AUDIO_EXTENSIONS.has(ext)
}

export function isVideoFile(filename: string): boolean {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || ''
  return VIDEO_EXTENSIONS.has(ext)
}

export function getFileExtension(filename: string): string {
  return filename.toLowerCase().match(/\.[^.]+$/)?.[0]?.slice(1) || ''
}

// ══════════════════════════════════════════════════════════════
// GENERATE UNIQUE ID
// ══════════════════════════════════════════════════════════════

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ══════════════════════════════════════════════════════════════
// DEBOUNCE UTILITY
// ══════════════════════════════════════════════════════════════

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: any[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  return debounced as T
}

// ══════════════════════════════════════════════════════════════
// LOCAL STORAGE HELPERS (pn_ prefixed)
// ══════════════════════════════════════════════════════════════

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function lsSet(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage quota exceeded or unavailable
  }
}

export function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
