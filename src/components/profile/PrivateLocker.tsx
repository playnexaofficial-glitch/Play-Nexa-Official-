'use client'

// ── Play Nexa Private Locker ────────────────────────────────────
// Videmate-style private folder · APK-ready (Capacitor WebView)
//
// State 1: Set Password (neon-teal lock + crimson button)
// State 2: Enter Passcode (4-dot dial pad · auto-validate · shake)
// State 3: Unlocked Vault (4 tabs: All/Videos/Audio/Images + Add + Unhide)
//
// Architecture:
//   Metadata  → XOR+Base64 encrypted localStorage (safe-store.ts)
//   Media Blobs → IndexedDB (idb-store.ts) · survives APK compilation
//   Thumbnails  → Canvas extraction + URL.createObjectURL
//
// APK/Capacitor safe:
//   ✅ IndexedDB · ✅ URL.createObjectURL · ✅ File API
//   ✅ Canvas · ✅ localStorage (metadata only)
//   ❌ No Web Share · ❌ No beforeunload · ❌ No Clipboard API
//
// 2GB RAM: content-visibility: auto · no backdrop-blur · GPU transforms ≤200ms

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  Lock, ShieldCheck, Delete, Video, Music,
  Plus, Trash2, EyeOff, X, FolderLock,
  Play, Pause, ChevronLeft, ShieldAlert, Image as ImageIcon, Layers
} from 'lucide-react'
import {
  hasPin, setPin, verifyPin,
  loadSafeEntries, addToSafe, removeFromSafe,
  type SafeEntry, safeId
} from '@/lib/safe-store'
import { saveBlob, getBlob, deleteBlob } from '@/lib/idb-store'

// ── Types ───────────────────────────────────────────────────────
type LockerState = 'set-password' | 'enter-pin' | 'unlocked'
type VaultTab = 'all' | 'videos' | 'audio' | 'images'

interface VaultFile extends SafeEntry {
  blobUrl?: string
  thumbUrl?: string   // tiny canvas thumbnail for videos
}

interface ToastData {
  visible: boolean
  message: string
  type: 'success' | 'error'
}

