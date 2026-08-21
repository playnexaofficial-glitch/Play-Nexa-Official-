// ── Play Nexa — Firebase Initialization ──────────────────────────
// Singleton pattern — prevents duplicate initialization
// Reads config from NEXT_PUBLIC_ env vars (safe for client)
// Gracefully degrades if env vars are missing (no crash)

import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

// Check if Firebase config is available
const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.authDomain &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.appId

// Prevent duplicate initialization (Next.js hot reload safety)
// Only initialize if config is available
let app: FirebaseApp | null = null
let authInstance: Auth | null = null

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    authInstance = getAuth(app)
  } catch (err) {
    console.warn('Firebase init failed:', err)
    app = null
    authInstance = null
  }
}

export const auth = authInstance
export const isFirebaseReady = isFirebaseConfigured
export default app
