// ── Play Nexa — Groq Cloud AI Helper ────────────────────────────
//  Free-tier replacement for Gemini when Gemini hits 429 rate limits.
//  Uses Groq's OpenAI-compatible API.
//
//  Models:
//    - llama3-8b-8192      (fast, 8K context, great for keyword gen)
//    - mixtral-8x7b-32768  (32K context, better quality)
//
//  KEY SOURCING (priority order):
//    1. Supabase `ai_key_vault` table (dynamic, multi-key rotation)
//    2. GROQ_API_KEY env var (legacy fallback)
//
//  AUTO-ROTATION:
//    On 429, calls markKeyRateLimited('groq') which advances the
//    active_key_index in the vault — next call uses the next key.
//
//  Server-side ONLY — never expose the key to the browser.

import {
  getActiveKey,
  markKeyRateLimited,
  markKeyDead,
} from '@/lib/ai-vault'

const GROQ_ENV_KEY = process.env.GROQ_API_KEY || ''
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'llama3-8b-8192'

// ════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════

export interface GroqRequestOptions {
  model?: string             // default: llama3-8b-8192
  temperature?: number       // 0.0–2.0, default 0.7
  maxTokens?: number         // default 2048
  systemInstruction?: string // optional system prompt
}

export interface GroqResponse {
  text: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/** Returns true if a Groq key is available (env fast check). */
export const isGroqReady = (): boolean => GROQ_ENV_KEY.length > 0

/** Async readiness check — also checks the vault table. */
export const isGroqReadyAsync = async (): Promise<boolean> => {
  if (GROQ_ENV_KEY.length > 0) return true
  const vaultKey = await getActiveKey('groq')
  return !!vaultKey
}

/** Returns the configured Groq key status (does not leak the key itself). */
export const getGroqStatus = () => ({
  ready: GROQ_ENV_KEY.length > 0,
  keyPreview: GROQ_ENV_KEY
    ? `${GROQ_ENV_KEY.slice(0, 6)}…${GROQ_ENV_KEY.slice(-4)}`
    : '(vault or env)',
  defaultModel: DEFAULT_MODEL,
})

/**
 * Call Groq's chat-completions API with OpenAI-compatible payload.
 *
 * Key sourcing: vault → env. On 429, auto-rotates to next vault key and retries once.
 *
 * Throws on:
 *  - missing API key (no vault keys AND no env)
 *  - HTTP 401 (invalid key) — marks key dead in vault, then throws
 *  - HTTP 429 (rate limit) — marks key rate-limited, retries once with next key
 *  - HTTP 5xx (Groq server error)
 *  - network failure / timeout
 */
export const callGroq = async (
  prompt: string,
  options: GroqRequestOptions = {},
): Promise<GroqResponse> => {
  const model = options.model || DEFAULT_MODEL
  const messages: Array<{ role: 'system' | 'user'; content: string }> = []

  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction })
  }
  messages.push({ role: 'user', content: prompt })

  // ── Try up to 2 keys (initial + 1 rotation on 429) ──
  for (let attempt = 0; attempt < 2; attempt++) {
    // ── Pull key from vault (priority) or env (fallback) ──
    const apiKey = await getActiveKey('groq') || GROQ_ENV_KEY
    if (!apiKey) {
      throw new Error(
        'Play Nexa Groq: no API key configured. Add keys to the AI Key Vault at /admin/key-vault, or set GROQ_API_KEY in .env.local'
      )
    }

    // 30s timeout — Groq is much faster than Gemini
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)

    try {
      const res = await fetch(GROQ_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
        }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      // ── 401 Invalid key — mark dead in vault, retry once ──
      if (res.status === 401) {
        const errBody = await res.text().catch(() => '')
        await markKeyDead('groq').catch(() => {})
        if (attempt === 0) {
          console.warn('[groq] 401 on key — marking dead, retrying with next key')
          continue
        }
        throw new Error(
          `Groq 401 Unauthorized — API key invalid or revoked. Check key in AI Key Vault or GROQ_API_KEY in .env.local. (body: ${errBody.slice(0, 120)})`
        )
      }

      // ── 429 Rate limited — mark + rotate, retry once ──
      if (res.status === 429) {
        const errBody = await res.text().catch(() => '')
        await markKeyRateLimited('groq').catch(() => {})
        if (attempt === 0) {
          console.warn('[groq] 429 on key — rotating to next key, retrying once')
          continue
        }
        throw new Error(
          `Groq 429 RATE_LIMITED — all vault keys exhausted. Add more keys at /admin/key-vault, or wait 60s. (body: ${errBody.slice(0, 120)})`
        )
      }

      // ── Other HTTP errors ──
      if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown error')
        throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 200)}`)
      }

      const data = await res.json()
      const text: string | undefined = data?.choices?.[0]?.message?.content
      if (!text) {
        const finishReason = data?.choices?.[0]?.finish_reason
        throw new Error(
          `Groq: empty response from model (finish_reason=${finishReason || 'unknown'})`
        )
      }

      return {
        text,
        model,
        usage: data?.usage
          ? {
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
              totalTokens: data.usage.total_tokens || 0,
            }
          : undefined,
      }
    } catch (err: any) {
      clearTimeout(timer)
      if (err?.name === 'AbortError') {
        throw new Error('Groq: request timed out after 30s')
      }
      throw err
    }
  }

  // Should never reach here — loop either returns or throws
  throw new Error('Groq: exhausted all retry attempts')
}

/**
 * Call Groq and parse the response as JSON.
 *
 * Groq models sometimes wrap JSON in ```json fences or prepend prose.
 * We handle both cases gracefully.
 */
export const callGroqJSON = async <T = unknown>(
  prompt: string,
  options: GroqRequestOptions = {},
): Promise<T> => {
  // ── Strategy 1: Ask Groq to produce pure JSON, then parse directly ──
  try {
    const response = await callGroq(prompt, {
      ...options,
      systemInstruction: (options.systemInstruction || '') +
        '\n\nYou MUST respond with valid JSON only. No markdown, no prose, no code fences.',
    })

    return parseJSONLoose<T>(response.text)
  } catch (err) {
    // If it's a 401/429/etc, propagate — don't retry a doomed request
    if (err instanceof Error && /401|429|timed out|not configured/i.test(err.message)) {
      throw err
    }

    // ── Strategy 2: Retry once with explicit "extract JSON" instruction ──
    const response = await callGroq(
      `${prompt}\n\nRESPOND WITH ONLY A JSON OBJECT/ARRAY. No prose, no markdown fences.`,
      options,
    )
    return parseJSONLoose<T>(response.text)
  }
}

/**
 * Parse JSON from a possibly-fenced / partially-prose response.
 * Tries multiple extraction strategies in order:
 *   1. Plain JSON.parse (best case)
 *   2. ```json ... ``` fenced block
 *   3. First { ... } or [ ... ] substring
 */
function parseJSONLoose<T>(raw: string): T {
  const trimmed = raw.trim()

  // Strategy 1: direct parse
  try {
    return JSON.parse(trimmed) as T
  } catch {
    // fall through
  }

  // Strategy 2: ```json ... ``` fenced block
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T
    } catch {
      // fall through
    }
  }

  // Strategy 3: first balanced array or object substring
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T
    } catch {
      // fall through
    }
  }
  const objMatch = trimmed.match(/\{[\s\S]*\}/)
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as T
    } catch {
      // fall through
    }
  }

  throw new Error(
    `Groq: failed to parse JSON from response. First 200 chars: ${trimmed.slice(0, 200)}`
  )
}
