'use client'

// ── Play Nexa Security Dashboard ─────────────────────────────
// 3-State Component: Setup → Calculator → Unlocked Dashboard
// Embedded in Profile page · Full-screen calculator overlay
// XOR 0x5A + Base64 encryption for all localStorage values
// Safe tokenizer + precedence stack evaluator (ZERO eval)
// Capacitor native bridge for APK features
// AMOLED Black calculator with secret equation unlock
// 2GB RAM safe · No backdrop-blur · No style jsx

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Shield, Lock, ChevronDown, ChevronUp,
  Menu, X, AlertTriangle, Plus, Smartphone, Palette,
  Calculator, Clock, FileText, Cloud,
  FolderOpen, Image, RefreshCw, Play, HelpCircle,
  Eye, EyeOff, Trash2, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react'

// ══════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════

interface CalculatorConfig {
  input1: string
  operator: string
  input2: string
  answer: string
  question: string
  questionAnswer: string
}

interface AppLockConfig {
  enabled: boolean
  lockDelaySeconds: number
  apps: string[]
}

interface IconChangerConfig {
  enabled: boolean
  iconName: string
  appLabel: string
}

interface SecurityDashboardProps {
  onUnlock?: () => void
}

// ══════════════════════════════════════════════════════════════
// XOR 0x5A + BASE64 ENCRYPTION
// Each character XOR'd with byte 0x5A then btoa encoded
// ══════════════════════════════════════════════════════════════

function xorEncrypt(text: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ 0x5A)
  }
  return btoa(result)
}

function xorDecrypt(encoded: string): string {
  try {
    const decoded = atob(encoded)
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ 0x5A)
    }
    return result
  } catch {
    return ''
  }
}

function encryptAnswer(answer: string): string {
  return xorEncrypt(answer.trim().toLowerCase())
}

function decryptAnswer(encoded: string): string {
  return xorDecrypt(encoded)
}

// ══════════════════════════════════════════════════════════════
// CONFIG PERSISTENCE (all values XOR 0x5A + Base64)
// ══════════════════════════════════════════════════════════════

const CALC_CONFIG_KEY = 'pn_calculator_config'
const APP_LOCK_KEY = 'pn_app_lock_config'
const ICON_CHANGE_KEY = 'pn_icon_changer_config'

function saveCalcConfig(config: CalculatorConfig): void {
  const json = JSON.stringify(config)
  localStorage.setItem(CALC_CONFIG_KEY, xorEncrypt(json))
}

function loadCalcConfig(): CalculatorConfig | null {
  try {
    const raw = localStorage.getItem(CALC_CONFIG_KEY)
    if (!raw) return null
    const json = xorDecrypt(raw)
    if (!json) return null
    return JSON.parse(json) as CalculatorConfig
  } catch {
    return null
  }
}

function clearCalcConfig(): void {
  localStorage.removeItem(CALC_CONFIG_KEY)
}

function saveAppLockConfig(config: AppLockConfig): void {
  const json = JSON.stringify(config)
  localStorage.setItem(APP_LOCK_KEY, xorEncrypt(json))
}

function loadAppLockConfig(): AppLockConfig {
  try {
    const raw = localStorage.getItem(APP_LOCK_KEY)
    if (!raw) return { enabled: false, lockDelaySeconds: 0, apps: [] }
    const json = xorDecrypt(raw)
    if (!json) return { enabled: false, lockDelaySeconds: 0, apps: [] }
    return { enabled: false, lockDelaySeconds: 0, apps: [], ...JSON.parse(json) }
  } catch {
    return { enabled: false, lockDelaySeconds: 0, apps: [] }
  }
}

function saveIconChangerConfig(config: IconChangerConfig): void {
  const json = JSON.stringify(config)
  localStorage.setItem(ICON_CHANGE_KEY, xorEncrypt(json))
}

function loadIconChangerConfig(): IconChangerConfig {
  try {
    const raw = localStorage.getItem(ICON_CHANGE_KEY)
    if (!raw) return { enabled: false, iconName: 'Calculator', appLabel: '' }
    const json = xorDecrypt(raw)
    if (!json) return { enabled: false, iconName: 'Calculator', appLabel: '' }
    return { enabled: false, iconName: 'Calculator', appLabel: '', ...JSON.parse(json) }
  } catch {
    return { enabled: false, iconName: 'Calculator', appLabel: '' }
  }
}

// ══════════════════════════════════════════════════════════════
// SAFE TOKENIZER + PRECEDENCE STACK EVALUATOR
// ZERO eval() — two-pass precedence approach
// Pass 1: * and / (higher precedence)
// Pass 2: + and - (lower precedence)
// ══════════════════════════════════════════════════════════════

function tokenize(expr: string): (number | string)[] {
  const tokens: (number | string)[] = []
  let current = ''
  for (const ch of expr) {
    if ('0123456789.'.includes(ch)) {
      current += ch
    } else if ('+-*/'.includes(ch)) {
      if (current) {
        const num = parseFloat(current)
        if (!isNaN(num)) tokens.push(num)
        current = ''
      }
      tokens.push(ch)
    }
  }
  if (current) {
    const num = parseFloat(current)
    if (!isNaN(num)) tokens.push(num)
  }
  return tokens
}

function evaluateWithPrecedence(tokens: (number | string)[]): number {
  if (tokens.length === 0) return 0
  if (tokens.length === 1 && typeof tokens[0] === 'number') return tokens[0]

  // Pass 1: handle * and / (higher precedence)
  const pass1: (number | string)[] = []
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === '*' || token === '/') {
      const prev = pass1.pop() as number
      i++
      const next = tokens[i] as number
      if (token === '*') {
        pass1.push(prev * next)
      } else {
        pass1.push(next !== 0 ? prev / next : Infinity)
      }
    } else {
      pass1.push(token)
    }
    i++
  }

  // Pass 2: handle + and - (lower precedence)
  let result = pass1[0] as number
  for (let j = 1; j < pass1.length; j += 2) {
    const op = pass1[j] as string
    const num = pass1[j + 1] as number
    if (op === '+') result += num
    else if (op === '-') result -= num
  }
  return result
}

function computeExpression(expr: string): string {
  const tokens = tokenize(expr)
  if (tokens.length === 0) return '0'
  const result = evaluateWithPrecedence(tokens)
  if (!Number.isFinite(result)) return 'Error'
  return String(parseFloat(result.toFixed(10)))
}

