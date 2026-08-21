'use client'

import { useState, useEffect } from 'react'

interface Game {
  id: string
  name: string
  category: string
  game_type: string
  cover_url: string
  is_hidden: boolean
  is_featured: boolean
}

interface DetectedGame {
  name: string | null
  description: string
  cover_url: string | null
  game_type: string
  category: string
  url: string
}

const CATEGORIES = [
  'Action', 'Adventure', 'Puzzle', 'Racing',
  'Sports', 'RPG', 'Strategy', 'Arcade',
  'Simulation', 'Casual'
]

const GAME_TYPES = [
  { value: 'offline', label: '📱 Offline APK' },
  { value: 'download', label: '⬇️ Download' },
  { value: 'online', label: '🌐 Online/Web' },
  { value: 'mini', label: '🎯 Mini Game' },
]

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [detected, setDetected] = useState<DetectedGame | null>(null)
  const [editedName, setEditedName] = useState('')
  const [editedCategory, setEditedCategory] = useState('Action')
  const [editedType, setEditedType] = useState('online')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')
  const [detectError, setDetectError] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/games')
    const data = await res.json()
    setGames(data.data || [])
    setLoading(false)
  }

  const handleDetect = async () => {
    if (!urlInput.trim()) return
    setDetecting(true)
    setDetected(null)
    setDetectError('')
    try {
      const res = await fetch('/api/admin/games/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: urlInput.trim()
        })
      })
      const data = await res.json()
      if (data.name) {
        setDetected(data)
        setEditedName(data.name)
        setEditedCategory(data.category || 'Action')
        setEditedType(data.game_type || 'online')
      } else {
        setDetectError('Could not auto-detect. Please fill in manually.')
        setDetected({
          name: null,
          description: '',
          cover_url: null,
          game_type: 'online',
          category: 'Action',
          url: urlInput.trim(),
        })
        setEditedName('')
      }
    } catch {
      setDetectError('Detection failed. Please fill manually.')
    }
    setDetecting(false)
  }

  const handleAdd = async () => {
    if (!editedName.trim()) {
      showToast('❌ Game name required')
      return
    }
    setAdding(true)
    const res = await fetch('/api/admin/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: urlInput.trim(),
        name: editedName.trim(),
        description: detected?.description || '',
        cover_url: detected?.cover_url || '',
        game_type: editedType,
        category: editedCategory,
      })
    })
    const data = await res.json()
    if (data.error) {
      showToast('❌ ' + data.error)
    } else {
      showToast('✅ Game added!')
      setShowModal(false)
      setUrlInput('')
      setDetected(null)
      setEditedName('')
      await loadGames()
    }
    setAdding(false)
  }

  const handleToggleHide = async (id: string, current: boolean) => {
    await fetch('/api/admin/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_hidden: !current })
    })
    setGames(prev => prev.map(g => g.id === id ? { ...g, is_hidden: !current } : g))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this game?')) return
    await fetch('/api/admin/games', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    setGames(prev => prev.filter(g => g.id !== id))
    showToast('✅ Game deleted')
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <span>🎮</span> Games ({games.length})
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-sm font-semibold min-h-[44px] active:scale-95 transition-all duration-150">
          + Add Game
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-16 bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-8 max-w-md mx-auto">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-[#9CA3AF] text-sm">
            No games yet. Add your first game!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ contentVisibility: 'auto' }}>
          {games.map(g => (
            <div key={g.id} className="flex items-center gap-4 bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 hover:border-[#2D2D44] transition-all">
              {g.cover_url ? (
                <img
                  src={g.cover_url}
                  loading="lazy"
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  alt={g.name}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#1A1A2E] flex items-center justify-center flex-shrink-0 text-2xl">
                  🎮
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {g.name}
                </p>
                <p className="text-[#9CA3AF] text-xs mt-1">
                  {g.category} • {g.game_type}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggleHide(g.id, g.is_hidden)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg min-h-[34px] transition-all font-medium ${
                    g.is_hidden
                      ? 'bg-[#2D2D44] text-[#9CA3AF]'
                      : 'bg-green-950/40 text-green-400 border border-green-800/30'
                  }`}>
                  {g.is_hidden ? 'Hidden' : 'Live'}
                </button>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-500 hover:bg-red-950/20 rounded-lg transition-all active:scale-95"
                  title="Delete">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Game Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm" onClick={() => !adding && setShowModal(false)}/>
          <div className="fixed bottom-0 left-0 right-0 sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg z-[56] bg-[#0F0F1A] sm:rounded-2xl border border-[#1A1A2E] max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 pb-10">
              <div className="w-10 h-1 bg-[#2D2D44] rounded-full mx-auto mb-5 sm:hidden"/>

              <p className="text-white font-bold text-lg mb-1">🎮 Add Game</p>
              <p className="text-[#9CA3AF] text-xs mb-5">
                Paste any game URL — auto-detects name, cover, category
              </p>

              {/* URL Input */}
              <div className="mb-6">
                <label className="text-[#9CA3AF] text-xs mb-2 block font-medium">
                  Game URL (Google Play, APK, or Web Game)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://play.google.com/..."
                    className="flex-1 h-12 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563]"
                  />
                  <button
                    onClick={handleDetect}
                    disabled={detecting || !urlInput.trim()}
                    className="px-4 h-12 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all duration-150 flex-shrink-0 flex items-center gap-2">
                    {detecting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    ) : 'Detect'}
                  </button>
                </div>
                {detectError && (
                  <p className="text-yellow-400 text-xs mt-2">{detectError}</p>
                )}
              </div>

              {/* Detected preview */}
              {detected && (
                <div className="space-y-4 border-t border-[#1A1A2E] pt-5">
                  {detected.cover_url && (
                    <div className="flex justify-center">
                      <img
                        src={detected.cover_url}
                        className="w-20 h-20 rounded-2xl object-cover border border-[#2D2D44]"
                        loading="lazy"
                        alt="cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[#9CA3AF] text-xs mb-2 block font-medium">
                      Game Name *
                    </label>
                    <input
                      type="text"
                      value={editedName}
                      onChange={e => setEditedName(e.target.value)}
                      placeholder="Enter game name"
                      className="w-full h-12 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
                    />
                  </div>

                  <div>
                    <label className="text-[#9CA3AF] text-xs mb-2 block font-medium">
                      Category
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(cat => (
                        <button key={cat}
                          onClick={() => setEditedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs min-h-[34px] transition-all ${
                            editedCategory === cat
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#141420] text-[#9CA3AF] border border-[#2D2D44] hover:border-[#4B5563]'
                          }`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[#9CA3AF] text-xs mb-2 block font-medium">
                      Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {GAME_TYPES.map(t => (
                        <button key={t.value}
                          onClick={() => setEditedType(t.value)}
                          className={`py-2.5 rounded-xl text-xs font-semibold min-h-[44px] transition-all border ${
                            editedType === t.value
                              ? 'bg-[#7C3AED] text-white border-transparent'
                              : 'bg-[#141420] text-[#9CA3AF] border-[#2D2D44] hover:border-[#4B5563]'
                          }`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleAdd}
                    disabled={adding || !editedName.trim()}
                    className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white font-semibold text-sm disabled:opacity-40 active:scale-95 transition-all mt-4">
                    {adding ? 'Adding...' : `✅ Add "${editedName || 'Game'}"`}
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowModal(false)}
                className="w-full h-10 text-[#9CA3AF] hover:text-white text-sm mt-4 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 py-3 z-[70] shadow-2xl animate-fade-in">
          <p className="text-white text-sm text-center font-medium">
            {toast}
          </p>
        </div>
      )}
    </div>
  )
}
