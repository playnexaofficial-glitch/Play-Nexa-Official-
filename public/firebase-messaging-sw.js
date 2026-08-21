// ═══════════════════════════════════════════════════════════════
// GROVIX — Firebase Cloud Messaging Service Worker
// ═══════════════════════════════════════════════════════════════
// Handles background push notifications when app is NOT in focus
// Placed in /public/ so it's served from the root
// Browser manages this SW — zero app memory when idle
// ═══════════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// Firebase config (replace with your actual config from Firebase Console)
firebase.initializeApp({
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
})

const messaging = firebase.messaging()

// ── Background Message Handler ──
// Only fires when the app is in the background
// When app is in foreground, the main thread handles it via onMessage

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'GROVIX'
  const options = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'grovix-notification',
    data: payload.data || {},
    vibrate: [100, 50, 100],
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }

  self.registration.showNotification(title, options)
})

// ── Notification Click Handler ──
// Opens the app and navigates to the relevant content

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Dismiss action — do nothing
  if (event.action === 'dismiss') return

  // Get click URL from notification data
  const clickUrl = event.notification.data?.clickUrl || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(clickUrl)
            return client.focus()
          }
        }
        // Open new window
        return clients.openWindow(clickUrl)
      })
  )
})
