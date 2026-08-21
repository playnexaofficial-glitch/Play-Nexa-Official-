// ── Play Nexa Admin — Feedback Stats API Route ─────────────────────
// Returns aggregated feedback statistics for the dashboard
// Uses supabaseAdmin (service role) to bypass RLS
// Called from admin feedback page for real-time stats

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── Auth check ──
function verifyAdmin(req: NextRequest): boolean {
  const token = req.cookies.get('pna_admin_token')?.value
  return !!token && token.length > 10
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase admin client not configured' },
      { status: 500 }
    )
  }

  try {
    const range = req.nextUrl.searchParams.get('range') || '7d'

    // Calculate date range
    const startDate = new Date()

    switch (range) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24)
        break
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      case 'all':
        startDate.setTime(0)
        break
      default:
        startDate.setDate(startDate.getDate() - 7)
    }

    // ── Fetch all feedback in range ──
    let query = supabaseAdmin
      .from('user_feedback')
      .select('id, category, priority, status, created_at')

    if (range !== 'all') {
      query = query.gte('created_at', startDate.toISOString())
    }

    const { data: feedbacks, error: fetchErr } = await query

    if (fetchErr) {
      return NextResponse.json(
        { error: 'Failed to fetch feedback: ' + fetchErr.message },
        { status: 500 }
      )
    }

    const all = feedbacks || []

    // ── Calculate stats ──
    const total = all.length
    const high = all.filter(f => f.priority === 'high').length
    const medium = all.filter(f => f.priority === 'medium').length
    const low = all.filter(f => f.priority === 'low').length
    const open = all.filter(f => f.status === 'open').length
    const inProgress = all.filter(f => f.status === 'in_progress').length
    const resolved = all.filter(f => f.status === 'resolved').length

    // ── By category ──
    const byCategory: Record<string, number> = {}
    all.forEach(f => {
      byCategory[f.category] = (byCategory[f.category] || 0) + 1
    })

    // ── By day (for chart) ──
    const byDay: Array<{ date: string; count: number; high: number }> = []
    const dayMap = new Map<string, { count: number; high: number }>()

    all.forEach(f => {
      const day = f.created_at?.split('T')[0]
      if (!day) return
      const existing = dayMap.get(day) || { count: 0, high: 0 }
      existing.count++
      if (f.priority === 'high') existing.high++
      dayMap.set(day, existing)
    })

    dayMap.forEach((value, key) => {
      byDay.push({ date: key, ...value })
    })

    // Sort by date ascending
    byDay.sort((a, b) => a.date.localeCompare(b.date))

    // ── Spike detection (high priority in last hour) ──
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const recentHigh = all.filter(
      f => f.priority === 'high' && f.created_at >= oneHourAgo
    )

    const spikeCategories: Record<string, number> = {}
    recentHigh.forEach(f => {
      spikeCategories[f.category] = (spikeCategories[f.category] || 0) + 1
    })

    const spikes = Object.entries(spikeCategories)
      .filter(([, count]) => count >= 3)
      .map(([category, count]) => ({ category, count }))

    // ── Resolution rate ──
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

    return NextResponse.json({
      range,
      total,
      byPriority: { high, medium, low },
      byStatus: { open, inProgress, resolved },
      byCategory,
      byDay,
      spikes,
      resolutionRate,
    })
  } catch (err: any) {
    console.error('[Feedback Stats] Error:', err?.message)
    return NextResponse.json(
      { error: 'Failed to compute stats: ' + (err?.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
