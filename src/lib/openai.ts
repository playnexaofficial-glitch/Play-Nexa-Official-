// ── Play Nexa — OpenAI (ChatGPT) Helper ────────────────────────────
//  Powers AI Chat + Auto-Tagging features.
//  OpenAI-compatible API (also works with Azure OpenAI, Together, etc.)
//
//  Models:
//    - gpt-4o-mini       (cheap, fast — default)
//    - gpt-4o            (high quality)
//    - gpt-4-turbo       (legacy)
//
//  KEY SOURCING (priority):
//    1. Supabase `ai_key_vault` table (dynamic, multi-key rotation)
//    2. OPENAI_API_KEY env var (legacy fallback)
//
//  AUTO-ROTATION:
//    On 429, calls markKeyRateLimited('gpt') which advances the
//    active_key_index in the vault — next call uses the next key.
//
//  Server-side ONLY — never expose the key to the browser.

import {
  getActiveKey,
  markKeyRateLimited,
  markKeyDead,
} from '@/lib/ai-vault'

const OPENAI_ENV_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-4o-mini'

// ════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════

export interface OpenAIRequestOptions {
  model?: string             // default: gpt-4o-mini
  temperature?: number       // 0.0–2.0, default 0.7
  maxTokens?: number         // default 2048
  systemInstruction?: string // optional system prompt
}

export interface OpenAIResponse {
  text: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/** Returns true if an OpenAI key is available (env fast check). */
export const isOpenAIReady = (): boolean => OPENAI_ENV_KEY.length > 0

/** Async readiness check — also checks the vault table. */
export const isOpenAIReadyAsync = async (): Promise<boolean> => {
  if (OPENAI_ENV_KEY.length > 0) return true
  const vaultKey = await getActiveKey('gpt')
  return !!vaultKey
}

/** Returns the configured OpenAI key status (does not leak the key itself). */
export const getOpenAIStatus = () => ({
  ready: OPENAI_ENV_KEY.length > 0,
  keyPreview: OPENAI_ENV_KEY
    ? `${OPENAI_ENV_KEY.slice(0, 6)}…${OPENAI_ENV_KEY.slice(-4)}`
    : '(vault or env)',
  defaultModel: DEFAULT_MODEL,
})

/**
 * Call OpenAI's chat-completions API.
 *
 * Key sourcing: vault → env. On 429, auto-rotates to next vault key and retries once.
 *
 * Throws on:
 *  - missing API key (no vault keys AND no env)
 *  - HTTP 401 (invalid key) — marks key dead in vault, then throws
 *  - HTTP 429 (rate limit) — marks key rate-limited, retries once with next key
 *  - HTTP 5xx (OpenAI server error)
 *  - network failure / timeout
 */
export const callOpenAI = async (
  prompt: string,
  options: OpenAIRequestOptions = {},
): Promise<OpenAIResponse> => {
  const model = options.model || DEFAULT_MODEL
  const messages: Array<{ role: 'system' | 'user'; content: string }> = []

  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction })
  }
  messages.push({ role: 'user', content: prompt })

  // ── Try up to 2 keys (initial + 1 rotation on 429) ──
  for (let attempt = 0; attempt < 2; attempt++) {
    const apiKey = await getActiveKey('gpt') || OPENAI_ENV_KEY
    if (!apiKey) {
      throw new Error(
        'Play Nexa OpenAI: no API key configured. Add keys to the AI Key Vault at /admin/key-vault, or set OPENAI_API_KEY in .env.local'
      )
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45_000) // OpenAI can be slower

    try {
      const res = await fetch(OPENAI_BASE_URL, {
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

      // ── 401 Invalid key — mark dead, retry once ──
      if (res.status === 401) {
        const errBody = await res.text().catch(() => '')
        await markKeyDead('gpt').catch(() => {})
        if (attempt === 0) {
          console.warn('[openai] 401 on key — marking dead, retrying with next key')
          continue
        }
        throw new Error(
          `OpenAI 401 Unauthorized — API key invalid or revoked. Check key in AI Key Vault or OPENAI_API_KEY in .env.local. (body: ${errBody.slice(0, 120)})`
        )
      }

      // ── 429 Rate limited — mark + rotate, retry once ──
      if (res.status === 429) {
        const errBody = await res.text().catch(() => '')
        await markKeyRateLimited('gpt').catch(() => {})
        if (attempt === 0) {
          console.warn('[openai] 429 on key — rotating to next key, retrying once')
          continue
        }
        throw new Error(
          `OpenAI 429 RATE_LIMITED — all vault keys exhausted. Add more keys at /admin/key-vault, or wait 60s. (body: ${errBody.slice(0, 120)})`
        )
      }

      // ── Other HTTP errors ──
      if (!res.ok) {
        const errText = await res.text().catch(() => 'unknown error')
        throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`)
      }

      const data = await res.json()
      const text: string | undefined = data?.choices?.[0]?.message?.content
      if (!text) {
        const finishReason = data?.choices?.[0]?.finish_reason
        throw new Error(
          `OpenAI: empty response from model (finish_reason=${finishReason || 'unknown'})`
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
        throw new Error('OpenAI: request timed out after 45s')
      }
      throw err
    }
  }

  throw new Error('OpenAI: exhausted all retry attempts')
}

/**
 * Call OpenAI and parse the response as JSON.
 *
 * OpenAI models sometimes wrap JSON in ```json fences or prepend prose.
 * We handle both cases gracefully (same strategy as Groq).
 */
export const callOpenAIJSON = async <T = unknown>(
  prompt: string,
  options: OpenAIRequestOptions = {},
): Promise<T> => {
  try {
    const response = await callOpenAI(prompt, {
      ...options,
      systemInstruction: (options.systemInstruction || '') +
        '\n\nYou MUST respond with valid JSON only. No markdown, no prose, no code fences.',
    })
    return parseJSONLoose<T>(response.text)
  } catch (err) {
    if (err instanceof Error && /401|429|timed out|not configured/i.test(err.message)) {
      throw err
    }
    // Retry once with explicit "extract JSON" instruction
    const response = await callOpenAI(
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

  try {
    return JSON.parse(trimmed) as T
  } catch {
    // fall through
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T
    } catch {
      // fall through
    }
  }

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
    `OpenAI: failed to parse JSON from response. First 200 chars: ${trimmed.slice(0, 200)}`
  )
}
