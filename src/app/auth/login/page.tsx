// ── Play Nexa — VidMate-Style Login Page ─────────────────────────
// 3 Login methods: Google, Email, Guest
// AMOLED dark theme, 44px touch targets, no backdrop-blur
// Users can skip login entirely (Guest mode)

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginWithEmail, loginWithGoogle, loginAsGuest } from '@/lib/firebaseAuth'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'choose' | 'email'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  // ── Email Login ──
  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email ও password দাও')
      return
    }
    setIsLoading(true)
    setError('')
    const { user, error: err } = await loginWithEmail(email, password)
    if (err) {
      setError(err)
      setIsLoading(false)
      return
    }
    if (user) router.replace('/')
    setIsLoading(false)
  }

  // ── Google Login ──
  const handleGoogle = async () => {
    setSocialLoading('google')
    setError('')
    const { user, error: err } = await loginWithGoogle()
    if (err) {
      setError(err)
      setSocialLoading(null)
      return
    }
    if (user) router.replace('/')
    setSocialLoading(null)
  }

  // ── Guest Login ──
  const handleGuest = async () => {
    setSocialLoading('guest')
    setError('')
    const { user, error: err } = await loginAsGuest()
    if (err) {
      setError(err)
      setSocialLoading(null)
      return
    }
    if (user) {
      localStorage.setItem('pn_guest_mode', 'true')
      router.replace('/')
    }
    setSocialLoading(null)
  }

  // ── Choose Mode (VidMate-style) ──
  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-black flex flex-col px-6 pb-8">
        {/* Header with illustration */}
        <div className="flex-1 flex flex-col items-center justify-center pb-6">
          {/* Play Nexa Logo */}
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}
            >
              <span className="text-white text-4xl font-black">P</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-[#22C55E] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          </div>

          <div className="inline-flex items-baseline gap-0 mb-2">
            <span className="text-[#7C3AED] font-bold text-3xl">Play</span>
            <span className="text-white font-bold text-3xl">Nexa</span>
          </div>
          <p className="text-[#9CA3AF] text-sm text-center">
            তোমার entertainment hub এ স্বাগতম
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm mx-auto space-y-3">
          {/* Error banner */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-2xl px-4 py-3 mb-2">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Google Sign-In — Primary */}
          <button
            onClick={handleGoogle}
            disabled={socialLoading !== null}
            className="w-full h-14 bg-white rounded-2xl text-black text-sm font-semibold flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.97] transition-transform duration-150 shadow-lg shadow-white/5"
          >
            {socialLoading === 'google' ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google দিয়ে Sign In
              </>
            )}
          </button>

          {/* Email Sign-In */}
          <button
            onClick={() => setMode('email')}
            disabled={socialLoading !== null}
            className="w-full h-14 bg-[#0F0F0F] border border-[#2D2D2D] rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.97] transition-transform duration-150"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            Email দিয়ে Sign In
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-[#1A1A1A]" />
            <span className="text-[#4B5563] text-xs">অথবা</span>
            <div className="flex-1 h-px bg-[#1A1A1A]" />
          </div>

          {/* Guest / Skip Login */}
          <button
            onClick={handleGuest}
            disabled={socialLoading !== null}
            className="w-full h-14 bg-[#0F0F0F] border border-dashed border-[#2D2D2D] rounded-2xl text-[#9CA3AF] text-sm font-medium flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.97] transition-transform duration-150"
          >
            {socialLoading === 'guest' ? (
              <div className="w-5 h-5 border-2 border-[#9CA3AF] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Guest হিসেবে চালিয়ে যাও
              </>
            )}
          </button>

          {/* Sign Up link */}
          <p className="text-center text-[#9CA3AF] text-sm mt-4">
            Account নেই?{' '}
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-[#7C3AED] font-semibold active:opacity-70"
            >
              Sign Up করো
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Email Login Mode ──
  return (
    <div className="min-h-screen bg-black flex flex-col justify-center px-6 pb-20">
      {/* Back button + Logo */}
      <div className="mb-8">
        <button
          onClick={() => { setMode('choose'); setError('') }}
          className="w-10 h-10 rounded-xl bg-[#0F0F0F] border border-[#2D2D2D] flex items-center justify-center mb-6 active:scale-90 transition-transform"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div className="inline-flex items-baseline gap-0 mb-2">
          <span className="text-[#7C3AED] font-bold text-3xl">Play</span>
          <span className="text-white font-bold text-3xl">Nexa</span>
        </div>
        <p className="text-[#9CA3AF] text-sm">Email ও password দিয়ে sign in করো</p>
      </div>

      {/* Form Card */}
      <div className="bg-[#0F0F0F] rounded-3xl p-6 border border-[#1A1A1A]">
        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="text-[#9CA3AF] text-xs mb-2 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
            placeholder="your@email.com"
            className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563] transition-colors"
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="text-[#9CA3AF] text-xs mb-2 block">Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
              placeholder="••••••••"
              className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 pr-12 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563] transition-colors"
            />
            <button
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[#9CA3AF] text-lg"
            >
              {showPass ? '🙈' : '👁'}
            </button>
          </div>

          <button
            onClick={() => router.push('/auth/reset')}
            className="text-[#7C3AED] text-xs mt-2 float-right active:opacity-70"
          >
            Password ভুলে গেছো?
          </button>
        </div>

        {/* Login button */}
        <button
          onClick={handleEmailLogin}
          disabled={isLoading}
          className="w-full h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm disabled:opacity-50 active:opacity-80 mb-4 flex items-center justify-center gap-2 transition-opacity"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Sign In'
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-[#2D2D2D]" />
          <span className="text-[#4B5563] text-xs">অথবা</span>
          <div className="flex-1 h-px bg-[#2D2D2D]" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={socialLoading !== null}
          className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 active:bg-[#242424] transition-colors"
        >
          {socialLoading === 'google' ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google দিয়ে Sign In
            </>
          )}
        </button>
      </div>

      {/* Sign up link */}
      <p className="text-center text-[#9CA3AF] text-sm mt-6">
        Account নেই?{' '}
        <button
          onClick={() => router.push('/auth/signup')}
          className="text-[#7C3AED] font-semibold active:opacity-70"
        >
          Sign Up করো
        </button>
      </p>
    </div>
  )
}
