'use client'

// ── Play Nexa File Import Preview Modal ──────────────────────
// Shows preview of selected files BEFORE importing to library
// User reviews → clicks "Import All" → files added to library
//
// 2GB RAM optimizations:
// - Thumbnails generated for first 20 videos only (lazy load rest on scroll)
// - content-visibility: auto on file rows
// - No backdrop-blur, GPU transforms only
// - All temp object URLs revoked on unmount
//
// AMOLED dark theme · 44px touch targets · Max 200ms transitions

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  X, Film, Music, Check, Loader2, FileAudio,
  AlertCircle, ChevronDown
} from 'lucide-react'

interface FileImportPreviewModalProps {
  files: File[]
  type: 'music' | 'video'
  onConfirm: () => void
  onCancel: () => void
}

export default function FileImportPreviewModal({
  files,
  type,
  onConfirm,
  onCancel,
}: FileImportPreviewModalProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [visibleCount, setVisibleCount] = useState(30) // Lazy load more on scroll
  const thumbnailUrlsRef = useRef<Set<string>>(new Set())
  const cancelledRef = useRef(false)

  // Total size calculation
  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files]
  )

  // Format helpers
  const fmtSize = (b: number) => {
    if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`
    if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`
    if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${b} B`
  }

  const getFormat = (filename: string) => {
    const dot = filename.lastIndexOf('.')
    return dot >= 0 ? filename.slice(dot + 1).toUpperCase() : '?'
  }

  // Generate thumbnails for FIRST 20 visible videos (2GB RAM safe)
  useEffect(() => {
    if (type !== 'video') return
    cancelledRef.current = false

    const toProcess = files.slice(0, Math.min(20, visibleCount))
    let processedCount = 0

    const generateOne = async (file: File) => {
      if (cancelledRef.current) return
      let tempUrl: string | null = null

      try {
        tempUrl = URL.createObjectURL(file)
        thumbnailUrlsRef.current.add(tempUrl)

        const thumbnail = await new Promise<string>((resolve, reject) => {
          const video = document.createElement('video')
          video.preload = 'metadata'
          video.muted = true
          video.playsInline = true
          video.src = tempUrl!

          const cleanup = () => {
            try {
              video.removeAttribute('src')
              video.load()
            } catch {}
          }

          const timeout = setTimeout(() => {
            cleanup()
            reject(new Error('timeout'))
          }, 3000)

          video.onloadeddata = () => {
            try {
              video.currentTime = Math.min(1, (video.duration || 1) * 0.1)
            } catch {
              cleanup()
              clearTimeout(timeout)
              reject(new Error('seek failed'))
            }
          }

          video.onseeked = () => {
            clearTimeout(timeout)
            try {
              const canvas = document.createElement('canvas')
              const w = video.videoWidth || 240
              const h = video.videoHeight || 135
              const scale = Math.min(1, 240 / w)
              canvas.width = Math.floor(w * scale)
              canvas.height = Math.floor(h * scale)
              const ctx = canvas.getContext('2d')
              if (!ctx) { cleanup(); reject(new Error('no ctx')); return }
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              const dataUrl = canvas.toDataURL('image/jpeg', 0.5)
              cleanup()
              resolve(dataUrl)
            } catch (e) {
              cleanup()
              reject(e)
            }
          }

          video.onerror = () => {
            clearTimeout(timeout)
            cleanup()
            reject(new Error('video error'))
          }
        })

        if (!cancelledRef.current) {
          setThumbnails(prev => ({
            ...prev,
            [`${file.name}_${file.size}`]: thumbnail,
          }))
        }
      } catch {
        // Thumbnail generation failed — leave placeholder
      } finally {
        // Revoke temp URL immediately after thumbnail is captured
        if (tempUrl) {
          try { URL.revokeObjectURL(tempUrl) } catch {}
          thumbnailUrlsRef.current.delete(tempUrl)
        }
        processedCount++
      }
    }

    // Process thumbnails sequentially (1 at a time = 2GB RAM safe)
    ;(async () => {
      for (const file of toProcess) {
        if (cancelledRef.current) break
        const key = `${file.name}_${file.size}`
        if (thumbnails[key]) continue
        await generateOne(file)
      }
    })()

    return () => {
      cancelledRef.current = true
      // Revoke any remaining temp URLs
      thumbnailUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url) } catch {}
      })
      thumbnailUrlsRef.current.clear()
    }
     
  }, [files, type, visibleCount])

  // Handle confirm
  const handleConfirm = useCallback(async () => {
    setImporting(true)
    // Small delay to show loading state for user feedback
    await new Promise(r => setTimeout(r, 150))
    onConfirm()
  }, [onConfirm])

  // Handle scroll for lazy load
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 200 && visibleCount < files.length) {
      setVisibleCount(prev => Math.min(prev + 30, files.length))
    }
  }, [visibleCount, files.length])

  const visibleFiles = files.slice(0, visibleCount)
  const isVideo = type === 'video'

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-[fade-in_200ms_ease-out]">
      {/* ════════════════════════════════════════════════════════
          HEADER
          ════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-900 flex-shrink-0">
        <button
          onClick={onCancel}
          disabled={importing}
          className="p-2 -ml-2 active:scale-90 transition-transform duration-100 disabled:opacity-50"
          aria-label="Close"
        >
          <X size={20} className="text-white" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-white text-sm font-semibold leading-tight">
            {files.length} {isVideo ? 'Videos' : 'Songs'} Selected
          </h2>
          <p className="text-neutral-500 text-[10px] mt-0.5">
            Review before importing
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* ════════════════════════════════════════════════════════
          SUMMARY BAR
          ════════════════════════════════════════════════════════ */}
      <div className="px-4 py-3 bg-neutral-900/40 border-b border-neutral-900 flex-shrink-0">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {isVideo ? (
              <Film size={12} className="text-[#7C5CFF]" />
            ) : (
              <Music size={12} className="text-[#7C5CFF]" />
            )}
            <span className="text-neutral-400">
              <span className="text-white font-semibold">{files.length}</span> files
            </span>
          </div>
          <span className="text-neutral-400">
            <span className="text-white font-semibold">{fmtSize(totalSize)}</span> total
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          FILE LIST — scrollable, lazy-loaded
          ════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 overflow-y-auto px-2 py-2 overscroll-contain"
        onScroll={handleScroll}
      >
        <div className="space-y-1">
          {visibleFiles.map((file, i) => {
            const thumbKey = `${file.name}_${file.size}`
            const thumb = thumbnails[thumbKey]
            const format = getFormat(file.name)

            return (
              <div
                key={`${file.name}_${i}`}
                className="flex items-center gap-3 px-2 py-2 rounded-lg
                           bg-neutral-900/30 border border-neutral-900/50
                           transition-colors duration-150"
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: '0 56px',
                }}
              >
                {/* Thumbnail / Icon */}
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0
                                bg-neutral-800 flex items-center justify-center">
                  {isVideo ? (
                    thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film size={16} className="text-neutral-600" />
                    )
                  ) : (
                    <div className="w-full h-full bg-[#7C5CFF]/10 flex items-center justify-center">
                      <Music size={16} className="text-[#7C5CFF]" />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate leading-tight">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-neutral-500 text-[10px]">{fmtSize(file.size)}</span>
                    <span className="text-neutral-700 text-[10px]">·</span>
                    <span className="text-[#7C5CFF]/70 text-[10px] font-mono uppercase">
                      {format}
                    </span>
                  </div>
                </div>

                {/* Status checkmark */}
                <div className="w-6 h-6 rounded-full bg-[#7C5CFF]/15 flex items-center justify-center flex-shrink-0">
                  <Check size={12} className="text-[#7C5CFF]" />
                </div>
              </div>
            )
          })}

          {/* "Load more" indicator */}
          {visibleCount < files.length && (
            <div className="flex items-center justify-center py-3">
              <div className="flex items-center gap-1.5 text-neutral-600 text-[10px]">
                <ChevronDown size={12} />
                <span>Loading more... ({files.length - visibleCount} remaining)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          FOOTER — Cancel + Import All
          ════════════════════════════════════════════════════════ */}
      <div className="px-4 py-3 border-t border-neutral-900 bg-black flex-shrink-0">
        {/* Helper text */}
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <AlertCircle size={11} className="text-neutral-600 flex-shrink-0" />
          <p className="text-neutral-600 text-[10px] leading-tight">
            Files will be added to your library instantly. Metadata loads in background.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={importing}
            className="flex-1 h-12 rounded-xl bg-neutral-900 border border-neutral-800
                       text-neutral-300 text-sm font-semibold
                       active:scale-95 transition-transform duration-100
                       disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={importing}
            className="flex-[2] h-12 rounded-xl bg-[#7C5CFF] text-white text-sm font-bold
                       flex items-center justify-center gap-2
                       active:scale-95 transition-transform duration-100
                       disabled:opacity-70
                       shadow-[0_0_20px_rgba(124,92,255,0.3)]"
          >
            {importing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Check size={16} />
                Import All ({files.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
