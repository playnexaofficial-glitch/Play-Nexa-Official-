// ── Play Nexa Safe Store ──────────────────────────────────────
// Client-side encrypted localStorage for Safe Folder
// PIN-derived XOR encryption — zero dependencies, 2GB RAM safe
// No WebCrypto overhead — runs instantly on budget devices

const SAFE_KEY = 'pn_safe_data'
const PIN_KEY  = 'pn_safe_pin'

// ── PIN hashing (simple but effective for local-only) ────────
// Produces a deterministic 32-bit key from a 4-digit PIN
function pinToKey(pin: string): number {
  let hash = 0
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash + pin.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

// ── XOR encrypt/decrypt a string with a numeric key ──────────
function xorTransform(data: string, key: number): string {
  const keyStr = key.toString()
  let result = ''
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length)
    result += String.fromCharCode(charCode)
  }
  return result
}

// ── Encode to base64 (UTF-8 safe) ───────────────────────────
function toBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)))
  } catch {
    return btoa(str)
  }
}

// ── Decode from base64 (UTF-8 safe) ─────────────────────────
function fromBase64(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64)))
  } catch {
    return atob(b64)
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

export interface SafeEntry {
  id: string
  name: string
  type: 'video' | 'audio' | 'image' | 'document'
  addedAt: number
  size?: number
}

// ── Set PIN (stores hashed) ─────────────────────────────────
export const setPin = (pin: string): void => {
  const key = pinToKey(pin)
  localStorage.setItem(PIN_KEY, key.toString())
}

// ── Verify PIN ──────────────────────────────────────────────
export const verifyPin = (pin: string): boolean => {
  const stored = localStorage.getItem(PIN_KEY)
  if (!stored) return false
  return pinToKey(pin).toString() === stored
}

// ── Check if PIN has been set ───────────────────────────────
export const hasPin = (): boolean => {
  return !!localStorage.getItem(PIN_KEY)
}

// ── Encrypt and save safe entries ───────────────────────────
export const saveSafeEntries = (entries: SafeEntry[], pin: string): void => {
  const key = pinToKey(pin)
  const json = JSON.stringify(entries)
  const encrypted = xorTransform(json, key)
  const encoded = toBase64(encrypted)
  localStorage.setItem(SAFE_KEY, encoded)
}

// ── Decrypt and load safe entries ───────────────────────────
export const loadSafeEntries = (pin: string): SafeEntry[] => {
  const encoded = localStorage.getItem(SAFE_KEY)
  if (!encoded) return []
  try {
    const encrypted = fromBase64(encoded)
    const json = xorTransform(encrypted, pinToKey(pin))
    return JSON.parse(json) as SafeEntry[]
  } catch {
    return [] // Wrong PIN or corrupted data
  }
}

// ── Add a single entry to safe ──────────────────────────────
export const addToSafe = (entry: SafeEntry, pin: string): SafeEntry[] => {
  const entries = loadSafeEntries(pin)
  entries.unshift(entry)
  saveSafeEntries(entries, pin)
  return entries
}

// ── Remove an entry from safe ───────────────────────────────
export const removeFromSafe = (id: string, pin: string): SafeEntry[] => {
  const entries = loadSafeEntries(pin).filter(e => e.id !== id)
  saveSafeEntries(entries, pin)
  return entries
}

// ── Clear all safe data ─────────────────────────────────────
export const clearSafe = (): void => {
  localStorage.removeItem(SAFE_KEY)
}

// ── Generate unique ID ──────────────────────────────────────
export const safeId = (): string => {
  return `sf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