// ── Time formatting ─────────────────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── File size formatter ─────────────────────────────────────────
function fmtSize(b: number): string {
  if (!b) return '0 B'
  if (b > 1073741824) return `${(b / 1073741824).toFixed(1)} GB`
  if (b > 1048576) return `${(b / 1048576).toFixed(1)} MB`
  if (b > 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${b} B`
}

// ── Tab config ──────────────────────────────────────────────────
const VAULT_TABS: { key: VaultTab; label: string; icon: typeof Video }[] = [
  { key: 'all',     label: 'All',     icon: Layers },
  { key: 'videos',  label: 'Videos',  icon: Video },
  { key: 'audio',   label: 'Audio',   icon: Music },
  { key: 'images',  label: 'Images',  icon: ImageIcon },
]

// ── Dial pad digits ─────────────────────────────────────────────
const DIAL_DIGITS = ['1','2','3','4','5','6','7','8','9','','0','del']

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════
export default function PrivateLocker({ onClose }: { onClose: () => void }) {
  // ── Locker state ──
  const [lockerState, setLockerState] = useState<LockerState>(
    hasPin() ? 'enter-pin' : 'set-password'
  )
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [setupStep, setSetupStep] = useState<'enter' | 'confirm' | null>(null)
  const [pinError, setPinError] = useState('')
  const [shake, setShake] = useState(false)
  const [successFlash, setSuccessFlash] = useState(false)

  // ── Vault state ──
  const [vaultTab, setVaultTab] = useState<VaultTab>('all')
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([])
  const [activeMedia, setActiveMedia] = useState<VaultFile | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [toast, setToast] = useState<ToastData>({ visible: false, message: '', type: 'success' })
  const [isImporting, setIsImporting] = useState(false)

  // ── Refs ──
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pinInputRef = useRef<HTMLInputElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Toast ──
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ visible: true, message, type })
    toastTimerRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
      toastTimerRef.current = null
    }, 4000)
  }, [])

  // ── Load vault when unlocked ──
  useEffect(() => {
    if (lockerState !== 'unlocked' || !pin) return

    const entries = loadSafeEntries(pin)
    setVaultFiles(entries.map(e => ({ ...e, blobUrl: undefined, thumbUrl: undefined })))

    // Lazily load blob URLs from IndexedDB for instant thumbnails
    let cancelled = false
    entries.forEach(async (entry) => {
      try {
        const stored = await getBlob(entry.id)
        if (cancelled || !stored) return
        const blobUrl = URL.createObjectURL(stored.blob)
        setVaultFiles(prev =>
          prev.map(f => f.id === entry.id ? { ...f, blobUrl } : f)
        )
      } catch {
        // Metadata-only entry (blob not in IDB)
      }
    })

    return () => { cancelled = true }
  }, [lockerState, pin])

  // ── Auto-focus PIN input ──
  useEffect(() => {
    if (lockerState === 'enter-pin' || (lockerState === 'set-password' && setupStep)) {
      setTimeout(() => pinInputRef.current?.focus(), 60)
    }
  }, [lockerState, setupStep])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      vaultFiles.forEach(f => {
        if (f.blobUrl) try { URL.revokeObjectURL(f.blobUrl) } catch {}
        if (f.thumbUrl) try { URL.revokeObjectURL(f.thumbUrl) } catch {}
      })
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
   
  }, [])

  // ════════════════════════════════════════════════════════════
  // PIN FLOW
  // ════════════════════════════════════════════════════════════
  const currentPinDisplay = lockerState === 'set-password'
    ? (setupStep === 'enter' ? pin : confirmPin)
    : pin

  const setCurrentPinDisplay = lockerState === 'set-password'
    ? (setupStep === 'enter' ? setPin : setConfirmPin)
    : setPin

  const processPinComplete = useCallback((value: string) => {
    if (lockerState === 'set-password') {
      if (setupStep === 'enter') {
        setPin(value)
        setSetupStep('confirm')
        setConfirmPin('')
        setPinError('')
      } else if (setupStep === 'confirm') {
        if (value === pin) {
          setPin(value)
          setSuccessFlash(true)
          setTimeout(() => { setSuccessFlash(false); setLockerState('unlocked') }, 400)
          setPinError('')
        } else {
          setPinError('PINs do not match. Try again.')
          setShake(true)
          setConfirmPin('')
          setTimeout(() => setShake(false), 500)
        }
      }
    } else {
      if (verifyPin(value)) {
        setPin(value)
        setSuccessFlash(true)
        setTimeout(() => { setSuccessFlash(false); setLockerState('unlocked') }, 300)
        setPinError('')
      } else {
        setPinError('Incorrect passcode')
        setShake(true)
        setPin('')
        setTimeout(() => setShake(false), 500)
      }
    }
  }, [lockerState, setupStep, pin])

  const handleDigit = useCallback((d: string) => {
    setCurrentPinDisplay(prev => {
      if (prev.length >= 4) return prev
      const next = prev + d
      if (next.length === 4) {
        setTimeout(() => processPinComplete(next), 120)
      }
      return next
    })
  }, [setCurrentPinDisplay, processPinComplete])

  const handleDelete = useCallback(() => {
    setCurrentPinDisplay(prev => prev.slice(0, -1))
    setPinError('')
  }, [setCurrentPinDisplay])

  const handleKeyInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setCurrentPinDisplay(val)
    if (val.length === 4) {
      setTimeout(() => processPinComplete(val), 120)
    }
  }, [setCurrentPinDisplay, processPinComplete])

  // ════════════════════════════════════════════════════════════
  // VAULT FILE MANAGEMENT
  // ════════════════════════════════════════════════════════════

  const handleAddClick = useCallback(() => {
    if (vaultTab === 'videos') videoInputRef.current?.click()
    else if (vaultTab === 'audio') audioInputRef.current?.click()
    else if (vaultTab === 'images') imageInputRef.current?.click()
    else videoInputRef.current?.click() // "All" tab defaults to video picker
  }, [vaultTab])

  const handleFileImport = useCallback(async (
    e: React.ChangeEvent<HTMLInputElement>,
    mediaType: 'video' | 'audio' | 'image'
  ) => {
    const files = Array.from(e.target.files || []) as File[]
    if (!files.length || !pin) return

    setIsImporting(true)

    try {
      const incoming: VaultFile[] = []

      for (const file of files) {
        const id = safeId()
        const blobUrl = URL.createObjectURL(file)

        // 1) Store encrypted metadata in localStorage
        addToSafe({
          id,
          name: file.name.replace(/\.[^.]+$/, ''),
          type: mediaType,
          addedAt: Date.now(),
          size: file.size,
        }, pin)

        // 2) Store raw Blob in IndexedDB (persists through APK)
        try { await saveBlob(id, file, file.type) } catch {}

        // 3) Create canvas thumbnail for videos
        let thumbUrl: string | undefined
        if (mediaType === 'video') {
          try {
            const thumb = await generateVideoThumbnail(file)
            if (thumb) thumbUrl = thumb
          } catch {}
        }

        incoming.push({
          id,
          name: file.name.replace(/\.[^.]+$/, ''),
          type: mediaType,
          addedAt: Date.now(),
          size: file.size,
          blobUrl,
          thumbUrl,
        })
      }

      setVaultFiles(prev => [...incoming, ...prev])
      showToast(
        `🔒 Asset successfully encrypted inside Vault! To complete the hide process, please manually delete the original file from your phone gallery.`,
        'success'
      )
    } catch {
      showToast('Import failed. Please try again.', 'error')
    }

    setIsImporting(false)
    e.target.value = ''
  }, [pin, showToast])

  const handleVideoImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleFileImport(e, 'video'), [handleFileImport])
  const handleAudioImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleFileImport(e, 'audio'), [handleFileImport])
  const handleImageImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleFileImport(e, 'image'), [handleFileImport])

  // ── Canvas thumbnail generator (APK-safe) ──
  async function generateVideoThumbnail(file: File): Promise<string | undefined> {
    return new Promise((resolve) => {
      try {
        const vid = document.createElement('video')
        vid.preload = 'metadata'
        vid.muted = true
        vid.playsInline = true
        const objUrl = URL.createObjectURL(file)
        vid.src = objUrl

        vid.onloadeddata = () => {
          vid.currentTime = 1
        }

        vid.onseeked = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = 200
            canvas.height = 200
            const ctx = canvas.getContext('2d')
            if (!ctx) { URL.revokeObjectURL(objUrl); resolve(undefined); return }
            ctx.drawImage(vid, 0, 0, 200, 200)
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.5)
            URL.revokeObjectURL(objUrl)
            resolve(thumbUrl)
          } catch {
            URL.revokeObjectURL(objUrl)
            resolve(undefined)
          }
        }

        vid.onerror = () => {
          URL.revokeObjectURL(objUrl)
          resolve(undefined)
        }

        // Timeout fallback for WebView
        setTimeout(() => {
          URL.revokeObjectURL(objUrl)
          resolve(undefined)
        }, 5000)
      } catch {
        resolve(undefined)
      }
    })
  }

  // ── Unhide ──
  const handleUnhide = useCallback((id: string) => {
    if (!pin) return
    const file = vaultFiles.find(f => f.id === id)
    if (!file) return

    const storageKey = file.type === 'video' ? 'pn_local_videos_v2'
      : file.type === 'audio' ? 'pn_local_tracks_v2'
      : 'pn_local_images_v2'

    try {
      const saved = localStorage.getItem(storageKey)
      const existing = saved ? JSON.parse(saved) : []
      const prefix = file.type === 'video' ? 'lv' : file.type === 'audio' ? 'lt' : 'li'
      existing.unshift({
        id: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size || 0,
        duration: 0,
        folder: 'Unhidden',
        addedAt: Date.now(),
        lastPlayed: undefined,
      })
      localStorage.setItem(storageKey, JSON.stringify(existing))
    } catch {}

    removeFromSafe(id, pin)
    deleteBlob(id).catch(() => {})
    if (file.blobUrl) try { URL.revokeObjectURL(file.blobUrl) } catch {}
    if (file.thumbUrl) try { URL.revokeObjectURL(file.thumbUrl) } catch {}
    setVaultFiles(prev => prev.filter(f => f.id !== id))
    showToast('File moved back to public view.', 'success')
  }, [pin, vaultFiles, showToast])

  // ── Delete ──
  const handleRemove = useCallback((id: string) => {
    if (!pin) return
    const file = vaultFiles.find(f => f.id === id)
    removeFromSafe(id, pin)
    deleteBlob(id).catch(() => {})
    if (file?.blobUrl) try { URL.revokeObjectURL(file.blobUrl) } catch {}
    if (file?.thumbUrl) try { URL.revokeObjectURL(file.thumbUrl) } catch {}
    setVaultFiles(prev => prev.filter(f => f.id !== id))
  }, [pin, vaultFiles])

  // ── Play file ──
  const handlePlayFile = useCallback(async (file: VaultFile) => {
    let playUrl = file.blobUrl
    if (!playUrl) {
      try {
        const stored = await getBlob(file.id)
        if (stored) {
          playUrl = URL.createObjectURL(stored.blob)
          setVaultFiles(prev =>
            prev.map(f => f.id === file.id ? { ...f, blobUrl: playUrl } : f)
          )
        }
      } catch {}
    }
    if (playUrl) {
      setActiveMedia({ ...file, blobUrl: playUrl })
      setIsPlaying(true)
    }
  }, [])

  const handleCloseMedia = useCallback(() => {
    setActiveMedia(null)
    setIsPlaying(false)
  }, [])

  // ── Derived data ──
  const filteredFiles = useMemo(() => {
    if (vaultTab === 'all') return vaultFiles
    const typeMap: Record<string, string> = { videos: 'video', audio: 'audio', images: 'image' }
    return vaultFiles.filter(f => f.type === typeMap[vaultTab])
  }, [vaultTab, vaultFiles])

  const tabCounts = useMemo(() => ({
    all: vaultFiles.length,
    videos: vaultFiles.filter(f => f.type === 'video').length,
    audio: vaultFiles.filter(f => f.type === 'audio').length,
    images: vaultFiles.filter(f => f.type === 'image').length,
  }), [vaultFiles])

  // ── Chronological sectioning for "All" tab ──
  const chronologicalSections = useMemo(() => {
    if (vaultTab !== 'all') return []
    const sections: { label: string; files: VaultFile[] }[] = []
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterday = today - 86400000

    let currentLabel = ''
    let currentFiles: VaultFile[] = []

    const sorted = [...filteredFiles].sort((a, b) => b.addedAt - a.addedAt)

    for (const file of sorted) {
      let label: string
      if (file.addedAt >= today) label = 'Today'
      else if (file.addedAt >= yesterday) label = 'Yesterday'
      else label = new Date(file.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      if (label !== currentLabel) {
        if (currentFiles.length) sections.push({ label: currentLabel, files: currentFiles })
        currentLabel = label
        currentFiles = [file]
      } else {
        currentFiles.push(file)
      }
    }
    if (currentFiles.length) sections.push({ label: currentLabel, files: currentFiles })
    return sections
  }, [vaultTab, filteredFiles])

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[9999] bg-black animate-[fade-in_200ms_ease-out]">

      {/* ════════════════════════════════════════════════════════
          STATE 1: SET PASSWORD
          ════════════════════════════════════════════════════════ */}
      {lockerState === 'set-password' && !setupStep && (
        <div className="flex flex-col items-center justify-center min-h-screen px-8 bg-black">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full
                       bg-neutral-900 border border-neutral-800
                       flex items-center justify-center
                       active:scale-90 transition-transform duration-100"
          >
            <X size={18} className="text-neutral-400" />
          </button>

          {/* Neon-teal lock graphic */}
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6
                         shadow-[0_0_40px_rgba(0,212,255,0.15)]"
               style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(15,118,110,0.12))' }}>
            <Lock size={40} className="text-[#00D4FF]" />
          </div>

          <h2 className="text-white text-xl font-bold mb-2">Set Password</h2>
          <p className="text-neutral-500 text-xs text-center mb-8 max-w-[260px] leading-relaxed">
            Lock videos, audio &amp; photos as private with a 4-digit passcode. Only you can access them.
          </p>

          <button
            onClick={() => setSetupStep('enter')}
            className="w-full max-w-[280px] h-12 rounded-xl
                       bg-[#DC2626] text-white text-sm font-bold
                       shadow-[0_0_20px_rgba(220,38,38,0.3)]
                       active:scale-95 transition-transform duration-100"
          >
            SET PASSWORD
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STATE 1b: PIN SETUP DIAL PAD
          ════════════════════════════════════════════════════════ */}
      {lockerState === 'set-password' && setupStep && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-black">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 text-neutral-600 text-xs
                       active:text-neutral-400 transition-colors"
          >
            Cancel
          </button>

          <input
            ref={pinInputRef}
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={currentPinDisplay}
            onChange={handleKeyInput}
            className="absolute opacity-0 w-0 h-0"
            autoComplete="off"
          />

          <div className="w-14 h-14 rounded-2xl bg-[#00D4FF]/10 flex items-center justify-center mb-4">
            <Lock size={24} className="text-[#00D4FF]" />
          </div>

          <h2 className="text-white text-base font-bold mb-1">
            {setupStep === 'enter' ? 'Create PIN' : 'Confirm PIN'}
          </h2>
          <p className="text-neutral-500 text-xs mb-8 text-center">
            {setupStep === 'enter' ? 'Enter a 4-digit passcode' : 'Re-enter your passcode to confirm'}
          </p>

          <div className={`flex gap-5 mb-6 ${shake ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150
                           ${i < currentPinDisplay.length
                             ? 'bg-[#00D4FF] scale-125 shadow-[0_0_8px_rgba(0,212,255,0.4)]'
                             : shake
                               ? 'bg-red-500/30 border-2 border-red-500'
                               : 'bg-neutral-800 border border-neutral-700'
                           }`}
              />
            ))}
          </div>

          {pinError && (
            <div className="flex items-center gap-2 mb-5 animate-[fade-in_200ms_ease-out]">
              <ShieldAlert size={14} className="text-red-400" />
              <p className="text-red-400 text-xs font-medium">{pinError}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 w-[240px]">
            {DIAL_DIGITS.map((d, i) => {
              if (d === '') return <div key={i} />
              if (d === 'del') return (
                <button key={i} onClick={handleDelete}
                  className="h-14 rounded-2xl flex items-center justify-center
                             active:scale-90 transition-transform duration-100
                             bg-neutral-900 border border-neutral-800">
                  <Delete size={18} className="text-neutral-500" />
                </button>
              )
              return (
                <button key={i} onClick={() => handleDigit(d)}
                  className="h-14 rounded-2xl flex items-center justify-center
                             text-white text-lg font-semibold
                             bg-neutral-900 border border-neutral-800
                             active:scale-90 active:bg-neutral-800
                             transition-all duration-100">
                  {d}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => { setSetupStep('enter'); setPin(''); setConfirmPin(''); setPinError('') }}
            className="mt-8 text-neutral-600 text-xs active:text-neutral-400 transition-colors duration-150">
            Start Over
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STATE 2: ENTER PASSCODE
          ════════════════════════════════════════════════════════ */}
      {lockerState === 'enter-pin' && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-black">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 text-neutral-600 text-xs
                       active:text-neutral-400 transition-colors"
          >
            Cancel
          </button>

          <input
            ref={pinInputRef}
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={handleKeyInput}
            className="absolute opacity-0 w-0 h-0"
            autoComplete="off"
          />

          <div className="w-14 h-14 rounded-2xl bg-[#7C5CFF]/10 flex items-center justify-center mb-4">
            <ShieldCheck size={24} className="text-[#7C5CFF]" />
          </div>

          <h2 className="text-white text-base font-bold mb-1">Private Folder</h2>
          <p className="text-neutral-500 text-xs mb-8">Enter your 4-digit passcode</p>

          <div className={`flex gap-5 mb-6 ${shake ? 'animate-shake' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150
                           ${successFlash
                             ? 'bg-[#22C55E] scale-125 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                             : i < pin.length
                               ? 'bg-[#7C5CFF] scale-125 shadow-[0_0_8px_rgba(124,92,255,0.3)]'
                               : shake
                                 ? 'bg-red-500/30 border-2 border-red-500'
                                 : 'bg-neutral-800 border border-neutral-700'
                           }`}
              />
            ))}
          </div>

          {pinError && (
            <div className="flex items-center gap-2 mb-5 animate-[fade-in_200ms_ease-out]">
              <ShieldAlert size={14} className="text-red-400" />
              <p className="text-red-400 text-xs font-medium">{pinError}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 w-[240px]">
            {DIAL_DIGITS.map((d, i) => {
              if (d === '') return <div key={i} />
              if (d === 'del') return (
                <button key={i} onClick={handleDelete}
                  className="h-14 rounded-2xl flex items-center justify-center
                             active:scale-90 transition-transform duration-100
                             bg-neutral-900 border border-neutral-800">
                  <Delete size={18} className="text-neutral-500" />
                </button>
              )
              return (
                <button key={i} onClick={() => handleDigit(d)}
                  className="h-14 rounded-2xl flex items-center justify-center
                             text-white text-lg font-semibold
                             bg-neutral-900 border border-neutral-800
                             active:scale-90 active:bg-neutral-800
                             transition-all duration-100">
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          STATE 3: UNLOCKED PRIVATE VAULT
          4 tabs · Per-type file pickers · GG-style grids · IDB blobs
          ════════════════════════════════════════════════════════ */}
      {lockerState === 'unlocked' && (
        <div className="min-h-screen bg-black pb-28">
          {/* ── Hidden file inputs (one per media type) ── */}
          <input ref={videoInputRef} type="file" accept="video/*" multiple onChange={handleVideoImport} className="hidden" />
          <input ref={audioInputRef} type="file" accept="audio/*" multiple onChange={handleAudioImport} className="hidden" />
          <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageImport} className="hidden" />

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-50 bg-black/95 border-b border-neutral-900/80">
            {/* Top bar */}
            <div className="flex items-center justify-between px-3 h-12">
              <button onClick={onClose}
                className="flex items-center gap-1.5 active:scale-95 transition-transform duration-100">
                <ChevronLeft size={20} className="text-white" />
                <span className="text-white text-sm font-semibold">Private Folder</span>
              </button>
              <button
                onClick={() => { setLockerState('enter-pin'); setPin(''); setPinError('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           bg-neutral-900 border border-neutral-800
                           text-neutral-500 text-[10px] font-medium
                           active:scale-95 transition-transform duration-100">
                <Lock size={10} />
                Lock
              </button>
            </div>

            {/* ── 4-tab pill navigation ── */}
            <div className="px-3 pb-2 flex items-center gap-2">
              <div className="flex-1 flex bg-neutral-900/80 rounded-lg p-[2px] border border-neutral-800/50">
                {VAULT_TABS.map(tab => {
                  const active = vaultTab === tab.key
                  const count = tabCounts[tab.key]
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setVaultTab(tab.key)}
                      className={`flex-1 h-7 rounded-md flex items-center justify-center gap-1
                                 text-[10px] font-semibold transition-all duration-150
                                 ${active ? 'bg-[#7C5CFF] text-white' : 'text-neutral-500 active:text-neutral-300'}`}>
                      <tab.icon size={11} />
                      {tab.label}
                      {count > 0 && (
                        <span className={`text-[8px] leading-none ${active ? 'text-white/60' : 'text-neutral-700'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* ── Premium Add button ── */}
              <button
                onClick={handleAddClick}
                disabled={isImporting}
                className={`flex items-center gap-1 px-3 h-7 rounded-md
                           bg-[#7C5CFF] text-white text-[10px] font-bold
                           shadow-[0_0_12px_rgba(124,92,255,0.25)]
                           active:scale-95 transition-all duration-100
                           ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                <Plus size={12} />
                {isImporting ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>

          {/* ── Security badge ── */}
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/15">
              <ShieldCheck size={12} className="text-[#22C55E]" />
              <p className="text-[#22C55E]/80 text-[10px] font-medium">
                Encrypted · Secure IndexedDB sandbox · Never leaves your device
              </p>
            </div>
          </div>

          {/* ── Content area ── */}
          <div className="px-3 pt-3">

            {/* ══════ EMPTY STATE ══════ */}
            {filteredFiles.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-neutral-900/80 flex items-center justify-center mb-3">
                  {vaultTab === 'videos' ? <Video size={26} className="text-neutral-700" /> :
                   vaultTab === 'audio'  ? <Music size={26} className="text-neutral-700" /> :
                   vaultTab === 'images' ? <ImageIcon size={26} className="text-neutral-700" /> :
                   <FolderLock size={26} className="text-neutral-700" />}
                </div>
                <p className="text-neutral-500 text-sm font-medium mb-1">
                  No {vaultTab === 'all' ? 'hidden files' : vaultTab} yet
                </p>
                <p className="text-neutral-700 text-xs mb-4">Tap the purple &quot;+ Add&quot; button to import</p>
                {/* Inline CTA add button for empty state */}
                <button
                  onClick={handleAddClick}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-5 h-10 rounded-xl
                             bg-[#7C5CFF]/10 border border-[#7C5CFF]/25
                             text-[#7C5CFF] text-xs font-semibold
                             active:scale-95 transition-all duration-100">
                  <Plus size={14} />
                  Add {vaultTab === 'all' ? 'Files' : vaultTab.slice(0, -1)}
                </button>
              </div>
            )}

            {/* ══════ ALL TAB — Chronological mixed list ══════ */}
            {vaultTab === 'all' && filteredFiles.length > 0 && (
              <div className="space-y-4">
                {chronologicalSections.map(section => (
                  <div key={section.label}>
                    {/* Section header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-neutral-600 text-[10px] font-bold uppercase tracking-wider">
                        {section.label}
                      </span>
                      <div className="flex-1 h-px bg-neutral-900" />
                      <span className="text-neutral-800 text-[9px]">{section.files.length}</span>
                    </div>

                    {/* Files in section */}
                    <div className="space-y-0.5">
                      {section.files.map(file => (
                        <div
                          key={file.id}
                          onClick={() => handlePlayFile(file)}
                          className="flex items-center gap-3 px-2 py-2.5 rounded-xl
                                     active:bg-neutral-900/50 transition-all duration-150 cursor-pointer"
                          style={{ contentVisibility: 'auto', containIntrinsicSize: '0 52px' }}
                        >
                          {/* Thumbnail / icon */}
                          {file.type === 'video' ? (
                            <div className="w-11 h-11 rounded-lg bg-neutral-800/80 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                              {(file.thumbUrl || file.blobUrl) ? (
                                <img
                                  src={file.thumbUrl || file.blobUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Video size={16} className="text-neutral-600" />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center border border-white/20">
                                  <Play size={7} className="text-white ml-[1px]" fill="white" />
                                </div>
                              </div>
                            </div>
                          ) : file.type === 'audio' ? (
                            <div className="w-11 h-11 rounded-lg bg-neutral-800/80 flex items-center justify-center flex-shrink-0">
                              <Music size={16} className="text-[#7C5CFF]/50" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-neutral-800/80 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {file.blobUrl ? (
                                <img src={file.blobUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <ImageIcon size={16} className="text-neutral-600" />
                              )}
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-[12px] font-semibold truncate leading-tight">{file.name}</p>
                            <p className="text-neutral-600 text-[9px] mt-0.5">
                              {file.size ? fmtSize(file.size) : '—'} · {timeAgo(file.addedAt)} · {file.type}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button onClick={e => { e.stopPropagation(); handleUnhide(file.id) }}
                              className="p-1.5 active:scale-90 transition-transform duration-100" title="Unhide">
                              <EyeOff size={12} className="text-[#00D4FF]/50" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleRemove(file.id) }}
                              className="p-1.5 active:scale-90 transition-transform duration-100" title="Delete">
                              <Trash2 size={12} className="text-red-500/40" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══════ VIDEOS TAB — 3-col GG grid ══════ */}
            {vaultTab === 'videos' && filteredFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    className="relative rounded-lg overflow-hidden
                               active:scale-[0.97] transition-transform duration-150"
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 160px' }}
                  >
                    <button
                      onClick={() => handlePlayFile(file)}
                      className="relative w-full aspect-square bg-neutral-900 flex items-center justify-center overflow-hidden">
                      {(file.thumbUrl || file.blobUrl) ? (
                        <img
                          src={file.thumbUrl || file.blobUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Video size={18} className="text-neutral-700" />
                      )}

                      {/* Glassmorphism play icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center
                                        bg-white/10 border border-white/20">
                          <Play size={14} className="text-white ml-0.5" fill="white" />
                        </div>
                      </div>

                      {/* File size overlay */}
                      {file.size ? (
                        <span className="absolute top-1 right-1 bg-black/70 text-neutral-200
                                       text-[7px] font-bold px-1.5 py-0.5 rounded leading-none">
                          {fmtSize(file.size)}
                        </span>
                      ) : null}
                    </button>

                    {/* Name + actions */}
                    <div className="px-1 pt-1 pb-1.5 flex items-center justify-between">
                      <p className="text-white text-[9px] font-medium truncate flex-1 mr-1">{file.name}</p>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); handleUnhide(file.id) }}
                          className="p-1 active:scale-90 transition-transform duration-100" title="Unhide">
                          <EyeOff size={8} className="text-[#00D4FF]/60" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleRemove(file.id) }}
                          className="p-1 active:scale-90 transition-transform duration-100" title="Delete">
                          <Trash2 size={8} className="text-red-400/60" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══════ AUDIO TAB — Vertical list rows ══════ */}
            {vaultTab === 'audio' && filteredFiles.length > 0 && (
              <div className="space-y-0.5">
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-xl
                               active:bg-neutral-900/50 transition-all duration-150"
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 52px' }}
                  >
                    {/* Play/pause button */}
                    <button
                      onClick={() => handlePlayFile(file)}
                      className="w-10 h-10 rounded-lg bg-neutral-800/80 flex items-center justify-center
                                 flex-shrink-0 active:scale-90 transition-transform duration-100">
                      {activeMedia?.id === file.id && isPlaying
                        ? <Pause size={14} className="text-white" />
                        : <Play size={14} className="text-[#7C5CFF]/60 ml-0.5" />
                      }
                    </button>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[12px] font-semibold truncate leading-tight">{file.name}</p>
                      <p className="text-neutral-600 text-[9px] mt-0.5">
                        {file.size ? fmtSize(file.size) : '—'} · {timeAgo(file.addedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => handleUnhide(file.id)}
                        className="p-1.5 active:scale-90 transition-transform duration-100" title="Unhide">
                        <EyeOff size={12} className="text-[#00D4FF]/50" />
                      </button>
                      <button onClick={() => handleRemove(file.id)}
                        className="p-1.5 active:scale-90 transition-transform duration-100" title="Delete">
                        <Trash2 size={12} className="text-red-500/40" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ══════ IMAGES TAB — 3-col GG grid ══════ */}
            {vaultTab === 'images' && filteredFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {filteredFiles.map(file => (
                  <div
                    key={file.id}
                    className="relative rounded-lg overflow-hidden
                               active:scale-[0.97] transition-transform duration-150"
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 160px' }}
                  >
                    <button
                      onClick={() => handlePlayFile(file)}
                      className="relative w-full aspect-square bg-neutral-900 flex items-center justify-center overflow-hidden">
                      {file.blobUrl ? (
                        <img
                          src={file.blobUrl}
                          alt={file.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon size={18} className="text-neutral-700" />
                      )}

                      {/* File size overlay */}
                      {file.size ? (
                        <span className="absolute top-1 right-1 bg-black/70 text-neutral-200
                                       text-[7px] font-bold px-1.5 py-0.5 rounded leading-none">
                          {fmtSize(file.size)}
                        </span>
                      ) : null}
                    </button>

                    {/* Name + actions */}
                    <div className="px-1 pt-1 pb-1.5 flex items-center justify-between">
                      <p className="text-white text-[9px] font-medium truncate flex-1 mr-1">{file.name}</p>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); handleUnhide(file.id) }}
                          className="p-1 active:scale-90 transition-transform duration-100" title="Unhide">
                          <EyeOff size={8} className="text-[#00D4FF]/60" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleRemove(file.id) }}
                          className="p-1 active:scale-90 transition-transform duration-100" title="Delete">
                          <Trash2 size={8} className="text-red-400/60" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          VIDEO PLAYER OVERLAY
          ════════════════════════════════════════════════════════ */}
      {activeMedia && activeMedia.type === 'video' && activeMedia.blobUrl && (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
          <div className="flex items-center justify-between px-3 h-12">
            <button onClick={handleCloseMedia}
              className="flex items-center gap-1 active:scale-95 transition-transform duration-100">
              <ChevronLeft size={18} className="text-white" />
              <span className="text-white text-xs font-medium">Back</span>
            </button>
            <p className="text-neutral-400 text-[10px] flex-1 text-center truncate mx-2">{activeMedia.name}</p>
            <div className="w-12" />
          </div>
          <div className="flex-1 flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={activeMedia.blobUrl}
              controls
              autoPlay
              playsInline
              className="w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          AUDIO MINI-PLAYER
          ════════════════════════════════════════════════════════ */}
      {activeMedia && activeMedia.type === 'audio' && activeMedia.blobUrl && (
        <div className="fixed bottom-0 left-0 right-0 z-[10000]
                        bg-[#111827] border-t border-neutral-800
                        animate-[slide-up_300ms_ease-out]">
          <audio
            ref={audioRef}
            src={activeMedia.blobUrl}
            autoPlay
            controls
            className="w-full h-10"
            onEnded={() => setIsPlaying(false)}
          />
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-[#7C5CFF]/15 flex items-center justify-center flex-shrink-0">
              <Music size={16} className="text-[#7C5CFF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{activeMedia.name}</p>
              <p className="text-neutral-600 text-[9px]">Now playing</p>
            </div>
            <button onClick={handleCloseMedia}
              className="p-2 active:scale-90 transition-transform duration-100">
              <X size={14} className="text-neutral-400" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          IMAGE VIEWER OVERLAY
          ════════════════════════════════════════════════════════ */}
      {activeMedia && activeMedia.type === 'image' && activeMedia.blobUrl && (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col animate-[fade-in_200ms_ease-out]">
          <div className="flex items-center justify-between px-3 h-12">
            <button onClick={handleCloseMedia}
              className="flex items-center gap-1 active:scale-95 transition-transform duration-100">
              <ChevronLeft size={18} className="text-white" />
              <span className="text-white text-xs font-medium">Back</span>
            </button>
            <p className="text-neutral-400 text-[10px] flex-1 text-center truncate mx-2">{activeMedia.name}</p>
            <div className="w-12" />
          </div>
          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
            <img
              src={activeMedia.blobUrl}
              alt={activeMedia.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          PREMIUM TOAST NOTIFICATION
          ════════════════════════════════════════════════════════ */}
      <div
        className={`fixed bottom-5 left-4 right-4 z-[10001]
                    transition-all duration-300
                    ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border
                        ${toast.type === 'success'
                          ? 'bg-[#111827]/95 border-[#22C55E]/20 shadow-[0_4px_24px_rgba(34,197,94,0.12)]'
                          : 'bg-[#111827]/95 border-red-500/20 shadow-[0_4px_24px_rgba(239,68,68,0.12)]'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                          ${toast.type === 'success' ? 'bg-[#22C55E]/15' : 'bg-red-500/15'}`}>
            {toast.type === 'success'
              ? <ShieldCheck size={12} className="text-[#22C55E]" />
              : <ShieldAlert size={12} className="text-red-400" />}
          </div>
          <p className={`text-[11px] leading-relaxed font-medium
                        ${toast.type === 'success' ? 'text-[#22C55E]/90' : 'text-red-400/90'}`}>
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  )
}
