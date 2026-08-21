'use client'

// ── Play Nexa App Lock Component ────────────────────────────────
// Master App Lock configuration UI for Settings
// - Biometric Lock toggle (Fingerprint/FaceID)
// - Pattern Lock (3×3 canvas grid with draw vectors)
// - Recovery System (Security Q&A + Master PIN bypass)
// 2GB RAM safe · APK/Capacitor compatible

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Fingerprint, Grid3X3, ShieldCheck, ShieldAlert,
  ChevronRight, HelpCircle, AlertTriangle
} from 'lucide-react'
import {
  loadLockConfig, saveLockConfig, setPattern,
  setSecurityQA, verifyMasterPin,
  verifySecurityAnswer, type AppLockConfig
} from '@/lib/app-lock-store'

const GRID_SIZE = 3
const TOTAL_NODES = GRID_SIZE * GRID_SIZE

type LockView = 'main' | 'draw-pattern' | 'confirm-pattern' | 'setup-qa' | 'forgot'

export default function AppLock() {
  const [config, setConfig] = useState<AppLockConfig>(loadLockConfig)
  const [view, setView] = useState<LockView>('main')
  const [toast, setToast] = useState('')

  const [drawnNodes, setDrawnNodes] = useState<number[]>([])
  const [confirmNodes, setConfirmNodes] = useState<number[]>([])
  const [patternError, setPatternError] = useState('')
  const [patternShake, setPatternShake] = useState(false)

  const [qaQuestion, setQaQuestion] = useState(config.securityQuestion || '')
  const [qaAnswer, setQaAnswer] = useState('')
  const [forgotAnswer, setForgotAnswer] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [masterInput, setMasterInput] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const currentPosRef = useRef<{ x: number; y: number } | null>(null)
  const nodePositionsRef = useRef<{ x: number; y: number }[]>([])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }, [])

  const update = useCallback((partial: Partial<AppLockConfig>) => {
    const updated = saveLockConfig(partial)
    setConfig(updated)
  }, [])

  // ── Calculate node positions ──
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

  // ── Draw canvas ──
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
    const activeNodes = view === 'confirm-pattern' ? confirmNodes : drawnNodes

    // Draw lines
    if (activeNodes.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = '#7C5CFF'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const first = positions[activeNodes[0]]
      ctx.moveTo(first.x, first.y)
      for (let i = 1; i < activeNodes.length; i++) {
        ctx.lineTo(positions[activeNodes[i]].x, positions[activeNodes[i]].y)
      }
      if (isDrawingRef.current && currentPosRef.current) {
        ctx.lineTo(currentPosRef.current.x, currentPosRef.current.y)
      }
      ctx.stroke()
    } else if (activeNodes.length === 1 && isDrawingRef.current && currentPosRef.current) {
      ctx.beginPath()
      ctx.strokeStyle = '#7C5CFF'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.moveTo(positions[activeNodes[0]].x, positions[activeNodes[0]].y)
      ctx.lineTo(currentPosRef.current.x, currentPosRef.current.y)
      ctx.stroke()
    }

    // Draw nodes
    for (let i = 0; i < TOTAL_NODES; i++) {
      const p = positions[i]
      const isActive = activeNodes.includes(i)

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
  }, [drawnNodes, confirmNodes, view, calcNodePositions])

  useEffect(() => {
    if (view === 'draw-pattern' || view === 'confirm-pattern') {
      drawCanvas()
    }
  }, [view, drawnNodes, confirmNodes, drawCanvas])

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
      if (view === 'confirm-pattern') setConfirmNodes([node])
      else setDrawnNodes([node])
    }
  }, [hitTestNode, getRelativePos, view])

  const handleDrawMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const pos = getRelativePos(e)
    currentPosRef.current = pos
    const node = hitTestNode(pos.x, pos.y)
    if (node !== null) {
      const currentNodes = view === 'confirm-pattern' ? confirmNodes : drawnNodes
      if (!currentNodes.includes(node)) {
        if (view === 'confirm-pattern') setConfirmNodes(prev => [...prev, node])
        else setDrawnNodes(prev => [...prev, node])
      }
    }
    drawCanvas()
  }, [hitTestNode, getRelativePos, view, confirmNodes, drawnNodes, drawCanvas])

  const handleDrawEnd = useCallback(() => {
    isDrawingRef.current = false
    currentPosRef.current = null
    drawCanvas()
  }, [drawCanvas])

  // ── Pattern submission ──
  const handlePatternSubmit = useCallback(() => {
    const currentNodes = view === 'confirm-pattern' ? confirmNodes : drawnNodes
    if (currentNodes.length < 4) {
      setPatternError('Connect at least 4 dots')
      setPatternShake(true)
      setTimeout(() => setPatternShake(false), 500)
      return
    }
    if (view === 'draw-pattern') {
      setConfirmNodes([])
      setView('confirm-pattern')
      setPatternError('')
    } else {
      if (JSON.stringify(drawnNodes) === JSON.stringify(confirmNodes)) {
        setPattern(drawnNodes)
        showToast('Pattern lock set successfully!')
        setDrawnNodes([])
        setConfirmNodes([])
        setPatternError('')
        setView('main')
        setConfig(loadLockConfig())
      } else {
        setPatternError('Patterns do not match. Try again.')
        setPatternShake(true)
        setConfirmNodes([])
        setTimeout(() => setPatternShake(false), 500)
      }
    }
  }, [view, drawnNodes, confirmNodes, showToast])

  // ── Save Security Q&A ──
  const handleSaveQA = useCallback(() => {
    if (!qaQuestion.trim() || !qaAnswer.trim()) { showToast('Please fill in both fields'); return }
    setSecurityQA(qaQuestion.trim(), qaAnswer.trim())
    showToast('Security question saved!')
    setView('main')
    setConfig(loadLockConfig())
  }, [qaQuestion, qaAnswer, showToast])

  // ── Forgot password ──
  const handleForgotVerify = useCallback(() => {
    if (verifySecurityAnswer(forgotAnswer)) {
      update({ enabled: false, method: 'none', patternHash: '' })
      showToast('Lock reset! Set a new pattern.')
      setView('main')
      setConfig(loadLockConfig())
    } else {
      setForgotError('Incorrect answer')
      setTimeout(() => setForgotError(''), 2000)
    }
  }, [forgotAnswer, update, showToast])

  // ── Master PIN bypass ──
  const handleMasterBypass = useCallback(() => {
    if (verifyMasterPin(masterInput)) {
      update({ enabled: false, method: 'none', patternHash: '' })
      showToast('Emergency bypass activated. Lock reset.')
      setView('main')
      setMasterInput('')
      setConfig(loadLockConfig())
    } else {
      showToast('Invalid code')
      setMasterInput('')
    }
  }, [masterInput, update, showToast])

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="relative">

      {/* ══════ MAIN ══════ */}
      {view === 'main' && (
        <div className="space-y-0">
          {/* App Lock toggle */}
          <div className="flex items-center gap-4 px-4 py-3.5">
            <div className="flex-1">
              <p className="text-white text-sm font-medium">App Lock</p>
              <p className="text-[#94A3B8] text-xs mt-0.5">Require authentication to open</p>
            </div>
            <button onClick={() => update({ enabled: !config.enabled })}
              className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-colors duration-200
                         ${config.enabled ? 'bg-[#7C5CFF]' : 'bg-[#1E293B]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200
                              ${config.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Biometric toggle */}
          <div className="flex items-center gap-4 px-4 py-3.5 border-t border-[#1E293B]">
            <Fingerprint size={16} className="text-[#00D4FF] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Biometric Lock</p>
              <p className="text-[#94A3B8] text-xs mt-0.5">Fingerprint / Face ID</p>
            </div>
            <button onClick={() => update({ biometricEnabled: !config.biometricEnabled, method: !config.biometricEnabled ? 'biometric' : config.patternHash ? 'pattern' : 'none' })}
              className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-colors duration-200
                         ${config.biometricEnabled ? 'bg-[#7C5CFF]' : 'bg-[#1E293B]'}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200
                              ${config.biometricEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Pattern Lock */}
          <button onClick={() => { setDrawnNodes([]); setConfirmNodes([]); setPatternError(''); setView('draw-pattern') }}
            className="flex items-center gap-4 px-4 py-3.5 border-t border-[#1E293B] w-full text-left active:bg-[#1E293B]/30 transition-colors duration-150">
            <Grid3X3 size={16} className="text-[#7C5CFF] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Pattern Lock</p>
              <p className="text-[#94A3B8] text-xs mt-0.5">
                {config.patternHash ? 'Pattern active — Tap to change' : 'Draw a pattern to lock'}
              </p>
            </div>
            <ChevronRight size={14} className="text-[#94A3B8]" />
          </button>

          {/* Security Question */}
          <button onClick={() => setView('setup-qa')}
            className="flex items-center gap-4 px-4 py-3.5 border-t border-[#1E293B] w-full text-left active:bg-[#1E293B]/30 transition-colors duration-150">
            <HelpCircle size={16} className="text-[#F59E0B] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Recovery Question</p>
              <p className="text-[#94A3B8] text-xs mt-0.5">
                {config.securityQuestion ? `Set: "${config.securityQuestion}"` : 'Set a security Q&A for lock recovery'}
              </p>
            </div>
            <ChevronRight size={14} className="text-[#94A3B8]" />
          </button>

          {/* Forgot Password link */}
          {config.patternHash && (
            <button onClick={() => { setForgotAnswer(''); setForgotError(''); setMasterInput(''); setView('forgot') }}
              className="w-full px-4 py-2.5 border-t border-[#1E293B] text-left active:bg-[#1E293B]/30 transition-colors duration-150">
              <p className="text-red-400/70 text-xs">Forgot Pattern?</p>
            </button>
          )}

          {/* Active badge */}
          {config.enabled && config.method !== 'none' && (
            <div className="flex items-center gap-2 px-3 py-2 mx-4 mt-2 rounded-lg bg-[#22C55E]/5 border border-[#22C55E]/15">
              <ShieldCheck size={12} className="text-[#22C55E]" />
              <p className="text-[#22C55E]/80 text-[10px] font-medium">
                {config.method === 'biometric' ? 'Biometric' : 'Pattern'} lock active
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════ PATTERN DRAW ══════ */}
      {(view === 'draw-pattern' || view === 'confirm-pattern') && (
        <div className="px-4 py-6 flex flex-col items-center">
          <button onClick={() => { setView('main'); setDrawnNodes([]); setConfirmNodes([]) }}
            className="self-start text-neutral-500 text-xs mb-4 active:text-neutral-300 transition-colors">
            ← Back
          </button>

          <div className={`w-14 h-14 rounded-2xl bg-[#7C5CFF]/10 flex items-center justify-center mb-3
                          ${patternShake ? 'animate-shake' : ''}`}>
            <Grid3X3 size={24} className="text-[#7C5CFF]" />
          </div>

          <h3 className="text-white text-base font-bold mb-1">
            {view === 'draw-pattern' ? 'Draw Pattern' : 'Confirm Pattern'}
          </h3>
          <p className="text-neutral-500 text-xs mb-5 text-center">
            {view === 'draw-pattern' ? 'Connect at least 4 dots' : 'Draw the same pattern to confirm'}
          </p>

          <span className="text-neutral-600 text-[10px] mb-3">
            {(view === 'confirm-pattern' ? confirmNodes : drawnNodes).length} / 9 dots
          </span>

          <div ref={containerRef} className="w-[240px] h-[240px] relative">
            <canvas ref={canvasRef} className="absolute inset-0 touch-none"
              onTouchStart={handleDrawStart} onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
              onMouseDown={handleDrawStart} onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd} />
          </div>

          {patternError && (
            <div className="flex items-center gap-2 mt-4 animate-[fade-in_200ms_ease-out]">
              <ShieldAlert size={14} className="text-red-400" />
              <p className="text-red-400 text-xs font-medium">{patternError}</p>
            </div>
          )}

          <button onClick={handlePatternSubmit}
            className="mt-6 w-full max-w-[240px] h-10 rounded-xl bg-[#7C5CFF] text-white text-sm font-bold active:scale-95 transition-transform duration-100">
            {view === 'draw-pattern' ? 'Continue' : 'Confirm Pattern'}
          </button>

          <button onClick={() => {
            if (view === 'confirm-pattern') { setConfirmNodes([]); setView('draw-pattern') }
            else setDrawnNodes([])
            setPatternError('')
          }} className="mt-3 text-neutral-600 text-xs active:text-neutral-400 transition-colors">
            Reset
          </button>
        </div>
      )}

      {/* ══════ SECURITY Q&A ══════ */}
      {view === 'setup-qa' && (
        <div className="px-4 py-6">
          <button onClick={() => setView('main')}
            className="text-neutral-500 text-xs mb-4 active:text-neutral-300 transition-colors">← Back</button>

          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={18} className="text-[#F59E0B]" />
            <h3 className="text-white text-base font-bold">Recovery Question</h3>
          </div>
          <p className="text-neutral-500 text-xs mb-6 leading-relaxed">
            If you forget your pattern, answer this question to regain access.
          </p>

          <div className="space-y-2 mb-4">
            <p className="text-[#94A3B8] text-xs font-medium">Choose a question:</p>
            {[
              "What is your mother's maiden name?",
              "What was the name of your first pet?",
              "What city were you born in?",
              "What is your favorite movie?",
              "Custom question..."
            ].map(q => (
              <button key={q} onClick={() => setQaQuestion(q === 'Custom question...' ? '' : q)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium border transition-all duration-150 active:scale-[0.98]
                           ${qaQuestion === q ? 'border-[#7C5CFF] bg-[#7C5CFF]/10 text-[#7C5CFF]' : 'border-[#1E293B] bg-[#0F172A] text-[#94A3B8]'}`}>
                {q}
              </button>
            ))}
          </div>

          {qaQuestion === '' && (
            <input type="text" placeholder="Type your custom question..." value={qaQuestion}
              onChange={e => setQaQuestion(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B] text-white text-xs mb-4 outline-none focus:border-[#7C5CFF] transition-colors" />
          )}

          <input type="text" placeholder="Your answer" value={qaAnswer}
            onChange={e => setQaAnswer(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B] text-white text-xs mb-6 outline-none focus:border-[#7C5CFF] transition-colors" />

          <button onClick={handleSaveQA}
            disabled={!qaQuestion.trim() || !qaAnswer.trim()}
            className="w-full h-10 rounded-xl bg-[#7C5CFF] text-white text-sm font-bold active:scale-95 transition-all duration-100 disabled:opacity-40 disabled:pointer-events-none">
            Save Recovery Question
          </button>
        </div>
      )}

      {/* ══════ FORGOT PASSWORD ══════ */}
      {view === 'forgot' && (
        <div className="px-4 py-6 flex flex-col items-center">
          <button onClick={() => { setView('main'); setForgotAnswer(''); setForgotError('') }}
            className="self-start text-neutral-500 text-xs mb-6 active:text-neutral-300 transition-colors">← Back</button>

          <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center mb-3">
            <AlertTriangle size={24} className="text-[#F59E0B]" />
          </div>

          <h3 className="text-white text-base font-bold mb-1">Forgot Pattern?</h3>
          <p className="text-neutral-500 text-xs mb-6 text-center">Answer your security question to reset</p>

          {config.securityQuestion ? (
            <>
              <div className="w-full bg-[#0F172A] border border-[#1E293B] rounded-lg px-3 py-2.5 mb-4">
                <p className="text-[#94A3B8] text-[10px] mb-1">Security Question</p>
                <p className="text-white text-xs font-medium">{config.securityQuestion}</p>
              </div>
              <input type="text" placeholder="Your answer" value={forgotAnswer}
                onChange={e => setForgotAnswer(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B] text-white text-xs mb-4 outline-none focus:border-[#7C5CFF] transition-colors" />
              {forgotError && <p className="text-red-400 text-xs mb-3">{forgotError}</p>}
              <button onClick={handleForgotVerify}
                className="w-full h-10 rounded-xl bg-[#7C5CFF] text-white text-sm font-bold active:scale-95 transition-transform duration-100 mb-3">
                Verify Answer
              </button>
            </>
          ) : (
            <p className="text-neutral-600 text-xs text-center mb-4">No security question set. Use emergency bypass below.</p>
          )}

          <div className="w-full border-t border-[#1E293B] pt-4 mt-2">
            <p className="text-neutral-600 text-[10px] text-center mb-3">Emergency Bypass</p>
            <div className="flex gap-2">
              <input type="password" placeholder="Enter code" value={masterInput}
                onChange={e => setMasterInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="flex-1 h-10 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B] text-white text-xs outline-none focus:border-red-500/50 transition-colors" />
              <button onClick={handleMasterBypass}
                className="px-4 h-10 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold active:scale-95 transition-transform duration-100">
                Bypass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute -top-12 left-0 right-0 z-50 bg-[#22C55E] rounded-xl p-3 text-center text-white text-xs font-semibold animate-[fade-in_200ms_ease-out]">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
