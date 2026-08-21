'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getAllPlaylists,
  createPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  renamePlaylist,
  deletePlaylist,
} from '@/lib/db'

interface PlaylistItem {
  id: string
  name: string
  type: 'movies' | 'shorts' | 'anime' | 'favorites' | 'watchLater' | 'custom'
  mediaIds: string[]
  createdAt: number
  updatedAt: number
  isDefault: boolean
}

export const usePlaylist = () => {
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await getAllPlaylists()
    setPlaylists(all as PlaylistItem[])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback(
    async (name: string) => {
      await createPlaylist(name)
      await refresh()
    },
    [refresh]
  )

  const addMedia = useCallback(
    async (playlistId: string, mediaId: string) => {
      await addToPlaylist(playlistId, mediaId)
      await refresh()
    },
    [refresh]
  )

  const removeMedia = useCallback(
    async (playlistId: string, mediaId: string) => {
      await removeFromPlaylist(playlistId, mediaId)
      await refresh()
    },
    [refresh]
  )

  const rename = useCallback(
    async (id: string, newName: string) => {
      await renamePlaylist(id, newName)
      await refresh()
    },
    [refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      await deletePlaylist(id)
      await refresh()
    },
    [refresh]
  )

  return {
    playlists,
    loading,
    create,
    addMedia,
    removeMedia,
    rename,
    remove,
  }
}
