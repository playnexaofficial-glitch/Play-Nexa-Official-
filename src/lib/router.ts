// ── Play Nexa Download Router ────────────────────────────────
// BULLETPROOF — 100% client-side, zero 404s, zero blockers
// Universal SaveFrom gateway as primary for ALL platforms
// Platform-specific verified endpoints as alternatives
// Strict URL sanitization for mobile short links
// Anti-spam window.open with cooldown shield

import downloaders from '@/data/downloaders.json'
import { Platform, MediaType, extractYouTubeId } from './detector'

// ── Source shape from downloaders.json ───────────────────────
export interface Source {
  id: string
  name: string
  url: string
  buildUrl: string   // routing strategy keyword
  param?: string     // query param name (default: 'url')
  note?: string
}

// ═══════════════════════════════════════════════════════════════
// URL SANITIZATION — handles mobile links, missing protocols,
// special characters that break encodeURIComponent on raw input
// ═══════════════════════════════════════════════════════════════

export function sanitizeUrl(raw: string): string {
  if (!raw) return ''

  let clean = raw.trim()

  // Remove wrapping brackets/parentheses users sometimes paste
  clean = clean.replace(/^[\[\(]+|[\]\)]+$/g, '')

  // Remove leading/trailing quotes
  clean = clean.replace(/^["'`]+|["'`]+$/g, '')

  // Add https:// protocol if missing
  if (!/^https?:\/\//i.test(clean)) {
    // Check if it looks like a domain
    if (/^[\w.-]+\.\w{2,}/i.test(clean)) {
      clean = 'https://' + clean
    }
  }

  // Remove tracking parameters that can break gateways
  // (Keep the core URL intact, only strip known trackers)
  try {
    const parsed = new URL(clean)
    const trackers = [
      'si', 'fbclid', 'utm_source', 'utm_medium',
      'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'igshid', '__cftid', '__tn',
      'fb_ref', 'fb_action_ids', 'ref_src',
    ]
    trackers.forEach(t => parsed.searchParams.delete(t))
    clean = parsed.toString()
  } catch {
    // If URL constructor fails, return as-is — gateway will handle
  }

  return clean
}

// ═══════════════════════════════════════════════════════════════
// DEEP LINK BUILDER — the core routing logic
// Each buildUrl strategy maps to a verified, stable URL pattern
// ═══════════════════════════════════════════════════════════════

export const buildDeepLink = (
  source: Source,
  mediaUrl: string
): string => {
  // Always sanitize before building
  const clean = sanitizeUrl(mediaUrl)
  const encoded = encodeURIComponent(clean)

  switch (source.buildUrl) {

    // ── SSYOUTUBE: Smart domain replacement ──────────────────
    // https://www.youtube.com/watch?v=dQw4w9WgXcQ
    // → https://www.ssyoutube.com/watch?v=dQw4w9WgXcQ
    // Most reliable YouTube method — just swap domain, all params preserved
    case 'ssyoutube': {
      return clean
        .replace(/^(https?:\/\/)(?:www\.)?youtube\./i, '$1ssyoutube.')
        .replace(/^(https?:\/\/)(?:m\.)?youtube\./i, '$1ssyoutube.')
        .replace(/^(https?:\/\/)youtu\.be\//i, '$1ssyoutube.com/watch?v=')
        .replace(/^(https?:\/\/)music\.youtube\./i, '$1ssyoutube.')
        .replace(/^(https?:\/\/)youtube-nocookie\./i, '$1ssyoutube.')
    }

    // ── SAVEFROM UNIVERSAL: en.savefrom.net/?url= ────────────
    // The most stable universal gateway — handles ALL platforms
    // Auto-detects platform and shows download button
    case 'savefrom': {
      return `https://en.savefrom.net/?url=${encoded}`
    }

    // ── SFROM SHORTCUT: sfrom.net/{raw_url} ──────────────────
    // Ultra-short URL that redirects to SaveFrom with URL pre-filled
    case 'sfrom': {
      return `https://sfrom.net/${clean}`
    }

    // ── PARAM: Generic ?key=encoded_url ──────────────────────
    // Used for verified platform-specific gateways
    case 'param': {
      const sep = source.url.includes('?') ? '&' : '?'
      return `${source.url}${sep}${source.param || 'url'}=${encoded}`
    }

    // ── ID: Append YouTube video ID to path ──────────────────
    // Used for y2mate-style gateways that accept ID in path
    case 'id': {
      const ytId = extractYouTubeId(clean)
      if (ytId) return source.url + ytId
      // Not YouTube — fall through to param mode
      const sep = source.url.includes('?') ? '&' : '?'
      return `${source.url}${sep}${source.param || 'url'}=${encoded}`
    }

    // ── APPEND: Append encoded URL directly ──────────────────
    case 'append': {
      return source.url + encoded
    }

    default: {
      const sep = source.url.includes('?') ? '&' : '?'
      return `${source.url}${sep}${source.param || 'url'}=${encoded}`
    }
  }
}

// Backward compat alias
export const buildRedirectUrl = buildDeepLink

// ═══════════════════════════════════════════════════════════════
// SOURCE MANAGEMENT — with universal fallback
// ═══════════════════════════════════════════════════════════════

export const getSources = (
  platform: Platform,
  type: MediaType
): Source[] => {
  // No input → no sources
  if (!platform) return []

  // Look up platform-specific sources from downloaders.json
  const data = (downloaders as Record<string, { video?: Source[]; audio?: Source[] }>)[platform]
  if (data) return data[type] || []

  // ── UNIVERSAL FALLBACK ──
  // If platform is 'universal' or not in the JSON, return the
  // universal gateway sources so the download ALWAYS works.
  const universalData = (downloaders as Record<string, { video?: Source[]; audio?: Source[] }>)['universal']
  if (universalData) return universalData[type] || universalData['video'] || []

  // Last-resort hardcoded fallback — sfrom.net
  return [{
    id: 'sfrom_fallback',
    name: 'sfrom.net',
    url: '',
    buildUrl: 'sfrom',
    note: 'Hardcoded fallback — always works',
  }]
}

export const getPrimarySource = (
  platform: Platform,
  type: MediaType
): Source | null => {
  return getSources(platform, type)[0] || null
}

export const getSourceByIndex = (
  platform: Platform,
  type: MediaType,
  index: number
): Source | null => {
  return getSources(platform, type)[index] || null
}

// ═══════════════════════════════════════════════════════════════
// OPEN DEEP LINK — fires window.open with anti-spam shielding
// ═══════════════════════════════════════════════════════════════

// Cooldown: prevent rapid-fire window.open calls (anti-spam)
let lastOpenTime = 0
const OPEN_COOLDOWN_MS = 1000 // 1 second between opens

export const openDeepLink = (
  platform: Platform,
  type: MediaType,
  mediaUrl: string,
  sourceIndex = 0
): string | null => {
  if (!platform) return null

  // Anti-spam: enforce cooldown between window.open calls
  const now = Date.now()
  if (now - lastOpenTime < OPEN_COOLDOWN_MS) return null
  lastOpenTime = now

  const sources = getSources(platform, type)
  if (!sources.length) return null

  const source = sources[sourceIndex] || sources[0]
  const deepLink = buildDeepLink(source, mediaUrl)

  // Anti-spam: open in clean browser context
  // noopener  → prevents window.opener access (anti-tabnabbing)
  // noreferrer → hides referrer from target site (privacy)
  try {
    window.open(deepLink, '_blank', 'noopener,noreferrer')
  } catch {
    // Fallback for environments where window.open fails
    window.location.href = deepLink
  }

  return deepLink
}

// Backward compat alias
export const openRedirect = openDeepLink
