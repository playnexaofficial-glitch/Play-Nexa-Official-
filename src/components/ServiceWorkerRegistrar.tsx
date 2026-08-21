// /components/ServiceWorkerRegistrar.tsx
// Registers Play Nexa service worker in production only
// Must be a client component — runs only in browser

'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Check for updates on load
        reg.update()

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'activated' &&
                navigator.serviceWorker.controller
              ) {
                // New SW activated — could notify user to reload
              }
            })
          }
        })
      })
      .catch(() => {
        // Silent fail — SW registration is non-critical
      })
  }, [])

  return null
}
