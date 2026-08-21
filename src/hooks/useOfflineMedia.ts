'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  saveMedia,
  getAllMedia,
  getMediaByType,
  deleteMedia,
  updateWatchProgress,
  getStorageInfo,
  createDefaultPlaylists,
} from '@/lib/db'

interface MediaItem {
  id: string
  title: string
  thumbnail: string
  videoId: string
  duration: string
  durationSec: number
  type: 'movie' | 'short'
  language: string
  channel: string
  quality: 'auto' | 'low' | 'medium' | 'hd'
  estimatedSizeMB: number
  savedAt: number
  status: 'saving' | 'saved' | 'failed'
  watchProgress: number
  watchPercent: number
  lastWatchedAt: number | null
  platform: string
  genre: string[]
  source: string
}

export const useOfflineMedia = () => {
  const [allMedia, setAllMedia] = useState<MediaItem[]>([])
  const [movies, setMovies] = useState<MediaItem[]>([])
  const [shorts, setShorts] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [storageInfo, setStorageInfo] = useState({
    usedMB: 0,
    totalMB: 4096,
  })

  const refresh = useCallback(async () => {
    const [all, movieList, shortList, storage] = await Promise.all([
      getAllMedia(),
      getMediaByType('movie'),
      getMediaByType('short'),
      getStorageInfo(),
    ])
    setAllMedia(all as MediaItem[])
    setMovies(movieList as MediaItem[])
    setShorts(shortList as MediaItem[])
    setStorageInfo(storage)
    setLoading(false)
  }, [])

  useEffect(() => {
    createDefaultPlaylists().then(refresh)
  }, [refresh])

  const removeMedia = useCallback(
    async (id: string) => {
      await deleteMedia(id)
      await refresh()
    },
    [refresh]
  )

  const saveProgress = useCallback(
    async (id: string, seconds: number, percent: number) => {
      await updateWatchProgress(id, seconds, percent)
    },
    []
  )

  return {
    allMedia,
    movies,
    shorts,
    loading,
    storageInfo,
    refresh,
    removeMedia,
    saveProgress,
  }
}
