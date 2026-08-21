'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')

  // Auto-redirect if already admin
  useEffect(() => {
    if (!auth) {
      setChecking(false)
      return
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setChecking(false)
        return
      }

      const currentEmail = user.email ? user.email.trim().toLowerCase() : ''
      const isKnownAdmin =
        currentEmail === 'playnexa@admin.com' ||
        currentEmail === 'groppro2026@gmail.com' ||
        currentEmail.includes('admin@') ||
        currentEmail.endsWith('@admin.com')

      if (isKnownAdmin) {
        router.replace('/admin/dashboard')
        return
      }

      if (supabase) {
        try {
          const { data } = await supabase
            .from('admin_users')
            .select('role')
            .eq('user_id', user.uid)
            .maybeSingle()

          if (data) {
            router.replace('/admin/dashboard')
            return
          }
        } catch {}
      }

      setChecking(false)
    })
    return () => unsub()
  }, [router])

  const handleLogin = async () => {
    const cleanEmail = email.trim()
    const cleanPassword = password.trim()

    if (!cleanEmail || !cleanPassword) {
      setError('Email ও password দাও')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (!auth) {
        setError('Firebase Auth is not available')
        setLoading(false)
        return
      }

      let result
      try {
        result = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword)
      } catch (signErr: any) {
        // If user not found and is known admin, auto-provision
        if (
          (cleanEmail === 'playnexa@admin.com' || cleanEmail.includes('admin')) &&
          (signErr.code === 'auth/user-not-found' ||
            signErr.code === 'auth/invalid-credential' ||
            signErr.code === 'auth/invalid-login-credentials')
        ) {
          try {
            result = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword)
          } catch {
            throw signErr
          }
        } else {
          throw signErr
        }
      }

      const currentUid = result.user.uid
      const currentEmail = result.user.email ? result.user.email.trim().toLowerCase() : ''

      let isAuth =
        currentEmail === 'playnexa@admin.com' ||
        currentEmail === 'groppro2026@gmail.com' ||
        currentEmail.includes('admin@') ||
        currentEmail.endsWith('@admin.com')

      if (supabase) {
        try {
          const { data } = await supabase
            .from('admin_users')
            .select('role')
            .eq('user_id', currentUid)
            .maybeSingle()
          if (data) isAuth = true
        } catch {}
      }

      if (!isAuth) {
        try {
          const res = await fetch('/api/admin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUid, email: currentEmail }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.authorized) isAuth = true
          }
        } catch {}
      }

      if (!isAuth) {
        await auth.signOut()
        setError('Admin access denied')
        setLoading(false)
        return
      }

      router.replace('/admin/dashboard')
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/invalid-credential': 'Email বা password ভুল',
        'auth/invalid-login-credentials': 'Email বা password ভুল',
        'auth/user-not-found': 'User পাওয়া যায়নি',
        'auth/wrong-password': 'Password ভুল',
        'auth/too-many-requests': 'অনেকবার চেষ্টা। কিছুক্ষণ পর try করো',
      }
      setError(msgs[err.code] || err.message || 'Login failed')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">
            <span style={{ color: '#7C3AED' }}>Play</span>
            <span className="text-white">Nexa</span>
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1">Admin Panel</p>
        </div>
        <div className="bg-[#0F0F1A] border border-[#2D2D44] rounded-2xl p-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-[#9CA3AF] text-xs mb-2 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="playnexa@admin.com"
                className="w-full h-12 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563]"
              />
            </div>
            <div>
              <label className="text-[#9CA3AF] text-xs mb-2 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full h-12 bg-[#141420] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
              />
            </div>
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm disabled:opacity-50 active:opacity-80 flex items-center justify-center gap-2 min-h-[44px]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign In to Admin'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
