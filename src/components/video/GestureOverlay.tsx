'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Sun, Volume2, Lock } from 'lucide-react';

// ══════════════════════════════════════════════════════════════
// PROPS
// ══════════════════════════════════════════════════════════════

interface GestureOverlayProps {
  onToggleControls: () => void;
  onSeek: (seconds: number) => void;
  onBrightnessChange: (val: number) => void;
  onVolumeChange: (val: number) => void;
  onSpeedChange: (rate: number) => void;
  isLocked: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onUnlock: () => void;
  brightness: number;
  volume: number;
  isMuted: boolean;
}

// ══════════════════════════════════════════════════════════════
// RIPPLE STATE
// ══════════════════════════════════════════════════════════════

interface RippleState {
  x: number;
  y: number;
  direction: 'forward' | 'backward';
  id: number;
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function GestureOverlay({
  onToggleControls,
  onSeek,
  onBrightnessChange,
  onVolumeChange,
  onSpeedChange,
  isLocked,
  videoRef,
  onUnlock,
  brightness,
  volume,
  isMuted,
}: GestureOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Gesture state ──
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const brightnessStartRef = useRef<number>(0);
  const volumeStartRef = useRef<number>(0);
  const activeZoneRef = useRef<'left' | 'center' | 'right' | null>(null);
  const isSwipingRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressingRef = useRef(false);
  const prevSpeedRef = useRef<number>(1);

  // ── Double-tap detection ──
  const lastTapTimeRef = useRef<number>(0);
  const pendingSingleTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Lock screen long press ──
  const lockLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Visual state ──
  const [brightnessIndicator, setBrightnessIndicator] = useState<number | null>(null);
  const [volumeIndicator, setVolumeIndicator] = useState<number | null>(null);
  const [ripples, setRipples] = useState<RippleState[]>([]);
  const [speedBadge, setSpeedBadge] = useState(false);
  const [lockVisible, setLockVisible] = useState(false);
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rippleCounterRef = useRef(0);

  // ── Cleanup timers on unmount ──
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
      if (pendingSingleTapRef.current) clearTimeout(pendingSingleTapRef.current);
      if (lockLongPressRef.current) clearTimeout(lockLongPressRef.current);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  // ── Auto-hide indicators ──
  const hideIndicators = useCallback(() => {
    if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    indicatorTimerRef.current = setTimeout(() => {
      setBrightnessIndicator(null);
      setVolumeIndicator(null);
    }, 800);
  }, []);

  // ── Show lock icon briefly ──
  const showLockBriefly = useCallback(() => {
    setLockVisible(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      setLockVisible(false);
    }, 1500);
  }, []);

