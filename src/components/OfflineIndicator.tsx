// /components/OfflineIndicator.tsx
// Shows a fixed banner when user goes offline
// Auto-hides 2s after coming back online

'use client'

import { useEffect, useState } from 'react'

type OfflineState = 'online' | 'offline' | 'back-online'

export default function OfflineIndicator() {
  const [state, setState] = useState<OfflineState>('online')

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Set initial state
    setState(navigator.onLine ? 'online' : 'offline')

    const handleOffline = () => setState('offline')
    const handleOnline = () => {
      setState('back-online')
      // Auto-hide after 2 seconds
      setTimeout(() => setState('online'), 2000)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Don't render anything when online
  if (state === 'online') return null

  const isOffline = state === 'offline'

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[10000]
                 h-8 flex items-center justify-center
                 text-white text-xs font-medium
                 transition-transform duration-200 ease-out"
      style={{
        backgroundColor: isOffline ? '#ef4444' : '#22c55e',
        transform: state === 'online' ? 'translateY(-100%)' : 'translateY(0)',
      }}
    >
      {isOffline ? (
        <span>📡 You&apos;re offline — cached content still available</span>
      ) : (
        <span>✅ Back online</span>
      )}
    </div>
  )
}
