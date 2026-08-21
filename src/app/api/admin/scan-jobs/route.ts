// ── Play Nexa — Scan Jobs API Route ──────────────────────────
// GET: list recent scan jobs for admin channel manager
// Uses service role key to bypass RLS

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server not configured' },
      { status: 500 }
    )
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ai_scan_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)

    if (error) {
      // Table may not exist yet
      return NextResponse.json({ jobs: [] })
    }

    return NextResponse.json({ jobs: data || [] })
  } catch {
    return NextResponse.json({ jobs: [] })
  }
}
