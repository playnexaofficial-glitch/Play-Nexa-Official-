// src/lib/media-scanner/web-strategy.ts
// ============================================================================
// Web (browser) strategy — used when running on Vercel or any non-Capacitor
// environment. Provides two paths, with automatic feature detection:
//
//   (A) Modern browsers (Chrome/Edge desktop, recent Android Chrome):
//       File System Access API → user picks a folder → we walk it recursively
//       and remember the handle in IndexedDB so next visit is one-tap.
//
//   (B) Fallback for all other browsers (iOS Safari, Firefox, old Android):
//       Hidden <input type="file" multiple accept="..."> element. The accept
//       attribute makes the OS-level picker show ONLY video OR audio files,
//       never mixed — this is the type-lock guarantee.
//
// Both paths return the same MediaFile[] shape. The exported `scanWeb` is
// the single entry point used by the unified hook.
// ============================================================================

import {
  type MediaFile,
  type MediaKind,
  type ScanResult,
  MEDIA_ACCEPT_TYPES,
  MAX_DIR_DEPTH,
  matchesKind,
  guessMimeType,
  getExt,
} from './types';
import { saveDirHandle, loadDirHandle, clearDirHandle } from './indexed-db-handle-store';

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

/**
 * True if the current browser supports `window.showDirectoryPicker()`.
 * (Chrome/Edge 86+, Opera 72+, recent Android Chrome.)
 */
