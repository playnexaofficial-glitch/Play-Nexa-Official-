'use client'

import { useState, useEffect } from 'react'
import { Cpu, RefreshCw, Save, Loader2 } from 'lucide-react'

interface Feature {
  id: string
  feature_key: string
  label: string
  icon: string
  status: 'live' | 'hidden' | 'coming_soon' | 'locked' | 'maintenance'
  coming_soon_message: string
  lock_reason: string
  sort_order: number
  updated_at: string
}

type FeatureStatus = Feature['status']

const STATUS_OPTIONS: { value: FeatureStatus; label: string; color: string }[] = [
  { value: 'live', label: 'LIVE', color: '#10B981' },
  { value: 'hidden', label: 'HIDDEN', color: '#6B7280' },
  { value: 'coming_soon', label: 'COMING SOON', color: '#7C3AED' },
  { value: 'locked', label: 'LOCKED', color: '#EF4444' },
  { value: 'maintenance', label: 'MAINTENANCE', color: '#F59E0B' },
]

export default function FeatureControlPage() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchFeatures = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/features')
      const data = await res.json()
      if (data.error) {
        showToast('❌ ' + data.error)
      } else {
        setFeatures(data.features || [])
      }
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Failed to load features'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFeatures()
  }, [])

  const saveFeature = async (feature: Feature) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: feature.id,
          status: feature.status,
          label: feature.label,
          coming_soon_message: feature.coming_soon_message,
          lock_reason: feature.lock_reason,
          sort_order: feature.sort_order,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`✅ ${feature.label} updated!`)
        setFeatures((prev) =>
          prev.map((f) => (f.id === feature.id ? { ...feature, updated_at: new Date().toISOString() } : f))
        )
        setEditingFeature(null)
      } else {
        showToast('❌ ' + (data.error || 'Update failed'))
      }
    } catch {
      showToast('❌ Network error')
    } finally {
      setSaving(false)
    }
  }

  const updateEditingField = <K extends keyof Feature>(key: K, value: Feature[K]) => {
    if (!editingFeature) return
    setEditingFeature((prev) => (prev ? { ...prev, [key]: value } : null))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu size={22} className="text-[#7C3AED]" />
            Feature Control Center
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">
            Manage Play Nexa module visibility, status and lockdown rules
          </p>
        </div>

        <button
          onClick={fetchFeatures}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#141420] border border-[#2D2D44] text-white text-xs font-semibold rounded-xl min-h-[44px] hover:bg-[#1A1A2E]"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoading && features.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : features.length === 0 ? (
        <div className="text-center py-16 bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl">
          <p className="text-[#6B7280] text-sm">No feature configurations found in database.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {features.map((feature) => {
            const isEditing = editingFeature?.id === feature.id
            const current = isEditing ? editingFeature : feature
            if (!current) return null

            return (
              <div
                key={feature.id}
                className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#141420] flex items-center justify-center text-lg flex-shrink-0">
                    {feature.icon || '⚙️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm truncate">
                        {feature.label}
                      </span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor:
                            (STATUS_OPTIONS.find((s) => s.value === current.status)?.color || '#6B7280') + '20',
                          color:
                            STATUS_OPTIONS.find((s) => s.value === current.status)?.color || '#6B7280',
                        }}
                      >
                        ● {current.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[#4B5563] text-xs font-mono">{feature.feature_key}</span>
                  </div>
                </div>

                {/* Status selection */}
                <div className="mb-4">
                  <label className="text-[#9CA3AF] text-xs font-medium mb-2 block">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => {
                      const isActive = current.status === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (!isEditing) setEditingFeature({ ...feature })
                            updateEditingField('status', opt.value)
                          }}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 min-h-[32px]"
                          style={{
                            backgroundColor: isActive ? opt.color + '20' : '#141420',
                            color: isActive ? opt.color : '#6B7280',
                            border: isActive ? `1.5px solid ${opt.color}66` : '1.5px solid #2D2D44',
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => saveFeature(current)}
                    disabled={!isEditing || saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-xl min-h-[44px] disabled:opacity-40"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save Changes
                  </button>
                  {isEditing && (
                    <button
                      onClick={() => setEditingFeature(null)}
                      className="px-4 py-2.5 bg-[#141420] border border-[#2D2D44] text-[#9CA3AF] text-xs font-medium rounded-xl min-h-[44px] hover:text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-4 right-4 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 py-3 z-[70] max-w-sm mx-auto shadow-lg">
          <p className="text-white text-sm text-center">{toast}</p>
        </div>
      )}
    </div>
  )
}
