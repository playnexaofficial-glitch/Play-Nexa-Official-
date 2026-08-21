// ── Play Nexa Admin — Daily Report Cron ──────────────────────────
// Generates daily feedback summary report
// Triggered by Supabase CRON at midnight

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Get yesterday's feedbacks
    const { data: feedbacks } = await supabaseAdmin
      .from('user_feedback')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    if (!feedbacks?.length) {
      return NextResponse.json({ message: 'No feedback today' })
    }

    const high = feedbacks.filter(f => f.priority === 'high')
    const medium = feedbacks.filter(f => f.priority === 'medium')
    const low = feedbacks.filter(f => f.priority === 'low')

    // Group by category
    const byCategory = feedbacks.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topIssues = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, count]) => ({
        category: cat,
        count,
        sample:
          feedbacks.filter(f => f.category === cat)[0]?.ai_summary || '',
      }))

    // Save report
    await supabaseAdmin
      .from('admin_reports')
      .upsert(
        [
          {
            report_date: yesterday.toISOString().split('T')[0],
            total_feedback: feedbacks.length,
            high_count: high.length,
            medium_count: medium.length,
            low_count: low.length,
            top_issues: topIssues,
            full_report: {
              feedbacks: feedbacks.map(f => ({
                category: f.category,
                description: f.description,
                priority: f.priority,
                ai_summary: f.ai_summary,
              })),
            },
          },
        ],
        { onConflict: 'report_date' }
      )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Daily report error:', err?.message)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

// Also support GET for manual trigger from admin
export async function GET() {
  return POST()
}