function computeSetupAnswer(input1: string, op: string, input2: string): string {
  const a = parseFloat(input1)
  const b = parseFloat(input2)
  if (isNaN(a) || isNaN(b)) return 'Error'
  let result: number
  switch (op) {
    case '+': result = a + b; break
    case '-': result = a - b; break
    case '*': result = a * b; break
    case '/': result = b !== 0 ? a / b : Infinity; break
    default: return 'Error'
  }
  if (!Number.isFinite(result)) return 'Error'
  return String(parseFloat(result.toFixed(10)))
}

// ══════════════════════════════════════════════════════════════
// NATIVE PLATFORM DETECTION + BRIDGE
// ══════════════════════════════════════════════════════════════

function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  if (w.Capacitor?.isNativePlatform?.()) return true
  if (w.Capacitor?.getPlatform?.() === 'android') return true
  return false
}

async function callNativeSetAppLock(config: {
  enabled: boolean
  apps: string[]
  lockDelaySeconds: number
}): Promise<boolean> {
  try {
    const plugins = (window as any).Capacitor?.Plugins
    if (!plugins?.AppManager) return false
    await plugins.AppManager.setAppLock(config)
    return true
  } catch {
    return false
  }
}

async function callNativeChangeIcon(config: {
  iconName: string
  appLabel: string
  enabled: boolean
}): Promise<boolean> {
  try {
    const plugins = (window as any).Capacitor?.Plugins
    if (!plugins?.AppManager) return false
    await plugins.AppManager.changeAppIcon(config)
    return true
  } catch {
    return false
  }
}

// ══════════════════════════════════════════════════════════════
// DISPLAY HELPERS
// ══════════════════════════════════════════════════════════════

function operatorSymbol(op: string): string {
  switch (op) {
    case '+': return '+'
    case '-': return '\u2212'
    case '*': return '\u00D7'
    case '/': return '\u00F7'
    default: return op
  }
}

function operatorLabel(op: string): string {
  switch (op) {
    case '+': return 'plus'
    case '-': return 'minus'
    case '*': return 'multiply'
    case '/': return 'divide'
    default: return op
  }
}

const ICON_OPTIONS = [
  { id: 'Calculator', label: 'Calculator', Icon: Calculator, color: '#7C5CFF' },
  { id: 'Clock', label: 'Clock', Icon: Clock, color: '#F59E0B' },
  { id: 'Notes', label: 'Notes', Icon: FileText, color: '#3B82F6' },
  { id: 'Weather', label: 'Weather', Icon: Cloud, color: '#00D4FF' },
  { id: 'Files', label: 'Files', Icon: FolderOpen, color: '#94A3B8' },
  { id: 'Gallery', label: 'Gallery', Icon: Image, color: '#EC4899' },
]

