// ── Play Nexa IndexedDB Store ──────────────────────────────────
// Stores heavy media Blobs for Private Locker
// localStorage crashes with video blobs — IndexedDB handles them safely
// Zero dependencies · 2GB RAM safe · lazy-initialized

const DB_NAME = 'pn_locker_db'
const STORE_NAME = 'blobs'
const DB_VERSION = 1

// ── Lazy-open database (singleton) ───────────────────────────
let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
    req.onblocked = () => {
      dbPromise = null
      reject(new Error('IDB blocked'))
    }
  })

  return dbPromise
}

// ── Stored blob record ───────────────────────────────────────
export interface StoredBlob {
  id: string        // matches SafeEntry.id
  blob: Blob        // actual media blob
  mimeType: string  // e.g. 'video/mp4', 'audio/mpeg', 'image/jpeg'
  addedAt: number
}

// ── Save a blob to IndexedDB ─────────────────────────────────
export async function saveBlob(
  id: string,
  blob: Blob,
  mimeType: string
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ id, blob, mimeType, addedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Get a single blob by ID ──────────────────────────────────
export async function getBlob(id: string): Promise<StoredBlob | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror = () => reject(req.error)
  })
}

// ── Get all blobs ────────────────────────────────────────────
export async function getAllBlobs(): Promise<StoredBlob[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result ?? [])
    req.onerror = () => reject(req.error)
  })
}

// ── Delete a single blob by ID ───────────────────────────────
export async function deleteBlob(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Clear all blobs (e.g. on locker reset) ──────────────────
export async function clearAllBlobs(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
