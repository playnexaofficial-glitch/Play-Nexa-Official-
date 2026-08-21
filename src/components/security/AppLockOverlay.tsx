'use client'

// ── Play Nexa App Lock Overlay ──────────────────────────────
// 100% PRODUCTION — Full-screen Pattern/PIN overlay
// Canvas-based 3×3 grid pattern lock
// 4-digit PIN pad with verification
// Emergency master bypass
// Reads pattern hash from app-lock-store (encrypted)
// Stores locked package in IndexedDB via app-security-store
// 2GB RAM safe · APK/Capacitor compatible

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  ShieldAlert, Grid3X3, Lock, X, AlertTriangle
} from 'lucide-react'
import { verifyPattern, verifyMasterPin } from '@/lib/app-lock-store'
import { verifyMasterBypass } from '@/lib/app-security-store'

const GRID_SIZE = 3
const TOTAL_NODES = GRID_SIZE * GRID_SIZE

type AuthMethod = 'pattern' | 'pin'
type OverlayView = 'auth' | 'forgot'

interface AppLockOverlayProps {
  appName: string
  appColor: string
  onUnlock: (success: boolean) => void
}

export default function AppLockOverlay({ appName, appColor, onUnlock }: AppLockOverlayProps) {
  const [method, setMethod] = useState<AuthMethod>('pattern')
  const [view, setView] = useState<OverlayView>('auth')
  const [pinDigits, setPinDigits] = useState('')
  const [drawnNodes, setDrawnNodes] = useState<number[]>([])
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [masterInput, setMasterInput] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const currentPosRef = useRef<{ x: number; y: number } | null>(null)
  const nodePositionsRef = useRef<{ x: number; y: number }[]>([])

  // ── Error shake ──
  const triggerError = useCallback((msg: string) => {
    setError(msg)
    setShake(true)
    setAttempts(prev => prev + 1)
    setTimeout(() => { setShake(false); setError('') }, 1500)
  }, [])

  // ── PIN submit ──
  const handlePinSubmit = useCallback(() => {
    if (pinDigits.length < 4) {
      triggerError('Enter 4 digits')
      return
    }
    // Check against master bypass PIN
    if (verifyMasterPin(pinDigits) || verifyMasterBypass(pinDigits)) {
      onUnlock(true)
      return
    }
    triggerError('Incorrect PIN')
    setPinDigits('')
  }, [pinDigits, onUnlock, triggerError])

  // ── PIN auto-submit when 4 digits entered ──
  useEffect(() => {
    if (method === 'pin' && pinDigits.length === 4) {
      // Small delay for visual feedback of 4th dot filling
      const timer = setTimeout(() => handlePinSubmit(), 300)
      return () => clearTimeout(timer)
    }
  }, [pinDigits, method, handlePinSubmit])

  const addPinDigit = useCallback((d: string) => {
    if (pinDigits.length >= 6) return
    setPinDigits(prev => prev + d)
  }, [pinDigits.length])

  const deletePinDigit = useCallback(() => {
    setPinDigits(prev => prev.slice(0, -1))
  }, [])

  // ── Canvas: calculate node positions ──
  const calcNodePositions = useCallback(() => {
    const container = containerRef.current
    if (!container) return []
    const w = container.clientWidth
    const padding = w * 0.15
    const spacing = (w - padding * 2) / (GRID_SIZE - 1)
    const positions: { x: number; y: number }[] = []
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        positions.push({ x: padding + col * spacing, y: padding + row * spacing })
      }
    }
    return positions
  }, [])

  // ── Canvas: draw ──
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const w = container.clientWidth
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = w * dpr
    canvas.height = w * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${w}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, w)

    const positions = calcNodePositions()
    nodePositionsRef.current = positions

    // Draw lines between selected nodes
    if (drawnNodes.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = '#7C5CFF'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const first = positions[drawnNodes[0]]
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < drawnNodes.length; i++) {
        ctx.lineTo(positions[drawnNodes[i]].x, positions[drawnNodes[i]].y)
      }
      if (isDrawingRef.current && currentPosRef.current) {
        ctx.lineTo(currentPosRef.current.x, currentPosRef.current.y)
      }
      ctx.stroke()
    } else if (drawnNodes.length === 1 && isDrawingRef.current && currentPosRef.current) {
      ctx.beginPath()
      ctx.strokeStyle = '#7C5CFF'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.moveTo(positions[drawnNodes[0]].x, positions[drawnNodes[0]].y)
      ctx.lineTo(currentPosRef.current.x, currentPosRef.current.y)
      ctx.stroke()
    }

    // Draw 3×3 dot grid
    for (let i = 0; i < TOTAL_NODES; i++) {
      const p = positions[i]
      const isActive = drawnNodes.includes(i)

      ctx.beginPath()
      ctx.arc(p.x, p.y, isActive ? 22 : 18, 0, Math.PI * 2)
      ctx.fillStyle = isActive ? 'rgba(124,92,255,0.15)' : 'rgba(255,255,255,0.04)'
      ctx.fill()
      ctx.strokeStyle = isActive ? '#7C5CFF' : 'rgba(255,255,255,0.12)'
      ctx.lineWidth = isActive ? 2.5 : 1.5
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(p.x, p.y, isActive ? 8 : 5, 0, Math.PI * 2)
      ctx.fillStyle = isActive ? '#7C5CFF' : 'rgba(255,255,255,0.2)'
      ctx.fill()
    }
  }, [drawnNodes, calcNodePositions])

  useEffect(() => {
    if (method === 'pattern' && view === 'auth') {
      drawCanvas()
    }
  }, [method, view, drawnNodes, drawCanvas])

  // ── Hit test ──
  const hitTestNode = useCallback((x: number, y: number): number | null => {
    const positions = nodePositionsRef.current
    for (let i = 0; i < positions.length; i++) {
      const dx = x - positions[i].x
      const dy = y - positions[i].y
      if (Math.sqrt(dx * dx + dy * dy) < 35) return i
    }
    return null
  }, [])

  const getRelativePos = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }, [])

  const handleDrawStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const pos = getRelativePos(e)
    const node = hitTestNode(pos.x, pos.y)
    if (node !== null) {
      isDrawingRef.current = true
      currentPosRef.current = pos
      setDrawnNodes([node])
    }
  }, [hitTestNode, getRelativePos])

  const handleDrawMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const pos = getRelativePos(e)
    currentPosRef.current = pos
    const node = hitTestNode(pos.x, pos.y)
    if (node !== null && !drawnNodes.includes(node)) {
      setDrawnNodes(prev => [...prev, node])
    }
    drawCanvas()
  }, [hitTestNode, getRelativePos, drawnNodes, drawCanvas])

  const handleDrawEnd = useCallback(() => {
    isDrawingRef.current = false
    currentPosRef.current = null

    if (drawnNodes.length >= 4) {
      if (verifyPattern(drawnNodes)) {
        onUnlock(true)
      } else {
        triggerError('Wrong pattern')
        setDrawnNodes([])
      }
    } else if (drawnNodes.length > 0 && drawnNodes.length < 4) {
      triggerError('Connect at least 4 dots')
      setDrawnNodes([])
    }
  }, [drawnNodes, onUnlock, triggerError])

  // ── Master bypass ──
  const handleMasterBypass = useCallback(() => {
    if (verifyMasterPin(masterInput) || verifyMasterBypass(masterInput)) {
      onUnlock(true)
    } else {
      triggerError('Invalid code')
      setMasterInput('')
    }
  }, [masterInput, onUnlock, triggerError])

  const handleClose = useCallback(() => {
    onUnlock(false)
  }, [onUnlock])

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[99999] bg-[#070B14] flex flex-col">

      {view === 'auth' && (
        <>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ backgroundColor: appColor + '30' }}>
                <Lock size={14} style={{ color: appColor }} />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">{appName}</p>
                <p className="text-[#94A3B8] text-[10px]">is protected</p>
              </div>
            </div>
            <button onClick={handleClose}
                    className="p-2 rounded-full bg-[#111827] border border-[#1E293B]
                               active:scale-90 transition-transform">
              <X size={14} className="text-[#94A3B8]" />
            </button>
          </div>

          {/* Method switcher */}
          <div className="flex items-center justify-center gap-4 px-4 py-3">
            <button onClick={() => { setMethod('pattern'); setDrawnNodes([]); setError('') }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold
                               transition-all duration-150 active:scale-95
                               ${method === 'pattern' ? 'bg-[#7C5CFF] text-white' : 'bg-[#111827] text-[#94A3B8] border border-[#1E293B]'}`}>
              <Grid3X3 size={11} />
              Pattern
            </button>
            <button onClick={() => { setMethod('pin'); setPinDigits(''); setError('') }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold
                               transition-all duration-150 active:scale-95
                               ${method === 'pin' ? 'bg-[#7C5CFF] text-white' : 'bg-[#111827] text-[#94A3B8] border border-[#1E293B]'}`}>
              <Lock size={11} />
              PIN
            </button>
          </div>

          {/* Shield icon */}
          <div className="flex justify-center py-2">
            <div className={`w-16 h-16 rounded-2xl bg-[#7C5CFF]/10 flex items-center justify-center
                            ${shake ? 'animate-shake' : ''}`}>
              {method === 'pattern' ? (
                <Grid3X3 size={28} className="text-[#7C5CFF]" />
              ) : (
                <Lock size={28} className="text-[#7C5CFF]" />
              )}
            </div>
          </div>

          <p className="text-center text-white text-sm font-bold mb-1">
            {method === 'pattern' ? 'Draw Pattern to Unlock' : 'Enter PIN to Unlock'}
          </p>
          <p className="text-center text-[#94A3B8] text-[10px] mb-4">
            {attempts > 0 ? `Attempt ${attempts + 1}` : 'Verify your identity'}
          </p>

          {error && (
            <div className="flex items-center justify-center gap-2 mb-3 animate-[fade-in_200ms_ease-out]">
              <ShieldAlert size={12} className="text-red-400" />
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </div>
          )}

          {/* Pattern canvas */}
          {method === 'pattern' && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="text-[#94A3B8] text-[10px] mb-3">
                {drawnNodes.length} / 9 dots
              </span>
              <div ref={containerRef} className="w-[220px] h-[220px] relative">
                <canvas ref={canvasRef} className="absolute inset-0 touch-none"
                  onTouchStart={handleDrawStart} onTouchMove={handleDrawMove}
                  onTouchEnd={handleDrawEnd}
                  onMouseDown={handleDrawStart} onMouseMove={handleDrawMove}
                  onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd} />
              </div>
              <button onClick={() => { setDrawnNodes([]); setError('') }}
                      className="mt-4 text-[#94A3B8] text-[10px] active:text-white transition-colors">
                Reset
              </button>
            </div>
          )}

          {/* PIN pad */}
          {method === 'pin' && (
            <div className="flex-1 flex flex-col items-center justify-center px-8">
              <div className="flex items-center gap-3 mb-8">
                {[0, 1, 2, 3].map(i => (
                  <div key={i}
                       className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150
                                  ${i < pinDigits.length
                                    ? 'bg-[#7C5CFF] border-[#7C5CFF]'
                                    : 'border-[#1E293B]'
                                  }`} />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(key => {
                  if (key === '') return <div key="empty" />
                  if (key === 'del') {
                    return (
                      <button key="del" onClick={deletePinDigit}
                              className="h-14 flex items-center justify-center text-[#94A3B8] text-xs font-medium
                                         active:scale-90 transition-transform">
                        DEL
                      </button>
                    )
                  }
                  return (
                    <button key={key} onClick={() => addPinDigit(key)}
                            className="h-14 flex items-center justify-center rounded-xl
                                       bg-[#111827] border border-[#1E293B]
                                       text-white text-xl font-medium
                                       active:scale-90 active:bg-[#1E293B]
                                       transition-all duration-100">
                      {key}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Forgot link */}
          <div className="px-4 pb-8">
            <button onClick={() => { setView('forgot'); setMasterInput('') }}
                    className="w-full text-center text-[#94A3B8] text-[10px] py-2
                               active:text-white transition-colors">
              Forgot Pattern? Emergency Bypass
            </button>
          </div>
        </>
      )}

      {/* Forgot / bypass view */}
      {view === 'forgot' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-[#F59E0B]" />
          </div>

          <h3 className="text-white text-base font-bold mb-1">Emergency Bypass</h3>
          <p className="text-[#94A3B8] text-xs text-center mb-6">
            Enter the master recovery code to unlock
          </p>

          <div className="w-full max-w-[260px]">
            <input
              type="password"
              placeholder="Enter recovery code"
              value={masterInput}
              onChange={e => setMasterInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => { if (e.key === 'Enter') handleMasterBypass() }}
              className="w-full h-12 px-4 rounded-xl bg-[#111827] border border-[#1E293B]
                         text-white text-center text-lg font-mono tracking-widest
                         outline-none focus:border-red-500/50 transition-colors"
            />
            <button
              onClick={handleMasterBypass}
              disabled={!masterInput}
              className="w-full mt-3 h-12 rounded-xl bg-red-500/10 border border-red-500/30
                         text-red-400 text-sm font-bold
                         active:scale-95 transition-transform duration-100
                         disabled:opacity-40 disabled:pointer-events-none">
              Emergency Unlock
            </button>
          </div>

          <button onClick={() => { setView('auth'); setError('') }}
                  className="mt-6 text-[#94A3B8] text-xs active:text-white transition-colors">
            Back to Lock Screen
          </button>

          {error && (
            <div className="flex items-center gap-2 mt-4 animate-[fade-in_200ms_ease-out]">
              <ShieldAlert size={12} className="text-red-400" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
