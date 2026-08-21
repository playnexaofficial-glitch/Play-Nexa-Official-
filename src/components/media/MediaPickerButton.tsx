// src/components/media/MediaPickerButton.tsx
// ============================================================================
// Thin web-only button that triggers the file / folder picker.
// Renders null on native (Android APK) because native auto-scans —
// no manual picker step exists there.
//
// VISUAL STYLE: matches the existing Play Nexa purple-accent button
// pattern (bg-pn-purple, h-12, rounded-xl, 150ms transition, active scale).
// No new design tokens introduced.
// ============================================================================

'use client';

import { useCallback, useState } from 'react';
import { Folder, FileAudio2, FileVideo2, Loader2 } from 'lucide-react';
import type { MediaFile, MediaKind } from '@/lib/media-scanner/types';

export interface MediaPickerButtonProps {
  /** 'video' => button picks videos only. 'audio' => audio only. */
  kind: MediaKind;
  /** Called when the user has selected one or more files. */
  onPicked: (files: MediaFile[]) => void;
  /**
   * 'files' => multi-file picker (default).
   * 'folder' => folder picker (File System Access API on Chrome, webkitdirectory fallback elsewhere).
   */
  mode?: 'files' | 'folder';
  /** Optional label override. */
  label?: string;
  /** Optional className merge. */
  className?: string;
  /** Visual variant. 'primary' = purple fill, 'secondary' = outlined. */
  variant?: 'primary' | 'secondary';
  /** Compact size for inline use. */
  size?: 'default' | 'compact';
}

export function MediaPickerButton({
  kind,
  onPicked,
  mode = 'files',
  label,
  className = '',
  variant = 'primary',
  size = 'default',
}: MediaPickerButtonProps) {
  const [busy, setBusy] = useState(false);

  // Native platforms never render this button — parent should hide it
  // too via the hook's `isNative` flag, but we double-check here for safety.
  const isNative =
    typeof window !== 'undefined' &&
    typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform === 'function' &&
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform();

  const handleClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Dynamically import the web strategy to avoid pulling native code
      // into the web bundle path unnecessarily.
      const { scanWeb } = await import('@/lib/media-scanner/web-strategy');
      const webMode = mode === 'folder' ? 'pick-dir' : 'pick-files';
      const result = await scanWeb(kind, webMode);
      if (result.files.length > 0) {
        onPicked(result.files);
      }
      // If result.error is set but files are empty, the parent component
      // is responsible for showing a message (via MediaScanStatus).
      // We deliberately do NOT call onPicked with an empty array, so the
      // parent's existing file list is preserved on cancel.
    } catch {
      /* swallow — parent shows empty state with retry */
    } finally {
      setBusy(false);
    }
  }, [busy, kind, mode, onPicked]);

  if (isNative) return null;

  const Icon =
    mode === 'folder'
      ? Folder
      : kind === 'video'
        ? FileVideo2
        : FileAudio2;

  const text =
    label ??
    (mode === 'folder'
      ? 'Select Folder'
      : kind === 'video'
        ? 'Select Videos'
        : 'Select Music');

  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-pn-purple/60';

  const sizeClasses =
    size === 'compact' ? 'h-9 px-3 text-xs rounded-lg' : 'h-12 px-6 text-sm rounded-xl';

  const variantClasses =
    variant === 'primary'
      ? 'bg-pn-purple text-white hover:bg-pn-purple/90'
      : 'border border-pn-purple/40 text-pn-purple hover:bg-pn-purple/10';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
    >
      {busy ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : (
        <Icon className="w-4 h-4" aria-hidden />
      )}
      <span>{busy ? 'Opening…' : text}</span>
    </button>
  );
}

export default MediaPickerButton;
