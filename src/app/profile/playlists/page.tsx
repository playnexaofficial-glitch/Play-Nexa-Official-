// src/app/profile/playlists/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Trash2, ListMusic, Folder } from 'lucide-react'
import { usePlaylist } from '@/hooks/usePlaylist'

export default function PlaylistsPage() {
  const router = useRouter()
  const { playlists, loading, create, remove } = usePlaylist()
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      await create(newTitle.trim())
      setNewTitle('')
      setShowNewModal(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 sticky top-0 z-40 bg-[#0D0D0D] border-b border-[#1A1A2E]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center text-white active:opacity-60 transition-opacity duration-150"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-white">My Playlists</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="w-9 h-9 bg-[#7C3AED] rounded-full flex items-center justify-center text-white active:opacity-60 transition-opacity duration-150"
        >
          <Plus size={18} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 px-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#1A1A2E] rounded-2xl" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <ListMusic size={40} color="#4B5563" className="mb-3" />
          <p className="text-white font-semibold mb-1">No playlists yet</p>
          <p className="text-[#9CA3AF] text-sm text-center mb-6">
            Create custom playlists to organize your favorite music and videos
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="h-11 px-6 bg-[#7C3AED] text-white font-semibold text-sm rounded-xl active:opacity-60 transition-opacity duration-150"
          >
            Create Playlist
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3" style={{ contentVisibility: 'auto' }}>
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="bg-[#1A1A2E] border border-[#2D2D44] rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#0D0D0D] border border-[#2D2D44] flex items-center justify-center flex-shrink-0">
                  <Folder size={20} color="#A78BFA" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate mb-0.5">
                    {pl.name}
                  </p>
                  <p className="text-[#9CA3AF] text-xs">
                    {pl.mediaIds?.length || 0} items
                  </p>
                </div>
              </div>
              {!pl.isDefault && (
                <button
                  onClick={() => remove(pl.id)}
                  className="w-9 h-9 flex items-center justify-center active:opacity-60 transition-opacity duration-150 text-[#6B7280] hover:text-[#EF4444]"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Playlist Modal */}
      {showNewModal && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/70"
            onClick={() => setShowNewModal(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[81] bg-[#0D0D0D] rounded-t-3xl p-6 pb-10 border-t border-[#1A1A2E]">
            <div className="w-10 h-1 bg-[#2D2D44] rounded-full mx-auto mb-5" />
            <h3 className="text-white font-bold text-lg mb-2">New Playlist</h3>
            <p className="text-[#9CA3AF] text-sm mb-4">
              Enter a name for your new playlist
            </p>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Playlist name"
              autoFocus
              className="w-full h-12 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] mb-4"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="w-full h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm mb-3 active:opacity-65 disabled:opacity-50 transition-opacity duration-150"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowNewModal(false)}
              className="w-full h-12 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl text-white font-semibold text-sm active:opacity-60 transition-opacity duration-150"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
