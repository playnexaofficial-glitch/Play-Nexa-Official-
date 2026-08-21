'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck, Clock, Star, Plus, X } from 'lucide-react'
import { useSaveMedia, type MediaInput } from '@/hooks/useSaveMedia'
import {
  getAllPlaylists,
  addToPlaylist,
  createPlaylist,
  initDefaultPlaylists,
} from '@/lib/db'

interface Props {
  media: MediaInput
}

export default function SaveButton({ media }: Props) {
  const { saved, loading, saveWatchLater, saveToFavorites, unsave } = useSaveMedia(media.id)

  const [showSheet, setShowSheet] = useState(false)
  const [playlists, setPlaylists] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState('')

  const openSheet = async () => {
    await initDefaultPlaylists()
    const all = await getAllPlaylists()
    setPlaylists(all)
    setShowSheet(true)
  }

  const handleSave = async (type: 'watchLater' | 'favorites') => {
    setSaving(true)
    if (type === 'watchLater') await saveWatchLater(media)
    else await saveToFavorites(media)
    setDone(type === 'watchLater' ? 'Watch Later' : 'Favorites')
    setSaving(false)
    setTimeout(() => {
      setShowSheet(false)
      setDone('')
    }, 1200)
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    setSaving(true)
    await addToPlaylist(playlistId, media.id)
    setDone('Playlist')
    setSaving(false)
    setTimeout(() => {
      setShowSheet(false)
      setDone('')
    }, 1200)
  }

  if (loading) return null

  return (
    <>
      {/* Main Button */}
      <button
        onClick={() => (saved ? unsave() : openSheet())}
        type="button"
        className={`flex items-center gap-2 px-4 py-2.5
                    rounded-xl text-sm font-medium min-h-[44px]
                    border transition-all duration-200 active:scale-95
                    ${
                      saved
                        ? 'bg-pn-success/10 border-pn-success text-pn-success'
                        : 'bg-pn-card border-pn-border text-white'
                    }`}
      >
        {saved ? (
          <>
            <BookmarkCheck size={16} /> Saved
          </>
        ) : (
          <>
            <Bookmark size={16} /> Save
          </>
        )}
      </button>

      {/* Bottom Sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowSheet(false)}
          />

          {/* Sheet */}
          <div className="relative w-full bg-pn-card border-t border-pn-border rounded-t-3xl p-5 z-10">
            {/* Handle */}
            <div className="w-10 h-1 bg-pn-border rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">Save to...</h3>
              <button
                onClick={() => setShowSheet(false)}
                type="button"
                className="p-2 rounded-full bg-pn-border"
              >
                <X size={14} className="text-pn-muted" />
              </button>
            </div>

            {/* Success message */}
            {done && (
              <div className="bg-pn-success/10 border border-pn-success rounded-xl p-3 mb-3 text-center">
                <p className="text-pn-success text-sm font-medium">
                  Added to {done}
                </p>
              </div>
            )}

            {/* Quick save options */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => handleSave('watchLater')}
                disabled={saving}
                type="button"
                className="flex items-center gap-3 p-4 bg-pn-bg rounded-2xl border border-pn-border active:scale-95 transition-transform duration-150"
              >
                <div className="w-10 h-10 rounded-xl bg-pn-purple/20 flex items-center justify-center">
                  <Clock size={18} className="text-pn-purple" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">Watch Later</p>
                  <p className="text-pn-muted text-xs">Save for later</p>
                </div>
              </button>

              <button
                onClick={() => handleSave('favorites')}
                disabled={saving}
                type="button"
                className="flex items-center gap-3 p-4 bg-pn-bg rounded-2xl border border-pn-border active:scale-95 transition-transform duration-150"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Star size={18} className="text-yellow-400" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">Favorites</p>
                  <p className="text-pn-muted text-xs">Add to favs</p>
                </div>
              </button>
            </div>

            {/* Playlists */}
            <p className="text-pn-muted text-xs font-medium uppercase tracking-wide mb-3">
              My Playlists
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id)}
                  disabled={saving}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 bg-pn-bg rounded-xl border border-pn-border active:scale-95 transition-transform duration-150"
                >
                  <span className="text-xl">{pl.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-medium">{pl.name}</p>
                    <p className="text-pn-muted text-xs">
                      {pl.mediaIds.length} videos
                    </p>
                  </div>
                  <Plus size={14} className="text-pn-purple" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
