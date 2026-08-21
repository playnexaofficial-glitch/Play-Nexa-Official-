// ── Play Nexa — LIVE Dynamic Global Search ─────────────────────────
// Hits the Supabase `media_items` table directly with ILIKE so that
// ANY movie or music track added by the AI Agent (or Deep Channel
// Importer, or Nightly Sync) shows up instantly — no Next.js cache,
// no static JSON, no stale data.
//
// GET /api/search/live?q=<query>&limit=<n>
//   → 200 { movies: [...], music: [...], total, ts }
//
// Cache strategy:
//   - `export const dynamic = 'force-dynamic'`  → never prerender
//   - `Cache-Control: no-store, max-age=0, must-revalidate`
//   - `Pragma: no-cache` / `Expires: 0`
//   These three together defeat Next.js fetch cache, Vercel CDN cache,
//   and browser cache — so every keystroke hits the DB fresh.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ⛔ Force dynamic rendering — never cached at build time
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

interface MediaRow {
  youtube_video_id: string
  title: string
  thumbnail_url: string | null
  category: 'movie' | 'music'
  channel_name: string | null
  channel_id: string | null
  duration_sec: number | null
  source: string | null
}

export interface LiveSearchResult {
  id: string
  type: 'movie' | 'music'
  title: string
  subtitle: string
  thumbnail: string | null
  href: string
  channel?: string | null
  durationSec?: number | null
  source?: string | null
}

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

/** Format duration in seconds → "1h 23m" / "4m 12s" / "—" */
function fmtDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/** Convert a media_items row to a LiveSearchResult */
function toResult(row: MediaRow): LiveSearchResult {
  const isMovie = row.category === 'movie'
  return {
    id: row.youtube_video_id,
    type: isMovie ? 'movie' : 'music',
    title: row.title || '(untitled)',
    subtitle: `${row.channel_name || 'Unknown'} • ${fmtDuration(row.duration_sec)}`,
    thumbnail: row.thumbnail_url || `https://i.ytimg.com/vi/${row.youtube_video_id}/mqdefault.jpg`,
    href: `/player/watch?v=${row.youtube_video_id}&type=${isMovie ? 'movie' : 'music'}`,
    channel: row.channel_name,
    durationSec: row.duration_sec,
    source: row.source,
  }
}

/** Sanitize user query for safe ILIKE pattern (escape %, _, \) */
function escapeIlike(q: string): string {
  return q.replace(/[%_\\]/g, '\\$&').slice(0, 100)
}

// ════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  // ── Parse query ──
  const { searchParams } = new URL(req.url)
  const rawQuery = (searchParams.get('q') || '').trim()
  const limitParam = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(limitParam || 20, 1), 50)

  // ── Empty query → empty results (UI will show popular/recent instead) ──
  if (!rawQuery || rawQuery.length < 1) {
    return NextResponse.json(
      { movies: [], music: [], total: 0, ts: Date.now() },
      { headers: noCacheHeaders() }
    )
  }

  // ── Supabase missing → return empty (don't crash UI) ──
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        movies: [],
        music: [],
        total: 0,
        ts: Date.now(),
        error: 'Supabase not configured',
      },
      { status: 503, headers: noCacheHeaders() }
    )
  }

  const ilikeQ = `%${escapeIlike(rawQuery)}%`

  // ── Strategy: 2 parallel ILIKE queries (title/channel OR category)
  //    UNION them in JS via Set<video_id> to dedupe.
  //    Limit per-query to keep payloads small.

  const [titleRes, channelRes] = await Promise.all([
    // ── Match on title or channel_name (most relevant) ──
    supabaseAdmin
      .from('media_items')
      .select('youtube_video_id, title, thumbnail_url, category, channel_name, channel_id, duration_sec, source')
      .or(`title.ilike.${ilikeQ},channel_name.ilike.${ilikeQ}`)
      .order('created_at', { ascending: false })
      .limit(30),

    // ── Match on category (lower priority, for keyword searches like "music" / "movie") ──
    supabaseAdmin
      .from('media_items')
      .select('youtube_video_id, title, thumbnail_url, category, channel_name, channel_id, duration_sec, source')
      .ilike('category', ilikeQ)
      .order('created_at', { ascending: false })
      .limit(15),
  ])

  // ── Merge + dedupe by video id ──
  const seen = new Set<string>()
  const merged: MediaRow[] = []
  for (const row of [
    ...((titleRes.data as MediaRow[]) || []),
    ...((channelRes.data as MediaRow[]) || []),
  ]) {
    if (!row?.youtube_video_id) continue
    if (seen.has(row.youtube_video_id)) continue
    seen.add(row.youtube_video_id)
    merged.push(row)
  }

  // ── Split into movies + music ──
  const movies: LiveSearchResult[] = []
  const music: LiveSearchResult[] = []
  for (const row of merged) {
    const result = toResult(row)
    if (result.type === 'movie') movies.push(result)
    else music.push(result)
  }

  // ── Cap each category ──
  const cap = Math.ceil(limit / 2)
  const cappedMovies = movies.slice(0, cap)
  const cappedMusic = music.slice(0, cap)

  if (titleRes.error) {
    console.warn('[live-search] title query error:', titleRes.error.message)
  }
  if (channelRes.error) {
    console.warn('[live-search] channel query error:', channelRes.error.message)
  }

  return NextResponse.json(
    {
      query: rawQuery,
      movies: cappedMovies,
      music: cappedMusic,
      total: cappedMovies.length + cappedMusic.length,
      ts: Date.now(),
    },
    { headers: noCacheHeaders() }
  )
}

// ════════════════════════════════════════════════════════════
//  CACHE-BYPASS HEADERS — defeats Next.js + Vercel + browser
// ════════════════════════════════════════════════════════════

function noCacheHeaders() {
  return {
    'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
  }
}
