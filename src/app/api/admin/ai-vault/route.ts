// ── Play Nexa Admin — AI Key Vault API ──────────────────────────────
// CRUD endpoint for the dynamic AI key vault.
//
//   GET  /api/admin/ai-vault              → returns all 3 provider rows
//                                            (key VALUES are masked in response)
//   POST /api/admin/ai-vault              → updates a provider's config
//        body: { provider, action, payload }
//
//  Actions:
//    'add_key'       payload: { value, label? }                 → append a new key
//    'remove_key'    payload: { index }                          → remove key at index
//    'set_mode'      payload: { mode: 'auto'|'single' }          → change rotation mode
//    'set_active'    payload: { index }                          → set active_key_index (single mode)
//    'set_permission' payload: { feature, enabled }              → toggle a feature permission
//    'reset_key'     payload: { index }                          → mark key as 'healthy' (clear 429 state)
//    'replace_keys'  payload: { keys: VaultKey[] }               → bulk replace (admin UI editor)
//
//  SECURITY:
//    - Admin cookie required (verifyAdmin)
//    - Uses supabaseAdmin (service role, bypasses RLS)
//    - Key VALUES are masked in GET response (only first 4 + last 4 chars)
//    - Keys NEVER sent to the browser in plaintext

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { AIProvider, VaultKey, VaultMode, FeatureFlag } from '@/lib/ai-vault'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════

function verifyAdmin(req: NextRequest): boolean {
  const token = req.cookies.get('pna_admin_token')?.value
  return !!token && token.length > 10
}

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

interface VaultRow {
  id: string
  provider: AIProvider
  keys: VaultKey[]
  mode: VaultMode
  active_key_index: number
  permissions: Record<string, boolean>
  updated_at: string
}

