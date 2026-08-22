// src/app/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react'

type Theme = 'dark' | 'amoled' | 'neon'
type ThumbnailQuality = 'low' | 'medium' | 'high'
type VideoQuality = 'auto' | '360p' | '480p' | '720p' | '1080p'

interface Settings {
  theme: Theme
  smoothMode: boolean
  batterySaver: boolean
  liteAnimation: boolean
  performanceBoost: boolean
  lowData: boolean
  smartLoading: boolean
  autoPlay: boolean
  thumbnailQuality: ThumbnailQuality
  videoQuality: VideoQuality
  showSubtitles: boolean
  autoFitScreen: boolean
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  smoothMode: true,
  batterySaver: false,
  liteAnimation: false,
  performanceBoost: false,
  lowData: false,
  smartLoading: true,
  autoPlay: true,
  thumbnailQuality: 'medium',
  videoQuality: 'auto',
  showSubtitles: false,
  autoFitScreen: true,
}

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const saved = localStorage.getItem('pn_settings')
    if (saved) {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(saved)
      }
    }
  } catch {}
  return DEFAULT_SETTINGS
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem('pn_settings', JSON.stringify(s))
  } catch {}
}

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || ''

  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetInput, setResetInput] = useState('')
  const [showQualitySheet, setShowQualitySheet] = useState(false)
  const [showVideoQualitySheet, setShowVideoQualitySheet] = useState(false)
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false)

  const handleClearCache = () => {
    const keysToKeep = ['pn_settings', 'pn_notif_enabled']
    const allKeys = Object.keys(localStorage)
    for (const key of allKeys) {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key)
      }
    }
    // Show success message (use state)
    setCacheClearSuccess(true)
    setTimeout(() => setCacheClearSuccess(false), 2000)
  }

  // Scroll to section based on tab
  useEffect(() => {
    if (activeTab) {
      const el = document.getElementById(activeTab)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [activeTab])

  // Apply theme on change
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'amoled') {
      root.style.setProperty('--bg-base', '#000000')
    } else if (settings.theme === 'neon') {
      root.style.setProperty('--bg-base', '#0B0B1E')
    } else {
      root.style.setProperty('--bg-base', '#0D0D0D')
    }
    saveSettings(settings)
  }, [settings])

  const update = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    if (resetInput !== 'RESET') return
    localStorage.clear()
    setSettings(DEFAULT_SETTINGS)
    setShowResetModal(false)
    setResetInput('')
    window.location.href = '/'
  }

  // Toggle Component
  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors duration-150 ${
        value ? 'bg-[#7C3AED]' : 'bg-[#374151]'
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-150 ${
          value ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )

  // Row Component
  const SettingRow = ({
    label,
    sublabel,
    right,
    onPress,
    noBorder,
    highlight,
  }: {
    label: string
    sublabel?: string
    right: React.ReactNode
    onPress?: () => void
    noBorder?: boolean
    highlight?: boolean
  }) => (
    <div
      onClick={onPress}
      className={`flex items-center gap-3 px-4 min-h-[54px] transition-colors duration-300 ${
        !noBorder ? 'border-b border-[#0D0D0D]' : ''
      } ${highlight ? 'bg-[#7C3AED]/10' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${highlight ? 'text-[#A78BFA] font-medium' : 'text-white'}`}>{label}</p>
        {sublabel && (
          <p className="text-[10px] text-[#6B7280] mt-0.5 leading-tight">{sublabel}</p>
        )}
      </div>
      {right}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 pt-4 pb-3 sticky top-0 z-40 bg-[#0D0D0D] border-b border-[#1A1A2E]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center active:opacity-60 transition-opacity duration-150"
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </button>
        <h1 className="text-lg font-bold text-white">Settings</h1>
      </div>

      <div className="px-4 pt-4 space-y-6">
        {/* THEME */}
        <section id="appearance">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 px-1">
            Appearance
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark' as Theme, label: 'Dark', bg: '#0D0D0D', card: '#1A1A2E' },
              { id: 'amoled' as Theme, label: 'AMOLED', bg: '#000000', card: '#111111' },
              { id: 'neon' as Theme, label: 'Neon', bg: '#0B0B1E', card: '#141430' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => update('theme', t.id)}
                className={`rounded-xl overflow-hidden border-2 transition-colors duration-150 ${
                  settings.theme === t.id ? 'border-[#7C3AED]' : 'border-[#2D2D44]'
                }`}
              >
                <div className="h-14 relative" style={{ backgroundColor: t.bg }}>
                  <div
                    className="absolute inset-x-2 top-2 h-2 rounded-full"
                    style={{ backgroundColor: t.card }}
                  />
                  <div
                    className="absolute inset-x-4 top-6 h-1.5 rounded-full"
                    style={{ backgroundColor: t.card }}
                  />
                  <div
                    className="absolute inset-x-6 bottom-2 h-1.5 rounded-full"
                    style={{ backgroundColor: t.card }}
                  />
                  {settings.theme === t.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#7C3AED] flex items-center justify-center">
                      <Check size={11} color="white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div
                  className="py-2"
                  style={{ backgroundColor: t.card, borderTop: '1px solid #2D2D44' }}
                >
                  <p
                    className={`text-xs text-center font-medium ${
                      settings.theme === t.id ? 'text-[#A78BFA]' : 'text-[#9CA3AF]'
                    }`}
                  >
                    {t.label}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* LANGUAGE SECTION */}
        <section id="language">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 px-1">
            Language
          </h2>
          <div className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D44] overflow-hidden">
            <SettingRow
              label="App Language"
              sublabel="Current: English (US)"
              highlight={activeTab === 'language'}
              right={
                <div className="flex items-center gap-1.5">
                  <span className="text-[#9CA3AF] text-sm">English</span>
                  <ChevronRight size={16} color="#4B5563" />
                </div>
              }
              noBorder
            />
          </div>
        </section>

        {/* SECURITY SECTION */}
        <section id="security">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 px-1">
            Account & Security
          </h2>
          <div className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D44] overflow-hidden">
            <SettingRow
              label="Secure Account"
              sublabel="Email verification status"
              highlight={activeTab === 'security'}
              right={
                <div className="flex items-center gap-1.5">
                  <span className="text-[#10B981] text-xs font-medium">Verified</span>
                  <ChevronRight size={16} color="#4B5563" />
                </div>
              }
            />
            <SettingRow
              label="Change Password"
              sublabel="Last changed 3 months ago"
              right={<ChevronRight size={16} color="#4B5563" />}
              noBorder
            />
          </div>
        </section>

        {/* PERFORMANCE */}
        <section id="performance">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 px-1">
            Performance
          </h2>
          <div className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D44] overflow-hidden">
            <SettingRow
              label="Smooth Mode"
              sublabel="Optimized rendering for speed"
              right={
                <Toggle
                  value={settings.smoothMode}
                  onChange={() => update('smoothMode', !settings.smoothMode)}
                />
              }
            />
            <SettingRow
              label="Battery Saver"
              sublabel="Reduce animations to save power"
              right={
                <Toggle
                  value={settings.batterySaver}
                  onChange={() => update('batterySaver', !settings.batterySaver)}
                />
              }
            />
            <SettingRow
              label="Lite Animation"
              sublabel="Minimal transitions"
              right={
                <Toggle
                  value={settings.liteAnimation}
                  onChange={() => update('liteAnimation', !settings.liteAnimation)}
                />
              }
            />
            <SettingRow
              label="Performance Boost"
              sublabel="Faster start, less preloading"
              noBorder
              right={
                <Toggle
                  value={settings.performanceBoost}
                  onChange={() => update('performanceBoost', !settings.performanceBoost)}
                />
              }
            />
          </div>
        </section>

        {/* VIDEO */}
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 px-1">
            Video
          </h2>
          <div className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D44] overflow-hidden">
            <SettingRow
              label="Default Quality"
              sublabel="Video playback resolution"
              onPress={() => setShowVideoQualitySheet(true)}
              right={
                <div className="flex items-center gap-1.5">
                  <span className="text-[#9CA3AF] text-sm capitalize">{settings.videoQuality}</span>
                  <ChevronRight size={16} color="#4B5563" />
                </div>
              }
            />
            <SettingRow
              label="Auto-fit Screen"
              sublabel="Stretch video to fill screen"
              right={
                <Toggle
                  value={settings.autoFitScreen}
                  onChange={() => update('autoFitScreen', !settings.autoFitScreen)}
                />
              }
            />
            <SettingRow
              label="Show Subtitles"
              sublabel="When available"
              noBorder
              right={
                <Toggle
                  value={settings.showSubtitles}
                  onChange={() => update('showSubtitles', !settings.showSubtitles)}
                />
              }
            />
          </div>
        </section>

        {/* NETWORK */}
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 px-1">
            Network & Data
          </h2>
          <div className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D44] overflow-hidden">
            <SettingRow
              label="Low Data Mode"
              sublabel="Load lower quality thumbnails"
              right={
                <Toggle
                  value={settings.lowData}
                  onChange={() => update('lowData', !settings.lowData)}
                />
              }
            />
            <SettingRow
              label="Smart Loading"
              sublabel="Pre-load content while browsing"
              right={
                <Toggle
                  value={settings.smartLoading}
                  onChange={() => update('smartLoading', !settings.smartLoading)}
                />
              }
            />
            <SettingRow
              label="Auto-play Next"
              sublabel="Play next video automatically"
              right={
                <Toggle
                  value={settings.autoPlay}
                  onChange={() => update('autoPlay', !settings.autoPlay)}
                />
              }
            />
            <SettingRow
              label="Thumbnail Quality"
              sublabel="Image quality in lists"
              noBorder
              onPress={() => setShowQualitySheet(true)}
              right={
                <div className="flex items-center gap-1.5">
                  <span className="text-[#9CA3AF] text-sm capitalize">
                    {settings.thumbnailQuality}
                  </span>
                  <ChevronRight size={16} color="#4B5563" />
                </div>
              }
            />
          </div>
        </section>

        {/* STORAGE */}
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 px-1">
            Storage
          </h2>
          <div className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D44] overflow-hidden p-4">
            <div className="mb-4">
              <div className="flex justify-between text-xs text-[#9CA3AF] mb-2">
                <span>App Storage</span>
                <span>Estimated</span>
              </div>
              <div className="h-2 bg-[#0D0D0D] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#7C3AED]" style={{ width: '30%' }} />
              </div>
            </div>

            {[
              { label: 'App Data', size: '2.4 MB' },
              { label: 'Cache', size: '1.8 MB' },
              { label: 'Playlists', size: '0.1 MB' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-2">
                <span className="text-sm text-[#9CA3AF]">{item.label}</span>
                <span className="text-sm text-white">{item.size}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            <button
              onClick={handleClearCache}
              className="w-full h-12 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl text-white text-sm font-semibold active:opacity-60 transition-opacity duration-150"
            >
              Clear Cache
            </button>
            {cacheClearSuccess && <p style={{ color: '#22C55E', fontSize: 13 }}>Cache cleared</p>}

            <button
              onClick={async () => {
                try {
                  const playlists = localStorage.getItem('pn_music_playlists') || '[]'
                  const json = JSON.stringify(JSON.parse(playlists), null, 2)
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'playnexa-playlists.json'
                  a.click()
                  URL.revokeObjectURL(url)
                } catch {
                  alert('Backup failed')
                }
              }}
              className="w-full h-12 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl text-white text-sm font-semibold active:opacity-60 transition-opacity duration-150"
            >
              Backup Playlists
            </button>
          </div>
        </section>

        {/* DANGER ZONE */}
        <section>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3 px-1">
            Danger Zone
          </h2>
          <button
            onClick={() => setShowResetModal(true)}
            className="w-full h-12 bg-[#1A1A2E] border border-[#EF4444]/30 rounded-xl text-[#EF4444] text-sm font-semibold active:opacity-60 transition-opacity duration-150"
          >
            Reset App
          </button>
          <p className="text-[#6B7280] text-xs mt-2 px-1 text-center">
            Clears all local data and preferences
          </p>
        </section>

        <p className="text-center text-[#4B5563] text-xs pb-2">Play Nexa v1.0.0</p>
      </div>

      {/* Thumbnail Quality Sheet */}
      {showQualitySheet && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/70"
            onClick={() => setShowQualitySheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[56] bg-[#0D0D0D] rounded-t-3xl border-t border-[#1A1A2E] p-6 pb-10">
            <div className="w-10 h-1 bg-[#2D2D44] rounded-full mx-auto mb-5" />
            <p className="text-white font-bold text-lg mb-4">Thumbnail Quality</p>
            <div className="space-y-2">
              {(['low', 'medium', 'high'] as ThumbnailQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    update('thumbnailQuality', q)
                    setShowQualitySheet(false)
                  }}
                  className={`w-full h-12 rounded-xl text-sm font-medium flex items-center justify-between px-4 capitalize transition-colors duration-150 ${
                    settings.thumbnailQuality === q
                      ? 'bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/40'
                      : 'bg-[#1A1A2E] text-white border border-[#2D2D44]'
                  }`}
                >
                  {q}
                  {settings.thumbnailQuality === q && (
                    <Check size={16} color="#A78BFA" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Video Quality Sheet */}
      {showVideoQualitySheet && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/70"
            onClick={() => setShowVideoQualitySheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[56] bg-[#0D0D0D] rounded-t-3xl border-t border-[#1A1A2E] p-6 pb-10">
            <div className="w-10 h-1 bg-[#2D2D44] rounded-full mx-auto mb-5" />
            <p className="text-white font-bold text-lg mb-4">Video Quality</p>
            <div className="space-y-2">
              {(['auto', '360p', '480p', '720p', '1080p'] as VideoQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    update('videoQuality', q)
                    setShowVideoQualitySheet(false)
                  }}
                  className={`w-full h-12 rounded-xl text-sm font-medium flex items-center justify-between px-4 uppercase transition-colors duration-150 ${
                    settings.videoQuality === q
                      ? 'bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/40'
                      : 'bg-[#1A1A2E] text-white border border-[#2D2D44]'
                  }`}
                >
                  {q === 'auto' ? 'Auto' : q}
                  {settings.videoQuality === q && (
                    <Check size={16} color="#A78BFA" strokeWidth={2.5} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/70"
            onClick={() => {
              setShowResetModal(false)
              setResetInput('')
            }}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[56] bg-[#0D0D0D] rounded-t-3xl border-t border-[#1A1A2E] p-6 pb-10">
            <div className="w-10 h-1 bg-[#2D2D44] rounded-full mx-auto mb-5" />
            <h3 className="text-white font-bold text-lg mb-1">Reset App</h3>
            <p className="text-[#9CA3AF] text-sm mb-5">
              This will clear all local data, settings, and sign you out. Type{' '}
              <strong className="text-white">RESET</strong> to confirm.
            </p>
            <input
              type="text"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="Type RESET to confirm"
              className="w-full h-12 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none mb-4 focus:border-[#EF4444] placeholder-[#4B5563]"
            />
            <button
              onClick={handleReset}
              disabled={resetInput !== 'RESET'}
              className="w-full h-12 bg-[#EF4444] rounded-xl text-white font-semibold text-sm disabled:opacity-40 active:opacity-80 mb-3 transition-opacity duration-150"
            >
              Reset Everything
            </button>
            <button
              onClick={() => {
                setShowResetModal(false)
                setResetInput('')
              }}
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
