// src/lib/media-scanner/types.ts
// ============================================================================
// Shared types for the unified dual-mode media scanner.
// Both web (browser picker) and native (Android APK MediaStore) strategies
// produce MediaFile[] arrays of the same shape, so existing UI components
// never need to know which platform they are running on.
// ============================================================================

/**
 * The kind of media the caller wants to scan / pick.
 * - 'video' => only video files (mp4, mkv, webm, mov, avi)
 * - 'audio' => only audio files (mp3, m4a, flac, wav, ogg)
 *
 * This is type-locked at the strategy layer — a video screen can NEVER
 * receive audio files and vice versa, even if the user attempts to pick
 * a mixed folder.
 */
export type MediaKind = 'video' | 'audio';

/**
 * Unified shape for any media file, regardless of source.
 *
 * `uri` field:
 *   - On WEB (browser): a blob: URL created via URL.createObjectURL(file).
 *     MUST be revoked via URL.revokeObjectURL when no longer in use to
 *     prevent memory leaks on 2GB RAM devices.
 *   - On NATIVE (Android APK): a content:// or file:// URI returned by
 *     MediaStore. These do NOT need revocation, but it is safe to call
 *     URL.revokeObjectURL on them (it will silently no-op).
 */
export interface MediaFile {
  /** Stable unique ID. On web: `${name}-${size}-${lastModified}`. On native: the MediaStore _ID column. */
  id: string;

  /** Display name (filename without path, e.g. "song.mp3"). */
  name: string;

  /**
   * Playable URI.
   * - Web: blob:https://... (must be revoked after use)
   * - Native: content://media/external/video/media/123 or file:///storage/...
   */
  uri: string;

  /** File size in bytes. May be 0 if unknown (native MediaStore should always fill this). */
  sizeBytes: number;

  /** Duration in seconds, if known. Undefined when not yet extracted (lazy-loaded). */
  durationSec?: number;

  /** MIME type, e.g. "video/mp4" or "audio/mpeg". Falls back to a synthetic type derived from extension if unknown. */
  mimeType: string;

  /** Source of the file — useful for deciding whether to revoke blob URLs and for analytics. */
  source: 'web-picker' | 'native-mediastore';

  /**
   * On web only, the underlying File object is retained so we can re-create
   * a fresh blob: URL if the old one was revoked (e.g. user scrolled away then back).
   * Always undefined on native.
   */
  file?: File;

  /**
   * Optional thumbnail data URL. Only populated lazily via IntersectionObserver,
   * never eagerly extracted for thousands of files (2GB RAM constraint).
   */
  thumbnailDataUrl?: string;
}

/**
 * Permission state reported by the unified hook.
 * - 'idle'         => before any request has been made
 * - 'prompting'    => request in flight (native only — shows nothing visible)
 * - 'granted'      => permission granted, scan can proceed
 * - 'denied'       => permission denied (native) OR picker cancelled (web)
 * - 'unsupported'  => platform lacks the required APIs entirely (very old browser / no Capacitor plugin)
 */
export type PermissionState =
  | 'idle'
  | 'prompting'
  | 'granted'
  | 'denied'
  | 'unsupported';

/**
 * Result returned by every strategy function. Never throws — all errors
 * are surfaced as `error` with a (possibly empty) partial result in `files`.
 */
export interface ScanResult {
  files: MediaFile[];
  /** True if there are more pages available on native, or more files left unprocessed on web. */
  hasMore: boolean;
  /** Non-fatal error message, e.g. "Permission denied" or "5s timeout exceeded, returning partial results". */
  error?: string;
}

/**
 * Allowed file extensions per kind. Used as a hard filter even when the OS
 * picker fails to honour the `accept` attribute (some old Android browsers).
 */
export const MEDIA_EXTENSIONS: Record<MediaKind, readonly string[]> = {
  video: ['.mp4', '.mkv', '.webm', '.mov', '.avi'],
  audio: ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.opus'],
} as const;

/**
 * MIME types per kind. Used to build the `accept` attribute on the hidden
 * file input, and to double-check files returned by directory pickers.
 */
export const MEDIA_ACCEPT_TYPES: Record<MediaKind, string> = {
  video: 'video/*',
  audio: 'audio/*',
};

/**
 * Page size for native MediaStore pagination. 50 is the sweet spot for
 * 2GB RAM devices — large enough to be efficient, small enough that
 * rendering + thumbnail extraction never blocks the main thread.
 */
export const PAGE_SIZE = 50;

/**
 * Maximum recursion depth when walking a directory via the File System
 * Access API. Prevents hangs on huge drives with deeply nested trees.
 */
export const MAX_DIR_DEPTH = 5;

/**
 * Timeout (ms) for native MediaStore queries. If the native plugin does
 * not respond within this window, we return whatever was fetched so far
 * rather than hanging the UI.
 */
export const NATIVE_TIMEOUT_MS = 5000;

/**
 * Helper: given a filename, return lowercase extension including the dot.
 * Returns '' if no extension.
 */
export function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  if (i < 0) return '';
  return name.slice(i).toLowerCase();
}

/**
 * Helper: check whether a filename matches the allowed extensions for `kind`.
 */
export function matchesKind(name: string, kind: MediaKind): boolean {
  const ext = getExt(name);
  return MEDIA_EXTENSIONS[kind].includes(ext);
}

/**
 * Helper: synthesise a MIME type from extension when none is known.
 */
export function guessMimeType(name: string, kind: MediaKind): string {
  const ext = getExt(name);
  const map: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac',
    '.opus': 'audio/opus',
  };
  return map[ext] ?? (kind === 'video' ? 'video/mp4' : 'audio/mpeg');
}
