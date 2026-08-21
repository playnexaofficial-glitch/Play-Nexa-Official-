// src/lib/media-scanner/indexed-db-handle-store.ts
// ============================================================================
// Tiny IndexedDB-backed key-value store for FileSystemDirectoryHandle
// objects. Used by the web strategy to remember which directory the user
// picked last time so we can attempt to re-request permission silently
// rather than forcing the picker dialog on every visit.
//
// NO external dependencies — uses the native `indexedDB` global.
// Every operation is wrapped in try/catch and returns null on any failure
// (private browsing mode, old browsers, revoked handles, etc.) so the
// caller can gracefully fall back to showing the picker button again.
// ============================================================================

import type { MediaKind } from './types';

const DB_NAME = 'play-nexa-media-scanner';
const DB_VERSION = 1;
const STORE_NAME = 'dir-handles';

/**
 * Lazy-open the IndexedDB database. Cached after first successful open.
 * Returns null on any failure (older browsers, private mode, etc.).
 */
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // key = 'video' | 'audio', value = FileSystemDirectoryHandle
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Persist a FileSystemDirectoryHandle for the given kind.
 * Silently no-ops on any failure.
 */
export async function saveDirHandle(
  kind: MediaKind,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, kind);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    /* swallow — handle persistence is an optimisation, not a requirement */
  }
}

/**
 * Load the previously-saved FileSystemDirectoryHandle for the given kind.
 * Returns null if none saved, IndexedDB unavailable, or any error occurs.
 *
 * IMPORTANT: a non-null return does NOT mean permission is still granted.
 * The caller MUST call `handle.requestPermission({ mode: 'read' })` and
 * handle denial gracefully.
 */
export async function loadDirHandle(
  kind: MediaKind
): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    if (!db) return null;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(kind);
    return await new Promise<FileSystemDirectoryHandle | null>((resolve) => {
      req.onsuccess = () => {
        const v = req.result as FileSystemDirectoryHandle | undefined;
        resolve(v ?? null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Forget the saved handle for the given kind. Call this when permission
 * has been permanently revoked so we don't keep retrying a dead handle.
 */
export async function clearDirHandle(kind: MediaKind): Promise<void> {
  try {
    const db = await openDb();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(kind);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    /* swallow */
  }
}
