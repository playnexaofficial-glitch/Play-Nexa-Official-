// ═══════════════════════════════════════════════════════════════
// GROVIX — Auth Service (Supabase Multi-Method Authentication)
// ═══════════════════════════════════════════════════════════════
// 3 Methods: Google Sign-In, Email/Password, Anonymous/Guest
// Auto-syncs to user_profiles table on every successful login
// Zero background loops. Fire-and-forget DB writes. 2GB RAM safe.
// ═══════════════════════════════════════════════════════════════

import { getSupabase, SupabaseUserProfile } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

// ── Types ──

export type AuthMethod = 'google' | 'email' | 'anonymous'

export interface AuthResult {
  success: boolean
  user: User | null
  session: Session | null
  error: string | null
  method: AuthMethod | null
}

export interface AuthState {
  isLoggedIn: boolean
  user: User | null
  profile: SupabaseUserProfile | null
  method: AuthMethod | null
  loading: boolean
}

// ── Helper ──

const emptyResult = (error?: string): AuthResult => ({
  success: false, user: null, session: null,
  error: error || null, method: null,
})

// ═══════════════════════════════════════════════════════════════
// 1. GOOGLE SIGN-IN
// ═══════════════════════════════════════════════════════════════

export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    const sb = getSupabase()

    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    })

    if (error) return emptyResult(error.message)

    return {
      success: true, user: null, session: null,
      error: null, method: 'google',
    }
  } catch (err: any) {
    return emptyResult(err?.message || 'Google sign-in failed')
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. EMAIL & PASSWORD
// ═══════════════════════════════════════════════════════════════

export const signUpWithEmail = async (
  email: string, password: string, displayName: string,
): Promise<AuthResult> => {
  if (!email.trim() || !password.trim())
    return emptyResult('Email and password are required')
  if (password.length < 6)
    return emptyResult('Password must be at least 6 characters')

  try {
    const sb = getSupabase()

    const { data, error } = await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { display_name: displayName.trim(), auth_provider: 'email' },
      },
    })

    if (error) return emptyResult(error.message)

    if (data.user) await syncUserProfile(data.user, 'email')

    return {
      success: true, user: data.user, session: data.session,
      error: null, method: 'email',
    }
  } catch (err: any) {
    return emptyResult(err?.message || 'Sign up failed')
  }
}

export const signInWithEmail = async (
  email: string, password: string,
): Promise<AuthResult> => {
  if (!email.trim() || !password.trim())
    return emptyResult('Email and password are required')

  try {
    const sb = getSupabase()

    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login'))
        return emptyResult('Wrong email or password')
      if (error.message.includes('Email not confirmed'))
        return emptyResult('Please check your email and confirm your account')
      return emptyResult(error.message)
    }

    if (data.user) await syncUserProfile(data.user, 'email')

    return {
      success: true, user: data.user, session: data.session,
      error: null, method: 'email',
    }
  } catch (err: any) {
    return emptyResult(err?.message || 'Login failed')
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. ANONYMOUS / GUEST LOGIN
// ═══════════════════════════════════════════════════════════════

export const signInAnonymously = async (): Promise<AuthResult> => {
  try {
    const sb = getSupabase()

    const { data, error } = await sb.auth.signInAnonymously()

    if (error) return emptyResult(error.message)

    if (data.user) await syncUserProfile(data.user, 'anonymous')

    return {
      success: true, user: data.user, session: data.session,
      error: null, method: 'anonymous',
    }
  } catch (err: any) {
    return emptyResult(err?.message || 'Guest login failed')
  }
}

// ═══════════════════════════════════════════════════════════════
// DATABASE SYNC — Upsert user_profiles on every login
// ═══════════════════════════════════════════════════════════════

export const syncUserProfile = async (
  user: User, provider: string,
): Promise<SupabaseUserProfile | null> => {
  try {
    const sb = getSupabase()
    const meta = user.user_metadata || {}

    const profileData = {
      auth_user_id: user.id,
      display_name: meta.display_name || meta.full_name || meta.name || 'Grovix User',
      email: user.email || meta.email || null,
      avatar_url: meta.avatar_url || meta.picture || null,
      auth_provider: provider,
    }

    const { data, error } = await sb
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'auth_user_id' })
      .select()
      .single()

    if (error) {
      console.warn('GROVIX: Profile sync failed:', error.message)
      return null
    }

    // Also sync to localStorage for instant profile page loads
    try {
      const localProfile = {
        username: profileData.display_name,
        handle: '@' + (profileData.display_name || 'grovix_user')
          .toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_]/g, ''),
        avatarColor: '#7C5CFF',
      }
      localStorage.setItem('grovix_profile', JSON.stringify(localProfile))
    } catch {}

    return data
  } catch (err) {
    console.warn('GROVIX: Profile sync error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
// SESSION HELPERS
// ═══════════════════════════════════════════════════════════════

export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    const sb = getSupabase()
    const { data } = await sb.auth.getSession()
    return data.session
  } catch { return null }
}

export const getCurrentUserProfile = async (): Promise<SupabaseUserProfile | null> => {
  try {
    const sb = getSupabase()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null

    const { data, error } = await sb
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (error || !data) return null
    return data
  } catch { return null }
}

export const signOut = async (): Promise<{ success: boolean; error: string | null }> => {
  try {
    const sb = getSupabase()
    const { error } = await sb.auth.signOut()

    if (error) return { success: false, error: error.message }

    try { localStorage.removeItem('grovix_profile') } catch {}
    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sign out failed' }
  }
}

export const resetPassword = async (email: string): Promise<{ success: boolean; error: string | null }> => {
  if (!email.trim()) return { success: false, error: 'Email is required' }
  try {
    const sb = getSupabase()
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Reset failed' }
  }
}
