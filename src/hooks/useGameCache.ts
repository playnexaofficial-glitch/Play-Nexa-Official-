// /hooks/useGameCache.ts
// Manually cache game URLs for offline play
// Uses Cache API directly — no SW needed for these ops

const GAMES_CACHE = 'pn-games-v2'
const THUMBS_CACHE = 'pn-thumbs-v2'

interface CacheResult {
  success: boolean
  error?: string
}

interface StorageEstimate {
  quota: number
  usage: number
  availableMB: number
}

async function getStorageEstimate(): Promise<StorageEstimate | null> {
  try {
    if (!navigator.storage?.estimate) return null
    const est = await navigator.storage.estimate()
    const availableMB = (est.quota - est.usage) / (1024 * 1024)
    return {
      quota: est.quota,
      usage: est.usage,
      availableMB,
    }
  } catch {
    return null
  }
}

/**
 * Cache a game URL for offline play.
 * Called when user taps Play.
 * Checks storage quota before caching.
 * Silent fail if cache unavailable.
 */
export async function cacheGame(
  gameId: string,
  gameUrl: string
): Promise<CacheResult> {
  try {
    if (typeof window === 'undefined') return { success: false, error: 'SSR' }
    if (!('caches' in window)) return { success: false, error: 'No Cache API' }

    // Check quota — need at least 200MB available for game caching
    const storage = await getStorageEstimate()
    if (storage && storage.availableMB < 200) {
      return { success: false, error: 'Insufficient storage' }
    }

    const cache = await caches.open(GAMES_CACHE)

    // Check if already cached
    const existing = await cache.match(gameUrl)
    if (existing) return { success: true }

    // Fetch and cache
    const response = await fetch(gameUrl, { mode: 'no-cors' })
    if (response) {
      await cache.put(gameUrl, response)
      // Also store a metadata entry mapping gameId → URL
      const metaCache = await caches.open(GAMES_CACHE)
      const metaResponse = new Response(JSON.stringify({ gameId, gameUrl, cachedAt: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      })
      await metaCache.put(`/__game_meta__/${gameId}`, metaResponse)
      return { success: true }
    }

    return { success: false, error: 'Fetch failed' }
  } catch {
    return { success: false, error: 'Unknown error' }
  }
}

/**
 * Check if a game is already cached.
 * Returns true if the game URL exists in cache.
 */
export async function isGameCached(gameId: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false
    if (!('caches' in window)) return false

    const cache = await caches.open(GAMES_CACHE)
    const metaResponse = await cache.match(`/__game_meta__/${gameId}`)
    return !!metaResponse
  } catch {
    return false
  }
}

/**
 * Clear all game cache entries.
 * Returns the number of items cleared.
 */
export async function clearGameCache(): Promise<number> {
  try {
    if (typeof window === 'undefined') return 0
    if (!('caches' in window)) return 0

    const cache = await caches.open(GAMES_CACHE)
    const keys = await cache.keys()
    const count = keys.length
    await Promise.all(keys.map((key) => cache.delete(key)))
    return count
  } catch {
    return 0
  }
}

/**
 * Clear all thumbnail cache entries.
 * Returns the number of items cleared.
 */
export async function clearThumbCache(): Promise<number> {
  try {
    if (typeof window === 'undefined') return 0
    if (!('caches' in window)) return 0

    const cache = await caches.open(THUMBS_CACHE)
    const keys = await cache.keys()
    const count = keys.length
    await Promise.all(keys.map((key) => cache.delete(key)))
    return count
  } catch {
    return 0
  }
}

/**
 * Get full storage estimate for display in settings.
 */
export async function getCacheStorageInfo(): Promise<{
  gamesCached: number
  thumbsCached: number
  storageMB: StorageEstimate | null
}> {
  try {
    if (typeof window === 'undefined') {
      return { gamesCached: 0, thumbsCached: 0, storageMB: null }
    }

    const gamesCache = await caches.open(GAMES_CACHE)
    const thumbsCache = await caches.open(THUMBS_CACHE)
    const gamesKeys = await gamesCache.keys()
    const thumbsKeys = await thumbsCache.keys()

    // Filter out meta entries from game count
    const gameMetaCount = gamesKeys.filter((k) =>
      k.url.includes('/__game_meta__/')
    ).length

    const storage = await getStorageEstimate()

    return {
      gamesCached: gameMetaCount,
      thumbsCached: thumbsKeys.length,
      storageMB: storage,
    }
  } catch {
    return { gamesCached: 0, thumbsCached: 0, storageMB: null }
  }
}

/**
 * React hook version — provides reactive state.
 */
export function useGameCacheState() {
  const [cachedGameIds, setCachedGameIds] = useState<Set<string>>(new Set())
  const [storageInfo, setStorageInfo] = useState<{
    gamesCached: number
    thumbsCached: number
    storageMB: number | null
  }>({
    gamesCached: 0,
    thumbsCached: 0,
    storageMB: null,
  })

  const refresh = async () => {
    try {
      if (typeof window === 'undefined' || !('caches' in window)) return

      const cache = await caches.open(GAMES_CACHE)
      const keys = await cache.keys()
      const metaKeys = keys.filter((k) => k.url.includes('/__game_meta__/'))

      const ids = new Set<string>()
      for (const key of metaKeys) {
        const response = await cache.match(key)
        if (response) {
          try {
            const data = await response.json()
            if (data.gameId) ids.add(data.gameId)
          } catch {
            // skip corrupt entries
          }
        }
      }
      setCachedGameIds(ids)

      const info = await getCacheStorageInfo()
      setStorageInfo({
        gamesCached: info.gamesCached,
        thumbsCached: info.thumbsCached,
        storageMB: info.storageMB?.availableMB ?? null,
      })
    } catch {
      // silent fail
    }
  }

  return { cachedGameIds, storageInfo, refresh }
}

// Need useState import for the hook
import { useState } from 'react'
