// ── Play Nexa Platform Detector ──────────────────────────────
// ULTRA-INCLUSIVE RegEx-based platform detection
// Supports: YouTube, TikTok, Facebook, Instagram, Twitter/X, Vimeo, SoundCloud
// Plus: Universal catch-all for ANY valid URL → sfrom.net gateway
//
// Design: Domain-first matching — any path on a known domain is accepted.
// Mobile subdomains, short URLs, and regional variants all matched.

export type Platform =
  | 'youtube'
  | 'tiktok'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'vimeo'
  | 'soundcloud'
  | 'universal'   // ← catch-all for any valid URL not matching above
  | null          // ← only for empty/invalid input

export type MediaType = 'video' | 'audio'

// ── Ultra-inclusive domain-first RegEx patterns ──────────────
// Strategy: Match the domain first, accept any path after it.
// This prevents "fb.watch" or "instagr.am" from being missed
// just because the path structure changed.
const PLATFORM_PATTERNS: Array<{
  platform: Exclude<NonNullable<Platform>, 'universal'>
  patterns: RegExp[]
  label: string
  icon: string
  color: string
  gradient: string
}> = [
  {
    platform: 'youtube',
    patterns: [
      // Standard desktop
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\//i,
      // Mobile
      /(?:https?:\/\/)?m\.youtube\.com\//i,
      // Music
      /(?:https?:\/\/)?music\.youtube\.com\//i,
      // Short URL
      /(?:https?:\/\/)?youtu\.be\//i,
      // Kids (some users paste kids videos)
      /(?:https?:\/\/)?(?:www\.)?youtube-nocookie\.com\//i,
    ],
    label: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    gradient: 'from-red-600 to-red-800',
  },
  {
    platform: 'tiktok',
    patterns: [
      // Standard desktop
      /(?:https?:\/\/)?(?:www\.)?tiktok\.com\//i,
      // Mobile short links (vt/vm)
      /(?:https?:\/\/)?vt\.tiktok\.com\//i,
      /(?:https?:\/\/)?vm\.tiktok\.com\//i,
      // TikTok short redirect
      /(?:https?:\/\/)?tiktok\.com\/t\//i,
      // Regional subdomains
      /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@/i,
    ],
    label: 'TikTok',
    icon: '🎵',
    color: '#FE2C55',
    gradient: 'from-pink-500 to-violet-600',
  },
  {
    platform: 'facebook',
    patterns: [
      // Standard desktop
      /(?:https?:\/\/)?(?:www\.)?facebook\.com\//i,
      // Mobile
      /(?:https?:\/\/)?m\.facebook\.com\//i,
      // Short URL fb.watch
      /(?:https?:\/\/)?fb\.watch\//i,
      // fb.com short domain
      /(?:https?:\/\/)?(?:www\.)?fb\.com\//i,
      // fb.me short links
      /(?:https?:\/\/)?fb\.me\//i,
      // Facebook web standalone (fbcdn not needed — those are CDN URLs)
      /(?:https?:\/\/)?web\.facebook\.com\//i,
    ],
    label: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    platform: 'instagram',
    patterns: [
      // Standard desktop
      /(?:https?:\/\/)?(?:www\.)?instagram\.com\//i,
      // Mobile
      /(?:https?:\/\/)?m\.instagram\.com\//i,
      // Short domain instagr.am
      /(?:https?:\/\/)?instagr\.am\//i,
      // ig.me short links
      /(?:https?:\/\/)?ig\.me\//i,
      // Instagram link in bio / dd.instagram.com
      /(?:https?:\/\/)?dd\.instagram\.com\//i,
    ],
    label: 'Instagram',
    icon: '📷',
    color: '#E1306C',
    gradient: 'from-pink-500 to-orange-400',
  },
  {
    platform: 'twitter',
    patterns: [
      // Standard twitter.com
      /(?:https?:\/\/)?(?:www\.)?twitter\.com\//i,
      // Mobile twitter
      /(?:https?:\/\/)?mobile\.twitter\.com\//i,
      // X.com (rebranded)
      /(?:https?:\/\/)?(?:www\.)?x\.com\//i,
      // t.co short links (Twitter's URL shortener)
      /(?:https?:\/\/)?t\.co\//i,
    ],
    label: 'Twitter / X',
    icon: '🐦',
    color: '#1DA1F2',
    gradient: 'from-sky-400 to-blue-600',
  },
  {
    platform: 'vimeo',
    patterns: [
      // Standard
      /(?:https?:\/\/)?(?:www\.)?vimeo\.com\//i,
      // Player embed
      /(?:https?:\/\/)?player\.vimeo\.com\//i,
      // Vimeo OTT / on-demand
      /(?:https?:\/\/)?vod\.vimeo\.com\//i,
    ],
    label: 'Vimeo',
    icon: '🎬',
    color: '#1AB7EA',
    gradient: 'from-cyan-400 to-blue-500',
  },
  {
    platform: 'soundcloud',
    patterns: [
      // Standard
      /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\//i,
      // Mobile
      /(?:https?:\/\/)?m\.soundcloud\.com\//i,
      // Short links
      /(?:https?:\/\/)?on\.soundcloud\.com\//i,
      // API subdomain some users see
      /(?:https?:\/\/)?api\.soundcloud\.com\//i,
    ],
    label: 'SoundCloud',
    icon: '🎧',
    color: '#FF5500',
    gradient: 'from-orange-500 to-orange-700',
  },
]

