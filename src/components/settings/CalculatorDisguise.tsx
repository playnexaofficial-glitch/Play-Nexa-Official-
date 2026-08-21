'use client'

// ── Play Nexa Calculator Camouflage ───────────────────────────
// 100% PRODUCTION — No eval(), no stubs, no placeholders
// Safe math reducer for +, -, ×, ÷ with strict operand tracking
// ★ MAGICAL 1+1= UNLOCK: typing "1+1=" reveals Play Nexa ★
// Emergency backdoor: "99887766=" clears all and resets
// Unlock checked BEFORE equals computation — zero "2" flash
// localStorage persistence via DisguiseContext
// 2GB RAM safe · APK/Capacitor compatible

import { useReducer, useRef, useCallback, useEffect } from 'react'
import { useDisguise } from '@/lib/disguise-context'

// ══════════════════════════════════════════════════════════════
// SAFE MATH REDUCER — Zero use of eval()
// ══════════════════════════════════════════════════════════════

interface CalcState {
  display: string            // Main display: current number or result
  expression: string         // Top line: expression being built
  prevValue: number | null   // First operand stored when operator pressed
  operator: string | null    // Pending operator (+, -, *, /)
  waitingForOperand: boolean // True after operator, waiting for second number
  rawInput: string           // Exact keystroke buffer for unlock detection
  justComputed: boolean      // True right after =, resets on next number
}

type CalcAction =
  | { type: 'NUMBER'; digit: string }
  | { type: 'OPERATOR'; op: string }
  | { type: 'EQUALS' }
  | { type: 'CLEAR' }
  | { type: 'PERCENT' }
  | { type: 'TOGGLE_SIGN' }
  | { type: 'DECIMAL' }
  | { type: 'BACKSPACE' }

function safeCalculate(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return b !== 0 ? a / b : Infinity
    default: return b
  }
}

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    // ── Number input ──
    case 'NUMBER': {
      const digit = action.digit

      // After a computation (= pressed), start fresh expression
      if (state.justComputed) {
        return {
          display: digit,
          expression: digit,
          prevValue: null,
          operator: null,
          waitingForOperand: false,
          rawInput: digit,
          justComputed: false,
        }
      }

      // After operator, start new operand display
      if (state.waitingForOperand) {
        return {
          ...state,
          display: digit,
          expression: state.expression + digit,
          waitingForOperand: false,
          rawInput: state.rawInput + digit,
        }
      }

      // Normal: append digit to current number
      const newDisplay = state.display === '0' ? digit : state.display + digit
      return {
        ...state,
        display: newDisplay,
        expression: state.expression === '0' ? digit : state.expression + digit,
        rawInput: state.rawInput + digit,
      }
    }

    // ── Operator input ──
    case 'OPERATOR': {
      const current = parseFloat(state.display)
      let newPrev = state.prevValue
      let newDisplay = state.display

      // If there's a pending operation, compute it first (chaining)
      if (state.prevValue !== null && state.operator && !state.waitingForOperand) {
        const result = safeCalculate(state.prevValue, current, state.operator)
        newDisplay = Number.isFinite(result)
          ? String(parseFloat(result.toFixed(10)))
          : 'Error'
        newPrev = result
      } else {
        newPrev = current
      }

      const opSymbol = action.op === '*' ? '×' : action.op === '/' ? '÷' : action.op
      return {
        ...state,
        display: newDisplay,
        expression: newDisplay + ' ' + opSymbol + ' ',
        prevValue: newPrev,
        operator: action.op,
        waitingForOperand: true,
        rawInput: state.rawInput + action.op,
        justComputed: false,
      }
    }

    // ── Equals — compute result ──
    case 'EQUALS': {
      if (state.prevValue === null || !state.operator) return state
      const current = parseFloat(state.display)
      const result = safeCalculate(state.prevValue, current, state.operator)
      const resultStr = Number.isFinite(result)
        ? String(parseFloat(result.toFixed(10)))
        : 'Error'
      return {
        ...state,
        display: resultStr,
        expression: state.expression + ' =',
        prevValue: null,
        operator: null,
        waitingForOperand: true,
        rawInput: state.rawInput + '=',
        justComputed: true,
      }
    }

    // ── Clear all ──
    case 'CLEAR': {
      return {
        display: '0',
        expression: '',
        prevValue: null,
        operator: null,
        waitingForOperand: false,
        rawInput: '',
        justComputed: false,
      }
    }

    // ── Percent ──
    case 'PERCENT': {
      const current = parseFloat(state.display)
      const pctStr = String(parseFloat((current / 100).toFixed(10)))
      return {
        ...state,
        display: pctStr,
        expression: pctStr,
        rawInput: state.rawInput + '%',
        justComputed: false,
      }
    }

    // ── Toggle sign ──
    case 'TOGGLE_SIGN': {
      const newDisplay = state.display.startsWith('-')
        ? state.display.slice(1)
        : '-' + state.display
      return {
        ...state,
        display: newDisplay,
        expression: newDisplay,
        justComputed: false,
      }
    }

    // ── Decimal point ──
    case 'DECIMAL': {
      if (state.justComputed) {
        return {
          display: '0.',
          expression: '0.',
          prevValue: null,
          operator: null,
          waitingForOperand: false,
          rawInput: '0.',
          justComputed: false,
        }
      }
      if (state.waitingForOperand) {
        return {
          ...state,
          display: '0.',
          expression: state.expression + '0.',
          waitingForOperand: false,
          rawInput: state.rawInput + '.',
        }
      }
      if (!state.display.includes('.')) {
        return {
          ...state,
          display: state.display + '.',
          expression: state.expression + '.',
          rawInput: state.rawInput + '.',
        }
      }
      return state
    }

    // ── Backspace ──
    case 'BACKSPACE': {
      if (state.justComputed) {
        return {
          display: '0',
          expression: '',
          prevValue: null,
          operator: null,
          waitingForOperand: false,
          rawInput: '',
          justComputed: false,
        }
      }
      if (state.display.length <= 1 || (state.display.length === 2 && state.display.startsWith('-'))) {
        return {
          ...state,
          display: '0',
          expression: '0',
          rawInput: state.rawInput.slice(0, -1),
        }
      }
      const trimmed = state.display.slice(0, -1)
      return {
        ...state,
        display: trimmed,
        expression: trimmed,
        rawInput: state.rawInput.slice(0, -1),
      }
    }

    default:
      return state
  }
}

