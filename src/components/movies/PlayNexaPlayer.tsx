// ── Play Nexa — PLAYit-Style Custom Video Player ──────────────────
// Feature A: Screen Lock (Padlock) — disables all controls, hides timeline
// Feature B: Mobile Swipe Gestures — Left=Volume, Right=Brightness
// Wraps YouTube iframe with gesture overlay for touch control
// AMOLED dark theme, 44px touch targets, no backdrop-blur, no styled-jsx
// Works with both YouTube iframe AND HTML5 video elements

'use client'

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type TouchEvent as ReactTouchEvent,
} from 'react'

// ── Props ──

interface PlayNexaPlayerProps {
  /** The video content — YouTube iframe or any child element */
  children: React.ReactNode
  /** Video title for accessibility */
  title?: string
  /** Close handler */
  onClose?: () => void
  /** Show Play Nexa badge */
  showBadge?: boolean
  /** Whether this is a YouTube iframe (limits native control) */
  isYouTube?: boolean
  /** HTML5 video ref for direct volume control (non-YouTube) */
  videoRef?: React.RefObject<HTMLVideoElement | null>
  /** Extra class */
  className?: string
}

// ── Gesture indicator types ──

interface GestureIndicator {
  type: 'volume' | 'brightness'
  value: number
  visible: boolean
}

// ═══════════════════════════════════════════════════════════════
//  PLAYIT-STYLE PLAYER WRAPPER
// ═══════════════════════════════════════════════════════════════

