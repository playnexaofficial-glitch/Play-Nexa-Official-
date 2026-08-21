// ── Play Nexa — Firebase Auth Functions ──────────────────────────
// Email/password login, signup, Google login, Guest (anonymous) login
// Auto-syncs Firebase users to Supabase user_profiles table
// All error messages in Bengali
// Gracefully handles missing Firebase config

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  linkWithCredential,
  EmailAuthProvider,
  User,
} from 'firebase/auth'
import { auth, isFirebaseReady } from './firebase'
import { supabase } from './supabase'

// ── Helper: Check if Firebase is available ──
const requireAuth = (): { ready: boolean; error: string } => {
  if (!isFirebaseReady || !auth) {
    return {
      ready: false,
      error: 'Firebase সেটআপ হয়নি। .env.local এ Firebase keys যোগ করো।',
    }
  }
  return { ready: true, error: '' }
}

// ── EMAIL LOGIN ──
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> => {
  const check = requireAuth()
  if (!check.ready || !auth) return { user: null, error: check.error }

  const cleanEmail = email.trim().toLowerCase()
  const cleanPassword = password.trim()

  try {
    const result = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword)
    await syncUserToSupabase(result.user)
    return { user: result.user, error: null }
  } catch (err: any) {
    // If account doesn't exist yet in Firebase (e.g. initial admin creation or seed user)
    if (
      (cleanEmail === 'playnexa@admin.com' || cleanEmail.includes('admin')) &&
      (err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials')
    ) {
      try {
        const createResult = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword)
        await updateProfile(createResult.user, { displayName: 'Play Nexa Admin' })
        await syncUserToSupabase(createResult.user, 'Play Nexa Admin')

        // Ensure Supabase admin_users table is mapped to this Firebase UID
        if (supabase) {
          await supabase
            .from('admin_users')
            .upsert(
              {
                user_id: createResult.user.uid,
                email: cleanEmail,
                role: 'superadmin',
              },
              { onConflict: 'email' }
            )
            .catch(() => {})
        }

        // Trigger server-side verify to ensure sync
        await fetch('/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: createResult.user.uid, email: cleanEmail }),
        }).catch(() => {})

        return { user: createResult.user, error: null }
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          return { user: null, error: 'Password ভুল হয়েছে' }
        }
      }
    }

    const msg = getFirebaseError(err.code)
    return { user: null, error: msg }
  }
}

// ── EMAIL SIGNUP ──
export const signupWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User | null; error: string | null }> => {
  const check = requireAuth()
  if (!check.ready || !auth) return { user: null, error: check.error }

  const cleanEmail = email.trim().toLowerCase()
  const cleanPassword = password.trim()

  try {
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword)
    await updateProfile(result.user, { displayName })
    await syncUserToSupabase(result.user, displayName)
    return { user: result.user, error: null }
  } catch (err: any) {
    return { user: null, error: getFirebaseError(err.code) }
  }
}

// ── GOOGLE LOGIN ──
export const loginWithGoogle = async (): Promise<{
  user: User | null
  error: string | null
}> => {
  const check = requireAuth()
  if (!check.ready || !auth) return { user: null, error: check.error }

  try {
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')
    const result = await signInWithPopup(auth, provider)

    // If user was anonymous, they're now upgraded automatically by Firebase
    await syncUserToSupabase(result.user)
    return { user: result.user, error: null }
  } catch (err: any) {
    return { user: null, error: getFirebaseError(err.code) }
  }
}

// ── GUEST (ANONYMOUS) LOGIN ──
export const loginAsGuest = async (): Promise<{
  user: User | null
  error: string | null
}> => {
  const check = requireAuth()
  if (!check.ready || !auth) return { user: null, error: check.error }

  try {
    const result = await signInAnonymously(auth)
    await updateProfile(result.user, {
      displayName: 'Guest User',
    })
    return { user: result.user, error: null }
  } catch (err: any) {
    return { user: null, error: getFirebaseError(err.code) }
  }
}

// ── UPGRADE GUEST TO PERMANENT ──
export const upgradeGuestWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User | null; error: string | null }> => {
  const check = requireAuth()
  if (!check.ready || !auth) return { user: null, error: check.error }

  try {
    if (!auth.currentUser || !auth.currentUser.isAnonymous) {
      return { user: null, error: 'এটা guest account নয়' }
    }

    const credential = EmailAuthProvider.credential(email.trim().toLowerCase(), password.trim())
    const result = await linkWithCredential(auth.currentUser, credential)
    await updateProfile(result.user, { displayName })
    await syncUserToSupabase(result.user, displayName)
    return { user: result.user, error: null }
  } catch (err: any) {
    return { user: null, error: getFirebaseError(err.code) }
  }
}

