// ── Play Nexa Admin — Auto YT Importer ────────────────────────────
// Hybrid YouTube Data API v3 + Gemini AI for smart movie import
// Workflow: Channel URL → Fetch Uploads → Filter (>60 min + keywords)
// → Gemini classification for uncertain videos → Upsert to Supabase
// AMOLED dark theme (#000000 base), no backdrop-blur, no styled-jsx
// 44px touch targets, separate from manual movie upload

'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/admin/Toast'

// ── Types ──

interface ImportStats {
  totalFetched: number
  passed: number
  skipped: number
  geminiChecked: number
  upserted: number
}

interface ImportedVideo {
  youtube_id: string
  title: string
  duration: string
  language: string
}

interface SkippedVideo {
  title: string
  reason: string
}

// ── Sample channel URLs for quick select ──

const SAMPLE_CHANNELS = [
  { label: 'G-Series', url: 'https://www.youtube.com/@GSeriesBD' },
  { label: 'Eagle Movies', url: 'https://www.youtube.com/@EagleMoviesBD' },
  { label: 'Chorki', url: 'https://www.youtube.com/@Chorki' },
  { label: 'BongoBD', url: 'https://www.youtube.com/@BongoBD' },
  { label: 'SVF', url: 'https://www.youtube.com/@SVF' },
]

// ═══════════════════════════════════════════════════════════════
//  YT IMPORTER PAGE
// ═══════════════════════════════════════════════════════════════

