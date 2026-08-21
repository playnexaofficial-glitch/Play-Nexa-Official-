'use client'

// ── Play Nexa Disguise Mode Context ──────────────────────────
// 100% PRODUCTION — Robust persistence + hidden pool interceptor
// Saves isCamouflageEnabled to localStorage with verification
// Provides interceptAppLaunch() for Hidden Pool enforcement
// APK/Capacitor safe · 2GB RAM optimized

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode
} from 'react'
import { isDisguiseActive, setDisguiseActive } from '@/lib/app-lock-store'
import { idbGetHiddenPoolNames } from '@/lib/security-idb'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface DisguiseContextValue {
  /** Whether the app is currently showing the Calculator disguise */
  disguised: boolean
  /** Activate Calculator camouflage — hides Play Nexa behind a calculator */
  activateDisguise: () => void
  /** Deactivate Calculator camouflage — reveals Play Nexa */
  deactivateDisguise: () => void
  /**
   * Check if an app launch should be intercepted.
   * If the app is in the Hidden Pool, force-reroutes to Calculator.
   * Returns true if the app was intercepted (and disguise was activated).
   */
  interceptAppLaunch: (packageName: string) => boolean
  /** Current list of hidden pool package names (loaded from IndexedDB) */
  hiddenPool: string[]
  /** Refresh hidden pool from IndexedDB */
  refreshHiddenPool: () => Promise<void>
}

const DisguiseContext = createContext<DisguiseContextValue>({
  disguised: false,
  activateDisguise: () => {},
  deactivateDisguise: () => {},
  interceptAppLaunch: () => false,
  hiddenPool: [],
  refreshHiddenPool: async () => {},
})

export function useDisguise() {
  return useContext(DisguiseContext)
}

// ══════════════════════════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════════════════════════

export function DisguiseProvider({ children }: { children: ReactNode }) {
  const [disguised, setDisguised] = useState(false)
  const [hiddenPool, setHiddenPool] = useState<string[]>([])
  const initializedRef = useRef(false)

  // ── Load persisted disguise state on mount ──
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Read from localStorage with verification
    const stored = localStorage.getItem('pn_disguise_active')
    if (stored === '1') {
      setDisguised(true)
    } else if (stored === null) {
      // Check the legacy key from app-lock-store as fallback
      if (isDisguiseActive()) {
        localStorage.setItem('pn_disguise_active', '1')
        setDisguised(true)
      }
    }
  }, [])

  // ── Load hidden pool from IndexedDB on mount ──
  useEffect(() => {
    loadHiddenPool()
  }, [])

  const loadHiddenPool = useCallback(async () => {
    try {
      const pool = await idbGetHiddenPoolNames()
      setHiddenPool(pool)
    } catch {
      setHiddenPool([])
    }
  }, [])

  // ── Activate disguise ──
  const activateDisguise = useCallback(() => {
    // Write to BOTH locations for redundancy
    localStorage.setItem('pn_disguise_active', '1')
    setDisguiseActive(true)
    setDisguised(true)
  }, [])

  // ── Deactivate disguise ──
  const deactivateDisguise = useCallback(() => {
    localStorage.removeItem('pn_disguise_active')
    setDisguiseActive(false)
    setDisguised(false)
  }, [])

  // ── Intercept app launch ──
  // If a restricted app is in the Hidden Pool, force the Calculator
  const interceptAppLaunch = useCallback((packageName: string): boolean => {
    if (hiddenPool.includes(packageName)) {
      activateDisguise()
      return true
    }
    return false
  }, [hiddenPool, activateDisguise])

  // ── Refresh hidden pool ──
  const refreshHiddenPool = useCallback(async () => {
    await loadHiddenPool()
  }, [loadHiddenPool])

  return (
    <DisguiseContext.Provider
      value={{
        disguised,
        activateDisguise,
        deactivateDisguise,
        interceptAppLaunch,
        hiddenPool,
        refreshHiddenPool,
      }}
    >
      {children}
    </DisguiseContext.Provider>
  )
}
