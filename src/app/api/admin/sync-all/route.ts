// ── Play Nexa — Sync All Channels API Route (Phase 2) ────────────
// Triggers a sync for ALL active channels with auto_sync enabled.
// Calls the sync-channel route for each channel sequentially
// to avoid overwhelming YouTube RSS rate limits.
// One channel failure does NOT stop other channels from syncing.
//
// POST /api/admin/sync-all
// Body: {} (empty)
// Returns: { synced, results: [{ channel, success, found, added, skipped, error? }] }

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(_req: NextRequest) {
  // ── 1. Check Supabase admin client ──
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server not configured — Supabase admin unavailable' },
      { status: 500 }
    )
  }

  // ── 2. Fetch all active channels with auto_sync enabled ──
  const { data: channels, error: fetchErr } = await supabaseAdmin
    .from('yt_channels')
    .select('id, channel_name, channel_id, channel_type, last_synced_at, sync_interval')
    .eq('is_active', true)
    .eq('auto_sync', true)

  if (fetchErr) {
    console.error('[Sync All] Failed to fetch channels:', fetchErr.message)
    return NextResponse.json(
      { error: 'Failed to fetch channels from database' },
      { status: 500 }
    )
  }

  if (!channels || channels.length === 0) {
    return NextResponse.json({
      synced: 0,
      results: [],
      message: 'No active channels with auto_sync enabled',
    })
  }

  // ── 3. Sync each channel sequentially ──
  // We sync one at a time to respect YouTube RSS rate limits.
  // YouTube allows ~1 request per second per IP, so sequential
  // processing with the ~10s RSS fetch time is naturally safe.
  const results: Array<{
    channel: string
    success: boolean
    found?: number
    added?: number
    skipped?: number
    total?: number
    error?: string
  }> = []

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    `http://localhost:3000`

  for (const channel of channels) {
    // Optional: Skip channels that were synced too recently
    // based on their sync_interval setting
    if (channel.last_synced_at && channel.sync_interval) {
      const hoursSinceSync =
        (Date.now() - new Date(channel.last_synced_at).getTime()) / 3600000

      if (hoursSinceSync < channel.sync_interval) {
        results.push({
          channel: channel.channel_name,
          success: true,
          found: 0,
          added: 0,
          skipped: 0,
          error: `Skipped — synced ${Math.floor(hoursSinceSync)}h ago (interval: ${channel.sync_interval}h)`,
        })
        continue
      }
    }

    try {
      // Call our own sync-channel API route
      const syncUrl = `${appUrl}/api/admin/sync-channel`
      const res = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id }),
        signal: AbortSignal.timeout(30000), // 30s per channel
      })

      const data = await res.json()

      if (res.ok && data.success) {
        results.push({
          channel: channel.channel_name,
          success: true,
          found: data.found,
          added: data.added,
          skipped: data.skipped,
          total: data.total,
        })
      } else {
        results.push({
          channel: channel.channel_name,
          success: false,
          found: data.found || 0,
          added: data.added || 0,
          skipped: data.skipped || 0,
          error: data.error || `HTTP ${res.status}`,
        })
      }
    } catch (err: any) {
      results.push({
        channel: channel.channel_name,
        success: false,
        error: err.message || 'Unknown sync error',
      })
    }
  }

  // ── 4. Summarize results ──
  const succeeded = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const totalAdded = results.reduce((sum, r) => sum + (r.added || 0), 0)
  const totalSkipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0)

  return NextResponse.json({
    synced: results.length,
    succeeded,
    failed,
    totalAdded,
    totalSkipped,
    results,
  })
}
