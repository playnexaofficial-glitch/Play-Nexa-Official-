'use client'

import { useState, useEffect, useCallback } from 'react'
import { KeyRound, Plus, Trash2, Eye, EyeOff, Edit3, Copy, RefreshCw, CheckCircle2 } from 'lucide-react'
import { logActivity } from '@/lib/adminAuth'

interface VaultKey {
  id: string
  service: string
  key_name: string
  masked_value: string
  is_active?: boolean
  updated_at?: string
}

const SERVICE_CONFIG: Record<
  string,
  { label: string; emoji: string; color: string; desc: string }
> = {
  supabase: {
    label: 'Supabase',
    emoji: '🟢',
    color: '#3ECF8E',
    desc: 'Database URL, Anon Key, and Service Role Secret',
  },
  gemini: {
    label: 'Gemini AI',
    emoji: '🤖',
    color: '#4285F4',
    desc: 'Google Gemini Studio API Keys for Media AI Scanning',
  },
  firebase: {
    label: 'Firebase',
    emoji: '🔥',
    color: '#FF6B35',
    desc: 'Authentication & Cloud Messaging configuration',
  },
  general: {
    label: 'Third-Party',
    emoji: '🔑',
    color: '#A855F7',
    desc: 'Other external APIs, Groq, TMDB, or OpenAI credentials',
  },
}

