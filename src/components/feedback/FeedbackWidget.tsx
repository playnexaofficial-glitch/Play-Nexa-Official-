// ── Play Nexa — User Feedback Widget ─────────────────────────────
// Floating button + bottom sheet for user feedback
// AMOLED dark theme, 44px touch targets, no backdrop-blur

'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'

// ── Categories ──

const CATEGORIES = [
  { emoji: '🎬', label: 'Movie' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '🎮', label: 'Game' },
  { emoji: '📱', label: 'App' },
  { emoji: '🐛', label: 'Bug' },
  { emoji: '💡', label: 'Idea' },
]

// ── Component ──

export default function FeedbackWidget() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Hide on admin pages
  if (pathname.startsWith('/admin')) return null

  // ── Submit feedback ──

  const submitFeedback = async () => {
    if (!category || !description.trim()) return
    setIsSubmitting(true)

    try {
      // Get current user ID from localStorage (if available)
      let userId: string | null = null
      try {
        const stored = localStorage.getItem('pn_user_id')
        if (stored) userId = stored
      } catch {}

      const res = await fetch('/api/admin/feedback-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description: description.trim(),
          userId,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSubmitted(true)
        setTimeout(() => {
          setIsOpen(false)
          setCategory('')
          setDescription('')
          setSubmitted(false)
        }, 2000)
      }
    } catch {
      // Silently fail — don't bother user with errors
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render ──

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[35] w-[52px] h-[52px] bg-[#7C3AED] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        aria-label="Report feedback"
      >
        <span className="text-xl">📣</span>
      </button>

      {/* Bottom Sheet */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/70"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#0F0F0F] rounded-t-2xl p-6 pb-10 border-t border-[#1A1A1A]">
            <div className="w-10 h-1 bg-[#2D2D2D] rounded-full mx-auto mb-4" />

            {submitted ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">✅</span>
                <p className="text-white font-bold text-lg">
                  Thank you!
                </p>
                <p className="text-[#9CA3AF] text-sm mt-1">
                  তোমার report পৌঁছেছে
                </p>
              </div>
            ) : (
              <>
                <p className="text-white font-bold text-lg mb-4">
                  Report a Problem
                </p>

                {/* Category selector */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.label}
                      onClick={() => setCategory(cat.label)}
                      className={`py-3 rounded-xl text-sm min-h-[48px] flex flex-col items-center gap-1 transition-colors ${
                        category === cat.label
                          ? 'bg-[#7C3AED]/20 border border-[#7C3AED]'
                          : 'bg-[#1A1A1A] border border-[#2D2D2D]'
                      }`}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-[#9CA3AF] text-xs">
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Text area */}
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="তোমার সমস্যা বিস্তারিত লিখো..."
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 py-3 text-white text-sm outline-none resize-none placeholder-[#4B5563] mb-4 focus:border-[#7C3AED] transition-colors"
                />

                <button
                  onClick={submitFeedback}
                  disabled={!category || !description.trim() || isSubmitting}
                  className="w-full py-4 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm min-h-[48px] disabled:opacity-40 active:opacity-80 transition-opacity"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
