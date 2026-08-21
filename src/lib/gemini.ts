// ── Play Nexa Gemini AI Multi-Key Lottery Manager ────────────────
// 5-Key rotation system — maximizes free tier to ~7,500 daily requests
// Lottery-style random key selection per request
// Automatic 429/error fallback — switches to next key and retries
// Server-side ONLY — zero client-side overhead
// Optimized for 2GB RAM — no memory leaks, minimal allocations
//
//  KEY SOURCING (priority):
//    1. Supabase `ai_key_vault` table (dynamic, multi-key rotation)
//    2. GEMINI_KEY_1..5 env vars (legacy fallback)
//
//  AUTO-ROTATION:
//    On 429 from a vault key, calls markKeyRateLimited('gemini')
//    which advances the active_key_index in the vault.

import {
  getActiveKey,
  markKeyRateLimited,
  markKeyDead,
} from '@/lib/ai-vault'

// ════════════════════════════════════════════════════════════
//  KEY POOL — 5 Gemini API Keys from environment (FALLBACK ONLY)
// ════════════════════════════════════════════════════════════

const GEMINI_KEYS = [
  process.env.GEMINI_KEY_1 || '',
  process.env.GEMINI_KEY_2 || '',
  process.env.GEMINI_KEY_3 || '',
  process.env.GEMINI_KEY_4 || '',
  process.env.GEMINI_KEY_5 || '',
].filter(Boolean) // Remove empty strings

// ── Key health tracking ──
// Tracks which keys are rate-limited and when they recover

interface KeyHealth {
  key: string
  index: number
  rateLimitedUntil: number  // Timestamp when rate limit expires
  consecutiveErrors: number
  totalRequests: number
  totalErrors: number
}

const keyPool: KeyHealth[] = GEMINI_KEYS.map((key, index) => ({
  key,
  index,
  rateLimitedUntil: 0,
  consecutiveErrors: 0,
  totalRequests: 0,
  totalErrors: 0,
}))

// ── Constants ──

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'gemini-2.0-flash'  // Fast + free-tier friendly
const MAX_RETRIES = 5       // Max keys to try before giving up
const RATE_LIMIT_COOLDOWN = 60_000  // 60s cooldown after 429

// ════════════════════════════════════════════════════════════
//  KEY SELECTION — Lottery (random) with health awareness
// ════════════════════════════════════════════════════════════

/**
 * Pick a key using lottery (random) selection.
 * Avoids keys that are currently rate-limited.
 * Weighted slightly toward keys with fewer errors.
 */
const pickKey = (excludeIndexes: Set<number>): KeyHealth | null => {
  const now = Date.now()

  // Filter: available keys not in exclude set and not rate-limited
  const available = keyPool.filter(
    k => !excludeIndexes.has(k.index) && k.rateLimitedUntil <= now
  )

  if (available.length === 0) {
    // All keys rate-limited — pick the one that recovers soonest
    const soonest = keyPool
      .filter(k => !excludeIndexes.has(k.index))
      .sort((a, b) => a.rateLimitedUntil - b.rateLimitedUntil)[0]
    if (soonest) {
      // Just return it — the caller will get a 429 again and the cooldown
      // will naturally expire. No synchronous sleep needed.
      return soonest
    }
    return null // All keys exhausted
  }

  // Lottery: pick a random available key
  // Slight weighting: keys with fewer consecutive errors are more likely
  const weights = available.map(k => {
    if (k.consecutiveErrors === 0) return 3  // Healthy key = 3x weight
    if (k.consecutiveErrors === 1) return 2  // One recent error = 2x weight
    return 1  // Multiple recent errors = 1x weight
  })

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < available.length; i++) {
    random -= weights[i]
    if (random <= 0) return available[i]
  }

  return available[available.length - 1]
}

/**
 * Mark a key as rate-limited after a 429 response.
 */
const markRateLimited = (index: number): void => {
  if (keyPool[index]) {
    keyPool[index].rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN
    keyPool[index].consecutiveErrors++
    keyPool[index].totalErrors++
  }
}

/**
 * Mark a key as healthy after a successful response.
 */
const markHealthy = (index: number): void => {
  if (keyPool[index]) {
    keyPool[index].consecutiveErrors = 0
  }
}

// ════════════════════════════════════════════════════════════
//  GEMINI API CALL — with automatic key rotation
// ════════════════════════════════════════════════════════════

export interface GeminiRequestOptions {
  model?: string            // Default: gemini-2.0-flash
  temperature?: number      // 0.0 – 2.0, default 0.7
  maxTokens?: number        // Max output tokens, default 2048
  topP?: number             // Default 0.95
  systemInstruction?: string  // System-level instruction
  responseMimeType?: string // e.g. 'application/json' for structured output
}

