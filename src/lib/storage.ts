// src/lib/storage.ts
// ============================================================================
// Real Capacitor Filesystem helpers used by Profile (download count) and
// Settings (storage breakdown).
//
// IMPORTANT: Capacitor Filesystem plugin is NOT installed in the base web
// build (only @capacitor/core is). All native calls use dynamic import()
// so the production build never fails when the plugin is missing — on web,
// the functions return graceful empty/zero values, and the user is never
// shown a crash. On Android APK builds that include @capacitor/filesystem,
// the real native filesystem is queried.
// ============================================================================

export interface StorageBreakdown {
  downloadsBytes: number;
  cacheBytes: number;
  otherBytes: number;
  totalBytes: number;
}

// ---------------------------------------------------------------------------
// Local type-shim for @capacitor/filesystem.
// Avoids a hard TS error when the plugin is not installed in the web build.
// The runtime dynamic import is still attempted; if it fails, getFilesystem()
// returns null and all callers fall back to safe zero values.
// ---------------------------------------------------------------------------

export type CapDirectory = 'DOCUMENTS' | 'EXTERNAL' | 'EXTERNAL_STORAGE' | 'CACHE' | 'DATA' | 'LIBRARY';

interface CapStatResult {
  size?: number;
  type?: 'file' | 'directory';
  uri?: string;
  mtime?: number;
}

interface CapReadResult {
  files: Array<{ name: string; type: 'file' | 'directory' }>;
}

interface CapFilesystemPlugin {
  readdir(opts: { path: string; directory: CapDirectory }): Promise<CapReadResult>;
  stat(opts: { path: string; directory: CapDirectory }): Promise<CapStatResult>;
  writeFile(opts: {
    path: string;
    data: string;
    directory: CapDirectory;
    encoding?: string;
  }): Promise<{ uri?: string }>;
}

interface CapFilesystemModule {
  Filesystem: CapFilesystemPlugin;
  Directory: {
    Documents: CapDirectory;
    External: CapDirectory;
    ExternalStorage: CapDirectory;
    Cache: CapDirectory;
    Data: CapDirectory;
    Library: CapDirectory;
  };
}

const DOWNLOAD_DIRS = [
  'PlayNexa/Movies',
  'PlayNexa/Music',
  'PlayNexa/Games',
  'PlayNexa/Downloads',
];

/**
 * Check whether Capacitor Filesystem is available in the current runtime.
 * Safe to call on web — returns null.
 */
async function getFilesystem(): Promise<CapFilesystemModule | null> {
  try {
    if (typeof window === 'undefined') return null;
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return null;
    // Use string variable so bundler leaves this dynamic.
    const mod = 'filesystem';
    const path = `@capacitor/${mod}`;
    const imported = await import(/* webpackIgnore: true */ /* @vite-ignore */ path);
    return imported as CapFilesystemModule;
  } catch {
    return null;
  }
}

/**
 * Recursively sum file sizes in a directory using Capacitor Filesystem.
 * Returns 0 on any error or when Filesystem is unavailable (web).
 */
async function getDirSize(
  path: string,
  directory: CapDirectory
): Promise<number> {
  try {
    const fs = await getFilesystem();
    if (!fs) return 0;

    const result = await fs.Filesystem.readdir({ path, directory });
    let total = 0;
    for (const entry of result.files) {
      const fullPath = `${path}/${entry.name}`;
      if (entry.type === 'directory') {
        total += await getDirSize(fullPath, directory);
      } else {
        try {
          const stat = await fs.Filesystem.stat({ path: fullPath, directory });
          total += stat.size || 0;
        } catch {
          /* skip unreadable file */
        }
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Compute the full storage breakdown.
 * - Downloads: real bytes from Capacitor Filesystem across DOWNLOAD_DIRS.
 * - Cache: real bytes from `pn_cache_*` localStorage keys.
 * - Other: reserved for future use (currently 0).
 * - Total: sum of the three.
 *
 * Safe to call on web — returns zeros for downloads, real bytes for cache.
 */
export async function getStorageBreakdown(): Promise<StorageBreakdown> {
  let downloadsBytes = 0;

  // Only attempt filesystem scan if Capacitor native plugin is present.
  const fs = await getFilesystem();
  if (fs) {
    for (const dir of DOWNLOAD_DIRS) {
      downloadsBytes += await getDirSize(dir, fs.Directory.External);
    }
  }

  // Cache = localStorage size estimate for pn_cache_ prefixed keys.
  let cacheBytes = 0;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('pn_cache_')) {
          cacheBytes += new Blob([
            localStorage.getItem(key) || '',
          ]).size;
        }
      }
    }
  } catch {
    /* private mode / disabled storage */
  }

  const otherBytes = 0; // reserved for future use

  return {
    downloadsBytes,
    cacheBytes,
    otherBytes,
    totalBytes: downloadsBytes + cacheBytes + otherBytes,
  };
}

/**
 * Remove all `pn_cache_*` keys from localStorage.
 * Returns the number of bytes freed.
 */
export async function clearAppCache(): Promise<number> {
  let freed = 0;
  const keysToRemove: string[] = [];

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('pn_cache_')) {
          freed += new Blob([
            localStorage.getItem(key) || '',
          ]).size;
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    /* swallow */
  }

  return freed;
}

/**
 * Reset all Play Nexa app data in localStorage.
 * Keeps auth/theme/language keys safe; clears everything else prefixed `pn_`.
 *
 * Does NOT touch downloaded media files on the filesystem — those persist
 * across resets so the user doesn't have to re-download movies/music/games.
 */
export async function resetAppData(): Promise<void> {
  const keysToKeep = ['pn_theme', 'pn_language'];
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const allKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith('pn_')
    );

    allKeys.forEach((k) => {
      if (!keysToKeep.includes(k)) {
        localStorage.removeItem(k);
      }
    });

    // Also clear sessionStorage (transient caches).
    try {
      sessionStorage.clear();
    } catch {
      /* swallow */
    }
  } catch {
    /* swallow */
  }
}

/**
 * Human-readable byte formatter:
 *   < 1 KB   → "X.X KB"
 *   < 1 MB   → "X MB"
 *   < 1 GB   → "X MB"
 *   >= 1 GB  → "X.XX GB"
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (kb < 1) return `${bytes} B`;
  if (mb < 1) return `${kb.toFixed(1)} KB`;
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

/**
 * Write a backup JSON file to the user's Documents directory via Capacitor
 * Filesystem. Returns the filename on success, null on any failure
 * (including missing plugin on web).
 */
export async function writeBackupFile(
  content: string,
  fileName: string
): Promise<string | null> {
  try {
    const fs = await getFilesystem();
    if (!fs) return null;

    await fs.Filesystem.writeFile({
      path: fileName,
      data: content,
      directory: fs.Directory.Documents,
    });
    return fileName;
  } catch {
    return null;
  }
}