export default function YTImporterPage() {
  const { showToast } = useToast()

  // ── State ──
  const [channelUrl, setChannelUrl] = useState('')
  const [maxResults, setMaxResults] = useState(50)
  const [useGemini, setUseGemini] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null)
  const [result, setResult] = useState<{
    success: boolean
    channel: { id: string; name: string }
    stats: ImportStats
    imported: ImportedVideo[]
    skipped: SkippedVideo[]
    geminiChecked: Array<{ title: string; result: string }>
    error?: string
  } | null>(null)

  // ── Check API config ──
  const checkApiConfig = useCallback(async () => {
    setIsChecking(true)
    try {
      const res = await fetch('/api/admin/yt-import')
      const data = await res.json()
      setApiConfigured(data.configured)
      if (!data.configured) {
        showToast('YouTube API key not configured', 'error')
      } else {
        showToast('YouTube API key is configured', 'success')
      }
    } catch {
      setApiConfigured(false)
      showToast('Failed to check API config', 'error')
    } finally {
      setIsChecking(false)
    }
  }, [showToast])

  // ── Start import ──
  const startImport = useCallback(async () => {
    if (!channelUrl.trim()) {
      showToast('Enter a channel URL', 'error')
      return
    }

    setIsImporting(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/yt-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelUrl: channelUrl.trim(),
          maxResults,
          useGemini,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Import failed', 'error')
        setResult(null)
        return
      }

      setResult(data)
      showToast(
        `Imported ${data.stats.upserted} movies from ${data.channel.name}`,
        'success'
      )
    } catch (err: any) {
      showToast(err?.message || 'Network error', 'error')
    } finally {
      setIsImporting(false)
    }
  }, [channelUrl, maxResults, useGemini, showToast])

  // ── Quick select channel ──
  const quickSelect = useCallback((url: string) => {
    setChannelUrl(url)
    setResult(null)
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">🚀</span>
        <div>
          <h1 className="text-white font-bold text-lg">Auto YT Importer</h1>
          <p className="text-[#9CA3AF] text-xs">
            Import movies from YouTube channels with AI-powered filtering
          </p>
        </div>
      </div>

      {/* ── API Status Card ── */}
      <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                apiConfigured === null
                  ? 'bg-[#9CA3AF]'
                  : apiConfigured
                    ? 'bg-green-500'
                    : 'bg-red-500'
              }`}
            />
            <div>
              <p className="text-white text-sm font-medium">YouTube Data API v3</p>
              <p className="text-[#9CA3AF] text-xs">
                {apiConfigured === null
                  ? 'Not checked yet'
                  : apiConfigured
                    ? 'Configured and ready'
                    : 'Not configured — add NEXT_PUBLIC_YOUTUBE_API_KEY to .env.local'}
              </p>
            </div>
          </div>
          <button
            onClick={checkApiConfig}
            disabled={isChecking}
            className="px-4 py-2 rounded-lg text-white text-xs font-medium min-h-[44px] disabled:opacity-50 bg-[#1A1A1A] border border-[#2D2D2D] hover:border-[#7C3AED]/50 transition-colors duration-150"
          >
            {isChecking ? 'Checking...' : 'Check'}
          </button>
        </div>
      </div>

      {/* ── Quick Select Channels ── */}
      <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4">
        <p className="text-white text-sm font-medium mb-3">Quick Select Channel</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_CHANNELS.map(ch => (
            <button
              key={ch.label}
              onClick={() => quickSelect(ch.url)}
              className={`px-3 py-2 rounded-lg text-xs font-medium min-h-[44px] border transition-colors duration-150 ${
                channelUrl === ch.url
                  ? 'bg-[#7C3AED]/15 border-[#7C3AED] text-[#A78BFA]'
                  : 'bg-[#1A1A1A] border-[#2D2D2D] text-[#9CA3AF] hover:border-[#7C3AED]/50 hover:text-white'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Import Form ── */}
      <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4 space-y-4">
        <p className="text-white text-sm font-medium">Channel URL</p>
        <input
          type="text"
          value={channelUrl}
          onChange={e => setChannelUrl(e.target.value)}
          placeholder="https://www.youtube.com/@GSeriesBD"
          className="w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 py-3 text-sm text-white outline-none placeholder-[#9CA3AF] focus:border-[#7C3AED]/50 transition-colors duration-150"
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Max Results */}
          <div>
            <label className="text-[#9CA3AF] text-xs mb-1.5 block">Max Videos</label>
            <select
              value={maxResults}
              onChange={e => setMaxResults(parseInt(e.target.value, 10))}
              className="w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Gemini Toggle */}
          <div>
            <label className="text-[#9CA3AF] text-xs mb-1.5 block">AI Filtering</label>
            <button
              onClick={() => setUseGemini(!useGemini)}
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium min-h-[44px] border transition-colors duration-150 ${
                useGemini
                  ? 'bg-[#7C3AED]/15 border-[#7C3AED] text-[#A78BFA]'
                  : 'bg-[#1A1A1A] border-[#2D2D2D] text-[#9CA3AF]'
              }`}
            >
              {useGemini ? '🤖 Gemini ON' : '⚡ Keywords Only'}
            </button>
          </div>
        </div>

        {/* Filter Rules Info */}
        <div className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl p-3">
          <p className="text-white text-xs font-medium mb-2">Filter Rules</p>
          <div className="space-y-1.5 text-[#9CA3AF] text-xs">
            <p>• Duration must be &gt; 60 minutes</p>
            <p>• Keywords: Movie, সিনেমা, নাটক, Film, Natok, Telefilm</p>
            <p>• Skip: Trailer, Teaser, Clip, Music Video, Song</p>
            {useGemini && (
              <p>• Uncertain videos checked by Gemini AI</p>
            )}
          </div>
        </div>

        {/* Import Button */}
        <button
          onClick={startImport}
          disabled={isImporting || !channelUrl.trim()}
          className="w-full py-3.5 rounded-xl text-white text-sm font-bold min-h-[44px] disabled:opacity-40 transition-all duration-150 active:scale-[0.98]"
          style={{ backgroundColor: '#7C3AED' }}
        >
          {isImporting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Importing...
            </span>
          ) : (
            '🚀 Start Import'
          )}
        </button>
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Fetched', value: result.stats.totalFetched, color: '#9CA3AF' },
              { label: 'Passed', value: result.stats.passed, color: '#22C55E' },
              { label: 'Skipped', value: result.stats.skipped, color: '#EF4444' },
              { label: 'AI Check', value: result.stats.geminiChecked, color: '#7C3AED' },
              { label: 'Imported', value: result.stats.upserted, color: '#3B82F6' },
            ].map(stat => (
              <div
                key={stat.label}
                className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-3 text-center"
              >
                <p className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="text-[#9CA3AF] text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Channel Info */}
          <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4">
            <p className="text-white text-sm font-medium mb-1">Channel</p>
            <p className="text-[#9CA3AF] text-xs">
              {result.channel.name} ({result.channel.id})
            </p>
          </div>

          {/* Imported Videos */}
          {result.imported.length > 0 && (
            <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-3">
                Imported Movies ({result.imported.length})
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.imported.map((v, i) => (
                  <div
                    key={v.youtube_id}
                    className="flex items-center gap-3 bg-[#1A1A1A] rounded-lg p-2.5"
                  >
                    <span className="text-[#9CA3AF] text-xs w-6 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">
                        {v.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[#9CA3AF] text-[10px]">{v.duration}</span>
                        <span className="text-[#7C3AED] text-[10px]">{v.language}</span>
                      </div>
                    </div>
                    <a
                      href={`https://youtube.com/watch?v=${v.youtube_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#9CA3AF] text-[10px] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      ▶
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped Videos */}
          {result.skipped.length > 0 && (
            <details className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4">
              <summary className="text-white text-sm font-medium cursor-pointer">
                Skipped ({result.skipped.length})
              </summary>
              <div className="space-y-1.5 mt-3 max-h-48 overflow-y-auto">
                {result.skipped.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-red-400 flex-shrink-0">✕</span>
                    <p className="text-[#9CA3AF] truncate">
                      <span className="text-white">{v.title}</span>
                      <span className="text-[#9CA3AF]"> — {v.reason}</span>
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Gemini-checked Videos */}
          {result.geminiChecked.length > 0 && (
            <details className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4">
              <summary className="text-white text-sm font-medium cursor-pointer">
                AI Classified ({result.geminiChecked.length})
              </summary>
              <div className="space-y-1.5 mt-3 max-h-48 overflow-y-auto">
                {result.geminiChecked.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={v.result === 'PASS' ? 'text-green-400' : 'text-red-400'}>
                      {v.result === 'PASS' ? '✓' : '✕'}
                    </span>
                    <p className="text-[#9CA3AF] truncate">
                      {v.title} — <span className={v.result === 'PASS' ? 'text-green-400' : 'text-red-400'}>{v.result}</span>
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Error */}
          {result.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-red-400 text-xs font-medium">Database Error</p>
              <p className="text-red-300 text-xs mt-1">{result.error}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Instructions ── */}
      <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-xl p-4">
        <p className="text-white text-sm font-medium mb-2">Setup Instructions</p>
        <div className="space-y-2 text-[#9CA3AF] text-xs">
          <p>Add your YouTube Data API v3 key to <code className="text-[#7C3AED]">.env.local</code>:</p>
          <div className="bg-[#1A1A1A] rounded-lg p-3 font-mono text-xs text-[#A78BFA]">
            NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key_here
          </div>
          <p>Get a key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] underline">Google Cloud Console</a> — enable YouTube Data API v3.</p>
          <p>This importer does NOT interfere with your manual movie upload form.</p>
        </div>
      </div>
    </div>
  )
}
