// ── Play Nexa Movie Hub Route ────────────────────────────────
// Mounted at /ott — redirects to /movies (canonical route)
// Supabase-powered Movie Hub — real database queries

import { redirect } from 'next/navigation'

export default function OTTPage() {
  redirect('/movies')
}
