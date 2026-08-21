// ═══════════════════════════════════════════════════════════════
// Play Nexa — Smart URL Detection Library
// Auto-detects 21 source platforms from any URL
// Extracts video IDs for YouTube, Instagram, etc.
// ═══════════════════════════════════════════════════════════════

import { SOURCE_PLATFORMS, SourcePlatform } from './platforms'

export interface DetectResult {
  platform: SourcePlatform | null
  videoId: string | null
  isValid: boolean
  cleanUrl: string
}

/**
 * Detect which source platform a URL belongs to.
 * Scans all 21 SOURCE_PLATFORMS using regex urlPatterns.
 * Returns the matched platform + extracted videoId (if any).
 */
export const detectPlatform = (
  url: string
): DetectResult => {
  const cleanUrl = url.trim().replace(/\s/g, '')

  if (!cleanUrl.startsWith('http')) {
    return {
      platform: null,
      videoId: null,
      isValid: false,
      cleanUrl,
    }
  }

  for (const platform of SOURCE_PLATFORMS) {
    const matched = platform.urlPatterns
      .some(pattern => pattern.test(cleanUrl))

    if (matched) {
      let videoId: string | null = null

      // Extract video ID using platform-specific pattern
      if (platform.videoIdPattern) {
        const match = cleanUrl.match(platform.videoIdPattern)
        videoId = match?.[1] || null
      }

      // Extract Instagram post ID from /p/, /reel/, /tv/ paths
      if (platform.id === 'instagram') {
        const instaMatch = cleanUrl.match(
          /\/(p|reel|tv)\/([A-Za-z0-9_-]+)/
        )
        videoId = instaMatch?.[2] || null
      }

      return {
        platform,
        videoId,
        isValid: true,
        cleanUrl,
      }
    }
  }

  // Unknown URL but valid format
  return {
    platform: null,
    videoId: null,
    isValid: true,
    cleanUrl,
  }
}

/** Validate URL format using the URL constructor */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url.trim())
    return true
  } catch {
    return false
  }
}

/** Extract YouTube video ID from various URL formats */
export const extractYouTubeId = (
  url: string
): string | null => {
  const patterns = [
    /v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
    /live\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}
