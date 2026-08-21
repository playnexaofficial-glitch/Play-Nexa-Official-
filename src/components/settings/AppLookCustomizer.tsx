'use client'

// ── Play Nexa App Look Customizer ───────────────────────────────
// Icon & Label Customizer panel for Settings
// - Preset app icons (ChatGPT, Clock, Settings, etc.)
// - Custom icon upload
// - Custom display label
// - Home screen shortcut maker (Capacitor bridge stub)
// 2GB RAM safe · APK/Capacitor compatible

import { useState, useCallback, useRef } from 'react'
import {
  Palette, Upload, Smartphone, Check,
  MessageSquare, Clock, Settings, Calculator,
  Camera, BookOpen, ChevronRight, ExternalLink
} from 'lucide-react'
import { saveLockConfig, loadLockConfig, type AppLockConfig } from '@/lib/app-lock-store'

// ── Preset icons ──
const PRESETS = [
  { id: 'chatgpt',  label: 'ChatGPT',  Icon: MessageSquare, color: '#10A37F' },
  { id: 'clock',    label: 'Clock',     Icon: Clock,         color: '#F59E0B' },
  { id: 'settings', label: 'Settings',  Icon: Settings,      color: '#94A3B8' },
  { id: 'calc',     label: 'Calculator',Icon: Calculator,    color: '#7C5CFF' },
  { id: 'camera',   label: 'Camera',    Icon: Camera,        color: '#EF4444' },
  { id: 'books',    label: 'Books',     Icon: BookOpen,      color: '#3B82F6' },
]

interface LookConfig {
  selectedPreset: string
  customLabel: string
  customIconDataUrl: string
  shortcutCreated: boolean
}

const LOOK_KEY = 'pn_app_look'

function loadLookConfig(): LookConfig {
  try {
    const raw = localStorage.getItem(LOOK_KEY)
    if (!raw) return { selectedPreset: '', customLabel: '', customIconDataUrl: '', shortcutCreated: false }
    return JSON.parse(raw)
  } catch {
    return { selectedPreset: '', customLabel: '', customIconDataUrl: '', shortcutCreated: false }
  }
}

function saveLookConfig(cfg: Partial<LookConfig>): LookConfig {
  const current = loadLookConfig()
  const merged = { ...current, ...cfg }
  localStorage.setItem(LOOK_KEY, JSON.stringify(merged))
  return merged
}