const DELAY_OPTIONS = [
  { label: 'Instant', seconds: 0 },
  { label: '5s', seconds: 5 },
  { label: '15s', seconds: 15 },
  { label: '30s', seconds: 30 },
]

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function SecurityDashboard({ onUnlock }: SecurityDashboardProps) {
  // ── Master view state ──
  const [view, setView] = useState<'setup' | 'calculator' | 'dashboard'>(() => {
    return loadCalcConfig() ? 'calculator' : 'setup'
  })

  // ── Setup state ──
  const [setupStep, setSetupStep] = useState<1 | 2>(1)
  const [input1, setInput1] = useState('')
  const [operator, setOperator] = useState('+')
  const [input2, setInput2] = useState('')
  const [question, setQuestion] = useState('')
  const [answerInput, setAnswerInput] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)

  // ── Calculator state ──
  const [calcExpr, setCalcExpr] = useState('')
  const [calcDisplay, setCalcDisplay] = useState('0')
  const [calcWaitingOperand, setCalcWaitingOperand] = useState(false)
  const [calcJustEval, setCalcJustEval] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotAnswer, setForgotAnswer] = useState('')
  const [forgotError, setForgotError] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // ── Dashboard state ──
  const [expandedGroup, setExpandedGroup] = useState<'shield' | 'phone' | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  // App Lock state
  const [appLockConfig, setAppLockConfig] = useState<AppLockConfig>(() => loadAppLockConfig())
  const [newAppName, setNewAppName] = useState('')
  const [appLockStatus, setAppLockStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')

  // Icon Changer state
  const [iconConfig, setIconConfig] = useState<IconChangerConfig>(() => loadIconChangerConfig())
  const [iconStatus, setIconStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')

  // ── Toast state ──
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Preview calculator state ──
  const [previewExpr, setPreviewExpr] = useState('')
  const [previewDisplay, setPreviewDisplay] = useState('0')
  const [previewWaiting, setPreviewWaiting] = useState(false)
  const [previewJustEval, setPreviewJustEval] = useState(false)

  // ════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }, [])

  const triggerUnlock = useCallback(() => {
    setView('dashboard')
    onUnlock?.()
  }, [onUnlock])

  // ── Click outside menu ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  // ── Setup: live preview ──
  const liveAnswer = computeSetupAnswer(input1, operator, input2)
  const canProceedStep1 = input1.trim() !== '' && input2.trim() !== '' && liveAnswer !== 'Error'
  const canSave = question.trim() !== '' && answerInput.trim() !== ''

  // ── Setup save handler ──
  const handleSetupSave = useCallback(() => {
    if (!canProceedStep1 || !canSave) return
    const config: CalculatorConfig = {
      input1: input1.trim(),
      operator,
      input2: input2.trim(),
      answer: liveAnswer,
      question: question.trim(),
      questionAnswer: encryptAnswer(answerInput),
    }
    saveCalcConfig(config)
    setView('calculator')
    showToast('Calculator disguise activated')
  }, [input1, operator, input2, liveAnswer, question, answerInput, canProceedStep1, canSave, showToast])

  // ════════════════════════════════════════════════════════════
  // CALCULATOR HANDLERS
  // ════════════════════════════════════════════════════════════

  const handleCalcNumber = useCallback((digit: string) => {
    if (calcJustEval) {
      setCalcExpr(digit)
      setCalcDisplay(digit)
      setCalcJustEval(false)
      setCalcWaitingOperand(false)
      return
    }
    if (calcWaitingOperand) {
      setCalcExpr(prev => prev + digit)
      setCalcDisplay(digit)
      setCalcWaitingOperand(false)
      return
    }
    const newDisplay = calcDisplay === '0' ? digit : calcDisplay + digit
    setCalcExpr(prev => prev + digit)
    setCalcDisplay(newDisplay)
  }, [calcJustEval, calcWaitingOperand, calcDisplay])

  const handleCalcOperator = useCallback((op: string) => {
    if (calcJustEval) {
      setCalcExpr(calcDisplay + op)
      setCalcJustEval(false)
      setCalcWaitingOperand(true)
      return
    }
    if (calcWaitingOperand) {
      setCalcExpr(prev => prev.slice(0, -1) + op)
      return
    }
    setCalcExpr(prev => prev + op)
    setCalcWaitingOperand(true)
  }, [calcJustEval, calcWaitingOperand, calcDisplay])

  const handleCalcEquals = useCallback(() => {
    if (!calcExpr) return
    const config = loadCalcConfig()
    const result = computeExpression(calcExpr)

    // ── Secret equation unlock check ──
    if (config) {
      const secretEquation = config.input1 + config.operator + config.input2
      if (calcExpr === secretEquation && result === config.answer) {
        triggerUnlock()
        return
      }
    }

    setCalcDisplay(result)
    setCalcJustEval(true)
  }, [calcExpr, triggerUnlock])

  const handleCalcClear = useCallback(() => {
    setCalcExpr('')
    setCalcDisplay('0')
    setCalcWaitingOperand(false)
    setCalcJustEval(false)
  }, [])

  const handleCalcBackspace = useCallback(() => {
    if (calcJustEval) {
      setCalcExpr('')
      setCalcDisplay('0')
      setCalcJustEval(false)
      return
    }
    if (calcExpr.length <= 1) {
      setCalcExpr('')
      setCalcDisplay('0')
      return
    }
    const newExpr = calcExpr.slice(0, -1)
    setCalcExpr(newExpr)
    // Update display to show the last number segment
    const lastNum = newExpr.split(/[+\-*/]/).pop() || '0'
    setCalcDisplay(lastNum || '0')
  }, [calcExpr, calcJustEval])

  const handleCalcPercent = useCallback(() => {
    const current = parseFloat(calcDisplay)
    if (isNaN(current)) return
    const pct = String(parseFloat((current / 100).toFixed(10)))
    setCalcDisplay(pct)
    if (calcJustEval) {
      setCalcExpr(pct)
    }
    setCalcJustEval(true)
  }, [calcDisplay, calcJustEval])

  const handleCalcToggleSign = useCallback(() => {
    if (calcJustEval) {
      const newDisplay = calcDisplay.startsWith('-') ? calcDisplay.slice(1) : '-' + calcDisplay
      setCalcDisplay(newDisplay)
      setCalcExpr(newDisplay)
      return
    }
    const newDisplay = calcDisplay.startsWith('-') ? calcDisplay.slice(1) : '-' + calcDisplay
    setCalcDisplay(newDisplay)
  }, [calcDisplay, calcJustEval])

  const handleCalcDecimal = useCallback(() => {
    if (calcJustEval) {
      setCalcExpr('0.')
      setCalcDisplay('0.')
      setCalcJustEval(false)
      setCalcWaitingOperand(false)
      return
    }
    if (calcWaitingOperand) {
      setCalcExpr(prev => prev + '0.')
      setCalcDisplay('0.')
      setCalcWaitingOperand(false)
      return
    }
    if (!calcDisplay.includes('.')) {
      setCalcExpr(prev => prev + '.')
      setCalcDisplay(prev => prev + '.')
    }
  }, [calcJustEval, calcWaitingOperand, calcDisplay])

  // ── Forgot PP handler ──
  const handleForgotSubmit = useCallback(() => {
    const config = loadCalcConfig()
    if (!config) return
    const decryptedAnswer = decryptAnswer(config.questionAnswer)
    if (forgotAnswer.trim().toLowerCase() === decryptedAnswer) {
      setShowForgotModal(false)
      setForgotAnswer('')
      setForgotError(false)
      triggerUnlock()
    } else {
      setForgotError(true)
      setTimeout(() => setForgotError(false), 600)
    }
  }, [forgotAnswer, triggerUnlock])

  // ════════════════════════════════════════════════════════════
  // PREVIEW CALCULATOR HANDLERS
  // ════════════════════════════════════════════════════════════

  const handlePreviewNumber = useCallback((digit: string) => {
    if (previewJustEval) {
      setPreviewExpr(digit)
      setPreviewDisplay(digit)
      setPreviewJustEval(false)
      setPreviewWaiting(false)
      return
    }
    if (previewWaiting) {
      setPreviewExpr(prev => prev + digit)
      setPreviewDisplay(digit)
      setPreviewWaiting(false)
      return
    }
    const newDisplay = previewDisplay === '0' ? digit : previewDisplay + digit
    setPreviewExpr(prev => prev + digit)
    setPreviewDisplay(newDisplay)
  }, [previewJustEval, previewWaiting, previewDisplay])

  const handlePreviewOperator = useCallback((op: string) => {
    if (previewJustEval) {
      setPreviewExpr(previewDisplay + op)
      setPreviewJustEval(false)
      setPreviewWaiting(true)
      return
    }
    if (previewWaiting) {
      setPreviewExpr(prev => prev.slice(0, -1) + op)
      return
    }
    setPreviewExpr(prev => prev + op)
    setPreviewWaiting(true)
  }, [previewJustEval, previewWaiting, previewDisplay])

  const handlePreviewEquals = useCallback(() => {
    if (!previewExpr) return
    const result = computeExpression(previewExpr)
    setPreviewDisplay(result)
    setPreviewJustEval(true)
  }, [previewExpr])

  const handlePreviewClear = useCallback(() => {
    setPreviewExpr('')
    setPreviewDisplay('0')
    setPreviewWaiting(false)
    setPreviewJustEval(false)
  }, [])

  const handlePreviewPercent = useCallback(() => {
    const current = parseFloat(previewDisplay)
    if (isNaN(current)) return
    const pct = String(parseFloat((current / 100).toFixed(10)))
    setPreviewDisplay(pct)
    if (previewJustEval) setPreviewExpr(pct)
    setPreviewJustEval(true)
  }, [previewDisplay, previewJustEval])

  const handlePreviewToggleSign = useCallback(() => {
    if (previewJustEval) {
      const nd = previewDisplay.startsWith('-') ? previewDisplay.slice(1) : '-' + previewDisplay
      setPreviewDisplay(nd)
      setPreviewExpr(nd)
      return
    }
    const nd = previewDisplay.startsWith('-') ? previewDisplay.slice(1) : '-' + previewDisplay
    setPreviewDisplay(nd)
  }, [previewDisplay, previewJustEval])

  const handlePreviewDecimal = useCallback(() => {
    if (previewJustEval) {
      setPreviewExpr('0.')
      setPreviewDisplay('0.')
      setPreviewJustEval(false)
      setPreviewWaiting(false)
      return
    }
    if (previewWaiting) {
      setPreviewExpr(prev => prev + '0.')
      setPreviewDisplay('0.')
      setPreviewWaiting(false)
      return
    }
    if (!previewDisplay.includes('.')) {
      setPreviewExpr(prev => prev + '.')
      setPreviewDisplay(prev => prev + '.')
    }
  }, [previewJustEval, previewWaiting, previewDisplay])

  // ════════════════════════════════════════════════════════════
  // DASHBOARD HANDLERS
  // ════════════════════════════════════════════════════════════

  const handleReconfigure = useCallback(() => {
    clearCalcConfig()
    setView('setup')
    setSetupStep(1)
    setInput1('')
    setOperator('+')
    setInput2('')
    setQuestion('')
    setAnswerInput('')
    setCalcExpr('')
    setCalcDisplay('0')
    setCalcWaitingOperand(false)
    setCalcJustEval(false)
    showToast('Calculator setup reset')
  }, [showToast])

  const handleAddApp = useCallback(() => {
    const name = newAppName.trim()
    if (!name) return
    if (appLockConfig.apps.includes(name)) {
      showToast('App already in list')
      return
    }
    setAppLockConfig(prev => ({ ...prev, apps: [...prev.apps, name] }))
    setNewAppName('')
  }, [newAppName, appLockConfig.apps, showToast])

  const handleRemoveApp = useCallback((name: string) => {
    setAppLockConfig(prev => ({ ...prev, apps: prev.apps.filter(a => a !== name) }))
  }, [])

  const handleSaveAppLock = useCallback(async () => {
    saveAppLockConfig(appLockConfig)
    if (isNativePlatform()) {
      setAppLockStatus('syncing')
      const success = await callNativeSetAppLock({
        enabled: appLockConfig.enabled,
        apps: appLockConfig.apps,
        lockDelaySeconds: appLockConfig.lockDelaySeconds,
      })
      setAppLockStatus(success ? 'success' : 'error')
      setTimeout(() => setAppLockStatus('idle'), 3000)
    } else {
      showToast('Config saved \u2014 activates on APK install')
    }
  }, [appLockConfig, showToast])

  const handleSaveIconChanger = useCallback(async () => {
    saveIconChangerConfig(iconConfig)
    if (isNativePlatform()) {
      setIconStatus('syncing')
      const success = await callNativeChangeIcon({
        iconName: iconConfig.iconName,
        appLabel: iconConfig.appLabel,
        enabled: iconConfig.enabled,
      })
      setIconStatus(success ? 'success' : 'error')
      setTimeout(() => setIconStatus('idle'), 3000)
    } else {
      showToast('Config saved \u2014 activates on APK install')
    }
  }, [iconConfig, showToast])

  const handleResetCalculator = useCallback(() => {
    clearCalcConfig()
    setView('setup')
    setSetupStep(1)
    setInput1('')
    setOperator('+')
    setInput2('')
    setQuestion('')
    setAnswerInput('')
    setConfirmReset(false)
    showToast('Calculator setup has been reset')
  }, [showToast])

  // ── Calculator buttons ──
  const calcButtons = [
    { label: 'AC', action: handleCalcClear, style: 'func' as const },
    { label: '+/\u2212', action: handleCalcToggleSign, style: 'func' as const },
    { label: '%', action: handleCalcPercent, style: 'func' as const },
    { label: '\u00F7', action: () => handleCalcOperator('/'), style: 'op' as const },
    { label: '7', action: () => handleCalcNumber('7'), style: 'num' as const },
    { label: '8', action: () => handleCalcNumber('8'), style: 'num' as const },
    { label: '9', action: () => handleCalcNumber('9'), style: 'num' as const },
    { label: '\u00D7', action: () => handleCalcOperator('*'), style: 'op' as const },
    { label: '4', action: () => handleCalcNumber('4'), style: 'num' as const },
    { label: '5', action: () => handleCalcNumber('5'), style: 'num' as const },
    { label: '6', action: () => handleCalcNumber('6'), style: 'num' as const },
    { label: '\u2212', action: () => handleCalcOperator('-'), style: 'op' as const },
    { label: '1', action: () => handleCalcNumber('1'), style: 'num' as const },
    { label: '2', action: () => handleCalcNumber('2'), style: 'num' as const },
    { label: '3', action: () => handleCalcNumber('3'), style: 'num' as const },
    { label: '+', action: () => handleCalcOperator('+'), style: 'op' as const },
    { label: '0', action: () => handleCalcNumber('0'), style: 'num-wide' as const },
    { label: '.', action: handleCalcDecimal, style: 'num' as const },
    { label: '=', action: handleCalcEquals, style: 'op-accent' as const },
  ]

  const previewButtons = [
    { label: 'AC', action: handlePreviewClear, style: 'func' as const },
    { label: '+/\u2212', action: handlePreviewToggleSign, style: 'func' as const },
    { label: '%', action: handlePreviewPercent, style: 'func' as const },
    { label: '\u00F7', action: () => handlePreviewOperator('/'), style: 'op' as const },
    { label: '7', action: () => handlePreviewNumber('7'), style: 'num' as const },
    { label: '8', action: () => handlePreviewNumber('8'), style: 'num' as const },
    { label: '9', action: () => handlePreviewNumber('9'), style: 'num' as const },
    { label: '\u00D7', action: () => handlePreviewOperator('*'), style: 'op' as const },
    { label: '4', action: () => handlePreviewNumber('4'), style: 'num' as const },
    { label: '5', action: () => handlePreviewNumber('5'), style: 'num' as const },
    { label: '6', action: () => handlePreviewNumber('6'), style: 'num' as const },
    { label: '\u2212', action: () => handlePreviewOperator('-'), style: 'op' as const },
    { label: '1', action: () => handlePreviewNumber('1'), style: 'num' as const },
    { label: '2', action: () => handlePreviewNumber('2'), style: 'num' as const },
    { label: '3', action: () => handlePreviewNumber('3'), style: 'num' as const },
    { label: '+', action: () => handlePreviewOperator('+'), style: 'op' as const },
    { label: '0', action: () => handlePreviewNumber('0'), style: 'num-wide' as const },
    { label: '.', action: handlePreviewDecimal, style: 'num' as const },
    { label: '=', action: handlePreviewEquals, style: 'op-accent' as const },
  ]

  // ── Display font sizing ──
  const calcDisplayLen = calcDisplay.length
  const calcFontSize = calcDisplayLen > 12 ? 'text-2xl' : calcDisplayLen > 9 ? 'text-3xl' : calcDisplayLen > 7 ? 'text-4xl' : 'text-5xl'

  // ── Format expression for top line display ──
  const formatExpr = (expr: string) =>
    expr.replace(/\*/g, '\u00D7').replace(/\//g, '\u00F7')

  // ════════════════════════════════════════════════════════════
  // RENDER HELPER: Calculator button grid
  // ════════════════════════════════════════════════════════════

  function renderCalcGrid(buttons: typeof calcButtons) {
    return (
      <div className="grid grid-cols-4 gap-[1px] bg-[#1a1a1a]">
        {buttons.map((btn, i) => {
          const isOp = btn.style === 'op' || btn.style === 'op-accent'
          const isFunc = btn.style === 'func'
          const isWide = btn.style === 'num-wide'
          const isAccent = btn.style === 'op-accent'
          return (
            <button
              key={i}
              onClick={btn.action}
              className={`
                ${isWide ? 'col-span-2' : ''}
                h-[68px] sm:h-[72px] flex items-center justify-center
                text-2xl font-medium
                active:brightness-150 active:scale-95
                transition-all duration-75
                ${isAccent
                  ? 'bg-[#7C5CFF] text-white text-3xl font-semibold'
                  : isOp
                    ? 'bg-[#333] text-[#7C5CFF] text-3xl'
                    : isFunc
                      ? 'bg-[#2a2a2a] text-[#A0A0A0] text-lg'
                      : 'bg-[#1a1a1a] text-white'
                }
              `}
              style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            >
              {btn.label}
            </button>
          )
        })}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: STATE 2 — ACTIVE CALCULATOR (full-screen overlay)
  // ════════════════════════════════════════════════════════════

  if (view === 'calculator') {
    return (
      <>
        {/* Inline trigger card for profile page */}
        <div className="w-full bg-[#111827] border border-[#1E293B] rounded-2xl p-4
                        active:scale-[0.98] transition-transform duration-100"
             onClick={() => {
               // Open the calculator overlay
               setCalcExpr('')
               setCalcDisplay('0')
               setCalcWaitingOperand(false)
               setCalcJustEval(false)
               setShowMenu(false)
             }}>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#000000] border border-[#1E293B]
                            flex items-center justify-center flex-shrink-0">
              <Calculator size={20} className="text-[#7C5CFF]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">Calculator Disguise</p>
              <p className="text-[#94A3B8] text-[10px] mt-0.5">
                Tap to open calculator and enter your secret equation
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#7C5CFF]/10 text-[#7C5CFF]">
                ACTIVE
              </span>
              <ChevronDown size={14} className="text-[#94A3B8] -rotate-90" />
            </div>
          </div>
        </div>

        {/* Full-screen calculator overlay */}
        <div className="fixed inset-0 z-[99999] bg-[#000000] flex flex-col select-none">
          {/* Hamburger menu */}
          <div className="absolute top-3 left-3 z-10" ref={menuRef}>
            <button
              onClick={() => setShowMenu(prev => !prev)}
              className="w-11 h-11 flex items-center justify-center rounded-xl
                         active:scale-90 transition-transform duration-75"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <Menu size={22} className="text-[#555]" />
            </button>
            {showMenu && (
              <div className="absolute top-12 left-0 bg-[#1a1a1a] border border-[#333]
                              rounded-xl overflow-hidden min-w-[170px] animate-fadeInUp
                              shadow-lg shadow-black/50">
                <button
                  onClick={() => { setShowMenu(false); setShowForgotModal(true) }}
                  className="w-full flex items-center gap-2.5 px-4 py-3.5 text-[#94A3B8] text-xs font-medium
                             active:bg-[#333] transition-colors duration-75"
                >
                  <HelpCircle size={14} />
                  Forgot PP?
                </button>
              </div>
            )}
          </div>

          {/* Display area */}
          <div className="flex-1 flex flex-col justify-end px-6 pb-4 min-h-[200px]">
            <p className="text-[#555] text-sm text-right mb-2 truncate min-h-[20px] font-light tracking-wide">
              {calcExpr ? formatExpr(calcExpr) : '\u00A0'}
            </p>
            <p className={`text-white ${calcFontSize} font-light text-right truncate leading-tight`}
               style={{ fontVariantNumeric: 'tabular-nums' }}>
              {calcDisplay}
            </p>
          </div>

          {/* Button grid */}
          {renderCalcGrid(calcButtons)}

          {/* Bottom safe area */}
          <div className="bg-[#000000]" style={{ height: 'env(safe-area-inset-bottom, 8px)' }} />

          {/* ── Forgot PP Modal ── */}
          {showForgotModal && (
            <div className="fixed inset-0 z-[100000] bg-black/80 flex items-center justify-center px-6">
              <div className={`w-full max-w-[340px] bg-[#111827] border border-[#1E293B] rounded-2xl p-6
                               ${forgotError ? 'animate-shake' : 'animate-fadeInUp'}`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                      <HelpCircle size={16} className="text-[#F59E0B]" />
                    </div>
                    <p className="text-white text-sm font-bold">Forgot Pass Phrase</p>
                  </div>
                  <button
                    onClick={() => { setShowForgotModal(false); setForgotAnswer(''); setForgotError(false) }}
                    className="p-1.5 rounded-lg bg-[#0F172A] active:scale-90 transition-transform"
                  >
                    <X size={14} className="text-[#94A3B8]" />
                  </button>
                </div>

                {(() => {
                  const config = loadCalcConfig()
                  return config ? (
                    <>
                      <p className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-1">
                        Security Question
                      </p>
                      <p className="text-white text-sm font-medium mb-4 leading-relaxed">
                        {config.question}
                      </p>
                      <input
                        type="text"
                        placeholder="Type your answer"
                        value={forgotAnswer}
                        onChange={e => setForgotAnswer(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleForgotSubmit() }}
                        autoFocus
                        className="w-full h-12 px-4 rounded-xl bg-[#0F172A] border border-[#1E293B]
                                   text-white text-sm outline-none focus:border-[#7C5CFF]
                                   transition-colors duration-150"
                      />
                      <button
                        onClick={handleForgotSubmit}
                        disabled={!forgotAnswer.trim()}
                        className="w-full mt-3 h-11 rounded-xl bg-[#7C5CFF] text-white text-sm font-bold
                                   active:scale-95 transition-transform duration-100
                                   disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Verify &amp; Unlock
                      </button>
                      {forgotError && (
                        <p className="text-red-400 text-xs text-center mt-2 animate-fadeInUp">
                          Incorrect answer. Please try again.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[#94A3B8] text-xs">No security question configured.</p>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: STATE 1 — FIRST TIME SETUP (inline)
  // ════════════════════════════════════════════════════════════

  if (view === 'setup') {
    return (
      <div className="space-y-3">
        {/* Setup header card */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#7C5CFF]/10 flex items-center justify-center">
              <Shield size={22} className="text-[#7C5CFF]" />
            </div>
            <div>
              <p className="text-white text-base font-bold">Security Setup</p>
              <p className="text-[#94A3B8] text-[10px]">Step {setupStep} of 2</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-1">
            <div className={`flex-1 h-1 rounded-full transition-colors duration-200 ${setupStep >= 1 ? 'bg-[#7C5CFF]' : 'bg-[#1E293B]'}`} />
            <div className={`flex-1 h-1 rounded-full transition-colors duration-200 ${setupStep >= 2 ? 'bg-[#7C5CFF]' : 'bg-[#1E293B]'}`} />
          </div>
        </div>

        {/* Step content */}
        {setupStep === 1 && (
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 animate-fadeInUp">
            <p className="text-white text-sm font-semibold mb-1">Create Your Secret Equation</p>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed mb-4">
              Type this exact equation on the calculator to unlock Play Nexa. Choose numbers and an operator only you would remember.
            </p>

            {/* Number 1 */}
            <div className="mb-3">
              <label className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-1.5 block">
                Number 1
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 2024"
                value={input1}
                onChange={e => setInput1(e.target.value.replace(/[^0-9.\-]/g, ''))}
                className="w-full h-12 px-4 rounded-xl bg-[#0F172A] border border-[#1E293B]
                           text-white text-base font-mono outline-none focus:border-[#7C5CFF]
                           transition-colors duration-150 placeholder:text-[#475569]"
              />
            </div>

            {/* Operator */}
            <div className="mb-3">
              <label className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-1.5 block">
                Operator
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { op: '+', label: '+' },
                  { op: '-', label: '\u2212' },
                  { op: '*', label: '\u00D7' },
                  { op: '/', label: '\u00F7' },
                ].map(item => (
                  <button
                    key={item.op}
                    onClick={() => setOperator(item.op)}
                    className={`h-12 rounded-xl text-xl font-medium transition-all duration-150 active:scale-95
                               ${operator === item.op
                                 ? 'bg-[#7C5CFF] text-white shadow-lg shadow-[#7C5CFF]/20'
                                 : 'bg-[#0F172A] border border-[#1E293B] text-[#94A3B8]'
                               }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Number 2 */}
            <div className="mb-4">
              <label className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-1.5 block">
                Number 2
              </label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 2"
                value={input2}
                onChange={e => setInput2(e.target.value.replace(/[^0-9.\-]/g, ''))}
                className="w-full h-12 px-4 rounded-xl bg-[#0F172A] border border-[#1E293B]
                           text-white text-base font-mono outline-none focus:border-[#7C5CFF]
                           transition-colors duration-150 placeholder:text-[#475569]"
              />
            </div>

            {/* Live preview */}
            {canProceedStep1 && (
              <div className="bg-[#0F172A] border border-[#7C5CFF]/20 rounded-xl p-4 animate-fadeInUp mb-4">
                <p className="text-[#94A3B8] text-[9px] font-bold uppercase tracking-widest mb-2">
                  Equation Preview
                </p>
                <p className="text-white text-xl font-mono font-bold">
                  {input1} {operatorSymbol(operator)} {input2} = <span className="text-[#7C5CFF]">{liveAnswer}</span>
                </p>
                <p className="text-[#94A3B8] text-[10px] mt-2 leading-relaxed">
                  Type <span className="text-[#00D4FF] font-mono font-semibold">{input1}{operator}{input2}=</span> on the calculator to unlock
                </p>
              </div>
            )}

            <button
              onClick={() => setSetupStep(2)}
              disabled={!canProceedStep1}
              className="w-full h-12 rounded-xl bg-[#7C5CFF] text-white text-sm font-bold
                         active:scale-95 transition-transform duration-100
                         disabled:opacity-40 disabled:pointer-events-none"
            >
              Continue
            </button>
          </div>
        )}

        {setupStep === 2 && (
          <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-5 animate-fadeInUp">
            <p className="text-white text-sm font-semibold mb-1">Security Question</p>
            <p className="text-[#94A3B8] text-[11px] leading-relaxed mb-4">
              If you forget your secret equation, answer this question to unlock instead. Your answer is stored encrypted.
            </p>

            <div className="mb-3">
              <label className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-1.5 block">
                Question
              </label>
              <input
                type="text"
                placeholder="e.g. What is your pet's name?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                maxLength={80}
                className="w-full h-12 px-4 rounded-xl bg-[#0F172A] border border-[#1E293B]
                           text-white text-sm outline-none focus:border-[#7C5CFF]
                           transition-colors duration-150 placeholder:text-[#475569]"
              />
            </div>

            <div className="mb-4">
              <label className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-1.5 block">
                Answer
              </label>
              <div className="relative">
                <input
                  type={showAnswer ? 'text' : 'password'}
                  placeholder="Your secret answer"
                  value={answerInput}
                  onChange={e => setAnswerInput(e.target.value)}
                  maxLength={40}
                  className="w-full h-12 px-4 pr-11 rounded-xl bg-[#0F172A] border border-[#1E293B]
                             text-white text-sm outline-none focus:border-[#7C5CFF]
                             transition-colors duration-150 placeholder:text-[#475569]"
                />
                <button
                  type="button"
                  onClick={() => setShowAnswer(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                >
                  {showAnswer
                    ? <EyeOff size={16} className="text-[#94A3B8]" />
                    : <Eye size={16} className="text-[#94A3B8]" />}
                </button>
              </div>
              <p className="text-[#94A3B8] text-[10px] mt-1.5">Case-insensitive \u2014 stored XOR encrypted</p>
            </div>

            {canSave && (
              <div className="bg-[#0F172A] border border-[#22C55E]/20 rounded-xl p-4 animate-fadeInUp mb-4">
                <p className="text-[#94A3B8] text-[9px] font-bold uppercase tracking-widest mb-2">
                  Setup Summary
                </p>
                <p className="text-white text-sm font-mono">
                  Equation: <span className="text-[#7C5CFF]">{input1}{operator}{input2}={liveAnswer}</span>
                </p>
                <p className="text-white text-sm font-mono mt-1">
                  Recovery: <span className="text-[#00D4FF]">{question}</span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setSetupStep(1)}
                className="flex-1 h-12 rounded-xl bg-[#0F172A] border border-[#1E293B]
                           text-[#94A3B8] text-sm font-medium
                           active:scale-95 transition-transform duration-100"
              >
                Back
              </button>
              <button
                onClick={handleSetupSave}
                disabled={!canSave}
                className="flex-1 h-12 rounded-xl bg-[#7C5CFF] text-white text-sm font-bold
                           active:scale-95 transition-transform duration-100
                           disabled:opacity-40 disabled:pointer-events-none"
              >
                Save &amp; Activate
              </button>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-20 left-4 right-4 z-50 bg-[#111827] border border-[#22C55E]/20
                          rounded-xl p-3 text-center text-[#22C55E] text-xs font-semibold
                          animate-fadeInUp">
            {toast}
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: STATE 3 — UNLOCKED DASHBOARD (inline)
  // ════════════════════════════════════════════════════════════

  const config = loadCalcConfig()

  return (
    <div className="space-y-3">

      {/* ── Unlocked header card ── */}
      <div className="bg-[#111827] border border-[#1E293B] rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center">
              <Shield size={20} className="text-[#22C55E]" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">Security Center</p>
              <p className="text-[#94A3B8] text-[10px]">Play Nexa Protection</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#22C55E]/10 text-[#22C55E] flex items-center gap-1">
            <CheckCircle2 size={10} />
            Unlocked
          </span>
        </div>
      </div>

      {/* ── APK info banner ── */}
      {!isNativePlatform() && (
        <div className="p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/15 flex items-start gap-2 animate-fadeInUp">
          <AlertTriangle size={14} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <p className="text-[#F59E0B]/80 text-[11px] leading-relaxed">
            APK required for native phone features. All settings are saved and will activate automatically on install.
          </p>
        </div>
      )}

      {/* ── GROUP 1: Play Nexa Shield ── */}
      <div>
        <button
          onClick={() => setExpandedGroup(prev => prev === 'shield' ? null : 'shield')}
          className="w-full bg-[#111827] border border-[#1E293B] rounded-2xl p-4
                     active:scale-[0.99] transition-transform duration-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#7C5CFF]/10 flex items-center justify-center">
                <Shield size={18} className="text-[#7C5CFF]" />
              </div>
              <div className="text-left">
                <p className="text-white text-sm font-semibold">Play Nexa Shield</p>
                <p className="text-[#94A3B8] text-[10px]">Vault &amp; Disguise</p>
              </div>
            </div>
            {expandedGroup === 'shield'
              ? <ChevronUp size={16} className="text-[#94A3B8]" />
              : <ChevronDown size={16} className="text-[#94A3B8]" />}
          </div>
        </button>

        {expandedGroup === 'shield' && (
          <div className="mt-2 space-y-2 animate-fadeInUp">
            {/* Private Media Vault */}
            <button
              onClick={() => showToast('Open Private Folder from the Privacy section above')}
              className="w-full bg-[#111827] border border-[#1E293B] rounded-xl p-4
                         active:bg-[#1a2030] transition-colors duration-100 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#7C5CFF]/10 flex items-center justify-center">
                  <Lock size={18} className="text-[#7C5CFF]" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Private Media Vault</p>
                  <p className="text-[#94A3B8] text-[10px] leading-relaxed">
                    Encrypted storage for private photos, videos, and documents. Protected by PIN and biometric authentication.
                  </p>
                </div>
                <ChevronDown size={14} className="text-[#94A3B8] -rotate-90" />
              </div>
            </button>

            {/* Calculator Disguise Mode */}
            <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center">
                  <Calculator size={18} className="text-[#00D4FF]" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Calculator Disguise Mode</p>
                  <p className="text-[#94A3B8] text-[10px]">
                    Equation: <span className="text-[#00D4FF] font-mono">
                      {config ? `${config.input1} ${operatorSymbol(config.operator)} ${config.input2} = ${config.answer}` : 'Not set'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReconfigure}
                  className="flex-1 h-10 rounded-xl bg-[#0F172A] border border-[#1E293B]
                             text-[#94A3B8] text-xs font-semibold flex items-center justify-center gap-1.5
                             active:scale-95 transition-transform duration-100"
                >
                  <RefreshCw size={12} />
                  Reconfigure
                </button>
                <button
                  onClick={() => {
                    setPreviewExpr('')
                    setPreviewDisplay('0')
                    setPreviewWaiting(false)
                    setPreviewJustEval(false)
                    setShowPreview(true)
                  }}
                  className="flex-1 h-10 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/30
                             text-[#00D4FF] text-xs font-semibold flex items-center justify-center gap-1.5
                             active:scale-95 transition-transform duration-100"
                >
                  <Play size={12} />
                  Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── GROUP 2: Phone App Manager ── */}
      <div>
        <button
          onClick={() => setExpandedGroup(prev => prev === 'phone' ? null : 'phone')}
          className="w-full bg-[#111827] border border-[#1E293B] rounded-2xl p-4
                     active:scale-[0.99] transition-transform duration-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00D4FF]/10 flex items-center justify-center">
                <Smartphone size={18} className="text-[#00D4FF]" />
              </div>
              <div className="text-left">
                <p className="text-white text-sm font-semibold">Phone App Manager</p>
                <p className="text-[#94A3B8] text-[10px]">Lock &amp; Disguise Apps</p>
              </div>
            </div>
            {expandedGroup === 'phone'
              ? <ChevronUp size={16} className="text-[#94A3B8]" />
              : <ChevronDown size={16} className="text-[#94A3B8]" />}
          </div>
        </button>

        {expandedGroup === 'phone' && (
          <div className="mt-2 space-y-2 animate-fadeInUp">

            {/* ── Global App Lock ── */}
            <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-[#7C5CFF]" />
                  <p className="text-white text-sm font-medium">Global App Lock</p>
                </div>
                <button
                  onClick={() => setAppLockConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-11 h-6 rounded-full transition-colors duration-150 relative
                             ${appLockConfig.enabled ? 'bg-[#7C5CFF]' : 'bg-[#1E293B]'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-150
                                   ${appLockConfig.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Lock delay */}
              <p className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-2">
                Lock Delay
              </p>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {DELAY_OPTIONS.map(opt => (
                  <button
                    key={opt.seconds}
                    onClick={() => setAppLockConfig(prev => ({ ...prev, lockDelaySeconds: opt.seconds }))}
                    className={`h-9 rounded-lg text-[10px] font-semibold transition-all duration-150 active:scale-95
                               ${appLockConfig.lockDelaySeconds === opt.seconds
                                 ? 'bg-[#7C5CFF]/15 text-[#7C5CFF] border border-[#7C5CFF]/30'
                                 : 'bg-[#0F172A] text-[#94A3B8] border border-[#1E293B]'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Add app */}
              <p className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-2">
                Locked Apps (Package Names)
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="com.example.app"
                  value={newAppName}
                  onChange={e => setNewAppName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddApp() }}
                  className="flex-1 h-9 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B]
                             text-white text-[11px] font-mono outline-none focus:border-[#7C5CFF]
                             transition-colors duration-150 placeholder:text-[#475569]"
                />
                <button
                  onClick={handleAddApp}
                  disabled={!newAppName.trim()}
                  className="h-9 px-3 rounded-lg bg-[#7C5CFF]/10 border border-[#7C5CFF]/30
                             text-[#7C5CFF] text-xs font-semibold flex items-center gap-1
                             active:scale-95 transition-transform duration-100
                             disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Plus size={12} />
                  Add
                </button>
              </div>

              {/* App list */}
              {appLockConfig.apps.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {appLockConfig.apps.map(app => (
                    <span key={app}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0F172A] border border-[#1E293B]
                                     text-[#94A3B8] text-[10px] font-mono">
                      {app}
                      <button onClick={() => handleRemoveApp(app)}
                              className="text-[#94A3B8] active:text-red-400 transition-colors ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {appLockConfig.apps.length === 0 && (
                <p className="text-[#475569] text-[10px] mb-3 italic">
                  No apps added yet. Add package names above.
                </p>
              )}

              {/* Save button */}
              <button
                onClick={handleSaveAppLock}
                disabled={appLockStatus === 'syncing'}
                className={`w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5
                           active:scale-95 transition-transform duration-100
                           ${appLockStatus === 'success' ? 'bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E]'
                             : appLockStatus === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                             : 'bg-[#7C5CFF] text-white'}`}
              >
                {appLockStatus === 'syncing' ? (
                  <><Loader2 size={14} className="animate-spin" /> Syncing with Android OS...</>
                ) : appLockStatus === 'success' ? (
                  <><CheckCircle2 size={14} /> Saved to system</>
                ) : appLockStatus === 'error' ? (
                  <><AlertCircle size={14} /> Error \u2014 try again</>
                ) : (
                  'Save App Lock Config'
                )}
              </button>
            </div>

            {/* ── Icon and Name Changer ── */}
            <div className="bg-[#111827] border border-[#1E293B] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Palette size={16} className="text-[#00D4FF]" />
                  <p className="text-white text-sm font-medium">Icon &amp; Name Changer</p>
                </div>
                <button
                  onClick={() => setIconConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-11 h-6 rounded-full transition-colors duration-150 relative
                             ${iconConfig.enabled ? 'bg-[#00D4FF]' : 'bg-[#1E293B]'}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-150
                                   ${iconConfig.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Icon grid */}
              <p className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-2">
                Disguise Icon
              </p>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {ICON_OPTIONS.map(opt => {
                  const isActive = iconConfig.iconName === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setIconConfig(prev => ({ ...prev, iconName: opt.id }))}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-150 active:scale-95
                                 ${isActive ? 'border-[#00D4FF] bg-[#00D4FF]/10 shadow-lg shadow-[#00D4FF]/10' : 'border-[#1E293B] bg-[#0F172A]'}`}
                    >
                      <opt.Icon size={20} style={{ color: isActive ? '#00D4FF' : opt.color }} />
                      <p className={`text-[9px] font-semibold ${isActive ? 'text-[#00D4FF]' : 'text-[#94A3B8]'}`}>
                        {opt.label}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* App label */}
              <p className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-2">
                App Label
              </p>
              <input
                type="text"
                placeholder="e.g. Calculator, Clock..."
                value={iconConfig.appLabel}
                onChange={e => setIconConfig(prev => ({ ...prev, appLabel: e.target.value }))}
                maxLength={20}
                className="w-full h-9 px-3 rounded-lg bg-[#0F172A] border border-[#1E293B]
                           text-white text-xs outline-none focus:border-[#00D4FF]
                           transition-colors duration-150 mb-3 placeholder:text-[#475569]"
              />

              {/* Save button */}
              <button
                onClick={handleSaveIconChanger}
                disabled={iconStatus === 'syncing'}
                className={`w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5
                           active:scale-95 transition-transform duration-100
                           ${iconStatus === 'success' ? 'bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E]'
                             : iconStatus === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                             : 'bg-[#00D4FF]/10 border border-[#00D4FF]/30 text-[#00D4FF]'}`}
              >
                {iconStatus === 'syncing' ? (
                  <><Loader2 size={14} className="animate-spin" /> Syncing with Android OS...</>
                ) : iconStatus === 'success' ? (
                  <><CheckCircle2 size={14} /> Saved to system</>
                ) : iconStatus === 'error' ? (
                  <><AlertCircle size={14} /> Error \u2014 try again</>
                ) : (
                  'Save Icon Config'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Danger Zone ── */}
      <div className="bg-[#111827] border border-red-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-red-400" />
          <p className="text-red-400 text-sm font-semibold">Danger Zone</p>
        </div>
        <p className="text-[#94A3B8] text-[10px] mb-3 leading-relaxed">
          Resetting removes your secret equation and returns to the setup screen. The calculator disguise will be deactivated.
        </p>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full h-10 rounded-xl border border-red-500/30 bg-red-500/10
                       text-red-400 text-xs font-bold
                       active:scale-95 transition-transform duration-100"
          >
            Reset Calculator Setup
          </button>
        ) : (
          <div className="flex gap-2 animate-fadeInUp">
            <button
              onClick={() => setConfirmReset(false)}
              className="flex-1 h-10 rounded-xl bg-[#0F172A] border border-[#1E293B]
                         text-[#94A3B8] text-xs font-medium
                         active:scale-95 transition-transform duration-100"
            >
              Cancel
            </button>
            <button
              onClick={handleResetCalculator}
              className="flex-1 h-10 rounded-xl border border-red-500/30 bg-red-500/10
                         text-red-400 text-xs font-bold flex items-center justify-center gap-1.5
                         active:scale-95 transition-transform duration-100"
            >
              <Trash2 size={12} />
              Confirm Reset
            </button>
          </div>
        )}
      </div>

      {/* ── Preview Calculator Overlay ── */}
      {showPreview && (
        <div className="fixed inset-0 z-[99999] bg-[#000000] flex flex-col select-none">
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={() => setShowPreview(false)}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#1a1a1a]
                         active:scale-90 transition-transform duration-75"
            >
              <X size={20} className="text-[#555]" />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-end px-6 pb-4 min-h-[200px]">
            <p className="text-[#555] text-sm text-right mb-2 truncate min-h-[20px] font-light tracking-wide">
              {previewExpr ? formatExpr(previewExpr) : '\u00A0'}
            </p>
            <p className="text-white text-5xl font-light text-right truncate leading-tight"
               style={{ fontVariantNumeric: 'tabular-nums' }}>
              {previewDisplay}
            </p>
          </div>

          {renderCalcGrid(previewButtons)}

          <div className="bg-[#000000]" style={{ height: 'env(safe-area-inset-bottom, 8px)' }} />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-[#111827] border border-[#22C55E]/20
                        rounded-xl p-3 text-center text-[#22C55E] text-xs font-semibold
                        animate-fadeInUp">
          {toast}
        </div>
      )}
    </div>
  )
}
