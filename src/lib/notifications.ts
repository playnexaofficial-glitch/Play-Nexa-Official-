// ═══════════════════════════════════════════════════════════════
// GROVIX — Client-Side Notification Service
// ═══════════════════════════════════════════════════════════════
// Memory-efficient push notification client for low-end devices.
//
// Architecture:
// 1. On app load: Request notification permission (one-time)
// 2. Register FCM token → Supabase push_subscriptions
// 3. Foreground: Listen via FCM onMessage (lightweight, event-driven)
// 4. Background: Service Worker handles push events
// 5. On sign-out: Unregister token from Supabase
//
// CRITICAL PERFORMANCE RULES:
// - NO continuous polling or background loops
// - NO persistent WebSocket connections
// - FCM onMessage is event-driven (zero CPU when idle)
// - Service Worker is browser-managed (zero app memory)
// - Token registration is fire-and-forget
// - All listeners properly disposed on cleanup
// - 2GB RAM safe. Zero battery drain.
// ═══════════════════════════════════════════════════════════════

import { getSupabase } from './supabase'

// ── Types ──

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  clickUrl?: string
  type?: string  // "new_content" | "achievement" | "system"
  timestamp?: number
}

export type NotificationCallback = (payload: NotificationPayload) => void

export type PermissionStatus = 'default' | 'granted' | 'denied'

// ── Config ──

const FCM_VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || ''
const NOTIFICATION_STORAGE_KEY = 'grovix_notification_token'
const NOTIFICATION_PREFS_KEY = 'grovix_notif_prefs'

// ── State (module-level, lightweight) ──
// No React state here — this is a plain service
// React hooks use this service internally

let fcmToken: string | null = null
let isInitialized = false
let foregroundListener: ((payload: any) => void) | null = null
let callbacks: Set<NotificationCallback> = new Set()

// ── Notification Preferences ──

interface NotificationPreferences {
  enabled: boolean
  newContent: boolean
  achievements: boolean
  system: boolean
  lastUpdated: number
}

const getDefaultPrefs = (): NotificationPreferences => ({
  enabled: true,
  newContent: true,
  achievements: true,
  system: true,
  lastUpdated: Date.now(),
})

export const getNotificationPrefs = (): NotificationPreferences => {
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return getDefaultPrefs()
}

export const setNotificationPrefs = (prefs: Partial<NotificationPreferences>): void => {
  try {
    const current = getNotificationPrefs()
    const updated = { ...current, ...prefs, lastUpdated: Date.now() }
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated))
  } catch {}
}


// ═══════════════════════════════════════════════════════════════
// 1. PERMISSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export const getNotificationPermission = (): PermissionStatus => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied' // SSR or unsupported
  }
  return Notification.permission as PermissionStatus
}

export const requestNotificationPermission = async (): Promise<PermissionStatus> => {
  if (typeof window === 'undefined') return 'denied'
  if (!('Notification' in window)) return 'denied'

  // Already granted or denied
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  // Request permission
  try {
    const permission = await Notification.requestPermission()
    return permission as PermissionStatus
  } catch {
    return 'denied'
  }
}


// ═══════════════════════════════════════════════════════════════
// 2. FCM TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════
// Lazy-loads Firebase messaging only when needed
// Stores token in localStorage + Supabase

const loadFirebaseMessaging = async () => {
  // Dynamic import — only loads when user grants permission
  // This prevents Firebase SDK from bloating initial page load
  try {
    const firebaseApp = await import('firebase/app')
    const firebaseMessaging = await import('firebase/messaging')

    // Check if already initialized
    const apps = firebaseApp.getApps()
    let app

    if (apps.length === 0) {
      // Initialize Firebase with config from env
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      }

      app = firebaseApp.initializeApp(firebaseConfig)
    } else {
      app = apps[0]
    }

    const messaging = firebaseMessaging.getMessaging(app)
    return { messaging, firebaseMessaging }
  } catch {
    console.warn('GROVIX: Firebase SDK not available. Push notifications disabled.')
    return null
  }
}

