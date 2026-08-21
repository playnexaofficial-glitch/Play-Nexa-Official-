'use client'

import { useState, useEffect, useCallback } from 'react'
import { KeyRound, Plus, Trash2, CheckCircle, RefreshCw, ShieldCheck } from 'lucide-react'
import { logActivity } from '@/lib/adminAuth'

interface GeminiKey {
  id: string
  key_name: string
  masked_key: string
  is_active: boolean
  status: string
  usage_count: number
  last_used_at: string | null
  created_at: string
}

export default function GeminiKeysPage() {
  const [keys, setKeys] = useState<GeminiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchKeys = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/gemini-keys')
      const data = await res.json()
      if (data.error) {
        showToast('❌ ' + data.error)
      } else {
        setKeys(data.keys || [])
      }
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Failed to load keys'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const setActiveKey = async (id: string) => {
    try {
      const res = await fetch('/api/admin/gemini-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'activate' }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('✅ Key activated for Gemini AI!')
        setKeys((prev) =>
          prev.map((k) => ({
            ...k,
            is_active: k.id === id,
          }))
        )
        const activeKeyObj = keys.find(k => k.id === id)
        logActivity('ACTIVATE_KEY', activeKeyObj?.key_name || id, { keyId: id })
      } else {
        showToast('❌ ' + (data.error || 'Failed to activate'))
      }
    } catch {
      showToast('❌ Network error')
    }
  }

  const addKey = async () => {
    const trimmedName = newKeyName.trim()
    if (!trimmedName || !newKeyValue.trim()) {
      showToast('❌ Please fill in both key name and API key')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/gemini-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_name: trimmedName,
          api_key: newKeyValue.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('✅ Gemini API Key added!')
        setShowAddModal(false)
        setNewKeyName('')
        setNewKeyValue('')
        fetchKeys()
        logActivity('ADD_KEY', trimmedName, { keyName: trimmedName })
      } else {
        showToast('❌ ' + (data.error || 'Failed to add key'))
      }
    } catch {
      showToast('❌ Network error')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteKey = async (id: string) => {
    try {
      const deletedKeyObj = keys.find(k => k.id === id)
      const res = await fetch(`/api/admin/gemini-keys?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setKeys((prev) => prev.filter((k) => k.id !== id))
        showToast('🗑️ Key removed')
        logActivity('DELETE_KEY', deletedKeyObj?.key_name || id, { keyId: id })
      } else {
        showToast('❌ ' + (data.error || 'Delete failed'))
      }
    } catch {
      showToast('❌ Error deleting key')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
            <KeyRound size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gemini AI Keys</h1>
            <p className="text-xs text-[#9CA3AF]">
              {keys.length} API keys configured with rotation capability
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchKeys}
            className="px-3 py-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-xs font-semibold min-h-[44px] hover:bg-[#1A1A2E] flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-xs font-semibold min-h-[44px] flex items-center gap-2"
          >
            <Plus size={16} /> Add Key
          </button>
        </div>
      </div>

      {isLoading && keys.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl">
          <p className="text-[#6B7280] text-sm mb-4">No Gemini API keys registered yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#7C3AED] text-white text-xs font-semibold rounded-xl"
          >
            + Register First Key
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keys.map((k) => (
            <div
              key={k.id}
              className={`bg-[#0F0F1A] border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                k.is_active
                  ? 'border-[#7C3AED] shadow-[0_0_20px_rgba(124,58,237,0.15)]'
                  : 'border-[#1A1A2E]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-sm">{k.key_name}</h3>
                    {k.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40 flex items-center gap-1">
                        <ShieldCheck size={11} /> ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#6B7280]">
                    Used {k.usage_count || 0} times
                  </span>
                </div>

                <div className="p-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-xs font-mono text-[#9CA3AF] mb-4">
                  {k.masked_key || 'AIzaSy••••••••••••'}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1A1A2E]">
                <div className="text-[10px] text-[#6B7280]">
                  Added: {new Date(k.created_at).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  {!k.is_active && (
                    <button
                      onClick={() => setActiveKey(k.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white min-h-[36px]"
                    >
                      Make Active
                    </button>
                  )}
                  <button
                    onClick={() => deleteKey(k.id)}
                    className="p-2 rounded-lg text-red-400 bg-red-950/20 border border-red-800/40 hover:bg-red-900/30 min-h-[36px]"
                    title="Delete Key"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/70"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] bg-[#0F0F1A] border border-[#2D2D44] rounded-2xl p-6 max-w-md w-[90%] shadow-2xl">
            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <KeyRound size={18} className="text-[#7C3AED]" />
              Add Gemini API Key
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">Key Name / Label</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Key 1"
                  className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">
                  Gemini API Secret Key
                </label>
                <input
                  type="password"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm font-mono outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-11 bg-[#141420] border border-[#2D2D44] rounded-xl text-[#9CA3AF] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={addKey}
                  disabled={isSaving}
                  className="flex-1 h-11 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl text-white text-xs font-semibold disabled:opacity-40"
                >
                  {isSaving ? 'Saving...' : 'Save API Key'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 left-4 right-4 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 py-3 z-[70] max-w-sm mx-auto shadow-lg">
          <p className="text-white text-sm text-center">{toast}</p>
        </div>
      )}
    </div>
  )
}
