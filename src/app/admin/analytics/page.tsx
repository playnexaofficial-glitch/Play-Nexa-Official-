// ── Play Nexa Admin — Analytics Dashboard ─────────────────────
// Charts with Recharts: Bar, Line, Pie + summary cards + activity log
// AMOLED dark theme (#000000 base), no backdrop-blur, no styled-jsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/admin/Toast'
import { Calendar, Film, Clock, Tv, X, Search, TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'

// ── Types ──

interface TopWatched {
  name: string
  watch_count: number
}

interface DailyUser {
  date: string
  count: number
}

interface ChannelLike {
  name: string
  count: number
}

interface ActivityEntry {
  id: string
  action: string
  target: string
  details: Record<string, unknown>
  admin_id: string | null
  created_at: string
}

// ── Constants ──

const PIE_COLORS = ['#FF4444', '#FF8C42', '#A78BFA', '#22D3EE', '#FCD34D']

// ── Custom Tooltip ──

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-3 py-2 text-xs text-white">
      <p className="text-[#9CA3AF] text-xs mb-1">{label}</p>
      <p className="font-semibold">{payload[0].value}</p>
    </div>
  )
}

// ── Helpers ──

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function getActionBadgeColor(action: string): string {
  if (action.startsWith('ADD_')) return '#10B981'
  if (action.startsWith('UPDATE_')) return '#3B82F6'
  if (action.startsWith('DELETE_')) return '#EF4444'
  if (action.startsWith('SEND_')) return '#7C3AED'
  return '#9CA3AF'
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

// Group dates helper
function groupByDate(records: any[], dateField: string): DailyUser[] {
  const map = new Map<string, number>()
  records.forEach((r) => {
    const d = r[dateField]
    if (!d) return
    const dateKey = new Date(d).toISOString().split('T')[0]
    map.set(dateKey, (map.get(dateKey) || 0) + 1)
  })

  // Fill in missing dates for last 30 days
  const result: DailyUser[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    result.push({
      date: key.slice(5), // MM-DD
      count: map.get(key) || 0,
    })
  }
  return result
}

// ── Component ──

export default function AnalyticsPage() {
  const { showToast } = useToast()

  const [topWatched, setTopWatched] = useState<TopWatched[]>([])
  const [dailyUsers, setDailyUsers] = useState<DailyUser[]>([])
  const [rawDailyRecords, setRawDailyRecords] = useState<any[]>([])
  const [selectedDrillDownDate, setSelectedDrillDownDate] = useState<string | null>(null)
  const [drillDownSearch, setDrillDownSearch] = useState('')
  const [channelLikes, setChannelLikes] = useState<ChannelLike[]>([])
  const [genreData, setGenreData] = useState<ChannelLike[]>([])
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch all analytics data via API ──

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/analytics')
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch analytics')
      }

      setTopWatched(data.topWatched || [])
      setRawDailyRecords(data.dailyRecords || [])
      setDailyUsers(groupByDate(data.dailyRecords || [], 'watched_at'))
      setChannelLikes(data.channelLikes || [])
      setGenreData(data.genreData || [])
      setActivityLog(data.activityLog || [])
    } catch (err: any) {
      const msg = err?.message || 'Failed to load analytics'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // ── Summary stats ──

  const mostWatched = topWatched.length > 0 ? topWatched[0].name : '—'
  const peakDay =
    dailyUsers.length > 0
      ? dailyUsers.reduce(
          (max, d) => (d.count > max.count ? d : max),
          dailyUsers[0]
        )
      : null
  const mostLikedChannel = channelLikes.length > 0 ? channelLikes[0].name : '—'

  // ── Loading state ──

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#9CA3AF] text-sm">Loading analytics…</p>
        </div>
      </div>
    )
  }

  // ── Error state ──

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#2A0A0A] border border-[#EF4444]/20 flex items-center justify-center">
            <span className="text-[#EF4444] text-2xl">✕</span>
          </div>
          <p className="text-white font-semibold text-lg">Something went wrong</p>
          <p className="text-[#9CA3AF] text-sm">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="min-h-[44px] px-6 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium rounded-xl transition-colors duration-150"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ── Render ──

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">📊 Analytics</h1>
        <p className="text-[#9CA3AF] text-sm mt-1">
          Play Nexa usage insights & admin activity
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-4">
          <p className="text-[#9CA3AF] text-xs font-medium mb-1">Most Watched</p>
          <p className="text-white font-semibold text-sm truncate" title={mostWatched}>
            {mostWatched}
          </p>
        </div>
        <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-4">
          <p className="text-[#9CA3AF] text-xs font-medium mb-1">Most Active User</p>
          <p className="text-white font-semibold text-sm">—</p>
        </div>
        <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-4">
          <p className="text-[#9CA3AF] text-xs font-medium mb-1">
            Most Liked Channel
          </p>
          <p
            className="text-white font-semibold text-sm truncate"
            title={mostLikedChannel}
          >
            {mostLikedChannel}
          </p>
        </div>
        <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-4">
          <p className="text-[#9CA3AF] text-xs font-medium mb-1">Peak Day</p>
          <p className="text-white font-semibold text-sm">
            {peakDay ? `${peakDay.date} (${peakDay.count})` : '—'}
          </p>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Most Watched Movies — Bar Chart */}
        <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-4">
            Most Watched Movies
          </h2>
          {topWatched.length === 0 ? (
            <div className="flex items-center justify-center h-56">
              <p className="text-[#4B5563] text-sm">No watch data available</p>
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topWatched} maxBarSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#9CA3AF', fontSize: 10 }}
                    axisLine={{ stroke: '#1A1A1A' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    axisLine={{ stroke: '#1A1A1A' }}
                    tickLine={false}
                    tickFormatter={formatCount}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: '#1A1A1A' }}
                  />
                  <Bar dataKey="watch_count" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Daily Activity — Line Chart */}
        <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white font-semibold text-base">
                Daily Activity (30 Days)
              </h2>
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
                Interactive Drill Down
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280] mb-4">
              💡 Tip: Click on any chart node or any active day below to drill down into metrics.
            </p>
          </div>
          {dailyUsers.every((d) => d.count === 0) ? (
            <div className="flex items-center justify-center h-56">
              <p className="text-[#4B5563] text-sm">No activity data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyUsers}
                    onClick={(state) => {
                      if (state && state.activeLabel) {
                        setSelectedDrillDownDate(state.activeLabel)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      axisLine={{ stroke: '#1A1A1A' }}
                      tickLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      axisLine={{ stroke: '#1A1A1A' }}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={{ fill: '#06B6D4', r: 3 }}
                      activeDot={{ r: 5, fill: '#06B6D4' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Interactive list of active days for perfect accessibility */}
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium mb-2">Recent Active Days</p>
                <div className="flex flex-wrap gap-2">
                  {dailyUsers
                    .filter((d) => d.count > 0)
                    .slice(-5)
                    .reverse()
                    .map((d) => (
                      <button
                        key={d.date}
                        onClick={() => setSelectedDrillDownDate(d.date)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-[#141416] border border-[#27272A] hover:bg-cyan-950/20 hover:border-cyan-500/40 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 active:opacity-75 min-h-[36px]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {d.date} ({d.count})
                      </button>
                    ))}
                  {dailyUsers.filter((d) => d.count > 0).length === 0 && (
                    <p className="text-xs text-[#4B5563]">No active days tracked in this window</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Pie Chart Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Likes Per Channel — Pie Chart */}
        <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-4">
            Likes Per Channel
          </h2>
          {channelLikes.length === 0 ? (
            <div className="flex items-center justify-center h-56">
              <p className="text-[#4B5563] text-sm">No like data available</p>
            </div>
          ) : (
            <div className="h-56 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelLikes}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {channelLikes.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-3 py-2 text-xs text-white">
                          <p className="font-semibold">{payload[0].name}</p>
                          <p className="text-[#9CA3AF]">
                            {payload[0].value} likes
                          </p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-col gap-2 ml-2">
                {channelLikes.map((ch, i) => (
                  <div key={ch.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span
                      className="text-[#9CA3AF] text-xs truncate max-w-[90px]"
                      title={ch.name}
                    >
                      {ch.name}
                    </span>
                    <span className="text-white text-xs font-medium ml-auto">
                      {ch.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Movies Per Channel — Pie Chart */}
        <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-5">
          <h2 className="text-white font-semibold text-base mb-4">
            Movies Per Channel
          </h2>
          {genreData.length === 0 ? (
            <div className="flex items-center justify-center h-56">
              <p className="text-[#4B5563] text-sm">No channel data available</p>
            </div>
          ) : (
            <div className="h-56 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {genreData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-3 py-2 text-xs text-white">
                          <p className="font-semibold">{payload[0].name}</p>
                          <p className="text-[#9CA3AF]">
                            {payload[0].value} movies
                          </p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-col gap-2 ml-2">
                {genreData.map((ch, i) => (
                  <div key={ch.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span
                      className="text-[#9CA3AF] text-xs truncate max-w-[90px]"
                      title={ch.name}
                    >
                      {ch.name}
                    </span>
                    <span className="text-white text-xs font-medium ml-auto">
                      {ch.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Log ── */}
      <div className="bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl p-5">
        <h2 className="text-white font-semibold text-base mb-4">Activity Log</h2>

        {activityLog.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[#4B5563] text-sm">No activity recorded yet</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1A1A1A] [&::-webkit-scrollbar-thumb]:rounded-full">
            {activityLog.map((entry, idx) => {
              const badgeColor = getActionBadgeColor(entry.action ?? '')
              return (
                <div
                  key={entry.id ?? idx}
                  className="flex items-center gap-3 py-2"
                >
                  <span
                    className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                    style={{
                      backgroundColor: badgeColor + '22',
                      color: badgeColor,
                    }}
                  >
                    {entry.action}
                  </span>
                  <span
                    className="text-[#9CA3AF] text-sm flex-1 truncate"
                    title={entry.target}
                  >
                    {entry.target}
                  </span>
                  <span className="text-[#4B5563] text-xs flex-shrink-0">
                    {entry.created_at ? getRelativeTime(entry.created_at) : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Daily Activity Quick-View Modal ── */}
      {selectedDrillDownDate && (() => {
        // Compute drill down stats dynamically
        const matched = rawDailyRecords.filter((r) => {
          if (!r.watched_at) return false
          try {
            const d = new Date(r.watched_at).toISOString().split('T')[0]
            return d.slice(5) === selectedDrillDownDate
          } catch {
            return false
          }
        })

        const totalPlays = matched.length

        // Group movies
        const movieMap = new Map<string, { title: string; channel: string; count: number }>()
        matched.forEach((r) => {
          const title = r.movies?.title || 'Unknown Video Content'
          const channel = r.movies?.channel_name || 'Direct Link / External'
          const key = `${title}::${channel}`
          const existing = movieMap.get(key) || { title, channel, count: 0 }
          existing.count++
          movieMap.set(key, existing)
        })
        const movies = Array.from(movieMap.values()).sort((a, b) => b.count - a.count)

        // Group channels
        const channelMap = new Map<string, number>()
        matched.forEach((r) => {
          const channel = r.movies?.channel_name || 'Direct Link / External'
          channelMap.set(channel, (channelMap.get(channel) || 0) + 1)
        })
        const channels = Array.from(channelMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)

        // Group hours
        const hourMap = Array(24).fill(0)
        matched.forEach((r) => {
          if (!r.watched_at) return
          try {
            const hr = new Date(r.watched_at).getHours()
            hourMap[hr]++
          } catch {}
        })
        const hours = hourMap
          .map((count, hour) => ({
            label: `${hour.toString().padStart(2, '0')}:00`,
            count,
          }))
          .filter((h) => h.count > 0)

        // Filter movies by search term
        const filteredMovies = movies.filter(m =>
          m.title.toLowerCase().includes(drillDownSearch.toLowerCase()) ||
          m.channel.toLowerCase().includes(drillDownSearch.toLowerCase())
        )

        return (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 transition-all animate-fade-in">
            <div className="bg-[#09090B] border border-[#27272A] w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-4 border-b border-[#27272A] flex items-center justify-between bg-[#121214]/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/40 text-cyan-400 flex items-center justify-center border border-cyan-800/30">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Date Drill Down: {selectedDrillDownDate}</h3>
                    <p className="text-[#9CA3AF] text-xs">Granular video & peak hour traffic analysis</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedDrillDownDate(null)
                    setDrillDownSearch('')
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-6 flex-1">
                {/* High-level metrics row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#121214] border border-[#1F1F23] rounded-xl p-3">
                    <span className="text-[10px] text-[#71717A] uppercase tracking-wider font-semibold">Total Video Plays</span>
                    <p className="text-xl font-bold text-white mt-1 font-mono">{totalPlays}</p>
                  </div>
                  <div className="bg-[#121214] border border-[#1F1F23] rounded-xl p-3">
                    <span className="text-[10px] text-[#71717A] uppercase tracking-wider font-semibold">Unique Items Watched</span>
                    <p className="text-xl font-bold text-white mt-1 font-mono">{movies.length}</p>
                  </div>
                  <div className="bg-[#121214] border border-[#1F1F23] rounded-xl p-3">
                    <span className="text-[10px] text-[#71717A] uppercase tracking-wider font-semibold">Active Channels</span>
                    <p className="text-xl font-bold text-white mt-1 font-mono">{channels.length}</p>
                  </div>
                </div>

                {/* Left/Right layout for video plays vs peak hour metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Channels Breakdown */}
                  <div className="bg-[#121214]/50 border border-[#1F1F23]/80 rounded-xl p-4">
                    <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 text-cyan-400">
                      <Tv size={14} /> Channel Traffic
                    </h4>
                    {channels.length === 0 ? (
                      <p className="text-xs text-gray-500">No channel metrics</p>
                    ) : (
                      <div className="space-y-2">
                        {channels.map((c) => (
                          <div key={c.name} className="flex items-center justify-between text-xs text-gray-300">
                            <span className="truncate max-w-[150px]" title={c.name}>{c.name}</span>
                            <span className="font-mono bg-cyan-950/30 text-cyan-400 px-2 py-0.5 rounded border border-cyan-900/30 font-semibold">{c.count} plays</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hourly peak traffic */}
                  <div className="bg-[#121214]/50 border border-[#1F1F23]/80 rounded-xl p-4">
                    <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 text-[#A78BFA]">
                      <Clock size={14} /> Peak Activity Hours
                    </h4>
                    {hours.length === 0 ? (
                      <p className="text-xs text-gray-500">No hour metrics available</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {hours.map((h) => (
                          <div key={h.label} className="text-[11px] px-2 py-1 rounded-md bg-[#1F1F23] border border-[#27272A] text-gray-300 font-mono flex items-center gap-1">
                            <span className="text-gray-500">{h.label}</span>
                            <span className="text-[#A78BFA] font-bold font-sans">({h.count})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Video play breakdown list with search */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Film size={14} className="text-[#EF4444]" /> Video Engagement Details
                    </h4>
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={13} />
                      <input
                        type="text"
                        placeholder="Filter videos..."
                        value={drillDownSearch}
                        onChange={(e) => setDrillDownSearch(e.target.value)}
                        className="w-full min-h-[32px] pl-8 pr-3 rounded-lg bg-[#121214] border border-[#1F1F23] text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="bg-[#121214] border border-[#1F1F23] rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-[#1F1F23]/60">
                    {filteredMovies.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500">
                        No videos found matching your search.
                      </div>
                    ) : (
                      filteredMovies.map((m, idx) => (
                        <div key={idx} className="p-3 hover:bg-white/[0.02] transition-colors flex items-center justify-between text-xs gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate" title={m.title}>{m.title}</p>
                            <p className="text-gray-500 text-[10px] mt-0.5 truncate">{m.channel}</p>
                          </div>
                          <span className="font-mono bg-[#1E1E22] text-gray-300 px-2.5 py-1 rounded-lg border border-[#27272A]">
                            {m.count} plays
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#27272A] bg-[#121214]/60 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedDrillDownDate(null)
                    setDrillDownSearch('')
                  }}
                  className="min-h-[38px] px-4 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold text-xs rounded-xl transition-colors active:scale-95"
                >
                  Dismiss Quick-View
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