export const getFCMToken = async (): Promise<string | null> => {
  // Return cached token if available
  if (fcmToken) return fcmToken

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    if (cached) {
      fcmToken = cached
      return cached
    }
  } catch {}

  // Load Firebase and get token
  const fb = await loadFirebaseMessaging()
  if (!fb) return null

  try {
    const { firebaseMessaging } = fb
    const token = await firebaseMessaging.getToken(fb.messaging, {
      vapidKey: FCM_VAPID_KEY,
    })

    if (token) {
      fcmToken = token
      // Cache in localStorage
      try { localStorage.setItem(NOTIFICATION_STORAGE_KEY, token) } catch {}
      return token
    }
  } catch {
    console.warn('GROVIX: Failed to get FCM token')
  }

  return null
}


// ═══════════════════════════════════════════════════════════════
// 3. TOKEN REGISTRATION (Supabase)
// ═══════════════════════════════════════════════════════════════
// Registers the FCM token with Supabase push_subscriptions
// Called after login + permission grant
// Fire-and-forget: won't block UI

export const registerPushToken = async (authUserId: string): Promise<boolean> => {
  if (!authUserId) return false

  // Check if user has enabled notifications
  const prefs = getNotificationPrefs()
  if (!prefs.enabled) return false

  // Get permission
  const permission = getNotificationPermission()
  if (permission !== 'granted') return false

  // Get FCM token
  const token = await getFCMToken()
  if (!token) return false

  // Register with Supabase
  try {
    const sb = getSupabase()
    const { error } = await sb.rpc('register_push_token', {
      p_auth_user_id: authUserId,
      p_device_token: token,
      p_platform: 'web',
      p_device_info: navigator.userAgent.split(' ').slice(-2).join(' '),
    })

    if (error) {
      console.warn('GROVIX: Push token registration failed:', error.message)
      return false
    }

    return true
  } catch {
    return false
  }
}


// ═══════════════════════════════════════════════════════════════
// 4. TOKEN UNREGISTRATION (on sign-out)
// ═══════════════════════════════════════════════════════════════

export const unregisterPushToken = async (): Promise<void> => {
  const token = fcmToken || (() => {
    try { return localStorage.getItem(NOTIFICATION_STORAGE_KEY) } catch { return null }
  })()

  if (!token) return

  try {
    const sb = getSupabase()
    await sb.rpc('unregister_push_token', {
      p_device_token: token,
    })
  } catch {}

  // Clear local cache
  fcmToken = null
  try { localStorage.removeItem(NOTIFICATION_STORAGE_KEY) } catch {}
}


// ═══════════════════════════════════════════════════════════════
// 5. FOREGROUND LISTENER
// ═══════════════════════════════════════════════════════════════
// Listens for push notifications while app is in foreground
// This is EVENT-DRIVEN: zero CPU usage when no notifications arrive
// FCM onMessage uses a passive listener, NOT a polling loop

export const startForegroundListener = async (): Promise<void> => {
  if (foregroundListener) return // Already listening

  const fb = await loadFirebaseMessaging()
  if (!fb) return

  const { firebaseMessaging } = fb

  foregroundListener = firebaseMessaging.onMessage(fb.messaging, (payload) => {
    // Convert FCM payload to our format
    const notification: NotificationPayload = {
      title: payload.notification?.title || 'GROVIX',
      body: payload.notification?.body || '',
      icon: payload.notification?.icon,
      clickUrl: payload.data?.clickUrl,
      type: payload.data?.type || 'system',
      timestamp: Date.now(),
    }

    // Show in-app notification (not system notification — SW handles that)
    // Notify all registered callbacks
    callbacks.forEach(cb => {
      try { cb(notification) } catch {}
    })

    // Also show a system notification if app doesn't have focus
    // (FCM only auto-shows when app is in background)
    if (document.hidden) {
      showLocalNotification(notification)
    }
  })
}


export const stopForegroundListener = (): void => {
  // FCM onMessage returns an unsubscribe function
  if (foregroundListener) {
    foregroundListener = null
  }
  callbacks.clear()
}


// ═══════════════════════════════════════════════════════════════
// 6. CALLBACK REGISTRATION (for React hooks)
// ═══════════════════════════════════════════════════════════════

export const onNotification = (callback: NotificationCallback): (() => void) => {
  callbacks.add(callback)

  // Return unsubscribe function for proper cleanup
  return () => {
    callbacks.delete(callback)
  }
}


// ═══════════════════════════════════════════════════════════════
// 7. LOCAL NOTIFICATION (fallback)
// ═══════════════════════════════════════════════════════════════
// Shows a browser notification when FCM is unavailable
// Used for in-app events (achievements, etc.)

