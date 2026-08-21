// ── Play Nexa — Gemini Key Auto-Rotate API ───────────────────────
// GET: Returns current active Gemini key (DB or env fallback)
// POST: Updates key usage after API call
// Auto-rotates when quota >= threshold

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ── GET — Returns current active key ──

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        key: process.env.GEMINI_API_KEY || '',
        source: 'env',
        keyId: null,
      })
    }

    // Get active key
    const { data: activeKey } = await supabaseAdmin
      .from('gemini_keys')
      .select('*')
      .eq('is_active', true)
      .single()

    if (!activeKey) {
      // Fall back to env key
      return NextResponse.json({
        key: process.env.GEMINI_API_KEY || '',
        source: 'env',
        keyId: null,
      })
    }

    // Check auto-rotate settings from app_settings
    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'gemini_auto_rotate')
      .maybeSingle()

    const autoRotate = settings?.value?.enabled ?? true
    const threshold = settings?.value?.threshold ?? 80

    // Auto-rotate if needed
    if (autoRotate && activeKey.quota_used >= threshold) {
      const rotated = await rotateToNextKey(activeKey.id)
      if (rotated) {
        return NextResponse.json({
          key: rotated.api_key,
          source: 'db',
          keyId: rotated.id,
          rotated: true,
          previousKey: activeKey.key_name,
        })
      }
    }

    return NextResponse.json({
      key: activeKey.api_key,
      source: 'db',
      keyId: activeKey.id,
    })
  } catch {
    return NextResponse.json({
      key: process.env.GEMINI_API_KEY || '',
      source: 'env_fallback',
      keyId: null,
    })
  }
}

// ── POST — Update key usage after API call ──

export async function POST(req: NextRequest) {
  try {
    const { keyId, usageIncrement } = await req.json()

    if (!keyId || !supabaseAdmin) {
      return NextResponse.json({ success: false })
    }

    const { data: current } = await supabaseAdmin
      .from('gemini_keys')
      .select('usage_count, quota_used')
      .eq('id', keyId)
      .single()

    if (!current) return NextResponse.json({ success: false })

    const newQuota = Math.min(
      100,
      (current.quota_used || 0) + (usageIncrement || 1)
    )

    await supabaseAdmin
      .from('gemini_keys')
      .update({
        usage_count: (current.usage_count || 0) + 1,
        quota_used: newQuota,
        last_used: new Date().toISOString(),
      })
      .eq('id', keyId)

    // Check if exhausted
    if (newQuota >= 95) {
      await supabaseAdmin
        .from('gemini_keys')
        .update({ status: 'exhausted' })
        .eq('id', keyId)

      // Auto rotate immediately
      await rotateToNextKey(keyId)
    }

    return NextResponse.json({ success: true, newQuota })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message })
  }
}

// ── Rotate to next available standby key ──

async function rotateToNextKey(currentKeyId: string) {
  if (!supabaseAdmin) return null

  // Find next available standby key
  const { data: keys } = await supabaseAdmin
    .from('gemini_keys')
    .select('*')
    .eq('status', 'standby')
    .neq('id', currentKeyId)
    .order('sort_order')
    .limit(1)

  const nextKey = keys?.[0]
  if (!nextKey) return null

  // Deactivate current
  await supabaseAdmin
    .from('gemini_keys')
    .update({ is_active: false, status: 'cooling' })
    .eq('id', currentKeyId)

  // Activate next
  await supabaseAdmin
    .from('gemini_keys')
    .update({ is_active: true, status: 'active' })
    .eq('id', nextKey.id)

  // Log rotation
  await supabaseAdmin.from('admin_activity_log').insert([
    {
      action: 'AUTO_ROTATE_GEMINI_KEY',
      target: nextKey.key_name,
      details: {
        from: currentKeyId,
        to: nextKey.id,
        automatic: true,
      },
    },
  ])

  return nextKey
}