// ── Detect platform from URL using RegEx ────────────────────
// Returns the matched platform, 'universal' for valid but unrecognized URLs,
// or null only for empty/blank input.
export const detectPlatform = (url: string): Platform => {
  if (!url || !url.trim()) return null
  const trimmed = url.trim()

  // Try each known platform's patterns
  for (const rule of PLATFORM_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) return rule.platform
    }
  }

  // ── UNIVERSAL CATCH-ALL ──
  // If the input is a valid URL but didn't match any known platform,
  // route it through the universal engine (sfrom.net).
  // This ensures 100% coverage — NO "not supported" blocker.
  if (isValidUrl(trimmed)) return 'universal'

  // Might be a partial/domain-like input — try adding https://
  if (/^[\w.-]+\.\w{2,}/i.test(trimmed)) return 'universal'

  return null
}

// ── Extract YouTube video ID from any YouTube URL ───────────
export const extractYouTubeId = (url: string): string | null => {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?.*&(?:amp;)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

// ── Check if URL is a YouTube Shorts link ───────────────────
export const isYouTubeShorts = (url: string): boolean => {
  return /youtube\.com\/shorts\//i.test(url)
}

// ── Platform metadata helpers ───────────────────────────────
export const getPlatformIcon = (p: Platform): string => {
  if (p === 'universal') return '🌐'
  const rule = PLATFORM_PATTERNS.find(r => r.platform === p)
  return rule?.icon ?? '🔗'
}

export const getPlatformColor = (p: Platform): string => {
  if (p === 'universal') return '#7C5CFF'
  const rule = PLATFORM_PATTERNS.find(r => r.platform === p)
  return rule?.color ?? '#7C5CFF'
}

export const getPlatformGradient = (p: Platform): string => {
  if (p === 'universal') return 'from-purple-500 to-indigo-600'
  const rule = PLATFORM_PATTERNS.find(r => r.platform === p)
  return rule?.gradient ?? 'from-purple-500 to-purple-700'
}

export const getPlatformName = (p: Platform): string => {
  if (p === 'universal') return 'Universal'
  const rule = PLATFORM_PATTERNS.find(r => r.platform === p)
  return rule?.label ?? 'Unknown'
}

// Check if soundcloud — audio only
export const isAudioOnly = (p: Platform): boolean =>
  p === 'soundcloud'

// ── Validate URL format ─────────────────────────────────────
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    return true
  } catch {
    return false
  }
}

// ── Get all supported platforms for the grid ────────────────
export interface PlatformMeta {
  key: NonNullable<Platform>
  label: string
  icon: string
  color: string
  gradient: string
}

export const ALL_PLATFORMS: PlatformMeta[] = [
  ...PLATFORM_PATTERNS.map(r => ({
    key: r.platform as NonNullable<Platform>,
    label: r.label,
    icon: r.icon,
    color: r.color,
    gradient: r.gradient,
  })),
  // Universal is shown in the grid too
  {
    key: 'universal',
    label: 'Any Link',
    icon: '🌐',
    color: '#7C5CFF',
    gradient: 'from-purple-500 to-indigo-600',
  },
]