export default function KeyVaultPage() {
  const [activeTab, setActiveTab] = useState('supabase')
  const [keys, setKeys] = useState<VaultKey[]>([])
  const [rawValues, setRawValues] = useState<Record<string, string>>({})
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
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
      const res = await fetch(`/api/admin/vault?service=${activeTab}`)
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
  }, [activeTab])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const revealKey = async (id: string) => {
    if (showValues[id]) {
      setShowValues((prev) => ({ ...prev, [id]: false }))
      return
    }

    try {
      const res = await fetch(`/api/admin/vault?id=${id}&show=true`)
      const data = await res.json()
      if (data.key?.key_value) {
        setRawValues((prev) => ({ ...prev, [id]: data.key.key_value }))
        setShowValues((prev) => ({ ...prev, [id]: true }))
      }
    } catch {
      showToast('❌ Could not reveal key')
    }
  }

  const copyToClipboard = async (id: string, masked: string) => {
    let val = rawValues[id]
    if (!val) {
      const res = await fetch(`/api/admin/vault?id=${id}&show=true`)
      const data = await res.json()
      val = data.key?.key_value || masked
    }
    await navigator.clipboard.writeText(val)
    showToast('📋 Copied key to clipboard!')
  }

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/vault', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, key_value: editValue.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('✅ Key updated!')
        setEditingId(null)
        setEditValue('')
        fetchKeys()
        const editedKey = keys.find(k => k.id === id)
        logActivity('VAULT_UPDATE_KEY', editedKey ? `${editedKey.service}/${editedKey.key_name}` : id, { keyId: id })
      } else {
        showToast('❌ ' + (data.error || 'Failed to update'))
      }
    } catch {
      showToast('❌ Network error')
    } finally {
      setIsSaving(false)
    }
  }

  const addKey = async () => {
    const trimmedName = newKeyName.trim()
    if (!trimmedName || !newKeyValue.trim()) {
      showToast('❌ Fill in key name and value')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: activeTab,
          key_name: trimmedName,
          key_value: newKeyValue.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('✅ Added to vault!')
        setShowAddModal(false)
        setNewKeyName('')
        setNewKeyValue('')
        fetchKeys()
        logActivity('VAULT_ADD_KEY', `${activeTab}/${trimmedName}`, { service: activeTab, keyName: trimmedName })
      } else {
        showToast('❌ ' + (data.error || 'Failed to add'))
      }
    } catch {
      showToast('❌ Network error')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteKey = async (id: string) => {
    try {
      const deletedKey = keys.find(k => k.id === id)
      const res = await fetch(`/api/admin/vault?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        setKeys((prev) => prev.filter((k) => k.id !== id))
        showToast('🗑️ Key removed')
        logActivity('VAULT_DELETE_KEY', deletedKey ? `${deletedKey.service}/${deletedKey.key_name}` : id, { keyId: id })
      }
    } catch {
      showToast('❌ Error deleting')
    }
  }

  const currentMeta = SERVICE_CONFIG[activeTab] || SERVICE_CONFIG.general

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
            <KeyRound size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">API Key Vault</h1>
            <p className="text-xs text-[#9CA3AF]">
              Secure backend credential repository & live injection
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
            <Plus size={16} /> Store Key
          </button>
        </div>
      </div>

      {/* Service Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {Object.entries(SERVICE_CONFIG).map(([svcKey, svc]) => (
          <button
            key={svcKey}
            onClick={() => setActiveTab(svcKey)}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === svcKey
                ? 'bg-[#141420] border-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                : 'bg-[#0F0F1A] border-[#1A1A2E] text-[#9CA3AF] hover:text-white hover:bg-[#141420]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{svc.emoji}</span>
              <span className="text-xs font-bold">{svc.label}</span>
            </div>
            <p className="text-[10px] text-[#6B7280] mt-1 line-clamp-1">{svc.desc}</p>
          </button>
        ))}
      </div>

      {/* Keys List */}
      {isLoading && keys.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl">
          <p className="text-[#6B7280] text-sm mb-4">
            No keys saved for {currentMeta.label} yet.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#7C3AED] text-white text-xs font-semibold rounded-xl"
          >
            + Add First Key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div
              key={k.id}
              className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white font-mono">
                    {k.key_name}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#141420] text-[#7C3AED] border border-[#2D2D44]">
                    {k.service}
                  </span>
                </div>

                {editingId === k.id ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Enter new secret value..."
                      className="flex-1 h-9 bg-[#141420] border border-[#7C3AED] rounded-lg px-3 text-xs font-mono text-white outline-none"
                    />
                    <button
                      onClick={() => saveEdit(k.id)}
                      disabled={isSaving}
                      className="px-3 bg-[#7C3AED] text-white text-xs font-semibold rounded-lg"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2.5 bg-[#141420] text-[#9CA3AF] text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-[#9CA3AF] bg-[#141420] border border-[#2D2D44] rounded-lg px-3 py-2 mt-1 truncate">
                    {showValues[k.id] ? rawValues[k.id] : k.masked_value}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => revealKey(k.id)}
                  className="p-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#1A1A2E] min-h-[40px]"
                  title={showValues[k.id] ? 'Hide Key' : 'Reveal Key'}
                >
                  {showValues[k.id] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => copyToClipboard(k.id, k.masked_value)}
                  className="p-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#1A1A2E] min-h-[40px]"
                  title="Copy Key"
                >
                  <Copy size={15} />
                </button>
                <button
                  onClick={() => {
                    setEditingId(k.id)
                    setEditValue('')
                  }}
                  className="p-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-[#7C3AED] hover:bg-[#7C3AED]/10 min-h-[40px]"
                  title="Edit Value"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => deleteKey(k.id)}
                  className="p-2.5 bg-red-950/20 border border-red-800/40 rounded-xl text-red-400 hover:bg-red-900/30 min-h-[40px]"
                  title="Delete Key"
                >
                  <Trash2 size={15} />
                </button>
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
              Add Key for {currentMeta.label}
            </h3>

            <div className="space-y-3.5">
              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">Key Name / Identifer</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. SUPABASE_SERVICE_ROLE_KEY"
                  className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-xs font-mono outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">Secret Key Value</label>
                <input
                  type="password"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  placeholder="eyJh..."
                  className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-xs font-mono outline-none focus:border-[#7C3AED]"
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
                  {isSaving ? 'Saving...' : 'Store Key'}
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
