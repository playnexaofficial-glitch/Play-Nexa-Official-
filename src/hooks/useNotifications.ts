// ═══════════════════════════════════════════════════════════════
// GROVIX — useNotifications Hook (React Integration)
// ═══════════════════════════════════════════════════════════════
// Memory-efficient notification hook for React components
// Integrates with the notifications.ts service
// Proper lifecycle: initializes on mount, cleans up on unmount
// Zero continuous background loops.
// ═══════════════════════════════════════════════════════════════

"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  initNotifications,
  requestNotificationPermission,
  getNotificationPermission,
  registerPushToken,
  unregisterPushToken,
  onNotification,
  cleanupNotifications,
  showLocalNotification,
  getNotificationPrefs,
  setNotificationPrefs,
  type NotificationPayload,
  type PermissionStatus,
} from '@/lib/notifications'

// ── Types ──

export interface NotificationState {
  permission: PermissionStatus
  isInitialized: boolean
  lastNotification: NotificationPayload | null
  prefs: {
    enabled: boolean
    newContent: boolean
    achievements: boolean
    system: boolean
  }
}

// ── Main Hook ──

export const useNotifications = (authUserId?: string | null) => {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    isInitialized: false,
    lastNotification: null,
    prefs: {
      enabled: true,
      newContent: true,
      achievements: true,
      system: true,
    },
  })

  const mountedRef = useRef(true)

  // ── Initialize notifications ──

  useEffect(() => {
    mountedRef.current = true

    const init = async () => {
      // Load prefs from localStorage
      const prefs = getNotificationPrefs()

      setState(prev => ({
        ...prev,
        permission: getNotificationPermission(),
        prefs: {
          enabled: prefs.enabled,
          newContent: prefs.newContent,
          achievements: prefs.achievements,
          system: prefs.system,
        },
      }))

      // Auto-init if user is logged in and has granted permission
      if (authUserId && prefs.enabled) {
        const result = await initNotifications(authUserId)

        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            permission: result.permission,
            isInitialized: true,
          }))
        }
      }
    }

    init()

    return () => {
      mountedRef.current = false
    }
  }, [authUserId])

  // ── Listen for foreground notifications ──

  useEffect(() => {
    if (!state.isInitialized) return

    const unsubscribe = onNotification((payload: NotificationPayload) => {
      if (!mountedRef.current) return

      // Update state with latest notification
      setState(prev => ({
        ...prev,
        lastNotification: payload,
      }))

      // Auto-clear after 10 seconds
      setTimeout(() => {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            lastNotification: null,
          }))
        }
      }, 10000)
    })

    return () => {
      unsubscribe()
    }
  }, [state.isInitialized])

  // ── Actions ──

  const requestPermission = useCallback(async () => {
    const permission = await requestNotificationPermission()

    if (mountedRef.current) {
      setState(prev => ({ ...prev, permission }))
    }

    // If granted and user is logged in, register token
    if (permission === 'granted' && authUserId) {
      const registered = await registerPushToken(authUserId)
      if (mountedRef.current) {
        setState(prev => ({ ...prev, isInitialized: registered }))
      }
    }

    return permission
  }, [authUserId])

  const updatePrefs = useCallback((updates: Partial<typeof state.prefs>) => {
    setNotificationPrefs(updates)

    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        prefs: { ...prev.prefs, ...updates },
      }))
    }
  }, [])

  const dismissNotification = useCallback(() => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, lastNotification: null }))
    }
  }, [])

  const disableNotifications = useCallback(async () => {
    // Unregister from Supabase
    await unregisterPushToken()

    // Update prefs
    setNotificationPrefs({ enabled: false })

    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        prefs: { ...prev.prefs, enabled: false },
      }))
    }
  }, [])

  const enableNotifications = useCallback(async () => {
    if (!authUserId) return

    // Request permission if needed
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') return

    // Register token
    const registered = await registerPushToken(authUserId)

    // Update prefs
    setNotificationPrefs({ enabled: true })

    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        permission,
        isInitialized: registered,
        prefs: { ...prev.prefs, enabled: true },
      }))
    }
  }, [authUserId])

  // ── Cleanup on sign-out ──
  // Call this when user logs out

  const cleanup = useCallback(async () => {
    await cleanupNotifications()
    if (mountedRef.current) {
      setState({
        permission: getNotificationPermission(),
        isInitialized: false,
        lastNotification: null,
        prefs: { enabled: false, newContent: false, achievements: false, system: false },
      })
    }
  }, [])

  return {
    ...state,
    requestPermission,
    updatePrefs,
    dismissNotification,
    disableNotifications,
    enableNotifications,
    cleanup,
    showLocalNotification,
  }
}
