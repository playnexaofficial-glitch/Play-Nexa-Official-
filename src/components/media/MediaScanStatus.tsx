// src/components/media/MediaScanStatus.tsx
// ============================================================================
// Minimal status / empty-state indicator shown above the existing media
// grid. Replicates the existing EmptyState pattern (centered icon + title
// + description + optional action button) — does NOT introduce a new
// visual style.
//
// Rendered states:
//   - loading            => small spinner + "Scanning your {kind}…"
//   - permission denied  => icon + "Permission denied" + retry button
//   - unsupported        => icon + "Not supported" message
//   - empty (web)        => icon + "No {kind} yet" + picker hint
//   - empty (native)     => icon + "No {kind} found on device" + rescan
//   - error              => icon + error message + retry button
//   - idle (default)     => renders nothing
// ============================================================================

'use client';

import { useCallback } from 'react';
import {
  Loader2,
  ShieldAlert,
  Music,
  Video,
  RefreshCw,
  FolderX,
  AlertTriangle,
} from 'lucide-react';
import type {
  MediaFile,
  MediaKind,
  PermissionState,
} from '@/lib/media-scanner/types';

export interface MediaScanStatusProps {
  kind: MediaKind;
  files: MediaFile[];
  isLoading: boolean;
  error: string | null;
  permissionState: PermissionState;
  isNative: boolean;
  /** Called when the user taps the retry / rescan button. */
  onRetry: () => void;
  /** Called when the user taps the "Select Files" hint button (web only). */
  onPickFiles?: () => void;
  /** Called when the user taps the "Select Folder" hint button (web only). */
  onPickFolder?: () => void;
}

export function MediaScanStatus({
  kind,
  files,
  isLoading,
  error,
  permissionState,
  isNative,
  onRetry,
  onPickFiles,
  onPickFolder,
}: MediaScanStatusProps) {
  const KindIcon = kind === 'video' ? Video : Music;
  const kindLabel = kind === 'video' ? 'videos' : 'music';

  // ---- Loading state ------------------------------------------------------
  if (isLoading && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Loader2 className="w-10 h-10 text-pn-purple animate-spin mb-3" aria-hidden />
        <p className="text-white font-semibold text-sm">
          {isNative
            ? `Scanning your ${kindLabel}…`
            : `Loading your ${kindLabel}…`}
        </p>
        <p className="text-pn-muted text-xs mt-1">
          This may take a moment on devices with many files.
        </p>
      </div>
    );
  }

  // ---- Permission denied (native) ----------------------------------------
  if (isNative && permissionState === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <ShieldAlert className="w-12 h-12 text-pn-muted mb-4" aria-hidden />
        <h3 className="text-white font-semibold text-lg mb-2">
          Permission needed
        </h3>
        <p className="text-pn-muted text-sm max-w-xs leading-relaxed mb-6">
          Allow access to your {kindLabel} so we can scan and play them.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="h-12 px-6 rounded-xl bg-pn-purple text-white font-medium text-sm transition-colors duration-150 hover:bg-pn-purple/90 active:scale-[0.97]"
        >
          Grant access
        </button>
      </div>
    );
  }

  // ---- Unsupported (native plugin missing) -------------------------------
  if (isNative && permissionState === 'unsupported') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-pn-muted mb-4" aria-hidden />
        <h3 className="text-white font-semibold text-lg mb-2">
          Media scanning unavailable
        </h3>
        <p className="text-pn-muted text-sm max-w-xs leading-relaxed">
          This build does not include the native media plugin. Please update
          the app to the latest version.
        </p>
      </div>
    );
  }

  // ---- Error state --------------------------------------------------------
  if (error && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-pn-muted mb-4" aria-hidden />
        <h3 className="text-white font-semibold text-lg mb-2">
          Something went wrong
        </h3>
        <p className="text-pn-muted text-sm max-w-xs leading-relaxed mb-6">
          {error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="h-12 px-6 rounded-xl bg-pn-purple text-white font-medium text-sm transition-colors duration-150 hover:bg-pn-purple/90 active:scale-[0.97]"
        >
          Try again
        </button>
      </div>
    );
  }

  // ---- Empty state --------------------------------------------------------
  if (files.length === 0) {
    // Web empty state: encourage user to pick files / folder
    if (!isNative) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <KindIcon className="w-12 h-12 text-pn-muted mb-4" aria-hidden />
          <h3 className="text-white font-semibold text-lg mb-2">
            No {kindLabel} yet
          </h3>
          <p className="text-pn-muted text-sm max-w-xs leading-relaxed mb-6">
            Pick individual files or an entire folder from your device to
            start playing.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {onPickFiles && (
              <button
                type="button"
                onClick={onPickFiles}
                className="h-12 px-6 rounded-xl bg-pn-purple text-white font-medium text-sm transition-colors duration-150 hover:bg-pn-purple/90 active:scale-[0.97]"
              >
                Select {kind === 'video' ? 'Videos' : 'Music'}
              </button>
            )}
            {onPickFolder && (
              <button
                type="button"
                onClick={onPickFolder}
                className="h-12 px-6 rounded-xl border border-pn-purple/40 text-pn-purple font-medium text-sm transition-colors duration-150 hover:bg-pn-purple/10 active:scale-[0.97]"
              >
                Select a Folder
              </button>
            )}
          </div>
        </div>
      );
    }

    // Native empty state: device scan returned nothing
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <FolderX className="w-12 h-12 text-pn-muted mb-4" aria-hidden />
        <h3 className="text-white font-semibold text-lg mb-2">
          No {kindLabel} found
        </h3>
        <p className="text-pn-muted text-sm max-w-xs leading-relaxed mb-6">
          We scanned your device but couldn&apos;t find any {kindLabel}.
          Add some files to your device, then rescan.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="h-12 px-6 rounded-xl bg-pn-purple text-white font-medium text-sm transition-colors duration-150 hover:bg-pn-purple/90 active:scale-[0.97]"
        >
          Rescan device
        </button>
      </div>
    );
  }

  // ---- Non-fatal warning (files present but error set) -------------------
  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 mx-3 my-2 rounded-lg bg-pn-purple/10 border border-pn-purple/30 text-xs text-pn-muted">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-pn-purple" aria-hidden />
        <span className="flex-1 truncate">{error}</span>
        <button
          type="button"
          onClick={onRetry}
          className="text-pn-purple font-medium shrink-0 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  // ---- Idle / has files: render nothing ----------------------------------
  return null;
}

export default MediaScanStatus;

/**
 * Convenience wrapper for the loading-spinner-only case (e.g. shown
 * briefly during `loadMore` pagination when the user already has files).
 */
export function MediaScanLoadingMore({ kind }: { kind: MediaKind }) {
  const handleRetry = useCallback(() => {
    /* no-op for inline loader */
  }, []);
  // Unused import suppression — kept for parity with main component API.
  void handleRetry;
  void kind;
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="w-5 h-5 text-pn-purple animate-spin" aria-hidden />
    </div>
  );
}
