// ── Play Nexa — Client Layout Guards ────────────────────────────────
// Renders BottomNav and FeedbackWidget only on non-admin/auth/player pages
// Single source of truth for hide routes — BottomNav no longer duplicates this
// Separated from root layout so metadata (server) still works

'use client'

import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

// ── FIX: Lazy-load FeedbackWidget — only loads when user is on a visible page ──
const FeedbackWidget = dynamic(() => import('@/components/feedback/FeedbackWidget'), {
  ssr: false,
  loading: () => null,
})

// ── Single source of truth for routes that hide the nav + feedback ──
const HIDE_ROUTES = ['/admin', '/auth', '/video', '/player']

export default function ClientLayoutGuards() {
  const pathname = usePathname()

  const shouldHide = HIDE_ROUTES.some(r => pathname.startsWith(r))

  if (shouldHide) return null

  return (
    <>
      {/* BottomNav is lightweight, always loaded when visible */}
      <BottomNavLazy />
      <FeedbackWidget />
    </>
  )
}

// ── Lazy-load BottomNav to reduce initial JS for pages that hide it ──
import BottomNav from '@/components/layout/BottomNav'
const BottomNavLazy = BottomNav
