// src/lib/media-scanner/useLocalMediaScanner.ts
// ============================================================================
// Unified React hook that adapts the dual-mode media scanner to the
// existing UI components. One hook, one shape (MediaFile[]), two
// completely different data sources behind the scenes:
//
//   - WEB (Vercel / browser): user picks files or folder via a button.
//     The hook exposes `pickFiles()` and `pickFolder()` for the UI to call.
//
//   - NATIVE (Android APK): on mount, automatically requests permission
//     and starts scanning page 0. The hook exposes `loadMore()` for
//     infinite-scroll pagination.
//
// Performance / memory rules baked in:
//   * Pagination everywhere — 50 items per page on native, hard cap 500
//     per folder on web.
//   * On web, blob: URLs are tracked in a Set and revoked on unmount
//     or when the user re-picks a different folder.
//   * Native URIs (content://) are NOT revoked (no-op), so the Set is
//     safe to call revokeUrls() on regardless of source.
//   * All async work is guarded against unmount — no setState on dead
//     components (avoids React warnings + memory leaks).
// ============================================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type MediaFile,
  type MediaKind,
  type PermissionState,
} from './types';
import { scanWeb, revokeUris } from './web-strategy';
import {
  isNativePlatform,
  requestNativePermission,
  scanNative,
} from './native-strategy';

export interface UseLocalMediaScannerResult {
  /** Current list of media files, appended to across pages (native) or replaced on pick (web). */
  files: MediaFile[];
  /** True while a permission request or initial scan is in flight. */
  isLoading: boolean;
  /** True while loadMore() is fetching the next page. */
  isLoadingMore: boolean;
  /** Last error message, or null. UI should show this via MediaScanStatus. */
  error: string | null;
  /** Current permission state. */
  permissionState: PermissionState;
  /** True on native platforms. UI uses this to hide the picker button. */
  isNative: boolean;
  /** True if there are more pages to load on native. Always false on web. */
  hasMore: boolean;

  /**
   * On native: trigger the initial permission request + first page scan.
   * On web: no-op (UI uses pickFiles / pickFolder instead).
   * Safe to call multiple times.
   */
  requestScan: () => Promise<void>;

  /**
   * On native: load the next page of results (50 more items).
   * On web: no-op.
   */
  loadMore: () => Promise<void>;

  /**
   * On web: open the multi-file picker (input type=file multiple).
   * Replaces the current files array.
   * On native: no-op.
   */
  pickFiles: () => Promise<void>;

  /**
   * On web: open the folder picker (File System Access API if available,
   * webkitdirectory input otherwise). Replaces the current files array.
   * On native: no-op.
   */
  pickFolder: () => Promise<void>;

  /**
   * Forget all currently-loaded files (revokes their blob URLs on web).
   * Useful for a "Clear" / "Rescan" button.
   */
  clear: () => void;
}

/**
 * Hook body.
 */
