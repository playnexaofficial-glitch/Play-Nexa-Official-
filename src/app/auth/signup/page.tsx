// ── Play Nexa — Signup Page ──────────────────────────────────────
// Email/password + Google signup with validation
// AMOLED dark theme, 44px touch targets, no backdrop-blur

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signupWithEmail, loginWithGoogle } from '@/lib/firebaseAuth'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSignup = async () => {
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('নাম কমপক্ষে ২ character হতে হবে')
      return
    }
    if (!email.trim()) {
      setError('Email দাও')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('সঠিক email address দাও')
      return
    }
    if (password.length < 6) {
      setError('Password কমপক্ষে 6 character হতে হবে')
      return
    }
    if (password !== confirmPassword) {
      setError('Password মিলছে না')
      return
    }

    setIsLoading(true)
    setError('')

    const { user, error: err } = await signupWithEmail(
      email,
      password,
      displayName.trim()
    )

    if (err) {
      setError(err)
      setIsLoading(false)
      return
    }

    if (user) router.replace('/')
    setIsLoading(false)
  }

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

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center px-6 pb-20">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-baseline gap-0 mb-3">
          <span className="text-[#7C3AED] font-bold text-3xl">Play</span>
          <span className="text-white font-bold text-3xl">Nexa</span>
        </div>
        <p className="text-[#9CA3AF] text-sm">
          নতুন account তৈরি করো
        </p>
      </div>

      {/* Card */}
      <div className="bg-[#0F0F0F] rounded-3xl p-6 border border-[#1A1A1A]">
        <h1 className="text-white font-bold text-xl mb-6 text-center">
          Create Account
        </h1>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Display Name */}
        <div className="mb-4">
          <label className="text-[#9CA3AF] text-xs mb-2 block">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="তোমার নাম"
            className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563] transition-colors"
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="text-[#9CA3AF] text-xs mb-2 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563] transition-colors"
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="text-[#9CA3AF] text-xs mb-2 block">
            Password
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="কমপক্ষে ৬ character"
              className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 pr-12 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563] transition-colors"
            />
            <button
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[#9CA3AF] text-lg"
            >
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <label className="text-[#9CA3AF] text-xs mb-2 block">
            Confirm Password
          </label>
          <input
            type={showPass ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
            placeholder="আবার password দাও"
            className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563] transition-colors"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-red-400 text-xs mt-1">Password মিলছে না</p>
          )}
        </div>

        {/* Signup button */}
        <button
          onClick={handleSignup}
          disabled={isLoading}
          className="w-full h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm disabled:opacity-50 active:opacity-80 mb-4 flex items-center justify-center gap-2 transition-opacity"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Create Account'
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
              Google দিয়ে Sign Up
            </>
          )}
        </button>
      </div>

      {/* Login link */}
      <p className="text-center text-[#9CA3AF] text-sm mt-6">
        Account আছে?{' '}
        <button
          onClick={() => router.push('/auth/login')}
          className="text-[#7C3AED] font-semibold active:opacity-70"
        >
          Sign In করো
        </button>
      </p>
    </div>
  )
}
