// src/lib/media-scanner/native-strategy.ts
// ============================================================================
// Native (Android APK) strategy — used when the app is running inside a
// Capacitor webview. Scans the device's MediaStore automatically with NO
// manual picker step, paginated 50 items at a time.
//
// PLUGIN REQUIREMENT
// ------------------
// This module dynamically imports a Capacitor community plugin named
// '@capacitor-community/media'. If you have not installed it yet, the
// dynamic import will fail gracefully and the functions here return
// 'denied' / empty results — the app NEVER crashes. To enable real
// MediaStore scanning, run:
//
//   npm install @capacitor-community/media
//   npx cap sync android
//
// And add the permissions from android-config/AndroidManifest-additions.xml
// to your AndroidManifest.xml.
//
// WHY DYNAMIC IMPORT?
// -------------------
// We use a string variable for the import path so TypeScript / webpack /
// Next.js do not hard-fail the production build when the plugin is not yet
// installed. This lets the WEB build (Vercel) ship without ever needing
// the plugin, while the APK build (GitHub Actions) can opt in.
// ============================================================================

import {
  type MediaFile,
  type MediaKind,
  type PermissionState,
  type ScanResult,
  PAGE_SIZE,
  NATIVE_TIMEOUT_MS,
  guessMimeType,
} from './types';

// ---------------------------------------------------------------------------
// Plugin path — change here if you fork / rename the plugin
// ---------------------------------------------------------------------------

/**
 * String constant for the dynamic import path. DO NOT replace with a
 * static import statement — that would force every web build to ship
 * the plugin (and fail if it's not installed).
 */
const PLUGIN_PATH = '@capacitor-community/media';

/**
 * Lazy-cached plugin module. Set to `null` after first failure so we
 * don't keep retrying a missing import on every page request.
 */
let pluginCache: unknown | null = undefined; // undefined = not tried yet

/**
 * Dynamic import the media plugin. Returns null on any failure
 * (not installed, network error, etc.) so callers can degrade gracefully.
 */
async function getPlugin<T = unknown>(): Promise<T | null> {
  if (pluginCache !== undefined) return pluginCache as T | null;
  try {
    // webpackIgnore comment tells bundlers to leave this import dynamic.
    const mod = await import(
      /* webpackIgnore: true */
      /* @vite-ignore */
      PLUGIN_PATH
    );
    pluginCache = mod?.default ?? mod;
    return pluginCache as T;
  } catch (err) {
    console.warn(
      '[media-scanner] Native media plugin not available.',
      'Install @capacitor-community/media to enable device scanning.',
      err
    );
    pluginCache = null;
    return null;
  }
}

/**
 * Native plugin interface — matches @capacitor-community/media's surface
 * (or any equivalent plugin that exposes the same method names).
 *
 * If your plugin uses different method names, adapt this interface and
 * the calls in requestNativePermission / scanNative accordingly.
 */
interface MediaStorePlugin {
  // Permission
  checkPermissions?: () => Promise<{ [k: string]: string }>;
  requestPermissions?: () => Promise<{ [k: string]: string }>;
  // Media listing (paginated). Method name varies by plugin — we try
  // several common aliases.
  getMedia?: (opts: {
    kind: MediaKind;
    page: number;
    pageSize: number;
  }) => Promise<{ items: NativeMediaItem[]; hasMore?: boolean }>;
  getMedias?: (opts: {
    kind: MediaKind;
    page: number;
    pageSize: number;
  }) => Promise<{ items: NativeMediaItem[]; hasMore?: boolean }>;
  list?: (opts: {
    kind: MediaKind;
    page: number;
    pageSize: number;
  }) => Promise<{ items: NativeMediaItem[]; hasMore?: boolean }>;
}

interface NativeMediaItem {
  /** MediaStore _ID column — used as the stable id. */
  id?: string | number;
  /** Display name from MediaStore.MediaColumns.DISPLAY_NAME. */
  displayName?: string;
  /** Display name fallback. */
  name?: string;
  /** content:// or file:// URI. */
  uri?: string;
  /** content:// fallback. */
  contentUri?: string;
  /** File path fallback (file:///storage/...). */
  path?: string;
  /** Size in bytes. */
  size?: number;
  /** Duration in ms (MediaStore.MediaColumns.DURATION). */
  duration?: number;
  /** MIME type. */
  mimeType?: string;
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/**
 * True if running inside a Capacitor native shell (Android APK).
 * Mirrors the check used in the unified hook.
 */
export function isNativePlatform(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform === 'function' &&
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform()
  );
}

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

/**
 * Map the plugin's permission result strings to our PermissionState.
 * Different plugins return 'granted' | 'denied' | 'prompt' | 'limited'
 * | 'never_ask_again' etc. We collapse to granted | denied | unsupported.
 */
