// ── Play Nexa Admin — AI Key Vault (MEGA FEATURE) ───────────────────
// Premium dashboard for managing dynamic multi-key API rotation.
// Replaces the need to manually edit .env files in production.
//
//  Features:
//    🎨 Premium dark violet theme (bg-[#0B0B1E])
//    📊 3 stat cards (Gemini/Groq/ChatGPT) with live health + active keys
//    🔐 Permission vault with iOS-style toggles per feature
//    🔑 Key rotation pool (up to 10 keys per provider, with health dots)
//    ⚙️ Mode selector (Auto Load-Balance | Single Override)
//
//  Routes:
//    /admin/key-vault         → this page
//  API:
//    GET  /api/admin/ai-vault → fetch all configs (masked keys)
//    POST /api/admin/ai-vault → { provider, action, payload }

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/admin/Toast'
import {
  Plus, Trash2, RefreshCw, Key as KeyIcon,
  Activity, Shield, Zap, AlertTriangle,
  CheckCircle2, XCircle, Loader2,
} from 'lucide-react'

// ════════════════════════════════════════════════════════════
//  TYPES (mirror of /api/admin/ai-vault route types)
// ════════════════════════════════════════════════════════════

type AIProvider = 'gemini' | 'groq' | 'gpt'
type VaultMode = 'auto' | 'single'
type KeyStatus = 'healthy' | 'rate_limited' | 'dead' | 'untested'
type FeatureFlag = 'yt_importer' | 'global_search' | 'auto_tagging' | 'ai_chat'

interface PublicKey {
  label?: string
  status: KeyStatus
  last_used: string | null
  last_429_at: string | null
  usage_count: number
  preview: string
}

interface PublicVaultRow {
  id: string
  provider: AIProvider
  keys: PublicKey[]
  mode: VaultMode
  active_key_index: number
  permissions: Record<string, boolean>
  updated_at: string
}

// ════════════════════════════════════════════════════════════
//  STATIC CONFIG — provider metadata
// ════════════════════════════════════════════════════════════

const PROVIDER_META: Record<AIProvider, {
  label: string
  emoji: string
  color: string       // hex
  gradient: string    // tailwind gradient classes
  description: string
  models: string[]
}> = {
  gemini: {
    label: 'Gemini',
    emoji: '🤖',
    color: '#4285F4',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    description: 'Google AI — fallback for YT Importer, powers AI Chat',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  },
  groq: {
    label: 'Groq',
    emoji: '⚡',
    color: '#F55036',
    gradient: 'from-orange-500/20 to-red-500/10',
    description: 'Ultra-fast inference — primary for YT Importer & Global Search',
    models: ['llama3-8b-8192', 'mixtral-8x7b-32768'],
  },
  gpt: {
    label: 'ChatGPT',
    emoji: '💬',
    color: '#10A37F',
    gradient: 'from-emerald-500/20 to-teal-500/10',
    description: 'OpenAI — primary for Auto-Tagging & AI Chat',
    models: ['gpt-4o-mini', 'gpt-4o'],
  },
}

const FEATURE_META: Record<FeatureFlag, {
  label: string
  description: string
  icon: string
  defaultProvider: AIProvider
}> = {
  yt_importer: {
    label: 'YT Importer',
    description: 'AI generates viral search keywords for movies/music',
    icon: '🎬',
    defaultProvider: 'groq',
  },
  global_search: {
    label: 'Global Search',
    description: 'AI-powered natural language search interpretation',
    icon: '🔍',
    defaultProvider: 'groq',
  },
  auto_tagging: {
    label: 'Auto-Tagging',
    description: 'AI categorizes & tags newly imported media items',
    icon: '🏷️',
    defaultProvider: 'gpt',
  },
  ai_chat: {
    label: 'AI Chat',
    description: 'Admin chatbot for content recommendations & support',
    icon: '💬',
    defaultProvider: 'gpt',
  },
}

// ════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════