export default function PlayNexaPlayer({
  children,
  title = '',
  onClose,
  showBadge = true,
  isYouTube = true,
  videoRef,
  className = '',
}: PlayNexaPlayerProps) {
  // ── Screen Lock State ──
  const [isLocked, setIsLocked] = useState(false)

  // ── Brightness State (CSS filter) ──
  const [brightness, setBrightness] = useState(100)

  // ── Volume State (0-100 for display) ──
  const [volume, setVolume] = useState(80)

  // ── Gesture State ──
  const [gesture, setGesture] = useState<GestureIndicator>({
    type: 'volume',
    value: 80,
    visible: false,
  })

  // ── Controls visibility ──
  const [showControls, setShowControls] = useState(true)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Touch tracking refs (avoid re-renders during gesture) ──
  const touchStartY = useRef(0)
  const touchStartX = useRef(0)
  const touchStartValue = useRef(0)
  const isTouching = useRef(false)
  const touchSide = useRef<'left' | 'right'>('left')
  const gestureActive = useRef(false)

  // ── Container ref ──
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Auto-hide controls ──
  const resetControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    setShowControls(true)
    if (!isLocked) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3500)
    }
  }, [isLocked])

  // ── Lock toggle ──
  const toggleLock = useCallback(() => {
    setIsLocked(prev => !prev)
    setShowControls(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
  }, [])

  // ── Apply volume to HTML5 video ──
  useEffect(() => {
    if (!isYouTube && videoRef?.current) {
      videoRef.current.volume = volume / 100
    }
  }, [volume, isYouTube, videoRef])

  // ── Cleanup timer ──
  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    }
  }, [])

  // ── TOUCH: Start ──
  const handleTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (isLocked) return

      const touch = e.touches[0]
      const rect = e.currentTarget.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const halfWidth = rect.width / 2

      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY
      touchSide.current = x < halfWidth ? 'left' : 'right'
      isTouching.current = true
      gestureActive.current = false

      // Store starting value
      touchStartValue.current =
        touchSide.current === 'left' ? volume : brightness
    },
    [isLocked, volume, brightness]
  )

  // ── TOUCH: Move ──
  const handleTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!isTouching.current || isLocked) return

      const touch = e.touches[0]
      const deltaY = touchStartY.current - touch.clientY // Positive = swipe UP

      // Minimum threshold to activate gesture (10px)
      if (!gestureActive.current && Math.abs(deltaY) < 10) return
      gestureActive.current = true

      // Calculate sensitivity: ~200px swipe = full range (0-100)
      const sensitivity = 200
      const deltaPercent = (deltaY / sensitivity) * 100
      const clampedValue = Math.max(
        0,
        Math.min(100, touchStartValue.current + deltaPercent)
      )

      if (touchSide.current === 'left') {
        // Volume control (left half)
        const newVol = Math.round(clampedValue)
        setVolume(newVol)
        setGesture({ type: 'volume', value: newVol, visible: true })
      } else {
        // Brightness control (right half)
        const newBright = Math.round(clampedValue)
        setBrightness(newBright)
        setGesture({ type: 'brightness', value: newBright, visible: true })
      }
    },
    [isLocked]
  )

  // ── TOUCH: End ──
  const handleTouchEnd = useCallback(() => {
    isTouching.current = false
    gestureActive.current = false

    // Hide gesture indicator after a short delay
    setTimeout(() => {
      setGesture(prev => ({ ...prev, visible: false }))
    }, 800)
  }, [])

  // ── Tap to toggle controls ──
  const handleTap = useCallback(() => {
    if (isLocked) {
      // When locked, only show the lock icon briefly
      setShowControls(true)
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 2000)
      return
    }
    setShowControls(prev => {
      const next = !prev
      if (next) resetControlsTimer()
      return next
    })
  }, [isLocked, resetControlsTimer])

  // ── Render ──
  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden select-none ${className}`}
      style={{
        filter: `brightness(${brightness}%)`,
        transition: gesture.visible ? 'none' : 'filter 0.15s ease',
      }}
    >
      {/* ── VIDEO CONTENT ── */}
      <div className="relative w-full aspect-video">
        {children}
      </div>

      {/* ── GESTURE OVERLAY (touch events) ── */}
      <div
        className="absolute inset-0 z-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
        style={{ touchAction: 'none' }}
      >
        {/* Invisible touch zone — no visual output, just captures events */}
      </div>

      {/* ── SCREEN LOCK OVERLAY (when locked) ── */}
      {isLocked && (
        <div className="absolute inset-0 z-20 bg-black/40 pointer-events-none" />
      )}

      {/* ── CONTROLS OVERLAY ── */}
      <div
        className={`absolute inset-0 z-30 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 pt-2">
          {/* Close button */}
          {onClose && !isLocked && (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center min-h-[44px] min-w-[44px] active:scale-90 transition-transform duration-100"
              aria-label="Close player"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}

          {/* Title */}
          {!isLocked && (
            <p className="text-white text-xs font-medium flex-1 text-center truncate px-2">
              {title}
            </p>
          )}

          {/* Lock button */}
          <button
            onClick={toggleLock}
            className={`w-10 h-10 rounded-full flex items-center justify-center min-h-[44px] min-w-[44px] active:scale-90 transition-transform duration-100 ${
              isLocked
                ? 'bg-[#7C3AED]/80'
                : 'bg-black/60'
            }`}
            aria-label={isLocked ? 'Unlock screen' : 'Lock screen'}
          >
            {/* Padlock SVG */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isLocked ? (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </>
              ) : (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Bottom gradient */}
        {!isLocked && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        )}

        {/* Bottom info bar (when unlocked) */}
        {!isLocked && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 pb-3">
            <span className="text-white/60 text-[10px]">
              🔊 {volume}% &nbsp; ☀️ {brightness}%
            </span>
            <span className="text-white/40 text-[10px]">
              Swipe: Left=Vol Right=Bright
            </span>
          </div>
        )}
      </div>

      {/* ── LOCKED STATE: Only the faded padlock ── */}
      {isLocked && !showControls && (
        <button
          onClick={toggleLock}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-black/30 flex items-center justify-center min-h-[44px] min-w-[44px] active:scale-90 transition-transform duration-100"
          aria-label="Unlock screen"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-50"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </button>
      )}

      {/* ── GESTURE INDICATOR (temporary, centered) ── */}
      {gesture.visible && !isLocked && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-40 pointer-events-none transition-opacity duration-300 ${
            gesture.visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: gesture.type === 'volume' ? '25%' : '75%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-black/70 rounded-2xl px-5 py-4 flex flex-col items-center gap-2 min-w-[80px]">
            {/* Icon */}
            <span className="text-2xl">
              {gesture.type === 'volume' ? '🔊' : '☀️'}
            </span>

            {/* Progress bar */}
            <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${gesture.value}%`,
                  backgroundColor: gesture.type === 'volume' ? '#7C3AED' : '#FBBF24',
                }}
              />
            </div>

            {/* Percentage */}
            <span className="text-white text-sm font-bold">
              {Math.round(gesture.value)}%
            </span>
          </div>
        </div>
      )}

      {/* ── PLAY NEXA BADGE ── */}
      {showBadge && !isLocked && (
        <div className="absolute top-2.5 right-2.5 z-15 bg-[#7C3AED]/90 rounded-lg px-2.5 py-1 pointer-events-none">
          <p className="text-white text-[11px] font-bold tracking-wide">
            Play Nexa
          </p>
        </div>
      )}
    </div>
  )
}
