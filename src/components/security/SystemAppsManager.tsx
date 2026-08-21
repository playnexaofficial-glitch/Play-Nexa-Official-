'use client'

// ── Play Nexa System Apps Manager Dashboard ──────────────────
// 100% PRODUCTION — Real state engine + event handler toggles
// - Device Apps Scanner with onLockToggle / onHideToggle handlers
// - IndexedDB persistence for locked packages
// - Background monitor service integration
// - Hidden Pool → Calculator Disguise interceptor
// 2GB RAM safe · APK/Capacitor compatible

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Shield, EyeOff, Palette, Search,
  Lock, Unlock, ChevronRight, AlertTriangle,
  Check, Eye, Monitor, Cpu, X, Scan, Smartphone
} from 'lucide-react'
import {
  type DeviceApp, type PermissionState,
  getInstalledApps, checkPermissions, requestPermission,
  CATEGORY_LABELS, startBackgroundMonitor, stopBackgroundMonitor
} from '@/lib/native-bridge'
import {
  loadSecurityEntries, toggleAppLock, toggleAppHide,
  getAppEntry, getSecurityStats, lockApp, unlockApp
} from '@/lib/app-security-store'
import { useDisguise } from '@/lib/disguise-context'
import AppLockOverlay from './AppLockOverlay'
import IconChangerModal from './IconChangerModal'

type TabFilter = 'all' | 'locked' | 'hidden' | 'disguised'
type SortMode = 'name' | 'category'

