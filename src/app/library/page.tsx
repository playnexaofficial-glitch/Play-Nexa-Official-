// ── REMOVED: Library route ────────────────────────────────────
// This old route has been deprecated and removed.
// Redirects to Home page.

import { redirect } from 'next/navigation'

export default function LibraryPage() {
  redirect('/')
}