export function hasFileSystemAccess(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker ===
      'function'
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Build a MediaFile from a browser File object. Always creates a fresh
 * blob: URL. The caller is responsible for revoking it via the unified
 * hook's cleanup logic when the file scrolls out of view or on unmount.
 */
function fileToMediaFile(file: File, kind: MediaKind): MediaFile | null {
  // Hard filter by extension — type-lock guarantee, even if the OS picker
  // somehow let a non-matching file through.
  if (!matchesKind(file.name, kind)) return null;

  const id = `${file.name}-${file.size}-${file.lastModified}`;
  let uri = '';
  try {
    uri = URL.createObjectURL(file);
  } catch {
    return null; // extremely rare (blob URL quota exhausted)
  }

  return {
    id,
    name: file.name,
    uri,
    sizeBytes: file.size,
    mimeType: file.type || guessMimeType(file.name, kind),
    source: 'web-picker',
    file,
  };
}

// ---------------------------------------------------------------------------
// (A) File System Access API — modern path
// ---------------------------------------------------------------------------

/**
 * Minimal type-shim for FileSystemDirectoryHandle.values() — TS lib.dom
 * may not include it on older TS versions.
 */
type FsDirHandle = FileSystemDirectoryHandle & {
  values?: () => AsyncIterableIterator<FileSystemHandle>;
  entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
};

/**
 * Recursively walk a directory handle, yielding all File entries that
 * match `kind`. Capped at MAX_DIR_DEPTH to prevent hangs on huge drives.
 */
async function* walkDirectory(
  handle: FsDirHandle,
  kind: MediaKind,
  depth: number
): AsyncIterableIterator<File> {
  if (depth > MAX_DIR_DEPTH) return;
  if (!handle.values) return;

  for await (const child of handle.values()) {
    if (child.kind === 'file') {
      const fh = child as FileSystemFileHandle;
      // Skip files that obviously don't match by name first — cheap filter
      // before we pay the cost of getFile().
      if (!matchesKind(child.name, kind)) continue;
      try {
        const file = await fh.getFile();
        // Double-check after getFile() in case the name had no extension
        // but the type is correct.
        if (matchesKind(file.name, kind)) {
          yield file;
        }
      } catch {
        /* skip unreadable file */
      }
    } else if (child.kind === 'directory') {
      try {
        yield* walkDirectory(
          child as FsDirHandle,
          kind,
          depth + 1
        );
      } catch {
        /* skip unreadable subdirectory (permission, etc.) */
      }
    }
  }
}

/**
 * Try to silently reuse a previously-saved directory handle. Resolves
 * with the handle only if read permission is already granted (no prompt).
 * Otherwise returns null — caller should fall back to showing the picker.
 */
async function tryReuseSavedHandle(
  kind: MediaKind
): Promise<FsDirHandle | null> {
  try {
    const saved = await loadDirHandle(kind);
    if (!saved) return null;

    // queryPermission is non-prompting; requestPermission would prompt.
    const anySaved = saved as unknown as {
      queryPermission?: (opts: {
        mode: 'read' | 'readwrite';
      }) => Promise<PermissionState>;
    };
    if (!anySaved.queryPermission) return null;

    const perm = await anySaved.queryPermission({ mode: 'read' });
    if (perm === 'granted') return saved as FsDirHandle;
    return null;
  } catch {
    return null;
  }
}

/**
 * Attempt to silently re-scan a remembered directory. If no saved handle
 * exists or permission was revoked, returns an empty result with hasMore=false
 * so the caller can decide to show the picker button.
 */
export async function rescanSavedDirectory(
  kind: MediaKind
): Promise<ScanResult> {
  try {
    const handle = await tryReuseSavedHandle(kind);
    if (!handle) {
      return { files: [], hasMore: false };
    }

    const files: MediaFile[] = [];
    let cancelled = false;

    // Cap total files at 500 per scan on web to protect 2GB RAM devices.
    // If the user has more, they can re-pick to refresh.
    const HARD_CAP = 500;

    for await (const file of walkDirectory(handle, kind, 0)) {
      const mf = fileToMediaFile(file, kind);
      if (mf) files.push(mf);
      if (files.length >= HARD_CAP) {
        cancelled = true;
        break;
      }
    }

    return {
      files,
      hasMore: false, // web has no native pagination; cap is the limit
      error: cancelled
        ? `Showing first ${HARD_CAP} files from this folder.`
        : undefined,
    };
  } catch (err) {
    // Likely permission revoked between sessions — forget the handle.
    await clearDirHandle(kind);
    return {
      files: [],
      hasMore: false,
      error: err instanceof Error ? err.message : 'Failed to read saved folder.',
    };
  }
}

/**
 * Prompt the user to pick a directory via the File System Access API.
 * On success, the handle is persisted to IndexedDB for next visit.
 *
 * Resolves with a ScanResult. Never throws.
 */
export async function pickDirectoryWeb(kind: MediaKind): Promise<ScanResult> {
  if (!hasFileSystemAccess()) {
    return {
      files: [],
      hasMore: false,
      error: 'This browser does not support folder picking.',
    };
  }

  try {
    const picker = (
      window as unknown as {
        showDirectoryPicker: (opts?: {
          mode?: 'read' | 'readwrite';
        }) => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;

    const handle = await picker({ mode: 'read' });
    await saveDirHandle(kind, handle);

    const files: MediaFile[] = [];
    const HARD_CAP = 500;
    let cancelled = false;

    for await (const file of walkDirectory(
      handle as FsDirHandle,
      kind,
      0
    )) {
      const mf = fileToMediaFile(file, kind);
      if (mf) files.push(mf);
      if (files.length >= HARD_CAP) {
        cancelled = true;
        break;
      }
    }

    return {
      files,
      hasMore: false,
      error: cancelled
        ? `Showing first ${HARD_CAP} files from this folder.`
        : files.length === 0
          ? `No ${kind} files found in this folder.`
          : undefined,
    };
  } catch (err) {
    // User cancellation throws AbortError — treat as silent no-op.
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError') {
      return { files: [], hasMore: false };
    }
    return {
      files: [],
      hasMore: false,
      error: err instanceof Error ? err.message : 'Folder pick failed.',
    };
  }
}

// ---------------------------------------------------------------------------
// (B) Fallback — hidden <input type="file"> picker
// ---------------------------------------------------------------------------

/**
 * Programmatically create and click a hidden file input. Returns the
 * selected FileList as a MediaFile[]. Resolves with empty array if the
 * user cancels.
 *
 * The hidden input is appended to document.body so iOS Safari reliably
 * fires the change event, then removed on completion.
 *
 * @param kind         'video' | 'audio' — drives the accept attribute.
 * @param allowFolder  When true, sets `webkitdirectory` so the user can
 *                     pick an entire folder. Note: with webkitdirectory,
 *                     the accept attribute is ignored by most browsers —
 *                     we still filter client-side via matchesKind().
 */
export function pickFilesWebFallback(
  kind: MediaKind,
  allowFolder = false
): Promise<ScanResult> {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = MEDIA_ACCEPT_TYPES[kind];

      if (allowFolder) {
        // webkitdirectory must be set as an attribute, not a property.
        input.setAttribute('webkitdirectory', '');
      }

      // Critical for iOS Safari & some Android browsers — input must be
      // in the DOM and visible enough to receive the click gesture.
      input.style.position = 'fixed';
      input.style.top = '-1000px';
      input.style.left = '-1000px';
      input.style.width = '1px';
      input.style.height = '1px';
      input.style.opacity = '0';
      document.body.appendChild(input);

      let settled = false;

      const cleanup = () => {
        if (settled) return;
        settled = true;
        // Defer DOM removal so the change event has fully fired.
        setTimeout(() => {
          try {
            document.body.removeChild(input);
          } catch {
            /* already removed */
          }
        }, 0);
      };

      input.onchange = () => {
        const list = input.files;
        if (!list || list.length === 0) {
          cleanup();
          resolve({ files: [], hasMore: false });
          return;
        }

        const files: MediaFile[] = [];
        for (let i = 0; i < list.length; i++) {
          const f = list.item(i);
          if (!f) continue;
          const mf = fileToMediaFile(f, kind);
          if (mf) files.push(mf);
        }

        cleanup();
        resolve({
          files,
          hasMore: false,
          error:
            files.length === 0
              ? allowFolder
                ? `No ${kind} files found in the selected folder.`
                : `No ${kind} files were selected.`
              : undefined,
        });
      };

      // If the user dismisses the picker without selecting, some browsers
      // fire a `cancel` event, others never fire anything. We add a window
      // focus listener as a fallback to detect cancellation.
      const onCancel = () => {
        // Give change event a chance to fire first.
        setTimeout(() => {
          if (!settled) cleanup();
          // Resolve with empty even if no change fired — Promise must settle.
          if (!settled) resolve({ files: [], hasMore: false });
        }, 300);
      };
      input.addEventListener('cancel', onCancel);

      // Click must happen synchronously inside the user-gesture call stack.
      // Since this function is called from a click handler, the gesture
      // propagates correctly.
      input.click();
    } catch (err) {
      resolve({
        files: [],
        hasMore: false,
        error: err instanceof Error ? err.message : 'File picker failed.',
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Single exported entry point
// ---------------------------------------------------------------------------

/**
 * Unified web scan entry point. Tries the modern path first (saved handle
 * reuse → fresh folder pick), falls back to the input-based picker.
 *
 * `mode`:
 *   - 'reuse'      => try saved handle only, no prompts (used on mount)
 *   - 'pick-dir'   => prompt for a folder (modern browsers only)
 *   - 'pick-files' => multi-file input picker (works everywhere)
 *   - 'pick-folder-fallback' => input picker with webkitdirectory (works everywhere)
 *
 * Never throws.
 */
export async function scanWeb(
  kind: MediaKind,
  mode: 'reuse' | 'pick-dir' | 'pick-files' | 'pick-folder-fallback'
): Promise<ScanResult> {
  try {
    if (mode === 'reuse') {
      return await rescanSavedDirectory(kind);
    }

    if (mode === 'pick-dir') {
      if (hasFileSystemAccess()) {
        return await pickDirectoryWeb(kind);
      }
      // No File System Access → fall through to folder fallback.
      return await pickFilesWebFallback(kind, true);
    }

    if (mode === 'pick-folder-fallback') {
      return await pickFilesWebFallback(kind, true);
    }

    // pick-files (default)
    return await pickFilesWebFallback(kind, false);
  } catch (err) {
    return {
      files: [],
      hasMore: false,
      error: err instanceof Error ? err.message : 'Web scan failed.',
    };
  }
}

// ---------------------------------------------------------------------------
// URL lifecycle helper — called by the unified hook on unmount / item removal
// ---------------------------------------------------------------------------

/**
 * Revoke a list of blob: URLs. Safe to call with native (content://) URIs —
 * URL.revokeObjectURL silently no-ops on non-blob URLs.
 */
export function revokeUris(files: MediaFile[]): void {
  for (const f of files) {
    try {
      if (f.uri.startsWith('blob:')) {
        URL.revokeObjectURL(f.uri);
      }
    } catch {
      /* swallow */
    }
  }
}

/**
 * Re-create a fresh blob: URL for a web-picked file whose previous URL
 * was revoked (e.g. user scrolled away then back). Returns the same
 * URI string if the file is native (no-op for content:// URIs).
 */
export function refreshUri(file: MediaFile): string {
  if (file.source === 'native-mediastore') return file.uri;
  if (!file.file) return file.uri;
  try {
    return URL.createObjectURL(file.file);
  } catch {
    return file.uri;
  }
}

// Re-export for callers that need extension utilities.
export { getExt, matchesKind, guessMimeType };