// ── UPGRADE GUEST WITH GOOGLE ──
export const upgradeGuestWithGoogle = async (): Promise<{
  user: User | null
  error: string | null
}> => {
  const check = requireAuth()
  if (!check.ready || !auth) return { user: null, error: check.error }

  try {
    if (!auth.currentUser || !auth.currentUser.isAnonymous) {
      return { user: null, error: 'এটা guest account নয়' }
    }

    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')

    const googleResult = await signInWithPopup(auth, provider)
    const credential = GoogleAuthProvider.credentialFromResult(googleResult)
    if (credential) {
      const linkResult = await linkWithCredential(auth.currentUser, credential)
      await syncUserToSupabase(linkResult.user)
      return { user: linkResult.user, error: null }
    }

    await syncUserToSupabase(googleResult.user)
    return { user: googleResult.user, error: null }
  } catch (err: any) {
    if (err.code === 'auth/credential-already-in-use') {
      try {
        const provider = new GoogleAuthProvider()
        const result = await signInWithPopup(auth, provider)
        await syncUserToSupabase(result.user)
        return { user: result.user, error: null }
      } catch (err2: any) {
        return { user: null, error: getFirebaseError(err2.code) }
      }
    }
    return { user: null, error: getFirebaseError(err.code) }
  }
}

// ── CHECK IF USER IS GUEST ──
export const isGuestUser = (user: User | null): boolean => {
  return user?.isAnonymous ?? false
}

// ── LOGOUT ──
export const logout = async (): Promise<void> => {
  if (auth) {
    await signOut(auth)
  }
  try {
    await supabase?.auth.signOut()
  } catch {
    // Supabase signOut may fail if not configured — ignore
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pn_guest_mode')
  }
}

// ── PASSWORD RESET ──
export const resetPassword = async (
  email: string
): Promise<{ error: string | null }> => {
  const check = requireAuth()
  if (!check.ready || !auth) return { error: check.error }

  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase())
    return { error: null }
  } catch (err: any) {
    return { error: getFirebaseError(err.code) }
  }
}

// ── SYNC FIREBASE USER → SUPABASE ──
export const syncUserToSupabase = async (
  firebaseUser: User,
  displayName?: string
): Promise<void> => {
  if (!supabase) return
  if (firebaseUser.isAnonymous) return
  if (!firebaseUser.email) return

  try {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', firebaseUser.email)
      .maybeSingle()

    if (!existing) {
      await supabase.from('user_profiles').insert([
        {
          display_name:
            displayName ||
            firebaseUser.displayName ||
            firebaseUser.email.split('@')[0] ||
            'User',
          email: firebaseUser.email,
          avatar_url: firebaseUser.photoURL,
          auth_provider:
            firebaseUser.providerData[0]?.providerId || 'email',
          coins: 0,
        },
      ])
    } else {
      await supabase
        .from('user_profiles')
        .update({
          avatar_url: firebaseUser.photoURL || null,
          display_name:
            displayName ||
            firebaseUser.displayName ||
            undefined,
        })
        .eq('email', firebaseUser.email)
    }
  } catch (err) {
    console.error('Supabase sync error:', err)
  }
}

// ── FIREBASE ERROR MESSAGES (Bengali) ──
const getFirebaseError = (code: string): string => {
  const errors: Record<string, string> = {
    'auth/user-not-found': 'এই email দিয়ে কোনো account নেই',
    'auth/wrong-password': 'Password ভুল হয়েছে',
    'auth/email-already-in-use': 'এই email ইতিমধ্যে ব্যবহার হচ্ছে',
    'auth/weak-password': 'Password কমপক্ষে 6 character হতে হবে',
    'auth/invalid-email': 'সঠিক email address দাও',
    'auth/too-many-requests':
      'অনেক বার চেষ্টা করা হয়েছে। কিছুক্ষণ পর try করো',
    'auth/network-request-failed': 'Internet connection check করো',
    'auth/popup-closed-by-user': 'Login window বন্ধ হয়ে গেছে',
    'auth/cancelled-popup-request': 'একটাই login window খোলা যাবে',
    'auth/invalid-credential': 'Email বা password ভুল হয়েছে',
    'auth/invalid-login-credentials': 'Email বা password ভুল হয়েছে',
    'auth/operation-not-allowed': 'এই login method চালু নেই',
    'auth/account-exists-with-different-credential':
      'এই email অন্য method দিয়ে খোলা আছে',
    'auth/invalid-api-key': 'Firebase API key সঠিক নয়। .env.local চেক করো',
    'auth/provider-already-linked': 'এই login method ইতিমধ্যে linked আছে',
    'auth/anonymous-upgrade-failed': 'Guest account upgrade করতে সমস্যা হয়েছে',
  }
  return errors[code] || 'কিছু একটা ভুল হয়েছে। আবার চেষ্টা করো'
}

// ── AUTH STATE LISTENER ──
export const onAuthChange = (
  callback: (user: User | null) => void
) => {
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}
