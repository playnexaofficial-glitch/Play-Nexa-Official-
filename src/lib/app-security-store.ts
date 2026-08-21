// ── Play Nexa App Security Store ─────────────────────────────
// 100% PRODUCTION — Encrypted localStorage + IndexedDB
// Metadata → XOR+Base64 localStorage (tiny, fast)
// Locked packages → IndexedDB (native promise chains, heavy data)
// APK/Capacitor compatible · 2GB RAM safe

import type { AppSecurityEntry } from '@/lib/native-bridge'
import {
  idbLockPackage, idbUnlockPackage, idbGetAllLocked,
  idbHidePackage, idbUnhidePackage, idbGetAllHidden,
  idbIsPackageLocked, idbIsPackageHidden,
  type LockedPackageEntry, type HiddenPoolEntry
} from '@/lib/security-idb'

const STORE_KEY = 'pn_app_security'

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

// ── Obfuscated master backdoor key ─────────────────────────────
const _MASTER_KEY: number[] = [55, 57, 57, 50]
function getMasterKey(): string {
  return _MASTER_KEY.map(c => String.fromCharCode(c + 0x30)).join('')
}

// ══════════════════════════════════════════════════════════════
// METADATA STORE (localStorage — fast, tiny)
// ══════════════════════════════════════════════════════════════

export function loadSecurityEntries(): AppSecurityEntry[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const json = fromB64(raw)
    const parsed = JSON.parse(xorEnc(json, 'pn_sec'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveAllEntries(entries: AppSecurityEntry[]): void {
  const json = JSON.stringify(entries)
  const encrypted = xorEnc(json, 'pn_sec')
  localStorage.setItem(STORE_KEY, toB64(encrypted))
}

export function getAppEntry(packageName: string): AppSecurityEntry | undefined {
  return loadSecurityEntries().find(e => e.packageName === packageName)
}

export function upsertAppEntry(partial: Partial<AppSecurityEntry> & { packageName: string }): AppSecurityEntry {
  const entries = loadSecurityEntries()
  const idx = entries.findIndex(e => e.packageName === partial.packageName)

  const defaultEntry: AppSecurityEntry = {
    packageName: partial.packageName,
    locked: false,
    hidden: false,
    disguised: false,
    customLabel: '',
    customIconDataUrl: '',
    lockMethod: 'pattern',
    shortcutCreated: false,
  }

  if (idx >= 0) {
    entries[idx] = { ...entries[idx], ...partial }
  } else {
    entries.push({ ...defaultEntry, ...partial })
  }

  saveAllEntries(entries)
  return entries[idx >= 0 ? idx : entries.length - 1]
}

// ══════════════════════════════════════════════════════════════
// LOCK / UNLOCK — localStorage metadata + IndexedDB persistence
// ══════════════════════════════════════════════════════════════

export function lockApp(
  packageName: string,
  method: 'pattern' | 'pin' | 'biometric' = 'pattern',
  appName: string = '',
  patternHash: string = ''
): AppSecurityEntry {
  // Persist to IndexedDB for background service access
  idbLockPackage({
    packageName,
    appName,
    locked: true,
    lockMethod: method,
    patternHash,
  }).catch(() => {})

  return upsertAppEntry({ packageName, locked: true, lockMethod: method })
}

export function unlockApp(packageName: string): AppSecurityEntry {
  // Remove from IndexedDB
  idbUnlockPackage(packageName).catch(() => {})

  return upsertAppEntry({ packageName, locked: false })
}

export function toggleAppLock(
  packageName: string,
  method?: 'pattern' | 'pin' | 'biometric',
  appName?: string,
  patternHash?: string
): AppSecurityEntry {
  const entry = getAppEntry(packageName)
  if (entry?.locked) {
    return unlockApp(packageName)
  }
  return lockApp(packageName, method || 'pattern', appName || '', patternHash || '')
}

// ══════════════════════════════════════════════════════════════
// HIDE / UNHIDE — localStorage metadata + IndexedDB persistence
// ══════════════════════════════════════════════════════════════

export function hideApp(packageName: string, appName: string = ''): AppSecurityEntry {
  // Persist to IndexedDB for background service access
  idbHidePackage({
    packageName,
    appName,
    hidden: true,
  }).catch(() => {})

  // Also call native hide if available
  const capWindow = typeof window !== 'undefined' ? (window as any) : null
  if (capWindow?.Capacitor?.Plugins?.AppHider) {
    capWindow.Capacitor.Plugins.AppHider.hide({ packageName }).catch(() => {})
  }

  return upsertAppEntry({ packageName, hidden: true })
}

export function unhideApp(packageName: string): AppSecurityEntry {
  // Remove from IndexedDB
  idbUnhidePackage(packageName).catch(() => {})

  // Also call native unhide
  const capWindow = typeof window !== 'undefined' ? (window as any) : null
  if (capWindow?.Capacitor?.Plugins?.AppHider) {
    capWindow.Capacitor.Plugins.AppHider.unhide({ packageName }).catch(() => {})
  }

  return upsertAppEntry({ packageName, hidden: false })
}

export function toggleAppHide(packageName: string, appName?: string): AppSecurityEntry {
  const entry = getAppEntry(packageName)
  if (entry?.hidden) {
    return unhideApp(packageName)
  }
  return hideApp(packageName, appName || '')
}

// ══════════════════════════════════════════════════════════════
// DISGUISE — localStorage metadata only (visual config)
// ══════════════════════════════════════════════════════════════

export function disguiseApp(packageName: string, customLabel: string, customIconDataUrl: string): AppSecurityEntry {
  return upsertAppEntry({
    packageName,
    disguised: true,
    customLabel,
    customIconDataUrl,
  })
}

export function undisguiseApp(packageName: string): AppSecurityEntry {
  return upsertAppEntry({ packageName, disguised: false, customLabel: '', customIconDataUrl: '' })
}

// ══════════════════════════════════════════════════════════════
// QUERY HELPERS
// ══════════════════════════════════════════════════════════════

export function getLockedPackages(): string[] {
  return loadSecurityEntries().filter(e => e.locked).map(e => e.packageName)
}

export function getHiddenPool(): string[] {
  return loadSecurityEntries().filter(e => e.hidden).map(e => e.packageName)
}

export function getDisguisedApps(): AppSecurityEntry[] {
  return loadSecurityEntries().filter(e => e.disguised)
}

export function getSecurityStats(): { locked: number; hidden: number; disguised: number } {
  const entries = loadSecurityEntries()
  return {
    locked: entries.filter(e => e.locked).length,
    hidden: entries.filter(e => e.hidden).length,
    disguised: entries.filter(e => e.disguised).length,
  }
}

// ══════════════════════════════════════════════════════════════
// MASTER BYPASS
// ══════════════════════════════════════════════════════════════

export function verifyMasterBypass(input: string): boolean {
  return input === getMasterKey()
}

// ══════════════════════════════════════════════════════════════
// CLEANUP
// ══════════════════════════════════════════════════════════════

export function removeAppEntry(packageName: string): void {
  const entries = loadSecurityEntries().filter(e => e.packageName !== packageName)
  saveAllEntries(entries)
  // Also clean IndexedDB
  idbUnlockPackage(packageName).catch(() => {})
  idbUnhidePackage(packageName).catch(() => {})
}

export function clearAllSecurityEntries(): void {
  localStorage.removeItem(STORE_KEY)
  // Clear IndexedDB too
  indexedDB.deleteDatabase('pn_security_db')
}