function mapPermission(
  raw: Record<string, string> | undefined,
  kind: MediaKind
): PermissionState {
  if (!raw) return 'denied';
  // The plugin typically returns { storage: 'granted' } or
  // { mediaVideo: 'granted', mediaAudio: 'granted' } depending on
  // Android API level. Check the most-specific key first.
  const keys =
    kind === 'video'
      ? ['mediaVideo', 'video', 'storage']
      : ['mediaAudio', 'audio', 'storage'];
  for (const k of keys) {
    const v = raw[k];
    if (v === 'granted' || v === 'limited') return 'granted';
    if (v === 'denied' || v === 'never_ask_again' || v === 'blocked') {
      return 'denied';
    }
  }
  // No permission entry at all → treat as denied (plugin not fully wired up).
  return 'denied';
}

/**
 * Request permission to read device media of the given kind.
 *
 * Returns 'granted' on success, 'denied' on any failure or user denial,
 * 'unsupported' if the plugin is not installed.
 *
 * Never throws.
 */
export async function requestNativePermission(
  kind: MediaKind
): Promise<PermissionState> {
  try {
    if (!isNativePlatform()) return 'unsupported';

    const plugin = await getPlugin<MediaStorePlugin>();
    if (!plugin) {
      console.warn(
        `[media-scanner] Cannot request ${kind} permission — ` +
          'plugin not installed. See native-strategy.ts header.'
      );
      return 'unsupported';
    }

    // If the plugin exposes checkPermissions, ask first to avoid
    // re-prompting on every app launch.
    if (typeof plugin.checkPermissions === 'function') {
      try {
        const current = await withTimeout(
          plugin.checkPermissions(),
          NATIVE_TIMEOUT_MS
        );
        const state = mapPermission(current, kind);
        if (state === 'granted') return 'granted';
      } catch {
        /* fall through to requestPermissions */
      }
    }

    if (typeof plugin.requestPermissions === 'function') {
      const result = await withTimeout(
        plugin.requestPermissions(),
        NATIVE_TIMEOUT_MS
      );
      return mapPermission(result, kind);
    }

    // Plugin exists but has no permission methods — assume granted
    // (some plugins auto-handle permissions natively and just expose scan).
    return 'granted';
  } catch (err) {
    console.warn('[media-scanner] requestNativePermission failed:', err);
    return 'denied';
  }
}

// ---------------------------------------------------------------------------
// Scan (paginated)
// ---------------------------------------------------------------------------

/**
 * Helper: race a promise against a timeout. Rejects with a TimeoutError
 * if the timeout fires first. Used so native scans never hang the UI.
 */
async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Native call timed out after ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * Map a single native media item to our MediaFile shape.
 */
function mapNativeItem(item: NativeMediaItem, kind: MediaKind): MediaFile | null {
  const name = item.displayName || item.name || 'unknown';
  const uri = item.uri || item.contentUri || (item.path ? `file://${item.path}` : '');
  if (!uri) return null;

  const id =
    item.id != null ? String(item.id) : `${name}-${item.size ?? 0}`;

  return {
    id,
    name,
    uri,
    sizeBytes: item.size ?? 0,
    durationSec: item.duration ? Math.round(item.duration / 1000) : undefined,
    mimeType: item.mimeType || guessMimeType(name, kind),
    source: 'native-mediastore',
    // file: undefined on native (no browser File object)
  };
}

/**
 * Scan a single page of native media. Page numbers are 0-indexed.
 *
 * Falls back to an empty result on any failure. The 5-second timeout
 * ensures we always return *something* — partial results are better
 * than a hung UI on a 2GB RAM device where the MediaStore may be slow
 * to respond on first launch.
 */
export async function scanNative(
  kind: MediaKind,
  page: number
): Promise<ScanResult> {
  try {
    if (!isNativePlatform()) {
      return { files: [], hasMore: false, error: 'Not running on native platform.' };
    }

    const plugin = await getPlugin<MediaStorePlugin>();
    if (!plugin) {
      return {
        files: [],
        hasMore: false,
        error: 'MediaStore plugin not installed.',
      };
    }

    // Pick the first available listing method — different plugin forks
    // use slightly different names.
    const listFn =
      plugin.getMedia ?? plugin.getMedias ?? plugin.list ?? null;

    if (!listFn) {
      return {
        files: [],
        hasMore: false,
        error: 'Plugin has no media-listing method.',
      };
    }

    let result: { items: NativeMediaItem[]; hasMore?: boolean };
    try {
      result = await withTimeout(
        listFn.call(plugin, { kind, page, pageSize: PAGE_SIZE }),
        NATIVE_TIMEOUT_MS
      );
    } catch (err) {
      // Timeout or native error — return what we have (which is nothing
      // for this page) plus a friendly error.
      return {
        files: [],
        hasMore: false,
        error:
          err instanceof Error
            ? `Media scan failed: ${err.message}`
            : 'Media scan failed.',
      };
    }

    const items = result?.items ?? [];
    const files: MediaFile[] = [];
    for (const item of items) {
      const mf = mapNativeItem(item, kind);
      if (mf) files.push(mf);
    }

    // hasMore: prefer plugin-supplied flag, else infer from page fill.
    const hasMore =
      typeof result.hasMore === 'boolean'
        ? result.hasMore
        : files.length === PAGE_SIZE;

    return { files, hasMore };
  } catch (err) {
    return {
      files: [],
      hasMore: false,
      error: err instanceof Error ? err.message : 'Native scan failed.',
    };
  }
}
