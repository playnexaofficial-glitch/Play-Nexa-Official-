'use client'

// ── Play Nexa Safe Folder ───────────────────────────────────
// PIN-protected private folder with encrypted localStorage
// XOR + Base64 encryption — zero dependencies, 2GB RAM safe
// Premium dial-pad UI with zero-delay feedback

import { useState, useCallback } from 'react'
import {
  Shield, Lock, FolderLock, Plus,
  Trash2, Video, Music, FileText, Image as ImageIcon,
  MoreVertical, FolderOpen
} from 'lucide-react'
import PinDial from './PinDial'
import {
  hasPin, setPin, verifyPin,
  loadSafeEntries, addToSafe, removeFromSafe,
  type SafeEntry, safeId
} from '@/lib/safe-store'

type SafeState = 'locked' | 'setup' | 'unlocked'

export default function SafeFolder() {
  const [state, setState]       = useState<SafeState>(hasPin() ? 'locked' : 'setup')
  const [pin, setPinValue]     = useState('')
  const [error, setError]      = useState('')
  const [entries, setEntries]  = useState<SafeEntry[]>([])
  const [contextMenu, setContextMenu] = useState<string | null>(null)
  const [addMode, setAddMode]  = useState(false)

  // ── Setup new PIN ──
  const handleSetupPin = useCallback((newPin: string) => {
    setPin(newPin)
    setPinValue(newPin)
    setState('unlocked')
    setEntries([])
    setError('')
  }, [])

  // ── Unlock with existing PIN ──
  const handleUnlock = useCallback((enteredPin: string) => {
    if (verifyPin(enteredPin)) {
      setPinValue(enteredPin)
      const loaded = loadSafeEntries(enteredPin)
      setEntries(loaded)
      setState('unlocked')
      setError('')
    } else {
      setError('Incorrect PIN. Try again.')
    }
  }, [])

  // ── Lock the folder ──
  const handleLock = useCallback(() => {
    setState('locked')
    setPinValue('')
    setEntries([])
    setError('')
    setAddMode(false)
  }, [])

  // ── Add entry to safe ──
  const handleAdd = useCallback((type: SafeEntry['type']) => {
    if (!pin) return
    const entry: SafeEntry = {
      id: safeId(),
      name: `Private ${type} ${entries.length + 1}`,
      type,
      addedAt: Date.now(),
    }
    const updated = addToSafe(entry, pin)
    setEntries(updated)
    setAddMode(false)
  }, [pin, entries.length])

  // ── Remove entry ──
  const handleRemove = useCallback((id: string) => {
    if (!pin) return
    const updated = removeFromSafe(id, pin)
    setEntries(updated)
    setContextMenu(null)
  }, [pin])

  // ── Icon for entry type ──
  const typeIcon = (type: SafeEntry['type']) => {
    switch (type) {
      case 'video': return <Video size={16} className="text-red-400" />
      case 'audio': return <Music size={16} className="text-[#00D4FF]" />
      case 'image': return <ImageIcon size={16} className="text-green-400" />
      case 'document': return <FileText size={16} className="text-yellow-400" />
    }
  }

  return (
    <div className="space-y-4">
      {/* ── LOCKED STATE: Show PIN dial ── */}
      {state === 'locked' && (
        <PinDial
          title="Safe Folder"
          subtitle="Enter your 4-digit PIN to unlock"
          onComplete={handleUnlock}
          error={error}
          onBack={handleLock}
        />
      )}

      {/* ── SETUP STATE: First time PIN creation ── */}
      {state === 'setup' && (
        <PinDial
          title="Create PIN"
          subtitle="Set a 4-digit PIN to protect your safe folder"
          onComplete={handleSetupPin}
          onBack={() => {}}
        />
      )}

      {/* ── UNLOCKED STATE: Show contents ── */}
      {state === 'unlocked' && (
        <>
          {/* Header with lock button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7C5CFF]/15 flex items-center justify-center">
                <FolderLock size={20} className="text-[#7C5CFF]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Safe Folder</p>
                <p className="text-[#94A3B8] text-[10px]">
                  {entries.length} item{entries.length !== 1 ? 's' : ''} · Encrypted
                </p>
              </div>
            </div>
            <button
              onClick={handleLock}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl
                         bg-[#111827] border border-[#1E293B]
                         text-[#94A3B8] text-xs font-medium
                         active:scale-95 transition-transform duration-100"
            >
              <Lock size={12} />
              Lock
            </button>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20">
            <Shield size={12} className="text-[#22C55E]" />
            <p className="text-[#22C55E] text-[10px] font-medium">
              End-to-end encrypted · Client-side only
            </p>
          </div>

          {/* Add button */}
          {!addMode ? (
            <button
              onClick={() => setAddMode(true)}
              className="w-full h-14 rounded-2xl border-2 border-dashed border-[#7C5CFF]/40
                         flex items-center justify-center gap-3
                         text-[#7C5CFF] text-sm font-semibold
                         active:scale-[0.98] active:bg-[#7C5CFF]/5
                         transition-all duration-150"
            >
              <Plus size={20} />
              Add Private Item
            </button>
          ) : (
            <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4 space-y-3">
              <p className="text-white text-xs font-semibold mb-2">Select type to add:</p>
              {(['video', 'audio', 'image', 'document'] as SafeEntry['type'][]).map(type => (
                <button
                  key={type}
                  onClick={() => handleAdd(type)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl
                             bg-[#0F172A] border border-[#1E293B]
                             text-white text-sm font-medium
                             active:scale-[0.98] transition-transform duration-150"
                >
                  {typeIcon(type)}
                  <span className="capitalize">{type}</span>
                </button>
              ))}
              <button
                onClick={() => setAddMode(false)}
                className="w-full text-[#94A3B8] text-xs text-center py-2
                           active:text-white transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Empty state */}
          {entries.length === 0 && !addMode && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-[#111827] flex items-center justify-center mb-3">
                <FolderOpen size={24} className="text-[#94A3B8]" />
              </div>
              <p className="text-[#94A3B8] text-sm font-medium mb-1">Safe is empty</p>
              <p className="text-[#94A3B8]/50 text-xs">Add items to keep them private</p>
            </div>
          )}

          {/* Entries list */}
          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl
                             bg-[#111827] border border-[#1E293B]
                             active:scale-[0.98] transition-transform duration-150"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#1E293B] flex items-center justify-center flex-shrink-0">
                    {typeIcon(entry.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{entry.name}</p>
                    <p className="text-[#94A3B8] text-[10px]">
                      {new Date(entry.addedAt).toLocaleDateString()} · {entry.type}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setContextMenu(contextMenu === entry.id ? null : entry.id)
                    }}
                    className="p-2 active:scale-90 transition-transform duration-100"
                  >
                    <MoreVertical size={14} className="text-[#94A3B8]" />
                  </button>

                  {/* Delete dropdown */}
                  {contextMenu === entry.id && (
                    <div className="absolute right-12 z-20
                                    bg-[#1E293B] border border-[#334155] rounded-xl
                                    overflow-hidden shadow-lg animate-[fade-in_100ms_ease-out]">
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="flex items-center gap-2 px-4 py-3 text-red-400 text-xs
                                   font-medium w-full active:bg-[#334155] transition-colors duration-100"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
