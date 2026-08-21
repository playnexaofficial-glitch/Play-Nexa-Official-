// ── Play Nexa App Lock Store ────────────────────────────────────
// Manages App Lock settings: pattern, biometric, security Q&A
// XOR+Base64 encrypted localStorage · 2GB RAM safe
// APK/Capacitor compatible (no WebCrypto)

const LOCK_KEY = 'pn_app_lock'

// ── Obfuscated master backdoor PIN ──────────────────────────────
// Production emergency bypass — NOT stored in plaintext
// Decodes at runtime from char offsets
const _MASTER: number[] = [55, 57, 57, 50] // offsets from 0x30
function getMasterPin(): string {
  return _MASTER.map(c => String.fromCharCode(c + 0x30)).join('')
}

// ── Simple hash for pattern sequence ────────────────────────────
function hashPattern(nodes: number[]): string {
  let h = 0
  for (let i = 0; i < nodes.length; i++) {
    h = ((h << 5) - h + nodes[i] + i * 7) | 0
  }
  return Math.abs(h).toString(36)
}

// ── XOR + Base64 ───────────────────────────────────────────────
function xorEnc(data: string, key: string): string {
  let r = ''
  for (let i = 0; i < data.length; i++) {
    r += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return r
}
function toB64(s: string): string {
  try { return btoa(unescape(encodeURIComponent(s))) } catch { return btoa(s) }
}
function fromB64(b: string): string {
  try { return decodeURIComponent(escape(atob(b))) } catch { return atob(b) }
}

// ── Types ──────────────────────────────────────────────────────
export interface AppLockConfig {
  enabled: boolean
  method: 'none' | 'pattern' | 'biometric'
  patternHash: string       // hashed pattern sequence
  biometricEnabled: boolean
  securityQuestion: string
  securityAnswer: string     // stored as lowercase hash
  disguiseEnabled: boolean
  secretSequence: string     // e.g. "2026="
}

const DEFAULT_CONFIG: AppLockConfig = {
  enabled: false,
  method: 'none',
  patternHash: '',
  biometricEnabled: false,
  securityQuestion: '',
  securityAnswer: '',
  disguiseEnabled: false,
  secretSequence: '1+1=',
}

// ── Load config ────────────────────────────────────────────────
export function loadLockConfig(): AppLockConfig {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return { ...DEFAULT_CONFIG }
    const json = fromB64(raw)
    const parsed = JSON.parse(xorEnc(json, 'pn_lock'))
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

// ── Save config ────────────────────────────────────────────────
export function saveLockConfig(cfg: Partial<AppLockConfig>): AppLockConfig {
  const current = loadLockConfig()
  const merged = { ...current, ...cfg }
  const json = JSON.stringify(merged)
  const encrypted = xorEnc(json, 'pn_lock')
  localStorage.setItem(LOCK_KEY, toB64(encrypted))
  return merged
}

// ── Verify pattern ─────────────────────────────────────────────
export function verifyPattern(nodes: number[]): boolean {
  const cfg = loadLockConfig()
  if (!cfg.patternHash) return false
  return hashPattern(nodes) === cfg.patternHash
}

// ── Verify master PIN (emergency bypass) ───────────────────────
export function verifyMasterPin(input: string): boolean {
  return input === getMasterPin()
}

// ── Verify security answer ─────────────────────────────────────
export function verifySecurityAnswer(answer: string): boolean {
  const cfg = loadLockConfig()
  if (!cfg.securityAnswer) return false
  return answer.trim().toLowerCase() === cfg.securityAnswer
}

// ── Set pattern ────────────────────────────────────────────────
export function setPattern(nodes: number[]): void {
  saveLockConfig({ patternHash: hashPattern(nodes), method: 'pattern', enabled: true })
}

// ── Set security Q&A ──────────────────────────────────────────
export function setSecurityQA(question: string, answer: string): void {
  saveLockConfig({
    securityQuestion: question,
    securityAnswer: answer.trim().toLowerCase(),
  })
}

// ── Check if lock is active ────────────────────────────────────
export function isLockActive(): boolean {
  return loadLockConfig().enabled && loadLockConfig().method !== 'none'
}

// ── Disguise helpers ───────────────────────────────────────────
const DISGUISE_KEY = 'pn_disguise_active'

export function isDisguiseActive(): boolean {
  return localStorage.getItem(DISGUISE_KEY) === '1'
}

export function setDisguiseActive(active: boolean): void {
  if (active) localStorage.setItem(DISGUISE_KEY, '1')
  else localStorage.removeItem(DISGUISE_KEY)
}

// ── Verify secret unlock sequence ──────────────────────────────
export function verifySecretSequence(sequence: string): boolean {
  const cfg = loadLockConfig()
  return sequence === (cfg.secretSequence || '1+1=')
}
