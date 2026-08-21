'use client'

// ── Play Nexa Safe Folder Modal ─────────────────────────────
// Full-screen overlay with PIN gate + encrypted file list
// AMOLED black · XOR-encrypted localStorage
// Zero-delay PIN dial · Add/Remove items

import { useState, useCallback } from 'react'
import {
  Shield, Lock, FolderLock, Plus,
  Trash2, Video, Music, FileText, Image as ImageIcon,
  MoreVertical, FolderOpen, X
} from 'lucide-react'
import PinDial from './PinDial'
import {
  hasPin, setPin, verifyPin,
  loadSafeEntries, addToSafe, removeFromSafe,
  type SafeEntry, safeId
} from '@/lib/safe-store'

type SafeState = 'locked' | 'setup' | 'unlocked'

interface SafeFolderModalProps {
  onClose: () => void
  initialItem?: { name: string; type: SafeEntry['type']; size?: number } | null
}

export default function SafeFolderModal({ onClose, initialItem }: SafeFolderModalProps) {
  const [state, setState]       = useState<SafeState>(hasPin() ? 'locked' : 'setup')
  const [pin, setPinValue]     = useState('')
  const [error, setError]      = useState('')
  const [entries, setEntries]  = useState<SafeEntry[]>([])
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [addMode, setAddMode]  = useState(false)

  // ── Setup new PIN ──
  const handleSetupPin = useCallback((newPin: string) => {
    setPin(newPin)
    setPinValue(newPin)
    setState('unlocked')
    // Add initial item if passed
    if (initialItem) {
      const entry: SafeEntry = {
        id: safeId(),
        name: initialItem.name,
        type: initialItem.type,
        addedAt: Date.now(),
        size: initialItem.size,
      }
      const entries = addToSafe(entry, newPin)
      setEntries(entries)
    } else {
      setEntries([])
    }
    setError('')
  }, [initialItem])

  // ── Unlock ──
  const handleUnlock = useCallback((enteredPin: string) => {
    if (verifyPin(enteredPin)) {
      setPinValue(enteredPin)
      const loaded = loadSafeEntries(enteredPin)
      // Add initial item if passed
      if (initialItem) {
        const entry: SafeEntry = {
          id: safeId(),
          name: initialItem.name,
          type: initialItem.type,
          addedAt: Date.now(),
          size: initialItem.size,
        }
        const updated = addToSafe(entry, enteredPin)
        setEntries(updated)
      } else {
        setEntries(loaded)
      }
      setState('unlocked')
      setError('')
    } else {
      setError('Incorrect PIN. Try again.')
    }
  }, [initialItem])

  // ── Add entry ──
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
    setMenuOpen(null)
  }, [pin])

  // ── Icon for type ──
  const typeIcon = (type: SafeEntry['type']) => {
    switch (type) {
      case 'video': return <Video size={15} className="text-red-400" />
      case 'audio': return <Music size={15} className="text-[#00D4FF]" />
      case 'image': return <ImageIcon size={15} className="text-green-400" />
      case 'document': return <FileText size={15} className="text-yellow-400" />
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Close button (unlocked only) */}
      {state === 'unlocked' && (
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full
                     bg-neutral-900 border border-neutral-800
                     flex items-center justify-center
                     active:scale-90 transition-transform duration-100"
        >
          <X size={18} className="text-neutral-400" />
        </button>
      )}

      {/* LOCKED STATE */}
      {state === 'locked' && (
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 text-neutral-600 text-xs
                       active:text-neutral-400 transition-colors"
          >
            Cancel
          </button>
          <PinDial
            title="Safe Folder"
            subtitle="Enter your 4-digit PIN to unlock"
            onComplete={handleUnlock}
            error={error}
          />
        </div>
      )}

      {/* SETUP STATE */}
      {state === 'setup' && (
        <PinDial
          title="Create PIN"
          subtitle="Set a 4-digit PIN to protect your safe folder"
          onComplete={handleSetupPin}
        />
      )}

      {/* UNLOCKED STATE */}
      {state === 'unlocked' && (
        <div className="pt-16 px-4 pb-24 space-y-4 overflow-y-auto h-full">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#7C5CFF]/10 flex items-center justify-center">
              <FolderLock size={22} className="text-[#7C5CFF]" />
            </div>
            <div>
              <p className="text-white text-base font-bold">Safe Folder</p>
              <p className="text-neutral-500 text-[10px]">
                {entries.length} item{entries.length !== 1 ? 's' : ''} · End-to-end encrypted
              </p>
            </div>
            <button
              onClick={() => { setState('locked'); setPinValue(''); setError('') }}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl
                         bg-neutral-900 border border-neutral-800
                         text-neutral-500 text-xs font-medium
                         active:scale-95 transition-transform duration-100"
            >
              <Lock size={11} />
              Lock
            </button>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/15">
            <Shield size={12} className="text-[#22C55E]" />
            <p className="text-[#22C55E]/80 text-[10px] font-medium">
              Client-side encrypted · Never leaves your device
            </p>
          </div>

          {/* Add button */}
          {!addMode ? (
            <button
              onClick={() => setAddMode(true)}
              className="w-full h-12 rounded-2xl border-2 border-dashed border-neutral-700
                         flex items-center justify-center gap-2
                         text-[#7C5CFF] text-xs font-semibold
                         active:scale-[0.98] active:bg-white/5
                         transition-all duration-150"
            >
              <Plus size={16} />
              Add Private Item
            </button>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 space-y-2">
              <p className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold mb-2">
                Select type
              </p>
              {(['video', 'audio', 'image', 'document'] as SafeEntry['type'][]).map(type => (
                <button
                  key={type}
                  onClick={() => handleAdd(type)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl
                             bg-black border border-neutral-800
                             text-white text-sm font-medium
                             active:scale-[0.98] transition-transform duration-150"
                >
                  {typeIcon(type)}
                  <span className="capitalize">{type}</span>
                </button>
              ))}
              <button
                onClick={() => setAddMode(false)}
                className="w-full text-neutral-600 text-xs text-center py-2
                           active:text-neutral-400 transition-colors duration-150"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Empty */}
          {entries.length === 0 && !addMode && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 flex items-center justify-center mb-3">
                <FolderOpen size={24} className="text-neutral-700" />
              </div>
              <p className="text-neutral-600 text-sm font-medium">Safe is empty</p>
            </div>
          )}

          {/* Entries */}
          {entries.length > 0 && (
            <div className="space-y-2">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl
                             bg-neutral-900 border border-neutral-800
                             active:scale-[0.99] transition-transform duration-150"
                >
                  <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                    {typeIcon(entry.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{entry.name}</p>
                    <p className="text-neutral-600 text-[10px]">
                      {new Date(entry.addedAt).toLocaleDateString()} · {entry.type}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(menuOpen === entry.id ? null : entry.id)
                    }}
                    className="p-2 active:scale-90 transition-transform duration-100"
                  >
                    <MoreVertical size={14} className="text-neutral-600" />
                  </button>
                  {menuOpen === entry.id && (
                    <div className="absolute right-8 z-20 min-w-[120px]
                                    bg-neutral-900 border border-neutral-700 rounded-xl
                                    overflow-hidden shadow-lg shadow-black/60
                                    animate-[fade-in_100ms_ease-out]">
                      <button
                        onClick={() => handleRemove(entry.id)}
                        className="flex items-center gap-2 px-4 py-3 text-red-400 text-xs
                                   font-medium w-full active:bg-neutral-800 transition-colors duration-100"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
