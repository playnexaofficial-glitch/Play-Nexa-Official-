// ── Play Nexa — Game Download Hook ────────────────────────────────
// Manages APK download, storage, and launch for Android builds.
// All Capacitor calls are guarded by isNativePlatform().
// Web fallback: shows "APK only on Android" message.

import { useState, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────

export interface DownloadState {
  isDownloading: boolean
  isDownloaded: boolean
  progress: number  // 0-100
  error: string | null
}

const INITIAL_STATE: DownloadState = {
  isDownloading: false,
  isDownloaded: false,
  progress: 0,
  error: null,
}

// ── Native Platform Check ──────────────────────────────────────
// Safely detect Capacitor without importing the package
// (it may not be installed in web-only builds).

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

// ── File Path Helper ───────────────────────────────────────────

function getGamePath(gameId: string): string {
  return `games/game_${gameId}.apk`
}

// ── Hook ───────────────────────────────────────────────────────

export function useGameDownload() {
  const [state, setState] = useState<DownloadState>(INITIAL_STATE)

  // ── Check if game is already downloaded ──
  const checkDownloaded = useCallback(async (
    gameId: string
  ): Promise<boolean> => {
    if (!isNativePlatform()) return false

    try {
      const { Filesystem, Directory } =
        await import('@capacitor/filesystem')
      await Filesystem.stat({
        path: getGamePath(gameId),
        directory: Directory.Data,
      })
      setState(prev => ({ ...prev, isDownloaded: true }))
      return true
    } catch {
      setState(prev => ({ ...prev, isDownloaded: false }))
      return false
    }
  }, [])

  // ── Download APK into Play Nexa app storage ──
  const downloadGame = useCallback(async (
    gameId: string,
    apkUrl: string
  ): Promise<boolean> => {
    // Web fallback — cannot download APK in browser
    if (!isNativePlatform()) {
      setState(prev => ({
        ...prev,
        error: 'APK download is only available on the Android app',
      }))
      return false
    }

    if (!apkUrl) {
      setState(prev => ({
        ...prev,
        error: 'No download URL available for this game',
      }))
      return false
    }

    setState(prev => ({
      ...prev,
      isDownloading: true,
      progress: 0,
      error: null,
    }))

    try {
      const { Filesystem, Directory } =
        await import('@capacitor/filesystem')

      // Step 1: Fetch the APK file as a blob
      const response = await fetch(apkUrl, {
        signal: AbortSignal.timeout(120000), // 2 min max
      })

      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`)
      }

      const contentLength = response.headers.get('content-length')
      const totalBytes = contentLength ? parseInt(contentLength) : 0

      // Step 2: Read the response with progress tracking
      if (!response.body) {
        // Fallback: read entire body at once (no progress)
        const blob = await response.blob()
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const dataUrl = reader.result as string
            const base64 = dataUrl.split(',')[1]
            resolve(base64)
          }
          reader.onerror = reject
        })
        reader.readAsDataURL(blob)
        const base64Data = await base64Promise

        await Filesystem.writeFile({
          path: getGamePath(gameId),
          data: base64Data,
          directory: Directory.Data,
          recursive: true,
        })

        setState(prev => ({
          ...prev,
          isDownloading: false,
          isDownloaded: true,
          progress: 100,
        }))
        return true
      }

      // Stream with progress
      const reader = response.body.getReader()
      const chunks: BlobPart[] = []
      let receivedBytes = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        receivedBytes += value.length

        if (totalBytes > 0) {
          const pct = Math.round((receivedBytes / totalBytes) * 100)
          setState(prev => ({ ...prev, progress: pct }))
        }
      }

      // Step 3: Convert chunks to base64 and write to filesystem
      const blob = new Blob(chunks)
      const reader2 = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader2.onloadend = () => {
          const dataUrl = reader2.result as string
          const base64 = dataUrl.split(',')[1]
          resolve(base64)
        }
        reader2.onerror = reject
      })
      reader2.readAsDataURL(blob)
      const base64Data = await base64Promise

      await Filesystem.writeFile({
        path: getGamePath(gameId),
        data: base64Data,
        directory: Directory.Data,
        recursive: true,
      })

      setState(prev => ({
        ...prev,
        isDownloading: false,
        isDownloaded: true,
        progress: 100,
      }))

      return true
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isDownloading: false,
        progress: 0,
        error: err.message || 'Download failed',
      }))
      return false
    }
  }, [])

  // ── Launch downloaded APK ──
  const launchGame = useCallback(async (
    gameId: string
  ): Promise<boolean> => {
    if (!isNativePlatform()) return false

    try {
      const { Filesystem, Directory } =
        await import('@capacitor/filesystem')

      // Get file URI from internal storage
      const result = await Filesystem.getUri({
        path: getGamePath(gameId),
        directory: Directory.Data,
      })

      // Open the APK file using the system's package installer
      // This triggers the Android "Install unknown apps" permission
      // if not already granted.
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: result.uri })

      return true
    } catch (err) {
      console.error('[GameDownload] Launch failed:', err)
      setState(prev => ({
        ...prev,
        error: 'Failed to launch game. Make sure "Install from unknown sources" is enabled.',
      }))
      return false
    }
  }, [])

  // ── Delete downloaded game (free storage) ──
  const deleteGame = useCallback(async (
    gameId: string
  ): Promise<boolean> => {
    if (!isNativePlatform()) return false

    try {
      const { Filesystem, Directory } =
        await import('@capacitor/filesystem')

      await Filesystem.deleteFile({
        path: getGamePath(gameId),
        directory: Directory.Data,
      })

      setState(prev => ({
        ...prev,
        isDownloaded: false,
        progress: 0,
      }))
      return true
    } catch (err) {
      console.error('[GameDownload] Delete failed:', err)
      return false
    }
  }, [])

  // ── Clear error ──
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    checkDownloaded,
    downloadGame,
    launchGame,
    deleteGame,
    clearError,
    isNative: isNativePlatform(),
  }
}
