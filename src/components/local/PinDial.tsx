'use client'

// ── Play Nexa PIN Dial Pad ──────────────────────────────────
// AMOLED dark premium 4-digit PIN entry
// Zero-delay haptic-style visual feedback · Shake on error
// Hidden <input type="tel"> for native keyboard support

import { useState, useCallback, useRef, useEffect } from 'react'
import { Lock, Delete, ShieldAlert } from 'lucide-react'

interface PinDialProps {
  title: string
  subtitle: string
  onComplete: (pin: string) => void
  error?: string
  onBack?: () => void
}

export default function PinDial({ title, subtitle, onComplete, error, onBack }: PinDialProps) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (error) {
      setShake(true)
      setPin('')
      const t = setTimeout(() => setShake(false), 500)
      return () => clearTimeout(t)
    }
  }, [error])

  const handleDigit = useCallback((d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      setTimeout(() => onComplete(next), 120)
    }
  }, [pin, onComplete])

  const handleDelete = useCallback(() => {
    setPin(p => p.slice(0, -1))
  }, [])

  const handleKeyInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(val)
    if (val.length === 4) {
      setTimeout(() => onComplete(val), 120)
    }
  }, [onComplete])

  const digits = ['1','2','3','4','5','6','7','8','9','','0','del']

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-6 bg-black">
      {/* Hidden input for keyboard PIN entry */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={handleKeyInput}
        className="absolute opacity-0 w-0 h-0"
        autoComplete="off"
      />

      {/* Lock icon */}
      <div className="w-16 h-16 rounded-2xl bg-[#7C5CFF]/10 flex items-center justify-center mb-4">
        <Lock size={28} className="text-[#7C5CFF]" />
      </div>

      {/* Title */}
      <h2 className="text-white text-lg font-bold mb-1">{title}</h2>
      <p className="text-neutral-500 text-xs mb-8 text-center">{subtitle}</p>

      {/* PIN Dots */}
      <div className={`flex gap-5 mb-6 ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full transition-all duration-120
                       ${i < pin.length
                         ? 'bg-[#7C5CFF] scale-125'
                         : 'bg-neutral-800 border border-neutral-700'
                       }`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mb-5 animate-[fade-in_200ms_ease-out]">
          <ShieldAlert size={14} className="text-red-400" />
          <p className="text-red-400 text-xs font-medium">{error}</p>
        </div>
      )}

      {/* Dial Pad */}
      <div className="grid grid-cols-3 gap-3 w-[240px]">
        {digits.map((d, i) => {
          if (d === '') return <div key={i} />
          if (d === 'del') {
            return (
              <button
                key={i}
                onClick={handleDelete}
                className="h-14 rounded-2xl flex items-center justify-center
                           active:scale-90 transition-transform duration-100
                           bg-neutral-900 border border-neutral-800"
              >
                <Delete size={18} className="text-neutral-500" />
              </button>
            )
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              className="h-14 rounded-2xl flex items-center justify-center
                         text-white text-lg font-semibold
                         bg-neutral-900 border border-neutral-800
                         active:scale-90 active:bg-neutral-800
                         transition-all duration-100"
            >
              {d}
            </button>
          )
        })}
      </div>

      {/* Back link */}
      {onBack && (
        <button
          onClick={onBack}
          className="mt-8 text-neutral-600 text-xs active:text-neutral-400
                     transition-colors duration-150"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
