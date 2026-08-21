'use client'

// ── Play Nexa Icon Changer Modal ────────────────────────────
// 100% PRODUCTION — Real file Blob input + ShortcutManager
// Captures real Blob for custom icon + text string for label
// Calls window.Capacitor.Plugins.ShortcutManager for native pinning
// Passes modified metadata bundle for background intent redirection
// 2GB RAM safe · APK/Capacitor compatible

import { useState, useCallback, useRef } from 'react'
import {
  X, Upload, Smartphone, Check, Palette,
  MessageSquare, Clock, Settings, Calculator,
  Camera, BookOpen, Music, MapPin, Mail,
  FileText, ShoppingBag, CameraOff
} from 'lucide-react'
import type { DeviceApp } from '@/lib/native-bridge'
import { disguiseApp, undisguiseApp, getAppEntry } from '@/lib/app-security-store'
import { createHomeShortcut } from '@/lib/native-bridge'

const PRESETS = [
  { id: 'chatgpt',  label: 'ChatGPT',   Icon: MessageSquare, color: '#10A37F' },
  { id: 'clock',    label: 'Clock',      Icon: Clock,         color: '#F59E0B' },
  { id: 'settings', label: 'Settings',   Icon: Settings,      color: '#94A3B8' },
  { id: 'calc',     label: 'Calculator', Icon: Calculator,    color: '#7C5CFF' },
  { id: 'camera',   label: 'Camera',     Icon: Camera,        color: '#EF4444' },
  { id: 'books',    label: 'Books',      Icon: BookOpen,      color: '#3B82F6' },
  { id: 'music',    label: 'Music',      Icon: Music,         color: '#EC4899' },
  { id: 'maps',     label: 'Maps',       Icon: MapPin,        color: '#22C55E' },
  { id: 'mail',     label: 'Mail',       Icon: Mail,          color: '#F97316' },
  { id: 'notes',    label: 'Notes',      Icon: FileText,      color: '#FFD93D' },
  { id: 'shop',     label: 'Shopping',   Icon: ShoppingBag,   color: '#A855F7' },
  { id: 'gallery',  label: 'Gallery',    Icon: CameraOff,     color: '#06B6D4' },
]

interface IconChangerModalProps {
  app: DeviceApp
  onClose: () => void
  showToast: (msg: string) => void
}

