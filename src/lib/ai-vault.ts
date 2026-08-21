// ── Play Nexa — AI Key Vault (Dynamic Multi-Key Rotation) ────────────
// Server-side utility for fetching & rotating AI API keys from the
// `ai_key_vault` Supabase table. Completely replaces the need to read
// from .env at runtime — the admin UI writes keys here, this lib reads
// them and auto-rotates on 429 rate-limit errors.
//
//  USAGE (in any API route):
//    import { getActiveKey, markKeyRateLimited, isFeatureAllowed } from '@/lib/ai-vault'
//
//    if (!await isFeatureAllowed('yt_importer')) return
//    const key = await getActiveKey('groq')
//    if (!key) throw new Error('No Groq keys configured in vault')
//
//    try {
//      await fetch('https://api.groq.com/...', { headers: { Authorization: `Bearer ${key}` } })
//    } catch (err) {
//      if (is429(err)) {
//        await markKeyRateLimited('groq')  // ← bumps active_key_index, persists to DB
//        // retry with new key …
//      }
//    }
//
//  FALLBACK: If the ai_key_vault table is empty or unavailable, falls
//  back to .env vars (GROQ_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY)
//  so the app keeps working during migration.

import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

export type AIProvider = 'gemini' | 'groq' | 'gpt'
export type VaultMode = 'auto' | 'single'
export type KeyStatus = 'healthy' | 'rate_limited' | 'dead' | 'untested'

export interface VaultKey {
  value: string         // the actual API key (NEVER expose to client)
  label?: string        // optional friendly name e.g. "Groq Free #1"
  status: KeyStatus
  last_used: string | null   // ISO timestamp
  last_429_at: string | null // ISO timestamp of last rate-limit hit
  usage_count: number
}

export interface VaultRow {
  id: string
  provider: AIProvider
  keys: VaultKey[]
  mode: VaultMode
  active_key_index: number
  permissions: Record<string, boolean>
  updated_at: string
}

export type FeatureFlag =
  | 'yt_importer'
  | 'global_search'
  | 'auto_tagging'
  | 'ai_chat'

// ════════════════════════════════════════════════════════════
//  FALLBACKS — used if the vault table is empty / unreachable
//  so the app stays working during migration.
// ════════════════════════════════════════════════════════════

const ENV_FALLBACK: Record<AIProvider, string> = {
  gemini: process.env.GEMINI_API_KEY || process.env.GEMINI_KEY_1 || '',
  groq:   process.env.GROQ_API_KEY || '',
  gpt:    process.env.OPENAI_API_KEY || '',
}

// ════════════════════════════════════════════════════════════
//  CORE: getVaultRow(provider)
//  Fetches the full vault row for a provider from Supabase.
//  Returns null if the table is unreachable or no row exists.
// ════════════════════════════════════════════════════════════

export async function getVaultRow(provider: AIProvider): Promise<VaultRow | null> {
  if (!supabaseAdmin) return null
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_key_vault')
      .select('*')
      .eq('provider', provider)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn(`[ai-vault] getVaultRow(${provider}) error:`, error.message)
      return null
    }
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
  } catch (err: any) {
    console.warn(`[ai-vault] getVaultRow(${provider}) exception:`, err?.message)
    return null
  }
}

// ════════════════════════════════════════════════════════════
//  CORE: getActiveKey(provider)
//  Returns the API key string that should be used RIGHT NOW for
//  the given provider, respecting the vault's mode + active index.
//
//  Logic:
//    1. Try vault table
//       - If mode='single', return keys[active_key_index].value
//       - If mode='auto',   return first healthy key starting from
//                           active_key_index (wraps around)
//    2. If vault empty / unreachable / no healthy keys → fall back to .env
//    3. If .env also empty → return null
// ════════════════════════════════════════════════════════════

