// ── REMOVED: Shorts route ──────────────────────────────────────
// This route has been deprecated and removed.
// Redirects to Home page.

import { redirect } from 'next/navigation'

export default function ShortsPage() {
  redirect('/')
}
