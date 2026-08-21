// ── Play Nexa Cache System ──────────────────────────────────────
// Real localStorage cache with 30-minute TTL
// Prevents redundant YouTube API calls → saves quota
// No fake timers. No demo. Real working.

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export const cacheSet = (key: string, data: unknown): void => {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }))
  } catch {
    // Storage full — skip cache silently
  }
}

export const cacheGet = <T = unknown>(key: string): T | null => {
  try {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { data: T; timestamp: number }
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

export const cacheClear = (prefix?: string): void => {
  try {
    if (typeof window === 'undefined') return
    if (!prefix) {
      // Only clear Play Nexa prefixed keys, not all localStorage
      Object.keys(localStorage)
        .filter(k => k.startsWith('pn_') || k.startsWith('grovix_'))
        .forEach(k => localStorage.removeItem(k))
      return
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith(prefix))
      .forEach(k => localStorage.removeItem(k))
  } catch {
    // Silently fail
  }
}