export default function AdminKeyVaultPage() {
  const { showToast } = useToast()

  const [vault, setVault] = useState<PublicVaultRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>('groq')

  // ── Fetch vault on mount ──
  const fetchVault = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/ai-vault', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.success) {
        setVault(data.vault)
      } else {
        throw new Error(data.error || 'Failed to load')
      }
    } catch (err: any) {
      showToast(`Failed to load vault: ${err?.message}`, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchVault() }, [fetchVault])

  // ── POST helper ──
  const postAction = useCallback(async (
    provider: AIProvider,
    action: string,
    payload: Record<string, unknown> = {}
  ) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/ai-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, action, payload }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      showToast(`✅ ${action} succeeded for ${provider}`, 'success')
      await fetchVault() // refresh
    } catch (err: any) {
      showToast(`❌ ${action} failed: ${err?.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }, [showToast, fetchVault])

  // ════════════════════════════════════════════════════════════
  //  LOADING STATE
  // ════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
          <p className="text-[#9CA3AF] text-sm">Loading AI Key Vault…</p>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0B0B1E] text-white">
      <div className="max-w-6xl mx-auto p-6 pb-24">

        {/* ───────────────────────────────────────────────────── */}
        {/*  HEADER                                                */}
        {/* ───────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Key Vault</h1>
              <p className="text-xs text-[#9CA3AF]">
                Dynamic API key rotation · Zero .env edits · Live Supabase sync
              </p>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────── */}
        {/*  SECTION 1: HEALTH STAT CARDS (3 providers)            */}
        {/* ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {(['gemini', 'groq', 'gpt'] as AIProvider[]).map(provider => {
            const row = vault.find(v => v.provider === provider)
            const meta = PROVIDER_META[provider]
            const healthy = row?.keys.filter(k => k.status === 'healthy' || k.status === 'untested').length || 0
            const total = row?.keys.length || 0
            const isHealthy = healthy > 0
            return (
              <div
                key={provider}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${meta.gradient} border border-white/5 p-5`}
              >
                {/* Glow accent */}
                <div
                  className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-30"
                  style={{ backgroundColor: meta.color }}
                />

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{meta.emoji}</span>
                      <div>
                        <p className="font-bold text-sm">{meta.label}</p>
                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">
                          {row?.mode === 'single' ? 'Single Override' : 'Auto Balance'}
                        </p>
                      </div>
                    </div>
                    <HealthDot healthy={isHealthy} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: meta.color }}>
                        {healthy}
                        <span className="text-sm text-[#9CA3AF] font-normal">/{total}</span>
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">
                        Active Keys
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {row?.keys.filter(k => k.status === 'rate_limited').length || 0}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">
                        Rate Limited
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-[#9CA3AF] line-clamp-2">
                      {meta.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ───────────────────────────────────────────────────── */}
        {/*  SECTION 2: PERMISSION VAULT                           */}
        {/* ───────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#7C3AED]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Permission Vault
            </h2>
            <span className="text-[10px] text-[#9CA3AF]">
              Toggle AI usage per feature
            </span>
          </div>

          <div className="bg-[#13132A] border border-white/5 rounded-2xl divide-y divide-white/5">
            {(Object.keys(FEATURE_META) as FeatureFlag[]).map(feature => {
              const meta = FEATURE_META[feature]
              // Read the toggle from the feature's default provider's permissions
              const providerRow = vault.find(v => v.provider === meta.defaultProvider)
              const enabled = providerRow?.permissions?.[feature] ?? false

              return (
                <div key={feature} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#0B0B1E] flex items-center justify-center text-lg flex-shrink-0">
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {meta.label}
                      </p>
                      <p className="text-xs text-[#9CA3AF] truncate">
                        {meta.description}
                      </p>
                      <p className="text-[10px] text-[#7C3AED] mt-0.5">
                        Default provider: {PROVIDER_META[meta.defaultProvider].label}
                      </p>
                    </div>
                  </div>

                  <IOSwitch
                    checked={enabled}
                    disabled={isSaving}
                    onChange={(checked) => {
                      postAction(meta.defaultProvider, 'set_permission', {
                        feature,
                        enabled: checked,
                      })
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────── */}
        {/*  SECTION 3: KEY ROTATION POOL                          */}
        {/* ───────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <KeyIcon className="w-4 h-4 text-[#7C3AED]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Key Rotation Pool
            </h2>
            <span className="text-[10px] text-[#9CA3AF]">
              Up to 10 keys per provider · auto-rotates on 429
            </span>
          </div>

          <div className="space-y-4">
            {(['groq', 'gemini', 'gpt'] as AIProvider[]).map(provider => {
              const row = vault.find(v => v.provider === provider)
              const meta = PROVIDER_META[provider]
              const isExpanded = expandedProvider === provider

              return (
                <div
                  key={provider}
                  className="bg-[#13132A] border border-white/5 rounded-2xl overflow-hidden"
                >
                  {/* ── Accordion header ── */}
                  <button
                    onClick={() => setExpandedProvider(isExpanded ? null : provider)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ backgroundColor: meta.color + '20' }}
                      >
                        {meta.emoji}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">{meta.label}</p>
                        <p className="text-xs text-[#9CA3AF]">
                          {row?.keys.length || 0} key{(row?.keys.length || 0) !== 1 ? 's' : ''} ·{' '}
                          {row?.mode === 'single' ? 'Single Override' : 'Auto Load-Balance'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Health dots preview */}
                      <div className="flex gap-1">
                        {(row?.keys || []).slice(0, 5).map((k, i) => (
                          <span
                            key={i}
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor:
                                k.status === 'healthy' || k.status === 'untested'
                                  ? '#22C55E'
                                  : k.status === 'rate_limited'
                                  ? '#F59E0B'
                                  : '#EF4444',
                            }}
                          />
                        ))}
                        {row && row.keys.length === 0 && (
                          <span className="text-[10px] text-[#9CA3AF]">no keys yet</span>
                        )}
                      </div>
                      <svg
                        className={`w-4 h-4 text-[#9CA3AF] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>

                  {/* ── Accordion body ── */}
                  {isExpanded && row && (
                    <div className="border-t border-white/5 p-4 space-y-4 bg-[#0F0F23]">

                      {/* ── MODE SELECTOR ── */}
                      <ModeSelector
                        mode={row.mode}
                        disabled={isSaving}
                        onChange={(mode) => postAction(provider, 'set_mode', { mode })}
                      />

                      {/* ── KEY LIST ── */}
                      <div className="space-y-2">
                        {row.keys.length === 0 && (
                          <div className="text-center py-8 text-xs text-[#9CA3AF]">
                            <KeyIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            No keys in pool. Add your first {meta.label} API key below.
                          </div>
                        )}

                        {row.keys.map((key, idx) => (
                          <KeyRow
                            key={idx}
                            index={idx}
                            keyData={key}
                            isActive={idx === row.active_key_index}
                            mode={row.mode}
                            providerColor={meta.color}
                            disabled={isSaving}
                            onRemove={() => postAction(provider, 'remove_key', { index: idx })}
                            onSetActive={() => postAction(provider, 'set_active', { index: idx })}
                            onReset={() => postAction(provider, 'reset_key', { index: idx })}
                          />
                        ))}
                      </div>

                      {/* ── ADD KEY FORM ── */}
                      {row.keys.length < 10 && (
                        <AddKeyForm
                          providerLabel={meta.label}
                          disabled={isSaving}
                          onAdd={(value, label) => postAction(provider, 'add_key', { value, label })}
                        />
                      )}

                      {/* ── MODELS INFO ── */}
                      <div className="pt-3 border-t border-white/5">
                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">
                          Supported models
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {meta.models.map(m => (
                            <span
                              key={m}
                              className="text-[10px] font-mono px-2 py-1 rounded-md bg-[#1A1A2E] text-[#9CA3AF]"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────── */}
        {/*  FOOTER NOTE                                          */}
        {/* ───────────────────────────────────────────────────── */}
        <div className="mt-8 p-4 rounded-xl bg-[#13132A] border border-white/5">
          <div className="flex items-start gap-3">
            <Activity className="w-4 h-4 text-[#7C3AED] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#9CA3AF] leading-relaxed">
              <p className="font-semibold text-white mb-1">How auto-rotation works</p>
              <p>
                When <span className="text-[#7C3AED]">Auto Load-Balance</span> is enabled and the
                active key returns a <span className="font-mono text-amber-400">429 rate-limit</span>,
                the system automatically marks it as rate-limited, advances to the next healthy key,
                and persists the new index to Supabase — all in real-time. The next request uses the
                new key with zero downtime.
              </p>
              <p className="mt-2">
                Keys marked <span className="text-red-400">dead</span> (HTTP 401 — invalid/revoked)
                are skipped permanently until manually reset.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ════════════════════════════════════════════════════════════

/** Small health indicator dot + label */
function HealthDot({ healthy }: { healthy: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${healthy ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}
      />
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${healthy ? 'text-green-400' : 'text-red-400'}`}>
        {healthy ? 'Healthy' : 'Down'}
      </span>
    </div>
  )
}

