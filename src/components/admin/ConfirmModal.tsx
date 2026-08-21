// ── Play Nexa Admin — Confirm Modal ───────────────────────────
// Two modes: normal (purple confirm) + danger (red, requires typing DELETE)
// AMOLED dark theme, 44px touch targets, max 200ms transitions

'use client'

import { useState } from 'react'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  const [deleteText, setDeleteText] = useState('')
  const canConfirm = danger ? deleteText === 'DELETE' : true

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0F0F0F] border border-[#242424] rounded-2xl p-6">
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
        <p className="text-[#9CA3AF] text-sm mb-5">{message}</p>

        {danger && (
          <div className="mb-4">
            <p className="text-[#9CA3AF] text-xs mb-2">
              Type <span className="text-[#EF4444] font-bold">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              className="w-full h-11 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-white text-sm outline-none focus:border-[#EF4444] transition-colors duration-150"
              placeholder="DELETE"
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border border-[#2D2D2D] text-[#9CA3AF] text-sm font-medium min-h-[44px] transition-colors duration-150 hover:bg-[#1A1A1A]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`flex-1 h-12 rounded-xl text-white text-sm font-semibold min-h-[44px] transition-all duration-150 disabled:opacity-40 ${
              danger
                ? 'bg-[#EF4444] hover:bg-[#DC2626]'
                : 'bg-[#7C3AED] hover:bg-[#6D28D9]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
