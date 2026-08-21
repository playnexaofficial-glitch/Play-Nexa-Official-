'use client'

// ── Play Nexa Gesture Video Player ──────────────────────────
// Custom HTML5 <video> wrapper with touch gesture controls
// Left half swipe UP/DOWN = Brightness | Right half = Volume
// 2GB RAM safe: URL.createObjectURL, GPU-accelerated only

import {
  useState, useRef, useCallback, useEffect, useMemo
} from 'react'
import {
  Play, Pause, SkipBack, SkipForward,
  Maximize, Minimize, Sun, Volume2,
  RotateCcw, MonitorSmartphone
} from 'lucide-react'

interface VideoPlayerProps {
  src: string           // Object URL from URL.createObjectURL()
  title?: string
  onClose: () => void
}

type AspectMode = 'fit' | 'fill' | '16:9' | '4:3'

export default function VideoPlayer({ src, title, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying]       = useState(false)
  const [currentTime, setCurrent]   = useState(0)
  const [duration, setDuration]     = useState(0)
  const [volume, setVolume]         = useState(1)
  const [brightness, setBrightness] = useState(100)
  const [showControls, setShowControls] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [aspectMode, setAspectMode] = useState<AspectMode>('fit')
  const [gestureIndicator, setGestureIndicator] = useState<{
    type: 'brightness' | 'volume'
    value: number
  } | null>(null)

  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const touchStart = useRef<{ y: number; x: number; val: number } | null>(null)

  // ── Format time ──
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
      : `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── Auto-hide controls ──
  const resetHide = useCallback(() => {
    setShowControls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3500)
  }, [playing])

  // ── Toggle play/pause ──
  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else { v.play().catch(() => {}); setPlaying(true) }
    resetHide()
  }, [playing, resetHide])

  // ── Seek ──
  const seek = useCallback((time: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration, time))
  }, [])

  const skip = useCallback((seconds: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds))
    resetHide()
  }, [resetHide])

  // ── Volume ──
  const changeVolume = useCallback((v: number) => {
    const vid = videoRef.current
    if (!vid) return
    const clamped = Math.max(0, Math.min(1, v))
    vid.volume = clamped
    setVolume(clamped)
  }, [])

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (!fullscreen) {
        await el.requestFullscreen?.()
        setFullscreen(true)
      } else {
        await document.exitFullscreen?.()
        setFullscreen(false)
      }
    } catch {}
  }, [fullscreen])

  // ── Aspect ratio cycle ──
  const aspectModes: AspectMode[] = ['fit', 'fill', '16:9', '4:3']
  const cycleAspect = useCallback(() => {
    const idx = aspectModes.indexOf(aspectMode)
    setAspectMode(aspectModes[(idx + 1) % aspectModes.length])
  }, [aspectMode])

  const aspectClass = useMemo(() => {
    switch (aspectMode) {
      case 'fill': return 'object-cover'
      case '16:9': return 'object-contain aspect-video'
      case '4:3': return 'object-contain aspect-[4/3]'
      default: return 'object-contain'
    }
  }, [aspectMode])

  // ── Touch gesture handlers ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const touch = e.touches[0]
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const isLeftHalf = touch.clientX < rect.left + rect.width / 2
    touchStart.current = {
      y: touch.clientY,
      x: touch.clientX,
      val: isLeftHalf ? brightness / 100 : volume
    }
  }, [brightness, volume])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || e.touches.length !== 1) return
    const touch = e.touches[0]
    const dy = touchStart.current.y - touch.clientY
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const isLeftHalf = touchStart.current.x < rect.left + rect.width / 2
    const sensitivity = 300 // pixels for full range
    const delta = dy / sensitivity

    if (isLeftHalf) {
      // Brightness control
      const newB = Math.max(10, Math.min(150, brightness + delta * 100))
      setBrightness(Math.round(newB))
      setGestureIndicator({ type: 'brightness', value: Math.round(newB) })
    } else {
      // Volume control
      const newV = Math.max(0, Math.min(1, touchStart.current.val + delta))
      changeVolume(newV)
      setGestureIndicator({ type: 'volume', value: Math.round(newV * 100) })
    }
  }, [brightness, volume, changeVolume])

  const handleTouchEnd = useCallback(() => {
    touchStart.current = null
    setTimeout(() => setGestureIndicator(null), 800)
  }, [])

  // ── Video event listeners ──
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onTime = () => setCurrent(v.currentTime)
    const onDur = () => setDuration(v.duration)
    const onEnd = () => { setPlaying(false); setCurrent(0) }

    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onDur)
    v.addEventListener('ended', onEnd)

    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onDur)
      v.removeEventListener('ended', onEnd)
    }
  }, [src])

  // Cleanup timer + video element on unmount
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      // Free video element resources
      const v = videoRef.current
      if (v) { v.pause(); v.src = ''; v.load() }
    }
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black select-none overflow-hidden"
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── VIDEO ELEMENT ── */}
      <video
        ref={videoRef}
        src={src}
        className={`w-full h-full ${aspectClass}`}
        style={{ filter: `brightness(${brightness}%)` }}
        playsInline
        preload="metadata"
        onClick={togglePlay}
      />

      {/* ── GESTURE INDICATOR ── */}
      {gestureIndicator && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="flex flex-col items-center gap-2 bg-black/70 rounded-2xl px-6 py-4 animate-[fade-in_150ms_ease-out]">
            {gestureIndicator.type === 'brightness' ? (
              <Sun size={24} className="text-yellow-400" />
            ) : (
              <Volume2 size={24} className="text-[#00D4FF]" />
            )}
            <span className="text-white text-lg font-bold">
              {gestureIndicator.value}%
            </span>
          </div>
        </div>
      )}

      {/* ── CONTROLS OVERLAY ── */}
      <div
        className={`absolute inset-0 flex flex-col justify-end
                    transition-opacity duration-200
                    ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0
                        bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-2 active:scale-90 transition-transform duration-100"
            >
              <RotateCcw size={20} className="text-white" />
            </button>
            <p className="text-white text-sm font-medium truncate max-w-[60%]">
              {title || 'Now Playing'}
            </p>
            <button
              onClick={cycleAspect}
              className="p-2 active:scale-90 transition-transform duration-100"
            >
              <MonitorSmartphone size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Center play/pause */}
        <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
          <button
            onClick={() => skip(-10)}
            className="pointer-events-auto p-3 active:scale-90 transition-transform duration-100"
          >
            <SkipBack size={28} className="text-white/80" />
          </button>
          <button
            onClick={togglePlay}
            className="pointer-events-auto w-16 h-16 rounded-full
                       bg-white/20 flex items-center justify-center
                       active:scale-90 transition-transform duration-100"
          >
            {playing
              ? <Pause size={32} className="text-white" />
              : <Play size={32} className="text-white ml-1" />
            }
          </button>
          <button
            onClick={() => skip(10)}
            className="pointer-events-auto p-3 active:scale-90 transition-transform duration-100"
          >
            <SkipForward size={28} className="text-white/80" />
          </button>
        </div>

        {/* Bottom controls */}
        <div className="bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8">
          {/* Seek bar */}
          <div className="relative w-full h-5 flex items-center mb-2">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full"
              style={{ accentColor: '#7C5CFF' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs font-mono">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
            <div className="flex items-center gap-3">
              {/* Volume indicator */}
              <div className="flex items-center gap-1">
                <Volume2 size={14} className="text-white/60" />
                <span className="text-white/60 text-[10px]">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              {/* Brightness indicator */}
              <div className="flex items-center gap-1">
                <Sun size={14} className="text-white/60" />
                <span className="text-white/60 text-[10px]">
                  {Math.round(brightness)}%
                </span>
              </div>
              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1 active:scale-90 transition-transform duration-100"
              >
                {fullscreen
                  ? <Minimize size={18} className="text-white/80" />
                  : <Maximize size={18} className="text-white/80" />
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
