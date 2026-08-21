'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  saveItem,
  deleteItem,
  isItemSaved,
  getAllPlaylists,
  addToPlaylist,
  initDefaultPlaylists,
} from '@/lib/db'

export interface MediaInput {
  id: string
  title: string
  thumbnail: string
  videoId: string
  duration: string
  type: 'movie' | 'short'
  language: string
  channel: string
  genre: string[]
}

export const useSaveMedia = (mediaId: string) => {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    isItemSaved(mediaId)
      .then(setSaved)
      .finally(() => setLoading(false))
  }, [mediaId])

  // Save to Watch Later
  const saveWatchLater = useCallback(async (media: MediaInput) => {
    await initDefaultPlaylists()
    await saveItem({
      ...media,
      savedAt: Date.now(),
      watchProgress: 0,
      watchPercent: 0,
      lastWatchedAt: null,
      lists: ['watch-later'],
    })
    await addToPlaylist('watch-later', media.id)
    setSaved(true)
  }, [])

  // Save to Favorites
  const saveToFavorites = useCallback(async (media: MediaInput) => {
    await initDefaultPlaylists()
    const existing = await isItemSaved(media.id)
    if (!existing) {
      await saveItem({
        ...media,
        savedAt: Date.now(),
        watchProgress: 0,
        watchPercent: 0,
        lastWatchedAt: null,
        lists: ['favorites'],
      })
    }
    await addToPlaylist('favorites', media.id)
    setSaved(true)
  }, [])

  // Remove from saved
  const unsave = useCallback(async () => {
    await deleteItem(mediaId)
    setSaved(false)
  }, [mediaId])

  return { saved, loading, saveWatchLater, saveToFavorites, unsave }
}