export interface GeminiResponse {
  text: string
  keyIndex: number         // Which key was used (for debugging)
  model: string
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

/**
 * Call Gemini API with automatic 5-key lottery rotation.
 *
 * Flow:
 * 1. Try vault key first (if vault has keys for 'gemini')
 * 2. If vault empty or all vault keys fail → fall back to env key pool
 * 3. Send the request
 * 4. If 429 → mark key as rate-limited, pick next key, retry
 * 5. If other error → try next key
 * 6. If success → mark key healthy, return response
 *
 * Retries up to MAX_RETRIES (5) times across different keys.
 */
export const callGemini = async (
  prompt: string,
  options: GeminiRequestOptions = {},
): Promise<GeminiResponse> => {
  const model = options.model || DEFAULT_MODEL

  // ════════════════════════════════════════════════════════════
  //  PATH A: VAULT KEY (priority) — try up to 2 vault keys
  // ════════════════════════════════════════════════════════════
  for (let vaultAttempt = 0; vaultAttempt < 2; vaultAttempt++) {
    const vaultKey = await getActiveKey('gemini')
    if (!vaultKey) break // vault empty → fall through to env pool

    try {
      const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${vaultKey}`
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048,
          topP: options.topP ?? 0.95,
        },
      }
      if (options.systemInstruction) {
        body.systemInstruction = { parts: [{ text: options.systemInstruction }] }
      }
      if (options.responseMimeType) {
        body.generationConfig = {
          ...body.generationConfig as object,
          responseMimeType: options.responseMimeType,
        }
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30_000)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timer)

      // ── 401 → mark dead, retry once with next vault key ──
      if (res.status === 401) {
        await markKeyDead('gemini').catch(() => {})
        if (vaultAttempt === 0) {
          console.warn('[gemini] 401 on vault key — marking dead, retrying')
          continue
        }
        throw new Error('Gemini 401 Unauthorized — vault key invalid. Check /admin/key-vault')
      }

      // ── 429 → mark rate-limited, rotate, retry once ──
      if (res.status === 429) {
        await markKeyRateLimited('gemini').catch(() => {})
        if (vaultAttempt === 0) {
          console.warn('[gemini] 429 on vault key — rotating to next key')
          continue
        }
        // Vault keys exhausted — fall through to env pool
        break
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown')
        throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`)
      }

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        const reason = data?.candidates?.[0]?.finishReason
        if (reason === 'SAFETY') {
          throw new Error('Play Nexa Gemini: Response blocked by safety filters')
        }
        throw new Error('Play Nexa Gemini: Empty response from model')
      }

