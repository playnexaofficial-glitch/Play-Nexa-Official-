// ── Play Nexa — Channel Display API Route ──────────────────────
// POST: upsert channel_display entry (badge color, visibility, etc.)
// Uses service role key to bypass RLS
// Ensures consistent channel_id (UUID from yt_channels.id)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    channel_id,
    display_name,
    logo_url,
    badge_color,
    border_color,
    is_visible,
  } = body

  if (!channel_id || !display_name) {
    return NextResponse.json(
      { error: 'channel_id and display_name are required' },
      { status: 400 }
    )
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server not configured' },
      { status: 500 }
    )
  }

  try {
    const { error } = await supabaseAdmin
      .from('channel_display')
      .upsert(
        [
          {
            channel_id,
            display_name,
            logo_url: logo_url || '',
            badge_color: badge_color || '#7C3AED',
            border_color: border_color || '#7C3AED',
            is_visible: is_visible !== undefined ? is_visible : true,
            sort_order: 0,
          },
        ],
        {
          onConflict: 'channel_id',
          ignoreDuplicates: false,
        }
      )

    if (error) {
      console.error('[channel-display] Upsert error:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    )
  }
}