// Public-safe version: key values masked
interface PublicVaultRow {
  id: string
  provider: AIProvider
  keys: Array<{
    label?: string
    status: VaultKey['status']
    last_used: string | null
    last_429_at: string | null
    usage_count: number
    preview: string  // "gsk_…abcd"
  }>
  mode: VaultMode
  active_key_index: number
  permissions: Record<string, boolean>
  updated_at: string
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

function maskKey(value: string): string {
  if (!value) return '(empty)'
  if (value.length <= 8) return '••••'
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

function toPublicRow(row: VaultRow): PublicVaultRow {
  return {
    id: row.id,
    provider: row.provider,
    keys: (row.keys || []).map(k => ({
      label: k.label,
      status: k.status,
      last_used: k.last_used,
      last_429_at: k.last_429_at,
      usage_count: k.usage_count || 0,
      preview: maskKey(k.value),
    })),
    mode: row.mode,
    active_key_index: row.active_key_index,
    permissions: row.permissions || {},
    updated_at: row.updated_at,
  }
}

async function fetchRow(provider: AIProvider): Promise<VaultRow | null> {
  if (!supabaseAdmin) return null
  const { data, error } = await supabaseAdmin
    .from('ai_key_vault')
    .select('*')
    .eq('provider', provider)
    .maybeSingle()
  if (error) throw new Error(`DB error: ${error.message}`)
  if (!data) return null
  return {
    id: data.id,
    provider: data.provider,
    keys: Array.isArray(data.keys) ? data.keys : [],
    mode: data.mode === 'single' ? 'single' : 'auto',
    active_key_index: typeof data.active_key_index === 'number' ? data.active_key_index : 0,
    permissions: typeof data.permissions === 'object' && data.permissions ? data.permissions : {},
    updated_at: data.updated_at,
  }
}

async function persistRow(provider: AIProvider, patch: Partial<VaultRow>): Promise<void> {
  if (!supabaseAdmin) throw new Error('Supabase not configured')
  const updatePayload: Record<string, unknown> = {
    ...patch,
    updated_at: new Date().toISOString(),
  }
  // Don't allow updating the provider column itself
  delete updatePayload.provider
  delete updatePayload.id

  const { error } = await supabaseAdmin
    .from('ai_key_vault')
    .update(updatePayload)
    .eq('provider', provider)
  if (error) throw new Error(`DB update failed: ${error.message}`)
}

// ════════════════════════════════════════════════════════════
//  GET — return all 3 provider rows (key values masked)
// ════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  try {
    const providers: AIProvider[] = ['gemini', 'groq', 'gpt']
    const rows = await Promise.all(providers.map(fetchRow))

    // If any provider row doesn't exist yet, seed it
    for (let i = 0; i < providers.length; i++) {
      if (!rows[i]) {
        const { error: seedErr } = await supabaseAdmin
          .from('ai_key_vault')
          .upsert({
            provider: providers[i],
            keys: [],
            mode: 'auto',
            active_key_index: 0,
            permissions: {
              yt_importer: providers[i] === 'groq' || providers[i] === 'gemini',
              global_search: providers[i] === 'groq',
              auto_tagging: providers[i] === 'gpt',
              ai_chat: providers[i] === 'gpt' || providers[i] === 'gemini',
            },
          }, { onConflict: 'provider' })
        if (seedErr) console.warn(`[ai-vault] seed ${providers[i]} failed:`, seedErr.message)
        rows[i] = await fetchRow(providers[i])
      }
    }

    const publicRows = rows.filter(Boolean).map(r => toPublicRow(r as VaultRow))

    return NextResponse.json({
      success: true,
      vault: publicRows,
      ts: Date.now(),
    })
  } catch (err: any) {
    console.error('[ai-vault] GET error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

// ════════════════════════════════════════════════════════════
//  POST — perform an action on a provider's vault row
// ════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  let body: {
    provider: AIProvider
    action: string
    payload?: any
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { provider, action, payload = {} } = body

  // ── Validate provider ──
  if (!['gemini', 'groq', 'gpt'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  try {
    const row = await fetchRow(provider)
    if (!row) {
      return NextResponse.json(
        { error: `No vault row for provider "${provider}". Run the SQL seed first.` },
        { status: 404 }
      )
    }

    // ═════════════════════════════════════════════════════════
    //  ACTION: add_key
    // ═════════════════════════════════════════════════════════
    if (action === 'add_key') {
      const value: string = (payload.value || '').trim()
      const label: string | undefined = payload.label?.trim() || undefined
      if (!value || value.length < 10) {
        return NextResponse.json({ error: 'Key value too short' }, { status: 400 })
      }
      if (row.keys.length >= 10) {
        return NextResponse.json({ error: 'Max 10 keys per provider' }, { status: 400 })
      }
      // Prevent exact duplicate keys
      if (row.keys.some(k => k.value === value)) {
        return NextResponse.json({ error: 'Key already exists in vault' }, { status: 400 })
      }

      const newKey: VaultKey = {
        value,
        label,
        status: 'untested',
        last_used: null,
        last_429_at: null,
        usage_count: 0,
      }

      await persistRow(provider, {
        keys: [...row.keys, newKey],
      })

      return NextResponse.json({ success: true, action: 'add_key' })
    }

    // ═════════════════════════════════════════════════════════
    //  ACTION: remove_key
    // ═════════════════════════════════════════════════════════
    if (action === 'remove_key') {
      const idx: number = parseInt(payload.index, 10)
      if (isNaN(idx) || idx < 0 || idx >= row.keys.length) {
        return NextResponse.json({ error: 'Invalid key index' }, { status: 400 })
      }
      const newKeys = row.keys.filter((_, i) => i !== idx)
      // Adjust active_key_index if we removed one before/at it
      let newActive = row.active_key_index
      if (idx < row.active_key_index) newActive = Math.max(0, newActive - 1)
      if (newActive >= newKeys.length) newActive = 0

      await persistRow(provider, {
        keys: newKeys,
        active_key_index: newActive,
      })

      return NextResponse.json({ success: true, action: 'remove_key' })
    }

    // ═════════════════════════════════════════════════════════
    //  ACTION: set_mode
    // ═════════════════════════════════════════════════════════
    if (action === 'set_mode') {
      const mode: VaultMode = payload.mode === 'single' ? 'single' : 'auto'
      await persistRow(provider, { mode })
      return NextResponse.json({ success: true, action: 'set_mode', mode })
    }

    // ═════════════════════════════════════════════════════════
    //  ACTION: set_active  (forces a specific key index — used in single mode)
    // ═════════════════════════════════════════════════════════
    if (action === 'set_active') {
      const idx: number = parseInt(payload.index, 10)
      if (isNaN(idx) || idx < 0 || idx >= row.keys.length) {
        return NextResponse.json({ error: 'Invalid key index' }, { status: 400 })
      }
      await persistRow(provider, { active_key_index: idx })
      return NextResponse.json({ success: true, action: 'set_active', active_key_index: idx })
    }

    // ═════════════════════════════════════════════════════════
    //  ACTION: set_permission  (toggle feature permission)
    // ═════════════════════════════════════════════════════════
    if (action === 'set_permission') {
      const feature: FeatureFlag = payload.feature
      const enabled: boolean = !!payload.enabled
      if (!['yt_importer', 'global_search', 'auto_tagging', 'ai_chat'].includes(feature)) {
        return NextResponse.json({ error: 'Invalid feature name' }, { status: 400 })
      }
      const newPerms = { ...row.permissions, [feature]: enabled }
      await persistRow(provider, { permissions: newPerms })
      return NextResponse.json({ success: true, action: 'set_permission', permissions: newPerms })
    }

    // ═════════════════════════════════════════════════════════
    //  ACTION: reset_key  (clear 429/dead status, mark as healthy)
    // ═════════════════════════════════════════════════════════
    if (action === 'reset_key') {
      const idx: number = parseInt(payload.index, 10)
      if (isNaN(idx) || idx < 0 || idx >= row.keys.length) {
        return NextResponse.json({ error: 'Invalid key index' }, { status: 400 })
      }
      const newKeys = row.keys.map((k, i) =>
        i === idx
          ? { ...k, status: 'healthy' as const, last_429_at: null }
          : k
      )
      await persistRow(provider, { keys: newKeys })
      return NextResponse.json({ success: true, action: 'reset_key' })
    }

    // ═════════════════════════════════════════════════════════
    //  ACTION: replace_keys  (bulk replace all keys)
    // ═════════════════════════════════════════════════════════
    if (action === 'replace_keys') {
      const newKeys: VaultKey[] = Array.isArray(payload.keys) ? payload.keys : []
      if (newKeys.length > 10) {
        return NextResponse.json({ error: 'Max 10 keys per provider' }, { status: 400 })
      }
      await persistRow(provider, {
        keys: newKeys,
        active_key_index: 0,
      })
      return NextResponse.json({ success: true, action: 'replace_keys' })
    }

    // ── Unknown action ──
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    )
  } catch (err: any) {
    console.error('[ai-vault] POST error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