export function useLocalMediaScanner(
  kind: MediaKind
): UseLocalMediaScannerResult {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] =
    useState<PermissionState>('idle');
  const [hasMore, setHasMore] = useState(false);

  const isNative = isNativePlatform();

  // Track current page on native for pagination.
  const pageRef = useRef(0);

  // Track whether the initial scan has been attempted (prevents re-runs
  // in StrictMode on dev which mounts components twice).
  const initialScanDoneRef = useRef(false);

  // Track mounted state to avoid setState after unmount.
  const mountedRef = useRef(true);

  // Track all blob: URLs we've created so we can revoke them on unmount
  // or when the file list is replaced. Native content:// URIs are added
  // too but revokeObjectURL() no-ops on them, so it's safe.
  const urlSetRef = useRef<Set<string>>(new Set());

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  const safeSetFiles = useCallback(
    (updater: (prev: MediaFile[]) => MediaFile[]) => {
      if (mountedRef.current) setFiles(updater);
    },
    []
  );
  const safeSetLoading = useCallback((v: boolean) => {
    if (mountedRef.current) setIsLoading(v);
  }, []);
  const safeSetLoadingMore = useCallback((v: boolean) => {
    if (mountedRef.current) setIsLoadingMore(v);
  }, []);
  const safeSetError = useCallback((v: string | null) => {
    if (mountedRef.current) setError(v);
  }, []);
  const safeSetPermission = useCallback((v: PermissionState) => {
    if (mountedRef.current) setPermissionState(v);
  }, []);
  const safeSetHasMore = useCallback((v: boolean) => {
    if (mountedRef.current) setHasMore(v);
  }, []);

  const trackUrls = useCallback((items: MediaFile[]) => {
    for (const f of items) {
      urlSetRef.current.add(f.uri);
    }
  }, []);

  /**
   * Revoke all currently-tracked URLs. Called on clear() and unmount.
   * Does NOT clear urlSetRef — caller does that.
   */
  const revokeAll = useCallback(() => {
    revokeUris(Array.from(urlSetRef.current).map((uri) => ({ uri } as MediaFile)));
    urlSetRef.current.clear();
  }, []);

  // -----------------------------------------------------------------------
  // Native: initial scan + loadMore
  // -----------------------------------------------------------------------

  const requestScan = useCallback(async () => {
    if (!isNative) {
      // On web, the UI calls pickFiles / pickFolder explicitly.
      // We do attempt a silent re-scan of a saved directory handle so
      // returning users don't have to re-pick on every visit.
      if (initialScanDoneRef.current) return;
      initialScanDoneRef.current = true;
      safeSetLoading(true);
      safeSetError(null);
      try {
        const result = await scanWeb(kind, 'reuse');
        if (result.files.length > 0) {
          safeSetFiles(() => result.files);
          trackUrls(result.files);
          safeSetPermission('granted');
        }
        if (result.error) safeSetError(result.error);
      } finally {
        safeSetLoading(false);
      }
      return;
    }

    if (initialScanDoneRef.current) return;
    initialScanDoneRef.current = true;

    safeSetLoading(true);
    safeSetError(null);
    safeSetPermission('prompting');

    try {
      const perm = await requestNativePermission(kind);
      safeSetPermission(perm);
      if (perm !== 'granted') {
        safeSetError(
          perm === 'unsupported'
            ? 'Media scanning is not available on this device.'
            : 'Permission denied. Enable storage access in app settings to scan your media.'
        );
        return;
      }

      pageRef.current = 0;
      const result = await scanNative(kind, 0);
      safeSetFiles(() => result.files);
      trackUrls(result.files);
      safeSetHasMore(result.hasMore);
      if (result.error && result.files.length === 0) {
        safeSetError(result.error);
      } else if (result.error) {
        // Non-fatal — keep showing what we have but surface the warning.
        safeSetError(result.error);
      } else {
        safeSetError(null);
      }
    } catch (err) {
      safeSetError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      safeSetLoading(false);
    }
  }, [isNative, kind, safeSetFiles, safeSetLoading, safeSetError, safeSetPermission, safeSetHasMore, trackUrls]);

  const loadMore = useCallback(async () => {
    if (!isNative) return;
    if (isLoadingMore || isLoading) return;
    if (!hasMore) return;

    safeSetLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const result = await scanNative(kind, nextPage);
      if (result.files.length > 0) {
        pageRef.current = nextPage;
        safeSetFiles((prev) => [...prev, ...result.files]);
        trackUrls(result.files);
      }
      safeSetHasMore(result.hasMore);
      if (result.error) safeSetError(result.error);
    } catch (err) {
      safeSetError(err instanceof Error ? err.message : 'Failed to load more.');
    } finally {
      safeSetLoadingMore(false);
    }
  }, [isNative, isLoadingMore, isLoading, hasMore, kind, safeSetFiles, safeSetHasMore, safeSetError, safeSetLoadingMore, trackUrls]);

  // -----------------------------------------------------------------------
  // Web: pickFiles + pickFolder
  // -----------------------------------------------------------------------

  const pickFiles = useCallback(async () => {
    if (isNative) return;
    safeSetLoading(true);
    safeSetError(null);
    try {
      const result = await scanWeb(kind, 'pick-files');
      if (result.files.length > 0) {
        // Replace existing list — revoke old URLs first.
        revokeAll();
        safeSetFiles(() => result.files);
        trackUrls(result.files);
        safeSetPermission('granted');
      }
      if (result.error) safeSetError(result.error);
    } catch (err) {
      safeSetError(err instanceof Error ? err.message : 'File pick failed.');
    } finally {
      safeSetLoading(false);
    }
  }, [isNative, kind, revokeAll, safeSetFiles, safeSetError, safeSetLoading, safeSetPermission, trackUrls]);

  const pickFolder = useCallback(async () => {
    if (isNative) return;
    safeSetLoading(true);
    safeSetError(null);
    try {
      const result = await scanWeb(kind, 'pick-dir');
      if (result.files.length > 0) {
        revokeAll();
        safeSetFiles(() => result.files);
        trackUrls(result.files);
        safeSetPermission('granted');
      }
      if (result.error) safeSetError(result.error);
    } catch (err) {
      safeSetError(err instanceof Error ? err.message : 'Folder pick failed.');
    } finally {
      safeSetLoading(false);
    }
  }, [isNative, kind, revokeAll, safeSetFiles, safeSetError, safeSetLoading, safeSetPermission, trackUrls]);

  // -----------------------------------------------------------------------
  // Clear + unmount cleanup
  // -----------------------------------------------------------------------

  const clear = useCallback(() => {
    revokeAll();
    safeSetFiles(() => []);
    safeSetHasMore(false);
    safeSetError(null);
    pageRef.current = 0;
    initialScanDoneRef.current = false; // allow re-scan after clear
  }, [revokeAll, safeSetFiles, safeSetHasMore, safeSetError]);

  // -----------------------------------------------------------------------
  // Auto-trigger initial scan on mount (native) or attempt reuse (web)
  // -----------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    // Defer to next tick so React StrictMode's double-mount doesn't trigger
    // two simultaneous scans on dev.
    const timer = setTimeout(() => {
      void requestScan();
    }, 0);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      // Revoke any URLs we created to prevent memory leaks on 2GB RAM devices.
      revokeUris(
        Array.from(urlSetRef.current).map((uri) => ({ uri } as MediaFile))
      );
      urlSetRef.current.clear();
    };
     
  }, [kind]);

  return {
    files,
    isLoading,
    isLoadingMore,
    error,
    permissionState,
    isNative,
    hasMore,
    requestScan,
    loadMore,
    pickFiles,
    pickFolder,
    clear,
  };
}
