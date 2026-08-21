'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Save, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react'

interface SettingRow {
  id?: string
  key: string
  value: string
  updated_at?: string
}

const DEFAULT_SETTINGS: Record<string, string> = {
  app_name: 'Play Nexa',
  hero_title: 'Your Entertainment Hub',
  hero_subtitle: 'Movies, Music, Games & More',
  primary_color: '#7C3AED',
  accent_color: '#06B6D4',
  maintenance_enabled: 'false',
  maintenance_message: 'Play Nexa is undergoing scheduled maintenance. We will be back shortly!',
}

export default function AppSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({ ...DEFAULT_SETTINGS })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/app-settings')
      const data = await res.json()
      if (data.error) {
        showToast('❌ ' + data.error)
      } else {
        const rows: SettingRow[] = data.settings || []
        const map: Record<string, string> = { ...DEFAULT_SETTINGS }
        rows.forEach((r) => {
          map[r.key] = r.value
        })
        setSettings(map)
      }
    } catch (err: any) {
      showToast('❌ ' + (err?.message || 'Failed to load settings'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSetting = async (key: string, value: string) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/app-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      const data = await res.json()
      if (data.success) {
        setSettings((prev) => ({ ...prev, [key]: value }))
        showToast(`✅ Saved ${key}`)
      } else {
        showToast('❌ ' + (data.error || 'Failed to save'))
      }
    } catch {
      showToast('❌ Network error')
    } finally {
      setIsSaving(false)
    }
  }

  const saveAllBranding = async () => {
    setIsSaving(true)
    try {
      await Promise.all([
        saveSetting('app_name', settings.app_name),
        saveSetting('hero_title', settings.hero_title),
        saveSetting('hero_subtitle', settings.hero_subtitle),
        saveSetting('primary_color', settings.primary_color),
        saveSetting('accent_color', settings.accent_color),
      ])
      showToast('✅ All Branding Saved!')
    } catch {
      showToast('❌ Failed to save branding')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleMaintenance = async () => {
    const nextVal = settings.maintenance_enabled === 'true' ? 'false' : 'true'
    await saveSetting('maintenance_enabled', nextVal)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
            <Settings size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">App Settings</h1>
            <p className="text-xs text-[#9CA3AF]">
              Branding, theme colors & maintenance switch
            </p>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          className="px-3 py-2.5 bg-[#141420] border border-[#2D2D44] rounded-xl text-white text-xs font-semibold min-h-[44px] hover:bg-[#1A1A2E] flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="space-y-6">
        {/* Branding */}
        <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">App Branding & Hero</h2>

          <div className="space-y-3.5">
            <div>
              <label className="text-[#9CA3AF] text-xs mb-1 block">App Name</label>
              <input
                type="text"
                value={settings.app_name}
                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="text-[#9CA3AF] text-xs mb-1 block">Hero Title</label>
              <input
                type="text"
                value={settings.hero_title}
                onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div>
              <label className="text-[#9CA3AF] text-xs mb-1 block">Hero Subtitle</label>
              <input
                type="text"
                value={settings.hero_subtitle}
                onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                className="w-full h-11 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border border-[#2D2D44]"
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="flex-1 h-10 bg-[#141420] border border-[#2D2D44] rounded-lg px-3 text-white text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#9CA3AF] text-xs mb-1 block">Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border border-[#2D2D44]"
                  />
                  <input
                    type="text"
                    value={settings.accent_color}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    className="flex-1 h-10 bg-[#141420] border border-[#2D2D44] rounded-lg px-3 text-white text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={saveAllBranding}
              disabled={isSaving}
              className="mt-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-xl min-h-[44px] flex items-center gap-2 disabled:opacity-40"
            >
              <Save size={14} /> Save Branding & Colors
            </button>
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-[#0F0F1A] border border-[#1A1A2E] rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Maintenance Mode</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Block regular app access and display maintenance notice
              </p>
            </div>

            <button
              onClick={toggleMaintenance}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.maintenance_enabled === 'true' ? 'bg-red-600' : 'bg-[#2D2D44]'
              }`}
            >
              <span
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                  settings.maintenance_enabled === 'true' ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[#9CA3AF] text-xs mb-1 block">Maintenance Message</label>
              <textarea
                value={settings.maintenance_message}
                onChange={(e) =>
                  setSettings({ ...settings, maintenance_message: e.target.value })
                }
                rows={2}
                className="w-full bg-[#141420] border border-[#2D2D44] rounded-xl p-3 text-white text-xs outline-none focus:border-[#7C3AED] resize-none"
              />
            </div>

            <button
              onClick={() => saveSetting('maintenance_message', settings.maintenance_message)}
              className="px-4 py-2 bg-[#141420] border border-[#2D2D44] text-white text-xs font-semibold rounded-xl min-h-[40px] hover:bg-[#1A1A2E]"
            >
              Update Notice Message
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-4 right-4 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 py-3 z-[70] max-w-sm mx-auto shadow-lg">
          <p className="text-white text-sm text-center">{toast}</p>
        </div>
      )}
    </div>
  )
}
