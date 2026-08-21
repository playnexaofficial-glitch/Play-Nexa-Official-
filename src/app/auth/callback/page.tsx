// ── GROVIX OAuth Callback Page ──
// Handles Google OAuth redirect after sign-in
// Supabase exchanges the auth code, then redirects to profile

"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { syncUserProfile } from '@/lib/auth'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const sb = getSupabase()

        // Supabase automatically exchanges the OAuth code
        // from the URL hash fragment for a session
        const { data, error } = await sb.auth.getSession()

        if (error) {
          console.error('GROVIX: Auth callback error:', error.message)
          router.replace('/auth')
          return
        }

        if (data.session?.user) {
          // Sync profile to user_profiles table
          const provider = data.session.user.app_metadata?.provider || 'google'
          await syncUserProfile(data.session.user, provider)

          // Redirect to profile page
          router.replace('/profile')
        } else {
          // No session — go back to login
          router.replace('/auth')
        }
      } catch {
        router.replace('/auth')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-[#070B14] flex items-center justify-center">
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-xl mx-auto mb-4
                     flex items-center justify-center
                     animate-pulse"
          style={{ background: 'linear-gradient(135deg, #7C5CFF, #00D4FF)' }}
        >
          <span className="text-white text-lg font-bold">G</span>
        </div>
        <p className="text-white text-sm font-medium">
          Signing you in...
        </p>
      </div>
    </div>
  )
}
