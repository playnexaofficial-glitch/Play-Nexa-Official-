// ── Play Nexa Admin — Toast Notification System ───────────────
// Success (green), Error (red), Info (blue)
// Auto-dismiss 3s, stack multiple, slide-up animation
// No backdrop-blur, no styled-jsx

'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export const useToast = () => useContext(ToastContext)

const TYPE_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#0A2618', border: '#10B981', icon: '✓' },
  error: { bg: '#2A0A0A', border: '#EF4444', icon: '✕' },
  info: { bg: '#0A1A2A', border: '#3B82F6', icon: 'ℹ' },
}

const ANIM_STYLE = `
@keyframes pnaToastIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.pna-toast-in { animation: pnaToastIn 150ms ease-out forwards; }
`

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <style dangerouslySetInnerHTML={{ __html: ANIM_STYLE }} />
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => {
          const colors = TYPE_COLORS[toast.type]
          return (
            <div
              key={toast.id}
              className="pna-toast-in pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{ backgroundColor: colors.bg, borderColor: colors.border + '44' }}
            >
              <span className="text-base font-bold flex-shrink-0" style={{ color: colors.border }}>
                {colors.icon}
              </span>
              <span className="text-white text-sm flex-1">{toast.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
