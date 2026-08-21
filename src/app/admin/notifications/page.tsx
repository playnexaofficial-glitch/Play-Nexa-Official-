'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, Plus, Trash2, Send, RefreshCw } from 'lucide-react'

interface NotificationLog {
  id: string
  title: string
  message?: string
  body?: string
  target?: string
  icon?: string
  action_url?: string
  sent_at?: string
  created_at?: string
}

interface ComposerForm {
  title: string
  message: string
  target: string
  icon: string
  action_url: string
}

const EMPTY_FORM: ComposerForm = {
  title: '',
  message: '',
  target: 'all',
  icon: '🔔',
  action_url: '',
}

const ICON_OPTIONS = ['🎬', '🎵', '🎮', '📥', '🔔', '⚡', '🎉', '🔥']

export default function NotificationCenterPage() {
  const [history, setHistory] = useState<NotificationLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [form, setForm] = useState<ComposerForm>(EMPTY_FORM)
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/notifications')
      const data = await res.json()
      if (data.error) {
        showToast('❌ ' + data.error)
      } else {
        setHistory(data.notifications || [])
      }
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Failed to load notifications'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const sendNotification = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      showToast('❌ Title and Message are required')
      return
    }

    setIsSending(true)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) {
        showToast('✅ Notification sent to users!')
        setForm(EMPTY_FORM)
        setShowComposer(false)
        fetchHistory()
      } else {
        showToast('❌ ' + (data.error || 'Failed to send'))
      }
    } catch {
      showToast('❌ Network error')
    } finally {
      setIsSending(false)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setHistory((prev) => prev.filter((n) => n.id !== id))
        showToast('🗑️ Notification log deleted')
      }
    } catch {
      showToast('❌ Error deleting')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Notification Center</h1>
            <p className="text-xs text-[#9CA3AF]">
              Push broadcast & in-app updates for Play Nexa users
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchHistory}
            className="px-3 py-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-xs font-semibold min-h-[44px] hover:bg-[#1A1A2E] flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-xs font-semibold min-h-[44px] flex items-center gap-2"
          >
            <Plus size={16} /> {showComposer ? 'Close Composer' : 'Compose Push'}
          </button>
        </div>
      </div>

      {showComposer && (
        <div className="bg-[#0F0F1A] border border-[#2D2D44] rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
            <Send size={16} className="text-[#7C3AED]" /> Send In-App Broadcast
          </h2>

          <div className="space-y-3.5 max-w-xl">
            <div>
              <label className="text-[#9CA3AF] text-xs mb-1 block">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. New Bollywood Movie Added!"
                className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="text-[#9CA3AF] text-xs mb-1 block">Message *</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Broadcast details..."
                rows={2}
                className="w-full bg-[#141420] border border-[#2D2D44] rounded-xl p-3 text-white text-sm outline-none focus:border-[#7C3AED] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">Icon</label>
                <div className="flex gap-1.5 flex-wrap">
                  {ICON_OPTIONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setForm({ ...form, icon: ic })}
                      className={`w-9 h-9 rounded-lg text-sm border flex items-center justify-center ${
                        form.icon === ic
                          ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                          : 'bg-[#141420] border-[#2D2D44]'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">Target URL (optional)</label>
                <input
                  type="text"
                  value={form.action_url}
                  onChange={(e) => setForm({ ...form, action_url: e.target.value })}
                  placeholder="/movies/123"
                  className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-3 text-white text-xs outline-none focus:border-[#7C3AED]"
                />
              </div>
            </div>

            <button
              onClick={sendNotification}
              disabled={isSending}
              className="w-full h-12 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl mt-2 disabled:opacity-40"
            >
              {isSending ? 'Sending Broadcast...' : '🚀 Send Notification'}
            </button>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-[#1A1A2E]">
          <h2 className="text-white text-sm font-semibold">Broadcast History</h2>
        </div>

        {isLoading && history.length === 0 ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-[#6B7280] text-sm">
            No notifications sent yet.
          </div>
        ) : (
          <div className="divide-y divide-[#1A1A2E]">
            {history.map((n) => (
              <div key={n.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#141420] border border-[#2D2D44] flex items-center justify-center text-lg flex-shrink-0">
                    {n.icon || '🔔'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{n.title}</p>
                    <p className="text-xs text-[#9CA3AF] line-clamp-1">
                      {n.message || n.body}
                    </p>
                    <p className="text-[10px] text-[#6B7280] mt-1">
                      {new Date(n.sent_at || n.created_at || Date.now()).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => deleteNotification(n.id)}
                  className="p-2 rounded-lg text-red-400 bg-red-950/20 border border-red-800/40 hover:bg-red-900/30 flex-shrink-0"
                  title="Delete Log"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
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