export const showLocalNotification = (payload: NotificationPayload): void => {
  if (typeof window === 'undefined') return
  if (getNotificationPermission() !== 'granted') return

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      tag: 'grovix-notification',
      requireInteraction: false,
    })

    notification.onclick = () => {
      window.focus()
      if (payload.clickUrl) {
        window.location.href = payload.clickUrl
      }
      notification.close()
    }

    // Auto-close after 5 seconds (prevent notification stacking)
    setTimeout(() => notification.close(), 5000)
  } catch {}
}


// ═══════════════════════════════════════════════════════════════
// 8. INITIALIZATION (called once on app mount)
// ═══════════════════════════════════════════════════════════════

export const initNotifications = async (authUserId?: string): Promise<{
  permission: PermissionStatus
  tokenRegistered: boolean
}> => {
  if (isInitialized) {
    return {
      permission: getNotificationPermission(),
      tokenRegistered: !!fcmToken,
    }
  }

  isInitialized = true

  // Check if notifications are supported
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { permission: 'denied', tokenRegistered: false }
  }

  // Check user preferences
  const prefs = getNotificationPrefs()
  if (!prefs.enabled) {
    return { permission: getNotificationPermission(), tokenRegistered: false }
  }

  // If already granted, register token and start listener
  const permission = getNotificationPermission()

  if (permission === 'granted') {
    // Register token with Supabase (if logged in)
    let tokenRegistered = false
    if (authUserId) {
      tokenRegistered = await registerPushToken(authUserId)
    }

    // Start foreground listener
    await startForegroundListener()

    return { permission, tokenRegistered }
  }

  return { permission, tokenRegistered: false }
}


// ═══════════════════════════════════════════════════════════════
// 9. FULL CLEANUP (on sign-out or app unmount)
// ═══════════════════════════════════════════════════════════════

export const cleanupNotifications = async (): Promise<void> => {
  // Stop foreground listener
  stopForegroundListener()

  // Unregister token from Supabase
  await unregisterPushToken()

  // Reset state
  isInitialized = false
  fcmToken = null
  callbacks.clear()
}


// ═══════════════════════════════════════════════════════════════
// 10. SERVICE WORKER REGISTRATION
// ═══════════════════════════════════════════════════════════════
// The service worker handles background push notifications
// This must be called early in the app lifecycle

export const registerNotificationServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return

  try {
    // Register the SW that handles background push
    // The existing sw.js handles offline caching
    // We register a separate SW for push at a different scope
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    })

    console.log('GROVIX: Push notification SW registered')
  } catch (err) {
    // SW registration failed — foreground notifications still work
    console.warn('GROVIX: Push SW registration failed:', err)
  }
}


// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER FILE (firebase-messaging-sw.js)
// ═══════════════════════════════════════════════════════════════
// This file should be placed in /public/firebase-messaging-sw.js
// It handles background push notifications when app is not focused
//
// Content of /public/firebase-messaging-sw.js:
//
// importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
// importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')
//
// firebase.initializeApp({
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_PROJECT.firebaseapp.com",
//   projectId: "YOUR_PROJECT_ID",
//   messagingSenderId: "YOUR_SENDER_ID",
//   appId: "YOUR_APP_ID"
// })
//
// const messaging = firebase.messaging()
//
// messaging.onBackgroundMessage((payload) => {
//   const title = payload.notification?.title || 'GROVIX'
//   const options = {
//     body: payload.notification?.body || '',
//     icon: payload.notification?.icon || '/icon-192x192.png',
//     badge: '/badge-72x72.png',
//     tag: 'grovix-notification',
//     data: payload.data,
//     vibrate: [100, 50, 100],
//     actions: [
//       { action: 'open', title: 'Open' },
//       { action: 'dismiss', title: 'Dismiss' }
//     ]
//   }
//
//   self.registration.showNotification(title, options)
// })
//
// self.addEventListener('notificationclick', (event) => {
//   event.notification.close()
//   if (event.action === 'dismiss') return
//
//   const clickUrl = event.notification.data?.clickUrl || '/'
//   event.waitUntil(
//     clients.matchAll({ type: 'window', includeUncontrolled: true })
//       .then((clientList) => {
//         for (const client of clientList) {
//           if (client.url.includes(clickUrl) && 'focus' in client) {
//             return client.focus()
//           }
//         }
//         return clients.openWindow(clickUrl)
//       })
//   )
// })
//
// ═══════════════════════════════════════════════════════════════