/** iOS-style toggle switch */
function IOSwitch({
  checked, onChange, disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onChange(!checked)
      }}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 flex-shrink-0 ${
        checked ? 'bg-[#7C3AED]' : 'bg-[#1A1A2E]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

/** Mode selector — Auto Load-Balance vs Single Override */
function ModeSelector({
  mode, onChange, disabled,
}: {
  mode: VaultMode
  onChange: (mode: VaultMode) => void
  disabled?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">
        Rotation Mode
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={disabled}
          onClick={() => onChange('auto')}
          className={`p-3 rounded-xl border text-left transition-all ${
            mode === 'auto'
              ? 'bg-[#7C3AED]/15 border-[#7C3AED] text-white'
              : 'bg-[#0B0B1E] border-white/5 text-[#9CA3AF] hover:border-white/10'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Auto Load-Balance</span>
          </div>
          <p className="text-[10px] text-[#9CA3AF] leading-tight">
            Rotates to next healthy key on 429
          </p>
        </button>

        <button
          disabled={disabled}
          onClick={() => onChange('single')}
          className={`p-3 rounded-xl border text-left transition-all ${
            mode === 'single'
              ? 'bg-[#7C3AED]/15 border-[#7C3AED] text-white'
              : 'bg-[#0B0B1E] border-white/5 text-[#9CA3AF] hover:border-white/10'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <KeyIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Single Override</span>
          </div>
          <p className="text-[10px] text-[#9CA3AF] leading-tight">
            Force use of one specific key
          </p>
        </button>
      </div>
    </div>
  )
}

/** Single key row inside the rotation pool */
function KeyRow({
  index, keyData, isActive, mode, providerColor, disabled,
  onRemove, onSetActive, onReset,
}: {
  index: number
  keyData: PublicKey
  isActive: boolean
  mode: VaultMode
  providerColor: string
  disabled?: boolean
  onRemove: () => void
  onSetActive: () => void
  onReset: () => void
}) {
  const statusMeta = getStatusMeta(keyData.status)

  return (
    <div
      className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isActive
          ? 'bg-[#7C3AED]/10 border-[#7C3AED]/40'
          : 'bg-[#0B0B1E] border-white/5'
      }`}
    >
      {/* Index badge */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: providerColor + '20', color: providerColor }}
      >
        {index + 1}
      </div>

      {/* Key info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-mono text-white truncate">
            {keyData.preview}
          </p>
          {isActive && (
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ backgroundColor: providerColor + '30', color: providerColor }}
            >
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
            <span className={`text-[10px] ${statusMeta.textClass}`}>
              {statusMeta.label}
            </span>
          </div>
          {keyData.usage_count > 0 && (
            <span className="text-[10px] text-[#9CA3AF]">
              · {keyData.usage_count} uses
            </span>
          )}
          {keyData.label && (
            <span className="text-[10px] text-[#9CA3AF] truncate">
              · {keyData.label}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Set active (only in single mode) */}
        {mode === 'single' && !isActive && (
          <button
            disabled={disabled}
            onClick={onSetActive}
            title="Force this key"
            className="w-7 h-7 rounded-lg bg-[#1A1A2E] hover:bg-[#2A2A3E] flex items-center justify-center text-[#9CA3AF] hover:text-white transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Reset (if rate-limited or dead) */}
        {(keyData.status === 'rate_limited' || keyData.status === 'dead') && (
          <button
            disabled={disabled}
            onClick={onReset}
            title="Reset to healthy"
            className="w-7 h-7 rounded-lg bg-[#1A1A2E] hover:bg-[#2A2A3E] flex items-center justify-center text-amber-400 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Remove */}
        <button
          disabled={disabled}
          onClick={onRemove}
          title="Remove key"
          className="w-7 h-7 rounded-lg bg-[#1A1A2E] hover:bg-red-500/20 flex items-center justify-center text-[#9CA3AF] hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Add new key form */
function AddKeyForm({
  providerLabel, disabled, onAdd,
}: {
  providerLabel: string
  disabled?: boolean
  onAdd: (value: string, label?: string) => void
}) {
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')

  const handleAdd = () => {
    if (!value.trim() || value.trim().length < 10) return
    onAdd(value.trim(), label.trim() || undefined)
    setValue('')
    setLabel('')
  }

  return (
    <div className="p-3 rounded-xl border border-dashed border-white/10 bg-[#0B0B1E]">
      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">
        Add new {providerLabel} key
      </p>
      <div className="space-y-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste API key (e.g. gsk_xxx, AIzaSyxxx, sk-xxx)"
          className="w-full h-10 bg-[#13132A] border border-white/10 rounded-lg px-3 text-xs font-mono text-white outline-none focus:border-[#7C3AED] transition-colors"
          disabled={disabled}
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional label (e.g. Free tier #1)"
            className="flex-1 h-10 bg-[#13132A] border border-white/10 rounded-lg px-3 text-xs text-white outline-none focus:border-[#7C3AED] transition-colors"
            disabled={disabled}
          />
          <button
            onClick={handleAdd}
            disabled={disabled || !value.trim() || value.trim().length < 10}
            className="h-10 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

/** Status meta helper */
function getStatusMeta(status: KeyStatus): {
  label: string
  dotClass: string
  textClass: string
} {
  switch (status) {
    case 'healthy':
      return { label: 'Healthy', dotClass: 'bg-green-400', textClass: 'text-green-400' }
    case 'untested':
      return { label: 'Untested', dotClass: 'bg-blue-400', textClass: 'text-blue-400' }
    case 'rate_limited':
      return { label: 'Rate Limited', dotClass: 'bg-amber-400', textClass: 'text-amber-400' }
    case 'dead':
      return { label: 'Dead/Invalid', dotClass: 'bg-red-400', textClass: 'text-red-400' }
    default:
      return { label: 'Unknown', dotClass: 'bg-gray-400', textClass: 'text-gray-400' }
  }
}