export default function AppLookCustomizer() {
  const [config, setConfig] = useState<LookConfig>(loadLookConfig)
  const [toast, setToast] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }, [])

  // ── Select preset ──
  const handlePreset = useCallback((id: string) => {
    const preset = PRESETS.find(p => p.id === id)
    const updated = saveLookConfig({
      selectedPreset: id,
      customLabel: preset?.label || '',
      customIconDataUrl: '',
      shortcutCreated: false,
    })
    setConfig(updated)
  }, [])

  // ── Custom label ──
  const handleLabelChange = useCallback((label: string) => {
    const updated = saveLookConfig({ customLabel: label, shortcutCreated: false })
    setConfig(updated)
  }, [])

  // ── Custom icon upload ──
  const handleIconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Convert to data URL (small icon — safe for localStorage)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const updated = saveLookConfig({
        customIconDataUrl: dataUrl,
        selectedPreset: '',
        shortcutCreated: false,
      })
      setConfig(updated)
      showToast('Custom icon uploaded!')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [showToast])

  // ── Create home screen shortcut ──
  const handleCreateShortcut = useCallback(() => {
    const preset = PRESETS.find(p => p.id === config.selectedPreset)
    const label = config.customLabel || preset?.label || 'Play Nexa'
    const iconUrl = config.customIconDataUrl || undefined

    // ── Method 1: Web API beforeinstallprompt / related_apps ──
    // Check if the native Capacitor plugin bridge is available
    const capacitorWindow = typeof window !== 'undefined'
      ? (window as any)
      : null

    if (capacitorWindow?.Capacitor?.Plugins?.Shortcuts) {
      // Capacitor Shortcuts plugin — native home screen shortcut
      capacitorWindow.Capacitor.Plugins.Shortcuts.create({
        label,
        iconUrl: iconUrl || '/icons/icon-192.png',
        url: window.location.origin,
      }).then(() => {
        const updated = saveLookConfig({ shortcutCreated: true })
        setConfig(updated)
        showToast('Shortcut created on home screen!')
      }).catch(() => {
        showToast('Shortcut creation failed. Try manually.')
      })
      return
    }

    // ── Method 2: PWA install prompt fallback ──
    if (capacitorWindow?.deferredPrompt) {
      capacitorWindow.deferredPrompt.prompt()
      showToast('Install prompt triggered!')
      return
    }

    // ── Method 3: Fallback — show manual instructions ──
    showToast('Add to Home Screen from browser menu to create shortcut.')

    // Update manifest dynamically for custom icon/label
    try {
      const manifest = {
        name: label,
        short_name: label,
        icons: iconUrl
          ? [{ src: iconUrl, sizes: '192x192', type: 'image/png' }]
          : [
              { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            ],
        start_url: '/',
        display: 'standalone',
        background_color: '#070B14',
        theme_color: '#7C5CFF',
      }
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement
      if (link) link.href = url
    } catch {}
  }, [config, showToast])

  const activePreset = PRESETS.find(p => p.id === config.selectedPreset)

  return (
    <div className="relative space-y-4 px-4 py-4">

      {/* ── Preset icons grid ── */}
      <div>
        <p className="text-white text-sm font-medium mb-3">Preset Disguise Icons</p>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map(preset => {
            const isActive = config.selectedPreset === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => handlePreset(preset.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 active:scale-95
                           ${isActive
                             ? 'border-[#7C5CFF] bg-[#7C5CFF]/10'
                             : 'border-[#1E293B] bg-[#0F172A]'
                           }`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                     style={{ backgroundColor: preset.color + '20' }}>
                  <preset.Icon size={20} style={{ color: preset.color }} />
                </div>
                <p className={`text-[10px] font-semibold truncate w-full text-center
                              ${isActive ? 'text-[#7C5CFF]' : 'text-[#94A3B8]'}`}>
                  {preset.label}
                </p>
                {isActive && (
                  <div className="w-4 h-4 rounded-full bg-[#7C5CFF] flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Custom icon upload ── */}
      <div>
        <p className="text-white text-sm font-medium mb-2">Custom Icon</p>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-14 rounded-xl border border-dashed border-[#1E293B] bg-[#0F172A]
                     flex items-center justify-center gap-2 text-[#94A3B8] text-xs
                     active:scale-[0.98] transition-all duration-150"
        >
          {config.customIconDataUrl ? (
            <>
              <img src={config.customIconDataUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-[#7C5CFF] font-medium">Icon uploaded</span>
            </>
          ) : (
            <>
              <Upload size={14} />
              <span>Upload custom icon (PNG/JPG)</span>
            </>
          )}
        </button>
      </div>

      {/* ── Custom display label ── */}
      <div>
        <p className="text-white text-sm font-medium mb-2">Display Label</p>
        <input
          type="text"
          placeholder="e.g. ChatGPT, Calculator, Clock..."
          value={config.customLabel}
          onChange={e => handleLabelChange(e.target.value)}
          maxLength={20}
          className="w-full h-10 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B]
                     text-white text-xs outline-none focus:border-[#7C5CFF]
                     transition-colors duration-150"
        />
        <p className="text-[#94A3B8] text-[10px] mt-1">
          This name appears on the home screen shortcut
        </p>
      </div>

      {/* ── Preview ── */}
      {(activePreset || config.customIconDataUrl || config.customLabel) && (
        <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
          <p className="text-[#94A3B8] text-[10px] font-medium mb-3">SHORTCUT PREVIEW</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                 style={{ backgroundColor: activePreset ? activePreset.color + '20' : '#7C5CFF20' }}>
              {config.customIconDataUrl ? (
                <img src={config.customIconDataUrl} alt="" className="w-full h-full object-cover" />
              ) : activePreset ? (
                <activePreset.Icon size={22} style={{ color: activePreset.color }} />
              ) : (
                <Palette size={22} className="text-[#7C5CFF]" />
              )}
            </div>
            <div>
              <p className="text-white text-sm font-medium">
                {config.customLabel || activePreset?.label || 'Play Nexa'}
              </p>
              <p className="text-[#94A3B8] text-[10px]">Home screen shortcut</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Create shortcut button ── */}
      <button
        onClick={handleCreateShortcut}
        className="w-full h-12 rounded-xl bg-[#7C5CFF] text-white text-sm font-bold
                   flex items-center justify-center gap-2
                   active:scale-95 transition-transform duration-100"
      >
        <Smartphone size={16} />
        Create Home Screen Shortcut
      </button>

      <p className="text-[#94A3B8] text-[10px] text-center leading-relaxed">
        On APK builds, this creates a native shortcut with your custom icon and label.
        On web, use &quot;Add to Home Screen&quot; from your browser menu.
      </p>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-[#111827] border border-[#22C55E]/20
                        rounded-xl p-3 text-center text-[#22C55E] text-xs font-semibold
                        animate-[fade-in_200ms_ease-out]">
          {toast}
        </div>
      )}
    </div>
  )
}
