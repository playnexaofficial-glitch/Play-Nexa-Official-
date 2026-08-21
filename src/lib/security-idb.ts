// ── Play Nexa Security IndexedDB ──────────────────────────────
// Production IndexedDB store for locked app packages
// Used by App Lock service for heavy data — NOT localStorage
// APK/Capacitor compatible · 2GB RAM safe

const DB_NAME = 'pn_security_db'
const DB_VERSION = 1
const LOCKED_STORE = 'locked_packages'
const HIDDEN_STORE = 'hidden_pool'

// ── Lazy-initialized singleton ──
let dbInstance: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(LOCKED_STORE)) {
        const store = db.createObjectStore(LOCKED_STORE, { keyPath: 'packageName' })
        store.createIndex('locked', 'locked', { unique: false })
        store.createIndex('method', 'lockMethod', { unique: false })
      }
      if (!db.objectStoreNames.contains(HIDDEN_STORE)) {
        const store = db.createObjectStore(HIDDEN_STORE, { keyPath: 'packageName' })
        store.createIndex('hidden', 'hidden', { unique: false })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// ══════════════════════════════════════════════════════════════
// LOCKED PACKAGES STORE
// ══════════════════════════════════════════════════════════════

export interface LockedPackageEntry {
  packageName: string
  appName: string
  locked: boolean
  lockMethod: 'pattern' | 'pin' | 'biometric'
  lockedAt: number
  patternHash: string
}

/** Add or update a locked package in IndexedDB */
export async function idbLockPackage(
  entry: Omit<LockedPackageEntry, 'lockedAt'>
): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(LOCKED_STORE, 'readwrite')
      const store = tx.objectStore(LOCKED_STORE)
      const record: LockedPackageEntry = {
        ...entry,
        lockedAt: Date.now(),
      }
      const req = store.put(record)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

/** Remove a locked package from IndexedDB (unlock) */
export async function idbUnlockPackage(
  packageName: string
): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(LOCKED_STORE, 'readwrite')
      const store = tx.objectStore(LOCKED_STORE)
      const req = store.delete(packageName)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

/** Get a single locked package entry */
export async function idbGetLockedPackage(
  packageName: string
): Promise<LockedPackageEntry | undefined> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(LOCKED_STORE, 'readonly')
      const store = tx.objectStore(LOCKED_STORE)
      const req = store.get(packageName)
      req.onsuccess = () => resolve(req.result as LockedPackageEntry | undefined)
      req.onerror = () => resolve(undefined)
    })
  } catch {
    return undefined
  }
}

/** Get all locked packages */
export async function idbGetAllLocked(): Promise<LockedPackageEntry[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(LOCKED_STORE, 'readonly')
      const store = tx.objectStore(LOCKED_STORE)
      const req = store.getAll()
      req.onsuccess = () => resolve((req.result as LockedPackageEntry[]) || [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

/** Check if a package is locked */
export async function idbIsPackageLocked(
  packageName: string
): Promise<boolean> {
  const entry = await idbGetLockedPackage(packageName)
  return entry?.locked === true
}

// ══════════════════════════════════════════════════════════════
// HIDDEN POOL STORE
// ══════════════════════════════════════════════════════════════

export interface HiddenPoolEntry {
  packageName: string
  appName: string
  hidden: boolean
  hiddenAt: number
}

/** Add an app to the hidden pool in IndexedDB */
export async function idbHidePackage(
  entry: Omit<HiddenPoolEntry, 'hiddenAt'>
): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(HIDDEN_STORE, 'readwrite')
      const store = tx.objectStore(HIDDEN_STORE)
      const record: HiddenPoolEntry = {
        ...entry,
        hiddenAt: Date.now(),
      }
      const req = store.put(record)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

/** Remove an app from the hidden pool (unhide) */
export async function idbUnhidePackage(
  packageName: string
): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(HIDDEN_STORE, 'readwrite')
      const store = tx.objectStore(HIDDEN_STORE)
      const req = store.delete(packageName)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

/** Get all hidden pool entries */
export async function idbGetAllHidden(): Promise<HiddenPoolEntry[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(HIDDEN_STORE, 'readonly')
      const store = tx.objectStore(HIDDEN_STORE)
      const req = store.getAll()
      req.onsuccess = () => resolve((req.result as HiddenPoolEntry[]) || [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

/** Check if a package is in the hidden pool */
export async function idbIsPackageHidden(
  packageName: string
): Promise<boolean> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(HIDDEN_STORE, 'readonly')
      const store = tx.objectStore(HIDDEN_STORE)
      const req = store.get(packageName)
      req.onsuccess = () => {
        const result = req.result as HiddenPoolEntry | undefined
        resolve(result?.hidden === true)
      }
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

/** Get all hidden package names as string array */
export async function idbGetHiddenPoolNames(): Promise<string[]> {
  const entries = await idbGetAllHidden()
  return entries.filter(e => e.hidden).map(e => e.packageName)
}

// ══════════════════════════════════════════════════════════════
// UTILITY
// ══════════════════════════════════════════════════════════════

/** Clear all security IndexedDB data */
export async function idbClearAll(): Promise<void> {
  try {
    const db = await openDB()
    const tx1 = db.transaction(LOCKED_STORE, 'readwrite')
    tx1.objectStore(LOCKED_STORE).clear()
    const tx2 = db.transaction(HIDDEN_STORE, 'readwrite')
    tx2.objectStore(HIDDEN_STORE).clear()
    dbInstance = null
  } catch {
    // Silently fail
  }
}