export default function IconChangerModal({ app, onClose, showToast }: IconChangerModalProps) {
  const entry = getAppEntry(app.packageName)

  const [customLabel, setCustomLabel] = useState(entry?.customLabel || '')
  const [customIconDataUrl, setCustomIconDataUrl] = useState(entry?.customIconDataUrl || '')
  const [customIconBlob, setCustomIconBlob] = useState<Blob | null>(null)
  const [activePresetId, setActivePresetId] = useState(
    PRESETS.find(p => p.label === entry?.customLabel)?.id || ''
  )
  const [shortcutCreated, setShortcutCreated] = useState(entry?.shortcutCreated || false)
  const [creating, setCreating] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Select preset ──
  const handlePreset = useCallback((preset: typeof PRESETS[number]) => {
    setActivePresetId(preset.id)
    setCustomLabel(preset.label)
    setCustomIconDataUrl('')
    setCustomIconBlob(null)
    setShortcutCreated(false)
  }, [])

  // ── Custom label change ──
  const handleLabelChange = useCallback((label: string) => {
    setCustomLabel(label)
    setActivePresetId('')
    setShortcutCreated(false)
  }, [])

  // ── Custom icon upload — captures REAL Blob ──
  const handleIconUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Store the real Blob for ShortcutManager
    setCustomIconBlob(file)

    // Also create a data URL for preview (small icons are safe for localStorage)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setCustomIconDataUrl(dataUrl)
      setActivePresetId('')
      setShortcutCreated(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  // ── Apply disguise ──
  const handleApply = useCallback(() => {
    if (!customLabel.trim() && !customIconDataUrl) {
      showToast('Set a custom name or icon first')
      return
    }

    disguiseApp(app.packageName, customLabel.trim(), customIconDataUrl)
    showToast(`${app.name} disguised as "${customLabel}"`)
    onClose()
  }, [app, customLabel, customIconDataUrl, showToast, onClose])

  // ── Remove disguise ──
  const handleRemove = useCallback(() => {
    undisguiseApp(app.packageName)
    showToast(`${app.name} disguise removed`)
    onClose()
  }, [app, showToast, onClose])

  // ── Create home screen shortcut ──
  // Calls Capacitor ShortcutManager with real Blob + metadata bundle
  const handleCreateShortcut = useCallback(async () => {
    setCreating(true)
    const preset = PRESETS.find(p => p.id === activePresetId)
    const label = customLabel || preset?.label || app.name

    // Build the shortcut config with real Blob
    const success = await createHomeShortcut({
      packageName: app.packageName,
      label,
      iconBlob: customIconBlob || undefined,
      iconDataUrl: customIconDataUrl || undefined,
      presetIconId: activePresetId || undefined,
    })

    setCreating(false)
    if (success) {
      setShortcutCreated(true)
      // Update the security entry to mark shortcut as created
      disguiseApp(app.packageName, customLabel, customIconDataUrl)
      showToast('Shortcut pinned to home screen!')
    } else {
      showToast('Add to Home Screen from browser menu')
    }
  }, [app, customLabel, customIconBlob, customIconDataUrl, activePresetId, showToast])

  const activePreset = PRESETS.find(p => p.id === activePresetId)
  const hasChanges = customLabel.trim() || customIconDataUrl

  return (
    <div className="fixed inset-0 z-[9999] flex items-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div className="relative w-full bg-[#070B14] border-t border-[#1E293B]
                      rounded-t-3xl max-h-[85vh] overflow-y-auto z-10">

        <div className="sticky top-0 bg-[#070B14] z-10 pt-3 pb-2 px-4">
          <div className="w-10 h-1 bg-[#1E293B] rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: app.iconColor + '30' }}>
                <Palette size={14} style={{ color: app.iconColor }} />
              </div>
              <div>
                <p className="text-white text-sm font-bold">Change Look</p>
                <p className="text-[#94A3B8] text-[10px]">{app.name}</p>
              </div>
            </div>
            <button onClick={onClose}
                    className="p-2 rounded-full bg-[#111827] border border-[#1E293B]
                               active:scale-90 transition-transform">
              <X size={14} className="text-[#94A3B8]" />
            </button>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-5">

          {/* Preset icons grid */}
          <div>
            <p className="text-white text-sm font-medium mb-3">Preset Disguise Icons</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map(preset => {
                const isActive = activePresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePreset(preset)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-150 active:scale-95
                               ${isActive ? 'border-[#7C5CFF] bg-[#7C5CFF]/10' : 'border-[#1E293B] bg-[#0F172A]'}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                         style={{ backgroundColor: preset.color + '20' }}>
                      <preset.Icon size={16} style={{ color: preset.color }} />
                    </div>
                    <p className={`text-[9px] font-semibold truncate w-full text-center
                                  ${isActive ? 'text-[#7C5CFF]' : 'text-[#94A3B8]'}`}>
                      {preset.label}
                    </p>
                    {isActive && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#7C5CFF] flex items-center justify-center">
                        <Check size={8} className="text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom icon upload — captures real file Blob */}
          <div>
            <p className="text-white text-sm font-medium mb-2">Custom Icon</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-14 rounded-xl border border-dashed border-[#1E293B] bg-[#0F172A]
                         flex items-center justify-center gap-2 text-[#94A3B8] text-xs
                         active:scale-[0.98] transition-all duration-150"
            >
              {customIconDataUrl ? (
                <>
                  <img src={customIconDataUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  <div className="text-left">
                    <span className="text-[#7C5CFF] font-medium block">Custom icon uploaded</span>
                    <span className="text-[#94A3B8] text-[9px]">
                      {customIconBlob ? `${(customIconBlob.size / 1024).toFixed(1)}KB · ${customIconBlob.type}` : 'Ready'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>Upload custom icon (PNG/JPG)</span>
                </>
              )}
            </button>
          </div>

          {/* Custom display label — text string input */}
          <div>
            <p className="text-white text-sm font-medium mb-2">Display Label</p>
            <input
              type="text"
              placeholder="e.g. ChatGPT, Calculator, Clock..."
              value={customLabel}
              onChange={e => handleLabelChange(e.target.value)}
              maxLength={20}
              className="w-full h-10 px-3 rounded-xl bg-[#0F172A] border border-[#1E293B]
                         text-white text-xs outline-none focus:border-[#7C5CFF]
                         transition-colors duration-150"
            />
            <p className="text-[#94A3B8] text-[10px] mt-1">
              This name appears on the home screen shortcut
            </p>
          </div>

          {/* Preview */}
          {hasChanges && (
            <div className="bg-[#0F172A] border border-[#1E293B] rounded-xl p-4">
              <p className="text-[#94A3B8] text-[10px] font-medium mb-3">SHORTCUT PREVIEW</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                     style={{ backgroundColor: activePreset ? activePreset.color + '20' : '#7C5CFF20' }}>
                  {customIconDataUrl ? (
                    <img src={customIconDataUrl} alt="" className="w-full h-full object-cover" />
                  ) : activePreset ? (
                    <activePreset.Icon size={22} style={{ color: activePreset.color }} />
                  ) : (
                    <Palette size={22} className="text-[#7C5CFF]" />
                  )}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {customLabel || activePreset?.label || app.name}
                  </p>
                  <p className="text-[#94A3B8] text-[10px]">Home screen shortcut</p>
                </div>
              </div>
            </div>
          )}

          {/* Native bridge info */}
          <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-3">
            <p className="text-[#94A3B8] text-[10px] leading-relaxed">
              <span className="text-[#7C5CFF] font-semibold">ShortcutManager Integration:</span>{' '}
              On APK builds, this creates a native Android shortcut using ShortcutManager
              with the custom icon Blob and label. The shortcut passes a modified metadata
              bundle to execute a background intent redirection that launches the target
              application under the mask identity while preserving the original package reference.
            </p>
          </div>

          {/* Create shortcut button */}
          <button
            onClick={handleCreateShortcut}
            disabled={!hasChanges || creating}
            className="w-full h-12 rounded-xl bg-[#0F172A] border border-[#00D4FF]/30
                       text-[#00D4FF] text-sm font-bold flex items-center justify-center gap-2
                       active:scale-95 transition-transform duration-100
                       disabled:opacity-40 disabled:pointer-events-none"
          >
            <Smartphone size={16} />
            {creating ? 'Creating...' : shortcutCreated ? 'Shortcut Created' : 'Create Home Screen Shortcut'}
          </button>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleRemove}
              disabled={entry?.disguised !== true}
              className="flex-1 h-11 rounded-xl border border-red-500/30 bg-red-500/10
                         text-red-400 text-xs font-semibold
                         active:scale-95 transition-transform duration-100
                         disabled:opacity-30 disabled:pointer-events-none"
            >
              Remove Disguise
            </button>
            <button
              onClick={handleApply}
              disabled={!hasChanges}
              className="flex-1 h-11 rounded-xl bg-[#7C5CFF] text-white text-xs font-bold
                         active:scale-95 transition-transform duration-100
                         disabled:opacity-40 disabled:pointer-events-none"
            >
              Apply Disguise
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