export async function getActiveKey(provider: AIProvider): Promise<string | null> {
  const row = await getVaultRow(provider)

  if (row && row.keys.length > 0) {
    // ── mode='single' — force the active key, even if rate-limited ──
    if (row.mode === 'single') {
      const k = row.keys[row.active_key_index]
      if (k?.value) return k.value
    }

    // ── mode='auto' — find next healthy key starting at active_index ──
    const n = row.keys.length
    for (let i = 0; i < n; i++) {
      const idx = (row.active_key_index + i) % n
      const k = row.keys[idx]
      if (k?.value && (k.status === 'healthy' || k.status === 'untested')) {
        // Update last_used asynchronously (don't block the call)
        bumpUsage(provider, idx).catch(() => {})
        return k.value
      }
    }

    // All keys rate-limited / dead — fall through to env fallback
    console.warn(`[ai-vault] All ${n} ${provider} keys unhealthy — falling back to .env`)
  }

  // ── Fallback to .env var ──
  return ENV_FALLBACK[provider] || null
}

// ════════════════════════════════════════════════════════════
//  CORE: markKeyRateLimited(provider)
//  Called when the currently-active key returns a 429.
//
//  Behavior depends on mode:
//    - 'auto': increment active_key_index (wraps), mark current key
//              as rate_limited with timestamp, persist to DB.
//              Next call to getActiveKey() will skip this key.
//    - 'single': just mark the key as rate_limited (do NOT advance index).
// ════════════════════════════════════════════════════════════

export async function markKeyRateLimited(provider: AIProvider): Promise<void> {
  const row = await getVaultRow(provider)
  if (!row || row.keys.length === 0) return

  const currentIdx = row.active_key_index
  const nowIso = new Date().toISOString()

  // ── Mark current key as rate-limited ──
  const updatedKeys = row.keys.map((k, i) =>
    i === currentIdx
      ? {
          ...k,
          status: 'rate_limited' as KeyStatus,
          last_429_at: nowIso,
          last_used: nowIso,
        }
      : k
  )

  // ── In 'auto' mode, advance to next key ──
  const nextIdx = row.mode === 'auto'
    ? (currentIdx + 1) % row.keys.length
    : currentIdx

  try {
    await supabaseAdmin!
      .from('ai_key_vault')
      .update({
        keys: updatedKeys,
        active_key_index: nextIdx,
        updated_at: nowIso,
      })
      .eq('provider', provider)

    console.log(`[ai-vault] ${provider} key #${currentIdx} rate-limited → advanced to #${nextIdx}`)
  } catch (err: any) {
    console.warn(`[ai-vault] markKeyRateLimited(${provider}) failed:`, err?.message)
  }
}

// ════════════════════════════════════════════════════════════
//  CORE: markKeyDead(provider, index?)
//  Called when a key returns 401 (invalid/revoked).
//  Marks the key as 'dead' permanently — it will never be retried.
// ════════════════════════════════════════════════════════════

export async function markKeyDead(provider: AIProvider, index?: number): Promise<void> {
  const row = await getVaultRow(provider)
  if (!row || row.keys.length === 0) return

  const idx = typeof index === 'number' ? index : row.active_key_index
  const nowIso = new Date().toISOString()

  const updatedKeys = row.keys.map((k, i) =>
    i === idx
      ? { ...k, status: 'dead' as KeyStatus, last_used: nowIso }
      : k
  )

  const nextIdx = row.mode === 'auto'
    ? (idx + 1) % row.keys.length
    : idx

  try {
    await supabaseAdmin!
      .from('ai_key_vault')
      .update({
        keys: updatedKeys,
        active_key_index: nextIdx,
        updated_at: nowIso,
      })
      .eq('provider', provider)
  } catch (err: any) {
    console.warn(`[ai-vault] markKeyDead(${provider}) failed:`, err?.message)
  }
}

// ════════════════════════════════════════════════════════════
//  CORE: isFeatureAllowed(feature)
//  Returns true if the AI permission for the given feature is ON.
//  Defaults to true if the vault is unreachable (fail-open for
//  backward compat — admin can disable explicitly via UI).
// ════════════════════════════════════════════════════════════

export async function isFeatureAllowed(feature: FeatureFlag): Promise<boolean> {
  // Each feature has a primary provider — check that provider's permissions
  const providerForFeature: Record<FeatureFlag, AIProvider> = {
    yt_importer: 'groq',         // YT Importer defaults to Groq (fallback Gemini)
    global_search: 'groq',       // Global Search defaults to Groq
    auto_tagging: 'gpt',         // Auto-Tagging defaults to ChatGPT
    ai_chat: 'gpt',              // AI Chat defaults to ChatGPT
  }

  const provider = providerForFeature[feature]
  const row = await getVaultRow(provider)

  if (!row) return true // fail-open if vault unreachable

  return row.permissions?.[feature] === true
}