export default function SystemAppsManager() {
  const { refreshHiddenPool, hiddenPool } = useDisguise()
  const [apps, setApps] = useState<DeviceApp[]>([])
  const [permissions, setPermissions] = useState<PermissionState>({
    PACKAGE_USAGE_STATS: 'unknown',
    SYSTEM_ALERT_WINDOW: 'unknown',
    BIOMETRIC: 'unknown',
    INSTALL_SHORTCUT: 'unknown',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [tabFilter, setTabFilter] = useState<TabFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('name')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ locked: 0, hidden: 0, disguised: 0 })
  const [refreshKey, setRefreshKey] = useState(0)

  // Modal states
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayApp, setOverlayApp] = useState<DeviceApp | null>(null)
  const [showIconModal, setShowIconModal] = useState(false)
  const [iconModalApp, setIconModalApp] = useState<DeviceApp | null>(null)
  const [toast, setToast] = useState('')

  // ── Load apps & permissions ──
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const [installedApps, perms] = await Promise.all([
        getInstalledApps(),
        checkPermissions(),
      ])
      if (mounted) {
        setApps(installedApps)
        setPermissions(perms)
        setStats(getSecurityStats())
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [refreshKey])

  // ── Start/stop background monitor when locked apps change ──
  useEffect(() => {
    const lockedPackages = loadSecurityEntries()
      .filter(e => e.locked)
      .map(e => e.packageName)

    if (lockedPackages.length > 0) {
      startBackgroundMonitor(lockedPackages).catch(() => {})
    } else {
      stopBackgroundMonitor().catch(() => {})
    }

    return () => {
      stopBackgroundMonitor().catch(() => {})
    }
  }, [stats.locked])

  const refresh = useCallback(() => {
    setStats(getSecurityStats())
    refreshHiddenPool()
    setRefreshKey(k => k + 1)
  }, [refreshHiddenPool])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }, [])

  // ── Filter & sort apps ──
  const filteredApps = useMemo(() => {
    let result = apps

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
      )
    }

    const entries = loadSecurityEntries()
    if (tabFilter === 'locked') {
      result = result.filter(a => entries.find(e => e.packageName === a.packageName && e.locked))
    } else if (tabFilter === 'hidden') {
      result = result.filter(a => entries.find(e => e.packageName === a.packageName && e.hidden))
    } else if (tabFilter === 'disguised') {
      result = result.filter(a => entries.find(e => e.packageName === a.packageName && e.disguised))
    }

    result = [...result].sort((a, b) => {
      if (sortMode === 'category') return a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name)
    })

    return result
  }, [apps, searchQuery, tabFilter, sortMode, refreshKey])

  // ════════════════════════════════════════════════════════════
  // EVENT HANDLERS — onLockToggle / onHideToggle
  // ════════════════════════════════════════════════════════════

  /** Lock toggle handler — stores package ID in IndexedDB */
  const onLockToggle = useCallback((app: DeviceApp) => {
    const entry = getAppEntry(app.packageName)
    if (!entry?.locked) {
      // Show the pattern/PIN lock overlay to set the lock
      setOverlayApp(app)
      setShowOverlay(true)
    } else {
      // Unlock — remove from IndexedDB + localStorage
      unlockApp(app.packageName)
      showToast(`${app.name} unlocked`)
      refresh()
    }
  }, [refresh, showToast])

  /** Hide toggle handler — adds to Hidden Pool in IndexedDB */
  const onHideToggle = useCallback((app: DeviceApp) => {
    toggleAppHide(app.packageName, app.name)
    const entry = getAppEntry(app.packageName)
    const nowHidden = !entry?.hidden // toggleAppHide just flipped it
    showToast(nowHidden ? `${app.name} added to Hidden Pool` : `${app.name} removed from Hidden Pool`)
    refresh()
  }, [refresh, showToast])

  /** Disguise look handler — opens icon changer modal */
  const handleChangeLook = useCallback((app: DeviceApp) => {
    setIconModalApp(app)
    setShowIconModal(true)
  }, [])

  /** Overlay unlock callback — confirms lock after pattern verification */
  const handleOverlayUnlock = useCallback((success: boolean) => {
    if (success && overlayApp) {
      lockApp(overlayApp.packageName, 'pattern', overlayApp.name)
      showToast(`${overlayApp.name} locked with pattern`)
    }
    setShowOverlay(false)
    setOverlayApp(null)
    refresh()
  }, [overlayApp, refresh, showToast])

  /** Icon modal close callback */
  const handleIconModalClose = useCallback(() => {
    setShowIconModal(false)
    setIconModalApp(null)
    refresh()
  }, [refresh])

  /** Permission request handler */
  const handleRequestPermission = useCallback(async (perm: keyof PermissionState) => {
    const granted = await requestPermission(perm)
    setPermissions(prev => ({ ...prev, [perm]: granted ? 'granted' : 'denied' }))
    if (granted) showToast(`${perm} permission granted`)
    else showToast(`${perm} permission denied`)
  }, [showToast])

  const grantedCount = Object.values(permissions).filter(v => v === 'granted').length
  const totalPerms = Object.keys(permissions).length

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="relative min-h-screen bg-[#070B14] pb-6">

      {/* ══════ PERMISSION STATUS BAR ══════ */}
      <div className="px-4 pt-2 pb-3">
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield size={14} className={grantedCount >= 3 ? 'text-[#22C55E]' : 'text-[#F59E0B]'} />
              <p className="text-white text-xs font-semibold">Native Permissions</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
              ${grantedCount >= 3 ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>
              {grantedCount}/{totalPerms}
            </span>
          </div>
          <div className="space-y-1.5">
            {(Object.entries(permissions) as [keyof PermissionState, string][]).map(([key, state]) => (
              <div key={key} className="flex items-center justify-between">
                <p className="text-[#94A3B8] text-[10px] font-mono">{key}</p>
                {state === 'granted' ? (
                  <div className="flex items-center gap-1">
                    <Check size={10} className="text-[#22C55E]" />
                    <span className="text-[#22C55E] text-[10px] font-medium">Granted</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRequestPermission(key)}
                    className="text-[10px] font-medium text-[#F59E0B] bg-[#F59E0B]/10
                               px-2 py-0.5 rounded-full active:scale-95 transition-transform"
                  >
                    {state === 'denied' ? 'Grant' : 'Check'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ STATS CARDS ══════ */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Locked', value: stats.locked, icon: <Lock size={14} />, color: '#7C5CFF' },
            { label: 'Hidden', value: stats.hidden, icon: <EyeOff size={14} />, color: '#EF4444' },
            { label: 'Disguised', value: stats.disguised, icon: <Palette size={14} />, color: '#00D4FF' },
          ].map(stat => (
            <div key={stat.label}
                 className="bg-[#111827] border border-[#1E293B] rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1"
                   style={{ color: stat.color }}>
                {stat.icon}
              </div>
              <p className="text-white text-xl font-bold">{stat.value}</p>
              <p className="text-[#94A3B8] text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════ SEARCH BAR ══════ */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search installed apps..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#111827] border border-[#1E293B]
                       text-white text-xs outline-none focus:border-[#7C5CFF]
                       transition-colors duration-150 placeholder:text-[#94A3B8]/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] active:text-white">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ══════ TAB FILTERS ══════ */}
      <div className="px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([
            { id: 'all' as TabFilter, label: 'All', icon: <Smartphone size={12} /> },
            { id: 'locked' as TabFilter, label: `Locked (${stats.locked})`, icon: <Lock size={12} /> },
            { id: 'hidden' as TabFilter, label: `Hidden (${stats.hidden})`, icon: <EyeOff size={12} /> },
            { id: 'disguised' as TabFilter, label: `Disguised (${stats.disguised})`, icon: <Palette size={12} /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold
                         whitespace-nowrap transition-all duration-150 active:scale-95
                         ${tabFilter === tab.id
                           ? 'bg-[#7C5CFF] text-white'
                           : 'bg-[#111827] border border-[#1E293B] text-[#94A3B8]'
                         }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════ SORT TOGGLE ══════ */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <p className="text-[#94A3B8] text-[10px]">{filteredApps.length} apps</p>
        <button
          onClick={() => setSortMode(m => m === 'name' ? 'category' : 'name')}
          className="text-[#94A3B8] text-[10px] font-medium flex items-center gap-1
                     active:text-white transition-colors"
        >
          Sort: {sortMode === 'name' ? 'A-Z' : 'Category'}
          <ChevronRight size={10} className={`transition-transform duration-150 ${sortMode === 'category' ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* ══════ LOADING STATE ══════ */}
      {loading && (
        <div className="px-4 py-12 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7C5CFF]/10 flex items-center justify-center animate-pulse">
            <Scan size={24} className="text-[#7C5CFF]" />
          </div>
          <p className="text-[#94A3B8] text-xs">Scanning installed apps...</p>
        </div>
      )}

      {/* ══════ APP LIST ══════ */}
      {!loading && (
        <div className="px-4 space-y-1.5">
          {filteredApps.map(app => {
            const entry = getAppEntry(app.packageName)
            const isLocked = entry?.locked || false
            const isHidden = entry?.hidden || false
            const isDisguised = entry?.disguised || false
            const isSystem = app.isSystemApp

            return (
              <div key={app.packageName}
                   className="bg-[#111827] border border-[#1E293B] rounded-xl p-3
                              transition-all duration-150">

                {/* App row */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                       style={{ backgroundColor: app.iconColor + '30' }}>
                    {isDisguised && entry?.customLabel ? (
                      <Palette size={18} style={{ color: app.iconColor }} />
                    ) : (
                      <span style={{ color: app.iconColor }}>
                        {app.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-sm font-medium truncate">
                        {isDisguised && entry?.customLabel ? entry.customLabel : app.name}
                      </p>
                      {isSystem && (
                        <span className="text-[8px] font-bold bg-[#94A3B8]/10 text-[#94A3B8]
                                         px-1.5 py-0.5 rounded-full flex-shrink-0">SYS</span>
                      )}
                    </div>
                    <p className="text-[#94A3B8] text-[10px] truncate">{app.packageName}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {isLocked && (
                        <span className="text-[8px] font-bold bg-[#7C5CFF]/10 text-[#7C5CFF]
                                         px-1.5 py-0.5 rounded-full">LOCKED</span>
                      )}
                      {isHidden && (
                        <span className="text-[8px] font-bold bg-[#EF4444]/10 text-[#EF4444]
                                         px-1.5 py-0.5 rounded-full">HIDDEN</span>
                      )}
                      {isDisguised && (
                        <span className="text-[8px] font-bold bg-[#00D4FF]/10 text-[#00D4FF]
                                         px-1.5 py-0.5 rounded-full">DISGUISED</span>
                      )}
                    </div>
                  </div>

                  <span className="text-[8px] font-semibold text-[#94A3B8]/60
                                   bg-[#1E293B] px-2 py-1 rounded-lg flex-shrink-0">
                    {CATEGORY_LABELS[app.category]}
                  </span>
                </div>

                {/* Action buttons row */}
                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[#1E293B]/50">
                  <button
                    onClick={() => onLockToggle(app)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold
                               transition-all duration-150 active:scale-95
                               ${isLocked
                                 ? 'bg-[#7C5CFF]/15 text-[#7C5CFF] border border-[#7C5CFF]/30'
                                 : 'bg-[#0F172A] text-[#94A3B8] border border-[#1E293B]'
                               }`}
                  >
                    {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                    {isLocked ? 'Locked' : 'Lock'}
                  </button>

                  <button
                    onClick={() => onHideToggle(app)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold
                               transition-all duration-150 active:scale-95
                               ${isHidden
                                 ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                                 : 'bg-[#0F172A] text-[#94A3B8] border border-[#1E293B]'
                               }`}
                  >
                    {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
                    {isHidden ? 'Hidden' : 'Hide'}
                  </button>

                  <button
                    onClick={() => handleChangeLook(app)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold
                               transition-all duration-150 active:scale-95
                               ${isDisguised
                                 ? 'bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/30'
                                 : 'bg-[#0F172A] text-[#94A3B8] border border-[#1E293B]'
                               }`}
                  >
                    <Palette size={11} />
                    {isDisguised ? 'Disguised' : 'Disguise'}
                  </button>
                </div>

                {/* Hidden pool warning */}
                {isHidden && (
                  <div className="flex items-center gap-2 mt-2 p-2 rounded-lg
                                  bg-[#F59E0B]/5 border border-[#F59E0B]/15">
                    <AlertTriangle size={10} className="text-[#F59E0B] flex-shrink-0" />
                    <p className="text-[#F59E0B]/80 text-[9px] leading-relaxed">
                      Launching this app requires Calculator Disguise secret passkey.
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {filteredApps.length === 0 && !loading && (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#111827] border border-[#1E293B]
                              flex items-center justify-center">
                <Search size={24} className="text-[#94A3B8]" />
              </div>
              <p className="text-[#94A3B8] text-xs text-center">
                {searchQuery ? 'No apps match your search' : 'No apps in this category'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════ HIDDEN POOL ACTIVE NOTE ══════ */}
      {stats.hidden > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-[#111827] border border-[#7C5CFF]/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor size={16} className="text-[#7C5CFF]" />
              <p className="text-white text-sm font-semibold">Hidden Pool Active</p>
            </div>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed mb-3">
              {stats.hidden} app{stats.hidden > 1 ? 's are' : ' is'} registered in the Hidden Pool.
              When any of these apps are launched, the Calculator Disguise overlay will intercept
              and require the secret passkey sequence before granting access.
            </p>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#7C5CFF]/5 border border-[#7C5CFF]/15">
              <Cpu size={12} className="text-[#7C5CFF]" />
              <p className="text-[#7C5CFF]/80 text-[10px] font-medium">
                Background service monitoring active on APK builds
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════ APP LOCK OVERLAY ══════ */}
      {showOverlay && overlayApp && (
        <AppLockOverlay
          appName={overlayApp.name}
          appColor={overlayApp.iconColor}
          onUnlock={handleOverlayUnlock}
        />
      )}

      {/* ══════ ICON CHANGER MODAL ══════ */}
      {showIconModal && iconModalApp && (
        <IconChangerModal
          app={iconModalApp}
          onClose={handleIconModalClose}
          showToast={showToast}
        />
      )}

      {/* ══════ TOAST ══════ */}
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
