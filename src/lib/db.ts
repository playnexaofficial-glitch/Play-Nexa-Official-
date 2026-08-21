import { openDB, type IDBPDatabase } from 'idb'

// ── Database Schema ──────────────────────────────────────────

interface PlayNexaDB {
  savedMedia: {
    key: string
    value: {
      id: string
      title: string
      thumbnail: string
      videoId: string
      duration: string
      type: 'movie' | 'short'
      language: string
      channel: string
      genre: string[]
      savedAt: number
      watchProgress: number
      watchPercent: number
      lastWatchedAt: number | null
      lists: string[]
    }
    indexes: {
      'by-type': string
      'by-savedAt': number
    }
  }
  playlists: {
    key: string
    value: {
      id: string
      name: string
      emoji: string
      mediaIds: string[]
      createdAt: number
      updatedAt: number
      isDefault: boolean
    }
  }
  // Legacy stores from Phase 1 (preserved for backward compat)
  downloads: {
    key: string
    value: {
      id: string
      name: string
      platform: string
      url: string
      timestamp: number
      size?: string
    }
  }
  settings: {
    key: string
    value: {
      key: string
      value: unknown
    }
  }
}

const DB_NAME = 'playnexa-v1'
const LEGACY_DB_NAME = 'grovix-v1'
const DB_VER = 1
let db: IDBPDatabase<PlayNexaDB> | null = null

export const getDB = async () => {
  if (db) return db
  db = await openDB<PlayNexaDB>(DB_NAME, DB_VER, {
    upgrade(database) {
      // savedMedia store
      if (!database.objectStoreNames.contains('savedMedia')) {
        const s = database.createObjectStore('savedMedia', { keyPath: 'id' })
        s.createIndex('by-type', 'type')
        s.createIndex('by-savedAt', 'savedAt')
      }

      // playlists store
      if (!database.objectStoreNames.contains('playlists')) {
        database.createObjectStore('playlists', { keyPath: 'id' })
      }

      // Legacy Phase 1 stores
      if (!database.objectStoreNames.contains('downloads')) {
        database.createObjectStore('downloads', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' })
      }
    },
  })
  return db
}

// ── Saved Media ──────────────────────────────────────────────

export const saveItem = async (item: PlayNexaDB['savedMedia']['value']) => {
  const d = await getDB()
  await d.put('savedMedia', item)
}

export const getItem = async (id: string) => {
  const d = await getDB()
  return d.get('savedMedia', id)
}

export const getAllSaved = async () => {
  const d = await getDB()
  return d.getAll('savedMedia')
}

export const getSavedByType = async (type: 'movie' | 'short') => {
  const d = await getDB()
  return d.getAllFromIndex('savedMedia', 'by-type', type)
}

export const deleteItem = async (id: string) => {
  const d = await getDB()
  await d.delete('savedMedia', id)
}

export const updateProgress = async (id: string, seconds: number, percent: number) => {
  const d = await getDB()
  const item = await d.get('savedMedia', id)
  if (!item) return
  await d.put('savedMedia', {
    ...item,
    watchProgress: seconds,
    watchPercent: percent,
    lastWatchedAt: Date.now(),
  })
}

export const isItemSaved = async (id: string): Promise<boolean> => {
  const d = await getDB()
  const item = await d.get('savedMedia', id)
  return !!item
}

// ── Playlists ────────────────────────────────────────────────

export const initDefaultPlaylists = async () => {
  const d = await getDB()
  const all = await d.getAll('playlists')
  if (all.length > 0) return

  const defaults: PlayNexaDB['playlists']['value'][] = [
    {
      id: 'watch-later',
      name: 'Watch Later',
      emoji: '🕐',
      mediaIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: true,
    },
    {
      id: 'favorites',
      name: 'Favorites',
      emoji: '⭐',
      mediaIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: true,
    },
    {
      id: 'anime',
      name: 'Anime List',
      emoji: '🎌',
      mediaIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: true,
    },
    {
      id: 'my-movies',
      name: 'My Movies',
      emoji: '🎬',
      mediaIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: true,
    },
  ]

  for (const p of defaults) {
    await d.put('playlists', p)
  }
}

export const getAllPlaylists = async () => {
  const d = await getDB()
  return d.getAll('playlists')
}

export const getPlaylist = async (id: string) => {
  const d = await getDB()
  return d.get('playlists', id)
}

export const createPlaylist = async (name: string, emoji = '📁') => {
  const d = await getDB()
  const p: PlayNexaDB['playlists']['value'] = {
    id: `pl_${Date.now()}`,
    name,
    emoji,
    mediaIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDefault: false,
  }
  await d.put('playlists', p)
  return p
}

export const addToPlaylist = async (playlistId: string, mediaId: string) => {
  const d = await getDB()
  const p = await d.get('playlists', playlistId)
  if (!p || p.mediaIds.includes(mediaId)) return
  await d.put('playlists', {
    ...p,
    mediaIds: [...p.mediaIds, mediaId],
    updatedAt: Date.now(),
  })
}

export const removeFromPlaylist = async (playlistId: string, mediaId: string) => {
  const d = await getDB()
  const p = await d.get('playlists', playlistId)
  if (!p) return
  await d.put('playlists', {
    ...p,
    mediaIds: p.mediaIds.filter((id) => id !== mediaId),
    updatedAt: Date.now(),
  })
}

export const deletePlaylist = async (id: string) => {
  const d = await getDB()
  const p = await d.get('playlists', id)
  if (!p || p.isDefault) return
  await d.delete('playlists', id)
}

export const renamePlaylist = async (id: string, name: string, emoji: string) => {
  const d = await getDB()
  const p = await d.get('playlists', id)
  if (!p) return
  await d.put('playlists', {
    ...p,
    name,
    emoji,
    updatedAt: Date.now(),
  })
}

// ── Legacy Phase 1 functions (preserved for backward compat) ──

export async function saveDownload(record: PlayNexaDB['downloads']['value']): Promise<void> {
  const d = await getDB()
  await d.put('downloads', record)
}

export async function getRecentDownloads(limit = 10): Promise<PlayNexaDB['downloads']['value'][]> {
  const d = await getDB()
  const all = await d.getAll('downloads')
  all.sort((a, b) => b.timestamp - a.timestamp)
  return all.slice(0, limit)
}

export async function clearDownloads(): Promise<void> {
  const d = await getDB()
  await d.clear('downloads')
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const d = await getDB()
  await d.put('settings', { key, value })
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const d = await getDB()
  const result = await d.get('settings', key)
  return result ? (result.value as T) : null
}

// ── Storage Info ─────────────────────────────────────────────

export const getStorageInfo = async () => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const est = await navigator.storage.estimate()
      const usedMB = Math.round((est.usage || 0) / (1024 * 1024))
      const totalMB = Math.round((est.quota || 0) / (1024 * 1024))
      return { usedMB, totalMB }
    }
  } catch {
    // fallback
  }
  return { usedMB: 0, totalMB: 4096 }
}
