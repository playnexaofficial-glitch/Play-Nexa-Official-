// ── Play Nexa — Password Reset Page ──────────────────────────────
// Sends Firebase password reset email
// AMOLED dark theme, 44px touch targets, no backdrop-blur

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resetPassword } from '@/lib/firebaseAuth'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Email দাও')
      return
    }
    setIsLoading(true)
    setError('')

    const { error: err } = await resetPassword(email)

    if (err) {
      setError(err)
      setIsLoading(false)
      return
    }

    setSent(true)
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center px-6 pb-20">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-baseline gap-0 mb-3">
          <span className="text-[#7C3AED] font-bold text-4xl">Play</span>
          <span className="text-white font-bold text-4xl">Nexa</span>
        </div>
      </div>

      {sent ? (
        <div className="bg-[#0F0F0F] rounded-3xl p-6 border border-[#1A1A1A] text-center">
          <span className="text-4xl block mb-4">📧</span>
          <h1 className="text-white font-bold text-xl mb-2">Email পাঠানো হয়েছে!</h1>
          <p className="text-[#9CA3AF] text-sm mb-6">
            {email} এ password reset link পাঠানো হয়েছে। Inbox check করো।
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm active:opacity-80 transition-opacity"
          >
            Sign In পেজে যাও
          </button>
        </div>
      ) : (
        <div className="bg-[#0F0F0F] rounded-3xl p-6 border border-[#1A1A1A]">
          <h1 className="text-white font-bold text-xl mb-2 text-center">
            Password Reset
          </h1>
          <p className="text-[#9CA3AF] text-sm mb-6 text-center">
            তোমার email address দাও, reset link পাঠাবো
          </p>

          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <label className="text-[#9CA3AF] text-xs mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              placeholder="your@email.com"
              className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED] placeholder-[#4B5563] transition-colors"
            />
          </div>

          <button
            onClick={handleReset}
            disabled={isLoading}
            className="w-full h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm disabled:opacity-50 active:opacity-80 flex items-center justify-center gap-2 transition-opacity"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Reset Link পাঠাও'
            )}
          </button>
        </div>
      )}

      <p className="text-center text-[#9CA3AF] text-sm mt-6">
        <button
          onClick={() => router.push('/auth/login')}
          className="text-[#7C3AED] font-semibold active:opacity-70"
        >
          ← Sign In এ ফিরে যাও
        </button>
      </p>
    </div>
  )
}
