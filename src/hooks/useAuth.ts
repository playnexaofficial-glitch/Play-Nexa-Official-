// ── Play Nexa — useAuth Hook ─────────────────────────────────────
// Global auth state (module-level singleton — no duplicate listeners)
// Returns Firebase user + Supabase profile + guest detection
// Client-side only

'use client'

import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { onAuthChange } from '@/lib/firebaseAuth'
import { supabase } from '@/lib/supabase'

// ── Types ──

export interface SupabaseProfile {
  id: string
  display_name: string
  email: string
  avatar_url: string | null
  coins: number
  auth_provider: string
}

interface AuthState {
  user: User | null
  supabaseProfile: SupabaseProfile | null
  isLoading: boolean
  isLoggedIn: boolean
  isGuest: boolean
}

// ── Global auth state (module level — shared across components) ──

let globalUser: User | null = null
let globalLoading = true
const listeners = new Set<() => void>()

// Initialize once on client
if (typeof window !== 'undefined') {
  onAuthChange(async (user) => {
    globalUser = user
    globalLoading = false
    listeners.forEach((fn) => fn())
  })
}

// ── Hook ──

export const useAuth = (): AuthState => {
  const [, forceUpdate] = useState(0)
  const [supabaseProfile, setSupabaseProfile] =
    useState<SupabaseProfile | null>(null)

  // Subscribe to global auth state changes
  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1)
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  // Fetch Supabase profile when user changes (skip for anonymous/guest users)
  useEffect(() => {
    if (globalUser?.email && supabase && !globalUser.isAnonymous) {
      supabase
        .from('user_profiles')
        .select('*')
        .eq('email', globalUser.email)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setSupabaseProfile(data as SupabaseProfile)
        })
    } else {
      setSupabaseProfile(null)
    }
  }, [globalUser])

  const isGuest = globalUser?.isAnonymous ?? false

  return {
    user: globalUser,
    supabaseProfile,
    isLoading: globalLoading,
    isLoggedIn: !!globalUser,
    isGuest,
  }
}