// ════════════════════════════════════════════════════════════
//  HELPER: getVaultStatus(provider)
//  Returns a summary for the admin UI (no key values exposed).
// ════════════════════════════════════════════════════════════

export interface VaultStatusSummary {
  provider: AIProvider
  ready: boolean
  mode: VaultMode
  totalKeys: number
  healthyKeys: number
  rateLimitedKeys: number
  deadKeys: number
  activeKeyIndex: number
  activeKeyPreview: string | null  // e.g. "gsk_…abcd"
  permissions: Record<string, boolean>
  envFallback: boolean             // true if .env has a fallback key
}

export async function getVaultStatus(provider: AIProvider): Promise<VaultStatusSummary> {
  const row = await getVaultRow(provider)
  const keys = row?.keys || []

  const healthy = keys.filter(k => k.status === 'healthy' || k.status === 'untested').length
  const rateLimited = keys.filter(k => k.status === 'rate_limited').length
  const dead = keys.filter(k => k.status === 'dead').length

  const activeKey = row && keys.length > 0 ? keys[row.active_key_index] : null
  const activeKeyPreview = activeKey?.value
    ? `${activeKey.value.slice(0, 4)}…${activeKey.value.slice(-4)}`
    : null

  return {
    provider,
    ready: keys.length > 0 || !!ENV_FALLBACK[provider],
    mode: row?.mode || 'auto',
    totalKeys: keys.length,
    healthyKeys: healthy,
    rateLimitedKeys: rateLimited,
    deadKeys: dead,
    activeKeyIndex: row?.active_key_index ?? 0,
    activeKeyPreview,
    permissions: row?.permissions || {},
    envFallback: !!ENV_FALLBACK[provider],
  }
}

// ════════════════════════════════════════════════════════════
//  HELPER: getAllVaultStatuses()
//  Convenience for the dashboard — fetches all 3 providers in parallel.
// ════════════════════════════════════════════════════════════

export async function getAllVaultStatuses(): Promise<VaultStatusSummary[]> {
  const [gemini, groq, gpt] = await Promise.all([
    getVaultStatus('gemini'),
    getVaultStatus('groq'),
    getVaultStatus('gpt'),
  ])
  return [gemini, groq, gpt]
}

// ════════════════════════════════════════════════════════════
//  INTERNAL: bumpUsage(provider, index)
//  Increment usage_count + update last_used for a key. Fire-and-forget.
// ════════════════════════════════════════════════════════════

async function bumpUsage(provider: AIProvider, index: number): Promise<void> {
  const row = await getVaultRow(provider)
  if (!row || index < 0 || index >= row.keys.length) return

  const nowIso = new Date().toISOString()
  const updatedKeys = row.keys.map((k, i) =>
    i === index
      ? {
          ...k,
          usage_count: (k.usage_count || 0) + 1,
          last_used: nowIso,
          status: k.status === 'untested' ? ('healthy' as KeyStatus) : k.status,
        }
      : k
  )

  try {
    await supabaseAdmin!
      .from('ai_key_vault')
      .update({ keys: updatedKeys, updated_at: nowIso })
      .eq('provider', provider)
  } catch {
    // non-critical — swallow
  }
}

// ════════════════════════════════════════════════════════════
//  HELPER: is429Error(err)
//  Detects a 429 rate-limit error from any AI provider's response.
// ════════════════════════════════════════════════════════════

export function is429Error(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return /429|rate.?limit|too many requests|quota exhausted|exceeded/i.test(msg)
}

// ════════════════════════════════════════════════════════════
//  HELPER: is401Error(err)
//  Detects a 401 invalid/unauthorized error (key revoked).
// ════════════════════════════════════════════════════════════

export function is401Error(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()
  return /401|unauthorized|invalid api key|invalid.*key|revoked/i.test(msg)
}
