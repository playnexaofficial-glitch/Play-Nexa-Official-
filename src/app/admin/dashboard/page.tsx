'use client'

import { useEffect, useState, useCallback } from 'react'
import { Film, Music, Users, Tv, Gamepad2, MessageCircle, RefreshCw } from 'lucide-react'

interface Stats {
  movies: number
  music: number
  users: number
  channels: number
  games: number
  feedback: number
}

const CARDS = [
  { key: 'movies', label: 'Total Movies', Icon: Film, color: '#7C3AED' },
  { key: 'music', label: 'Music Tracks', Icon: Music, color: '#06B6D4' },
  { key: 'users', label: 'Total Users', Icon: Users, color: '#22C55E' },
  { key: 'channels', label: 'YT Channels', Icon: Tv, color: '#F59E0B' },
  { key: 'games', label: 'Games', Icon: Gamepad2, color: '#EC4899' },
  { key: 'feedback', label: 'Feedback', Icon: MessageCircle, color: '#EF4444' },
] as const

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    movies: 0,
    music: 0,
    users: 0,
    channels: 0,
    games: 0,
    feedback: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isClearing, setIsClearing] = useState(false)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/stats')
      const d = await res.json()
      if (d.error) {
        setError(d.error)
      } else {
        setStats(d)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleClearContent = async () => {
    if (!clearConfirm) {
      setClearConfirm(true)
      return
    }
    setIsClearing(true)
    try {
      const res = await fetch('/api/admin/clear-content', {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        showToast('✅ All content cleared!')
        loadStats()
      } else {
        showToast('❌ Error: ' + (data.error || 'Failed to clear content'))
      }
    } catch {
      showToast('❌ Network error while clearing content')
    } finally {
      setIsClearing(false)
      setClearConfirm(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-xs text-[#9CA3AF]">Play Nexa core system overview</p>
        </div>

        <button
          onClick={loadStats}
          className="px-3 py-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-xs font-semibold min-h-[44px] hover:bg-[#1A1A2E] flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {CARDS.map(({ key, label, Icon, color }) => (
          <div
            key={key}
            className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 transition-all duration-150 hover:border-[#2D2D44]"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{
                backgroundColor: color + '20',
              }}
            >
              <Icon size={20} style={{ color }} strokeWidth={2} />
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-[#1A1A2E] rounded-lg mb-1 animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-white">
                {stats[key as keyof Stats]}
              </p>
            )}
            <p className="text-xs text-[#9CA3AF] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Danger Zone Section */}
      <div className="mt-8 bg-red-900/10 border border-red-800/30 rounded-2xl p-5">
        <p className="text-red-400 font-semibold text-sm mb-1">Danger Zone</p>
        <p className="text-[#9CA3AF] text-xs mb-4">
          Clear all movies and music tracks. This cannot be undone.
        </p>
        <button
          onClick={handleClearContent}
          disabled={isClearing}
          className={`w-full h-11 rounded-xl text-sm font-semibold disabled:opacity-50 active:opacity-80 transition-colors ${
            clearConfirm
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50'
          }`}
        >
          {isClearing
            ? 'Clearing...'
            : clearConfirm
            ? 'Confirm — Delete Everything'
            : 'Clear All Movies & Music'}
        </button>
        {clearConfirm && (
          <button
            onClick={() => setClearConfirm(false)}
            className="w-full h-9 text-[#9CA3AF] text-xs mt-2 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-20 left-4 right-4 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 py-3 z-[70] max-w-sm mx-auto shadow-lg">
          <p className="text-white text-sm text-center">{toast}</p>
        </div>
      )}
    </div>
  )
}