  // ── Get zone from x position ──
  const getZone = useCallback((clientX: number): 'left' | 'center' | 'right' => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 'center';
    const relX = clientX - rect.left;
    const width = rect.width;
    if (relX < width * 0.3) return 'left';
    if (relX > width * 0.7) return 'right';
    return 'center';
  }, []);

  // ── Add ripple ──
  const addRipple = useCallback((x: number, y: number, direction: 'forward' | 'backward') => {
    const id = ++rippleCounterRef.current;
    setRipples((prev) => [...prev, { x, y, direction, id }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 700);
  }, []);

  // ── Handle double tap ──
  const handleDoubleTap = useCallback(
    (x: number, y: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const relX = x - rect.left;
      const isRightHalf = relX > rect.width / 2;

      if (isRightHalf) {
        onSeek(10);
        addRipple(x, y, 'forward');
      } else {
        onSeek(-10);
        addRipple(x, y, 'backward');
      }
    },
    [onSeek, addRipple]
  );

  // ── Pointer events ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // ── LOCKED MODE ──
      if (isLocked) {
        // Start long press timer for unlock (1s)
        lockLongPressRef.current = setTimeout(() => {
          onUnlock();
          setLockVisible(false);
        }, 1000);
        return;
      }

      // ── UNLOCKED MODE ──
      const zone = getZone(e.clientX);
      activeZoneRef.current = zone;
      pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      isSwipingRef.current = false;

      if (zone === 'left') {
        brightnessStartRef.current = brightness;
      } else if (zone === 'right') {
        volumeStartRef.current = isMuted ? 0 : volume;
      } else if (zone === 'center') {
        // Long press for 2× speed
        prevSpeedRef.current = 1; // will be set properly on speed change
        longPressTimerRef.current = setTimeout(() => {
          isLongPressingRef.current = true;
          onSpeedChange(2);
          setSpeedBadge(true);
        }, 500);
      }
    },
    [isLocked, onUnlock, getZone, brightness, volume, isMuted, onSpeedChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // ── LOCKED MODE ──
      if (isLocked) {
        // If finger moves too much, cancel the unlock long press
        if (lockLongPressRef.current && pointerStartRef.current) {
          const dx = Math.abs(e.clientX - pointerStartRef.current.x);
          const dy = Math.abs(e.clientY - pointerStartRef.current.y);
          if (dx > 20 || dy > 20) {
            clearTimeout(lockLongPressRef.current);
            lockLongPressRef.current = null;
          }
        }
        return;
      }

      if (!pointerStartRef.current) return;

      const zone = activeZoneRef.current;
      const startY = pointerStartRef.current.y;
      const dy = startY - e.clientY; // positive = swipe up
      const sensitivity = 300; // pixels for full range

      if (Math.abs(dy) > 10) {
        isSwipingRef.current = true;

        // Cancel long press if swiping
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }

      if (zone === 'left' && isSwipingRef.current) {
        const delta = dy / sensitivity;
        const newBrightness = Math.max(0, Math.min(1, brightnessStartRef.current + delta));
        onBrightnessChange(newBrightness);
        setBrightnessIndicator(Math.round(newBrightness * 100));
        if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
      } else if (zone === 'right' && isSwipingRef.current) {
        const delta = dy / sensitivity;
        const newVolume = Math.max(0, Math.min(1, volumeStartRef.current + delta));
        onVolumeChange(newVolume);
        setVolumeIndicator(Math.round(newVolume * 100));
        if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
      }
    },
    [isLocked, onBrightnessChange, onVolumeChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // ── LOCKED MODE ──
      if (isLocked) {
        if (lockLongPressRef.current) {
          clearTimeout(lockLongPressRef.current);
          lockLongPressRef.current = null;
        }

        // If not a long press (didn't trigger unlock), treat as single tap
        // Show lock icon briefly and toggle controls
        if (pointerStartRef.current) {
          const dt = Date.now() - pointerStartRef.current.time;
          const dx = Math.abs(e.clientX - pointerStartRef.current.x);
          const dy = Math.abs(e.clientY - pointerStartRef.current.y);
          const isTap = dt < 1000 && dx < 20 && dy < 20;
          if (isTap) {
            showLockBriefly();
            onToggleControls();
          }
        } else {
          // No pointerStart recorded (locked from the start)
          showLockBriefly();
          onToggleControls();
        }

        pointerStartRef.current = null;
        return;
      }

      // ── UNLOCKED MODE ──
      // Cancel long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      // If was long-pressing, revert speed
      if (isLongPressingRef.current) {
        isLongPressingRef.current = false;
        setSpeedBadge(false);
        onSpeedChange(1);
        pointerStartRef.current = null;
        activeZoneRef.current = null;
        isSwipingRef.current = false;
        return;
      }

      if (!pointerStartRef.current) return;

      const dt = Date.now() - pointerStartRef.current.time;
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      const isTap = dt < 300 && dx < 20 && dy < 20;

      if (isTap && !isSwipingRef.current) {
        const now = Date.now();
        const timeSinceLastTap = now - lastTapTimeRef.current;

        if (timeSinceLastTap < 300 && lastTapTimeRef.current > 0) {
          // Double tap detected
          if (pendingSingleTapRef.current) {
            clearTimeout(pendingSingleTapRef.current);
            pendingSingleTapRef.current = null;
          }
          handleDoubleTap(e.clientX, e.clientY);
          lastTapTimeRef.current = 0;
        } else {
          // First tap — schedule single tap action
          lastTapTimeRef.current = now;

          if (pendingSingleTapRef.current) {
            clearTimeout(pendingSingleTapRef.current);
          }

          pendingSingleTapRef.current = setTimeout(() => {
            onToggleControls();
            lastTapTimeRef.current = 0;
            pendingSingleTapRef.current = null;
          }, 280);
        }
      }

      // Hide brightness/volume indicators after delay
      if (isSwipingRef.current) {
        hideIndicators();
      }

      pointerStartRef.current = null;
      activeZoneRef.current = null;
      isSwipingRef.current = false;
    },
    [isLocked, onToggleControls, onUnlock, showLockBriefly, handleDoubleTap, hideIndicators, onSpeedChange]
  );

  const handlePointerCancel = useCallback(() => {
    if (lockLongPressRef.current) {
      clearTimeout(lockLongPressRef.current);
      lockLongPressRef.current = null;
    }
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressingRef.current) {
      isLongPressingRef.current = false;
      setSpeedBadge(false);
      onSpeedChange(1);
    }
    if (pendingSingleTapRef.current) {
      clearTimeout(pendingSingleTapRef.current);
      pendingSingleTapRef.current = null;
    }
    pointerStartRef.current = null;
    activeZoneRef.current = null;
    isSwipingRef.current = false;
    hideIndicators();
  }, [hideIndicators, onSpeedChange]);

  // ── Track pointer start for locked mode ──
  const handlePointerDownLocked = useCallback(
    (e: React.PointerEvent) => {
      pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      handlePointerDown(e);
    },
    [handlePointerDown]
  );

  return (
    <>
      {/* ── GESTURE LAYER ── */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-10 touch-none"
        style={{ touchAction: 'none' }}
        onPointerDown={isLocked ? handlePointerDownLocked : handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      />

      {/* ── BRIGHTNESS INDICATOR (LEFT ZONE) ── */}
      {brightnessIndicator !== null && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
          <Sun size={20} className="text-white" />
          <div
            className="relative w-2 rounded-full overflow-hidden"
            style={{ height: 120, backgroundColor: '#1F1F1F' }}
          >
            <div
              className="absolute bottom-0 w-full rounded-full"
              style={{
                height: `${brightnessIndicator}%`,
                backgroundColor: '#7C3AED',
                transition: 'height 100ms',
              }}
            />
          </div>
          <span className="text-white text-xs font-mono">{brightnessIndicator}%</span>
        </div>
      )}

      {/* ── VOLUME INDICATOR (RIGHT ZONE) ── */}
      {volumeIndicator !== null && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
          <Volume2 size={20} className="text-white" />
          <div
            className="relative w-2 rounded-full overflow-hidden"
            style={{ height: 120, backgroundColor: '#1F1F1F' }}
          >
            <div
              className="absolute bottom-0 w-full rounded-full"
              style={{
                height: `${volumeIndicator}%`,
                backgroundColor: '#06B6D4',
                transition: 'height 100ms',
              }}
            />
          </div>
          <span className="text-white text-xs font-mono">{volumeIndicator}%</span>
        </div>
      )}

      {/* ── RIPPLE ANIMATIONS (DOUBLE-TAP FEEDBACK) ── */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute z-25 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              backgroundColor: 'rgba(0,0,0,0.5)',
              animation: 'ripple-expand 700ms ease-out forwards',
            }}
          >
            <span className="text-white text-sm font-bold">
              {ripple.direction === 'forward' ? '+10s' : '-10s'}
            </span>
          </div>
        </div>
      ))}

      {/* ── SPEED BADGE (LONG PRESS) ── */}
      {speedBadge && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div
            className="rounded-lg px-3 py-1"
            style={{ backgroundColor: '#7C3AED' }}
          >
            <span className="text-white font-bold text-sm">2×</span>
          </div>
        </div>
      )}

      {/* ── LOCK OVERLAY ── */}
      {isLocked && lockVisible && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 64,
              height: 64,
              backgroundColor: 'rgba(20,20,20,0.8)',
              border: '1px solid #1F1F1F',
            }}
          >
            <Lock size={28} className="text-[#7C3AED]" />
          </div>
        </div>
      )}

      {/* ── Inject ripple keyframes (once) ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ripple-expand {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}} />
    </>
  );
}
