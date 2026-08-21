'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getAllSaved,
  getSavedByType,
  getAllPlaylists,
  deleteItem,
  initDefaultPlaylists,
} from '@/lib/db'

export const useLibrary = () => {
  const [all, setAll] = useState<any[]>([])
  const [movies, setMovies] = useState<any[]>([])
  const [shorts, setShorts] = useState<any[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    await initDefaultPlaylists()
    const [allItems, movieItems, shortItems, playlistItems] = await Promise.all([
      getAllSaved(),
      getSavedByType('movie'),
      getSavedByType('short'),
      getAllPlaylists(),
    ])
    setAll(allItems)
    setMovies(movieItems)
    setShorts(shortItems)
    setPlaylists(playlistItems)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const remove = useCallback(
    async (id: string) => {
      await deleteItem(id)
      await refresh()
    },
    [refresh]
  )

  // Continue watching = has progress, not finished
  const continueWatching = all.filter(
    (m) => m.watchPercent > 2 && m.watchPercent < 95
  )

  return {
    all,
    movies,
    shorts,
    playlists,
    continueWatching,
    loading,
    refresh,
    remove,
  }
}