      return {
        text,
        keyIndex: -1, // -1 = vault key (not env-pool index)
        model,
        usageMetadata: data?.usageMetadata
          ? {
              promptTokenCount: data.usageMetadata.promptTokenCount || 0,
              candidatesTokenCount: data.usageMetadata.candidatesTokenCount || 0,
              totalTokenCount: data.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('Gemini: vault request timed out after 30s')
      }
      // If it's a safety/parse error, throw — don't fall through
      if (err instanceof Error && err.message.startsWith('Play Nexa Gemini:')) {
        throw err
      }
      // Other errors → fall through to env pool
      console.warn('[gemini] vault attempt failed, falling back to env pool:', err?.message)
      break
    }
  }

  // ════════════════════════════════════════════════════════════
  //  PATH B: ENV KEY POOL (fallback) — original 5-key lottery
  // ════════════════════════════════════════════════════════════
  if (keyPool.length === 0) {
    throw new Error(
      'Play Nexa: No Gemini keys configured. Add keys at /admin/key-vault, or set GEMINI_KEY_1..5 in .env'
    )
  }

  const excludedIndexes = new Set<number>()
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const keyInfo = pickKey(excludedIndexes)

    if (!keyInfo) {
      throw new Error(`Play Nexa: All ${keyPool.length} Gemini keys exhausted after ${attempt} attempts. Last error: ${lastError?.message || 'unknown'}`)
    }

    keyInfo.totalRequests++

    try {
      // ── Build Gemini REST API request ──
      const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${keyInfo.key}`

      const body: Record<string, unknown> = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048,
          topP: options.topP ?? 0.95,
        },
      }

      // Add system instruction if provided
      if (options.systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: options.systemInstruction }]
        }
      }

      // Add response MIME type for structured output
      if (options.responseMimeType) {
        body.generationConfig = {
          ...body.generationConfig as object,
          responseMimeType: options.responseMimeType,
        }
      }

      // ── Send request with 30s timeout ──
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 30_000)

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timer)

      // ── Handle 429 Rate Limit ──
      if (res.status === 429) {
        markRateLimited(keyInfo.index)
        excludedIndexes.add(keyInfo.index)
        console.warn(`Play Nexa Gemini: Key ${keyInfo.index + 1} rate-limited (429). Switching to next key.`)
        lastError = new Error(`Key ${keyInfo.index + 1} rate-limited`)
        continue // Try next key
      }

      // ── Handle other HTTP errors ──
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'unknown error')
        keyInfo.consecutiveErrors++
        keyInfo.totalErrors++
        excludedIndexes.add(keyInfo.index)
        console.warn(`Play Nexa Gemini: Key ${keyInfo.index + 1} error ${res.status}: ${errorText.slice(0, 200)}`)
        lastError = new Error(`Key ${keyInfo.index + 1} HTTP ${res.status}: ${errorText.slice(0, 100)}`)
        continue // Try next key
      }

      // ── Parse successful response ──
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        // Blocked by safety or empty response
        const blockReason = data?.candidates?.[0]?.finishReason
        if (blockReason === 'SAFETY') {
          throw new Error('Play Nexa Gemini: Response blocked by safety filters')
        }
        throw new Error('Play Nexa Gemini: Empty response from model')
      }

      // Mark key as healthy
      markHealthy(keyInfo.index)

      return {
        text,
        keyIndex: keyInfo.index,
        model,
        usageMetadata: data?.usageMetadata
          ? {
              promptTokenCount: data.usageMetadata.promptTokenCount || 0,
              candidatesTokenCount: data.usageMetadata.candidatesTokenCount || 0,
              totalTokenCount: data.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      }

    } catch (err) {
      // Network error or abort
      if (err instanceof Error && err.name === 'AbortError') {
        keyInfo.consecutiveErrors++
        excludedIndexes.add(keyInfo.index)
        lastError = new Error(`Key ${keyInfo.index + 1} timed out (30s)`)
        continue
      }

      // Non-retryable error (safety block, parsing error, etc.)
      if (err instanceof Error && err.message.startsWith('Play Nexa Gemini:')) {
        throw err
      }

      keyInfo.consecutiveErrors++
      keyInfo.totalErrors++
      excludedIndexes.add(keyInfo.index)
      lastError = err instanceof Error ? err : new Error(String(err))
      continue
    }
  }

  throw new Error(`Play Nexa Gemini: All keys failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || 'unknown'}`)
}

// ════════════════════════════════════════════════════════════
//  STRUCTURED OUTPUT — JSON response helper
// ════════════════════════════════════════════════════════════

/**
 * Call Gemini and parse the response as JSON.
 * Uses responseMimeType: 'application/json' for guaranteed JSON output.
 * Falls back to manual JSON extraction if the model doesn't support it.
 */
export const callGeminiJSON = async <T = unknown>(
  prompt: string,
  options: Omit<GeminiRequestOptions, 'responseMimeType'> = {},
): Promise<T> => {
  try {
    // Try with structured JSON output first
    const response = await callGemini(prompt, {
      ...options,
      responseMimeType: 'application/json',
    })
    return JSON.parse(response.text) as T
  } catch {
    // Fallback: extract JSON from text response
    const response = await callGemini(prompt, options)
    const jsonMatch = response.text.match(/```json\s*([\s\S]*?)```/) ||
                      response.text.match(/\{[\s\S]*\}/) ||
                      response.text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]) as T
    }
    throw new Error('Play Nexa Gemini: Failed to parse JSON from response')
  }
}

// ════════════════════════════════════════════════════════════
//  HEALTH CHECK — Monitor key pool status
// ════════════════════════════════════════════════════════════

export interface KeyPoolStatus {
  totalKeys: number
  healthyKeys: number
  rateLimitedKeys: number
  keys: Array<{
    index: number
    healthy: boolean
    rateLimited: boolean
    consecutiveErrors: number
    totalRequests: number
    totalErrors: number
  }>
}

/**
 * Get the current health status of the Gemini key pool.
 * Useful for admin dashboards and debugging.
 */
export const getKeyPoolStatus = (): KeyPoolStatus => {
  const now = Date.now()
  return {
    totalKeys: keyPool.length,
    healthyKeys: keyPool.filter(k => k.rateLimitedUntil <= now && k.consecutiveErrors === 0).length,
    rateLimitedKeys: keyPool.filter(k => k.rateLimitedUntil > now).length,
    keys: keyPool.map(k => ({
      index: k.index,
      healthy: k.consecutiveErrors === 0 && k.rateLimitedUntil <= now,
      rateLimited: k.rateLimitedUntil > now,
      consecutiveErrors: k.consecutiveErrors,
      totalRequests: k.totalRequests,
      totalErrors: k.totalErrors,
    })),
  }
}

/** Check if any Gemini keys are configured (env pool). Vault check is async. */
export const isGeminiReady = (): boolean => keyPool.length > 0

/** Async readiness check — also checks the vault table. */
export const isGeminiReadyAsync = async (): Promise<boolean> => {
  if (keyPool.length > 0) return true
  const vaultKey = await getActiveKey('gemini')
  return !!vaultKey
}