const INITIAL_STATE: CalcState = {
  display: '0',
  expression: '',
  prevValue: null,
  operator: null,
  waitingForOperand: false,
  rawInput: '',
  justComputed: false,
}

// ══════════════════════════════════════════════════════════════
// EMERGENCY BACKDOOR
// Typing "99887766=" clears ALL localStorage and resets layout
// Prevents APK bricking — full nuclear reset
// ══════════════════════════════════════════════════════════════

const EMERGENCY_BACKDOOR = '99887766='

function executeEmergencyReset() {
  try {
    const allKeys = Object.keys(localStorage)
    for (const key of allKeys) {
      if (key.startsWith('pn_') || key.startsWith('grovix_')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Continue regardless — localStorage may be restricted
  }
  try {
    indexedDB.deleteDatabase('pn_security_db')
    indexedDB.deleteDatabase('pn_locker_db')
  } catch {
    // Continue regardless
  }
  window.location.href = '/'
}

// ══════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════

export default function CalculatorDisguise() {
  const { deactivateDisguise } = useDisguise()
  const [state, dispatch] = useReducer(calcReducer, INITIAL_STATE)
  const unlockedRef = useRef(false)

  // ── Hydrate disguise state on mount ──
  // Ensures localStorage and React state are in sync
  useEffect(() => {
    const stored = localStorage.getItem('pn_disguise_active')
    if (stored !== '1') {
      // If disguise flag was somehow cleared, reveal the app
      deactivateDisguise()
    }
  }, [deactivateDisguise])

  // ── ★ EQUALS HANDLER — UNLOCK CHECK BEFORE COMPUTATION ★ ──
  // This is the core fix: check unlock conditions BEFORE the reducer
  // computes the result. This prevents the "2" flash on 1+1= unlock.
  const handleEquals = useCallback(() => {
    if (unlockedRef.current) return

    // Simulate what rawInput would look like with "=" appended
    const rawWithEquals = state.rawInput + '='
    const tail = rawWithEquals.slice(-20)

    // ── Emergency backdoor: "99887766=" ──
    if (tail.endsWith(EMERGENCY_BACKDOOR)) {
      unlockedRef.current = true
      executeEmergencyReset()
      return
    }

    // ── ★ MAGICAL 1+1= UNLOCK ★ ──
    // When the user types exactly "1+1" and presses "=",
    // do NOT compute the result. Instead, reveal Play Nexa.
    // The joke: 1+1=2, but here 1+1=Play Nexa!
    const lastEqualsIdx = state.rawInput.lastIndexOf('=')
    const currentExpr = lastEqualsIdx >= 0
      ? state.rawInput.slice(lastEqualsIdx + 1)
      : state.rawInput

    if (currentExpr === '1+1') {
      unlockedRef.current = true
      // Remove disguise flag from localStorage
      localStorage.removeItem('pn_disguise_active')
      // Update React context — triggers DisguiseWrapper to unmount calculator
      deactivateDisguise()
      return
    }

    // ── Normal calculation: dispatch EQUALS to compute result ──
    dispatch({ type: 'EQUALS' })
  }, [state.rawInput, deactivateDisguise])

  // ── Dispatch helpers ──
  const handleNumber = useCallback((digit: string) => {
    dispatch({ type: 'NUMBER', digit })
  }, [])

  const handleOperator = useCallback((op: string) => {
    dispatch({ type: 'OPERATOR', op })
  }, [])

  const handleClear = useCallback(() => {
    dispatch({ type: 'CLEAR' })
  }, [])

  const handlePercent = useCallback(() => {
    dispatch({ type: 'PERCENT' })
  }, [])

  const handleToggleSign = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIGN' })
  }, [])

  const handleDecimal = useCallback(() => {
    dispatch({ type: 'DECIMAL' })
  }, [])

  const handleBackspace = useCallback(() => {
    dispatch({ type: 'BACKSPACE' })
  }, [])

  // ── Button layout ──
  const buttons = [
    { label: 'AC',  action: handleClear,      style: 'func' as const },
    { label: '+/-', action: handleToggleSign, style: 'func' as const },
    { label: '%',   action: handlePercent,    style: 'func' as const },
    { label: '÷',   action: () => handleOperator('/'), style: 'op' as const },
    { label: '7',   action: () => handleNumber('7'), style: 'num' as const },
    { label: '8',   action: () => handleNumber('8'), style: 'num' as const },
    { label: '9',   action: () => handleNumber('9'), style: 'num' as const },
    { label: '×',   action: () => handleOperator('*'), style: 'op' as const },
    { label: '4',   action: () => handleNumber('4'), style: 'num' as const },
    { label: '5',   action: () => handleNumber('5'), style: 'num' as const },
    { label: '6',   action: () => handleNumber('6'), style: 'num' as const },
    { label: '-',   action: () => handleOperator('-'), style: 'op' as const },
    { label: '1',   action: () => handleNumber('1'), style: 'num' as const },
    { label: '2',   action: () => handleNumber('2'), style: 'num' as const },
    { label: '3',   action: () => handleNumber('3'), style: 'num' as const },
    { label: '+',   action: () => handleOperator('+'), style: 'op' as const },
    { label: '0',   action: () => handleNumber('0'), style: 'num-wide' as const },
    { label: '.',   action: handleDecimal,    style: 'num' as const },
    { label: '=',   action: handleEquals,     style: 'op-accent' as const },
  ]

  // ── Auto-shrink display font for long numbers ──
  const displayLen = state.display.length
  const displayFontSize = displayLen > 12 ? 'text-2xl' : displayLen > 9 ? 'text-3xl' : displayLen > 7 ? 'text-4xl' : 'text-5xl'

  // ════════════════════════════════════════════════════════════
  // RENDER — Premium AMOLED Black Calculator
  // ════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-[99999] bg-[#000000] flex flex-col select-none">

      {/* ── Status bar spacer ── */}
      <div className="h-safe-top flex-shrink-0" />

      {/* ── Display area ── */}
      <div className="flex-1 flex flex-col justify-end px-6 pb-4 min-h-[200px]">
        {/* Expression line — shows the full expression being built */}
        <p className="text-[#555] text-sm text-right mb-2 truncate min-h-[20px] font-light tracking-wide">
          {state.expression || '\u00A0'}
        </p>
        {/* Main display — current number or result */}
        <p className={`text-white ${displayFontSize} font-light text-right truncate leading-tight`}
           style={{ fontVariantNumeric: 'tabular-nums' }}>
          {state.display}
        </p>
      </div>

      {/* ── Button grid ── */}
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
                    ? 'bg-[#333333] text-[#7C5CFF] text-3xl'
                    : isFunc
                      ? 'bg-[#2a2a2a] text-[#A0A0A0] text-lg'
                      : 'bg-[#1a1a1a] text-white'
                }
              `}
              style={{
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                touchAction: 'manipulation',
              }}
            >
              {btn.label}
            </button>
          )
        })}
      </div>

      {/* ── Bottom safe area spacer for gesture nav ── */}
      <div className="bg-[#000000] h-[env(safe-area-inset-bottom,8px)]" />
    </div>
  )
}
