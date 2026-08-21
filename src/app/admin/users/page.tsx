// ── Play Nexa Admin — User Manager ────────────────────────────────
// Full user management: list, search, filter, view details, ban/unban, delete
// AMOLED dark theme (#000000 base), no backdrop-blur, no styled-jsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/admin/Toast'
import { logActivity } from '@/lib/adminAuth'
import ConfirmModal from '@/components/admin/ConfirmModal'

// ── Types ──

interface AdminUser {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  banned_until: string | null
  user_metadata: { avatar_url?: string; full_name?: string }
}

interface UserStats {
  watched: number
  liked: number
  watchlist: number
}

// ── Helpers ──

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  if (isNaN(then)) return '—'
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

function isUserBanned(user: AdminUser): boolean {
  if (!user.banned_until) return false
  return new Date(user.banned_until).getTime() > Date.now()
}

function getAvatarGradient(name?: string): string {
  const gradients = [
    'from-[#7C3AED] to-[#EC4899]',
    'from-[#06B6D4] to-[#3B82F6]',
    'from-[#10B981] to-[#06B6D4]',
    'from-[#F59E0B] to-[#EF4444]',
    'from-[#8B5CF6] to-[#06B6D4]',
    'from-[#EC4899] to-[#F59E0B]',
    'from-[#14B8A6] to-[#A78BFA]',
    'from-[#F43F5E] to-[#7C3AED]',
  ]
  const idx = name ? name.charCodeAt(0) % gradients.length : 0
  return gradients[idx]
}

function exportCSV(users: AdminUser[]) {
  const header = 'Email,Full Name,Joined,Last Active,Status'
  const rows = users.map(u =>
    [
      u.email,
      u.user_metadata?.full_name || '',
      formatDate(u.created_at),
      formatDate(u.last_sign_in_at),
      isUserBanned(u) ? 'Banned' : 'Active',
    ]
      .map(v => `"${v}"`)
      .join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `playnexa-users-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ──

export default function UserManagerPage() {
  const { showToast } = useToast()

  // Data state
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')

  // Detail panel state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userHistory, setUserHistory] = useState<any[]>([])

  // Modal state
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // ── Fetch users ──

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users || [])
    } catch (err: any) {
      showToast(err.message || 'Failed to load users', 'error')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, showToast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ── Fetch user stats when selected ──

  useEffect(() => {
    if (!selectedUser) {
      setUserStats(null)
      setUserHistory([])
      return
    }

    const fetchUserDetails = async () => {
      try {
        // We need the supabase admin client for this — call our own API
        const statsRes = await fetch(
          `/api/admin/users?userId=${selectedUser.id}&stats=true`,
        )
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setUserStats(statsData.stats || null)
          setUserHistory(statsData.history || [])
        }
      } catch {
        setUserStats(null)
        setUserHistory([])
      }
    }

    fetchUserDetails()
  }, [selectedUser])

  // ── Filter users by status ──

  const filteredUsers = users.filter(u => {
    if (statusFilter === 'active') return !isUserBanned(u)
    if (statusFilter === 'banned') return isUserBanned(u)
    return true
  })

  const activeCount = users.filter(u => !isUserBanned(u)).length
  const bannedCount = users.filter(u => isUserBanned(u)).length

  // ── Ban / Unban user ──

  const handleBanConfirm = async () => {
    if (!banTarget) return

    const action = isUserBanned(banTarget) ? 'unban' : 'ban'

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: banTarget.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')

      showToast(
        action === 'ban'
          ? `User ${banTarget.email} has been banned`
          : `User ${banTarget.email} has been unbanned`,
        'success',
      )

      logActivity(
        action === 'ban' ? 'BAN_USER' : 'UNBAN_USER',
        banTarget.email,
        { userId: banTarget.id },
      )

      // Refresh
      setBanTarget(null)
      fetchUsers()

      // Update selected user if it's the same
      if (selectedUser?.id === banTarget.id) {
        setSelectedUser(prev =>
          prev
            ? {
                ...prev,
                banned_until:
                  action === 'ban'
                    ? new Date(Date.now() + 876000 * 3600000).toISOString()
                    : null,
              }
            : null,
        )
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error')
    }
  }

  // ── Delete user ──

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    if (deleteConfirmText !== deleteTarget.email) {
      showToast('Email does not match', 'error')
      return
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId: deleteTarget.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')

      showToast(`User ${deleteTarget.email} has been deleted`, 'success')

      logActivity('DELETE_USER', deleteTarget.email, { userId: deleteTarget.id })

      // Refresh
      if (selectedUser?.id === deleteTarget.id) {
        setSelectedUser(null)
      }
      setDeleteTarget(null)
      setDeleteConfirmText('')
      fetchUsers()
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error')
    }
  }

  // ── Copy to clipboard ──

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => showToast('Copied to clipboard', 'success'),
      () => showToast('Failed to copy', 'error'),
    )
  }

  // ── Render ──

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            👥 User Manager
          </h1>
          <span className="px-2.5 py-0.5 bg-[#7C3AED]/20 text-[#A78BFA] text-xs font-semibold rounded-full">
            {users.length}
          </span>
        </div>
        <button
          onClick={() => exportCSV(filteredUsers)}
          disabled={filteredUsers.length === 0}
          className="h-11 px-5 bg-[#1A1A1A] border border-[#2D2D2D] hover:bg-[#2D2D2D] text-white text-sm font-medium rounded-xl transition-colors duration-150 min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          📥 Export CSV
        </button>
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl pl-10 pr-4 text-white text-sm outline-none focus:border-[#7C3AED] transition-colors duration-150 placeholder:text-[#6B7280]"
          />
        </div>

        {/* Status filter buttons */}
        <div className="flex gap-2">
          {([
            { key: 'all', label: 'All', count: users.length },
            { key: 'active', label: 'Active', count: activeCount },
            { key: 'banned', label: 'Banned', count: bannedCount },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`h-11 px-4 text-sm font-medium rounded-xl transition-colors duration-150 min-h-[44px] border ${
                statusFilter === f.key
                  ? f.key === 'banned'
                    ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                    : f.key === 'active'
                      ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                      : 'bg-[#7C3AED] border-[#7C3AED] text-white'
                  : 'bg-[#1A1A1A] border-[#2D2D2D] text-[#9CA3AF] hover:text-white hover:border-[#4B5563]'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* ── Users Table ── */}
      <div className="bg-[#0F0F0F] border border-[#242424] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#242424]">
                <th className="px-4 py-3 text-left text-[#9CA3AF] font-medium w-10">#</th>
                <th className="px-4 py-3 text-left text-[#9CA3AF] font-medium w-12">Avatar</th>
                <th className="px-4 py-3 text-left text-[#9CA3AF] font-medium">Email</th>
                <th className="px-4 py-3 text-left text-[#9CA3AF] font-medium w-28">Joined</th>
                <th className="px-4 py-3 text-left text-[#9CA3AF] font-medium w-28">Last Active</th>
                <th className="px-4 py-3 text-left text-[#9CA3AF] font-medium w-24">Status</th>
                <th className="px-4 py-3 text-right text-[#9CA3AF] font-medium w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-[#6B7280]">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                      <span>Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-[#6B7280]">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const banned = isUserBanned(user)
                  const firstName = user.user_metadata?.full_name || user.email
                  const initial = (firstName[0] || '?').toUpperCase()

                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-[#1A1A1A] hover:bg-[#1A1A1A]/50 transition-colors duration-150 ${
                        selectedUser?.id === user.id ? 'bg-[#7C3AED]/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-[#6B7280]">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(firstName)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                        >
                          {initial}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-white truncate max-w-[220px]" title={user.email}>
                            {user.email}
                          </p>
                          {user.user_metadata?.full_name && (
                            <p className="text-[#6B7280] text-xs truncate max-w-[220px]">
                              {user.user_metadata.full_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        <span title={user.last_sign_in_at || undefined}>
                          {getRelativeTime(user.last_sign_in_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {banned ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EF4444]/15 text-[#EF4444]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                            Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#10B981]/15 text-[#10B981]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#2D2D2D] transition-colors duration-150"
                            title="View Details"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => setBanTarget(user)}
                            className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors duration-150"
                            title={banned ? 'Unban User' : 'Ban User'}
                          >
                            🚫
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(user)
                              setDeleteConfirmText('')
                            }}
                            className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors duration-150"
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── User Detail Side Panel ── */}
      {selectedUser && (
        <div className="fixed right-0 top-0 h-full w-[360px] max-w-full bg-[#0F0F0F] border-l border-[#1A1A1A] z-[70] flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1A1A1A]">
            <h2 className="text-white font-bold text-base">User Details</h2>
            <button
              onClick={() => setSelectedUser(null)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#9CA3AF] hover:text-white transition-colors duration-150"
            >
              ✕
            </button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1A1A1A] [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* Avatar + Name */}
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarGradient(selectedUser.user_metadata?.full_name || selectedUser.email)} flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}
              >
                {((selectedUser.user_metadata?.full_name || selectedUser.email)[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-semibold truncate">
                  {selectedUser.user_metadata?.full_name || 'No name set'}
                </p>
                <p className="text-[#9CA3AF] text-sm truncate">{selectedUser.email}</p>
              </div>
            </div>

            {/* User ID (copyable) */}
            <div className="bg-[#1A1A1A] rounded-xl p-3">
              <p className="text-[#6B7280] text-xs font-medium mb-1">User ID</p>
              <div className="flex items-center gap-2">
                <code className="text-[#A78BFA] text-xs flex-1 truncate">{selectedUser.id}</code>
                <button
                  onClick={() => copyToClipboard(selectedUser.id)}
                  className="text-[#6B7280] hover:text-white transition-colors duration-150 flex-shrink-0 text-xs"
                  title="Copy"
                >
                  📋
                </button>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] text-sm">Email</span>
                <span className="text-white text-sm truncate max-w-[200px]">{selectedUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] text-sm">Joined</span>
                <span className="text-white text-sm">{formatDateTime(selectedUser.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] text-sm">Last Sign In</span>
                <span className="text-white text-sm">{formatDateTime(selectedUser.last_sign_in_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] text-sm">Status</span>
                {isUserBanned(selectedUser) ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EF4444]/15 text-[#EF4444]">
                    Banned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#10B981]/15 text-[#10B981]">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div>
              <h3 className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-3">
                Activity Stats
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-lg">
                    {userStats?.watched ?? '—'}
                  </p>
                  <p className="text-[#6B7280] text-xs mt-0.5">Watched</p>
                </div>
                <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-lg">
                    {userStats?.liked ?? '—'}
                  </p>
                  <p className="text-[#6B7280] text-xs mt-0.5">Liked</p>
                </div>
                <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
                  <p className="text-white font-bold text-lg">
                    {userStats?.watchlist ?? '—'}
                  </p>
                  <p className="text-[#6B7280] text-xs mt-0.5">Watchlist</p>
                </div>
              </div>
            </div>

            {/* Recent Watch History */}
            <div>
              <h3 className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-3">
                Recent Watch History
              </h3>
              {userHistory.length === 0 ? (
                <p className="text-[#4B5563] text-sm text-center py-4">No watch history</p>
              ) : (
                <div className="space-y-2">
                  {userHistory.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center gap-3 bg-[#1A1A1A] rounded-xl p-2.5"
                    >
                      {item.movies?.thumbnail ? (
                        <img
                          src={item.movies.thumbnail}
                          alt={item.movies?.title || ''}
                          className="w-12 h-7 rounded object-cover bg-[#2D2D2D] flex-shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-12 h-7 rounded bg-[#2D2D2D] flex items-center justify-center text-[#4B5563] text-xs flex-shrink-0">
                          🎬
                        </div>
                      )}
                      <span className="text-white text-sm truncate flex-1">
                        {item.movies?.title || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel footer — action buttons */}
          <div className="px-5 py-4 border-t border-[#1A1A1A] space-y-2">
            <button
              onClick={() => setBanTarget(selectedUser)}
              className="w-full h-12 rounded-xl bg-[#EF4444]/15 text-[#EF4444] text-sm font-semibold min-h-[44px] transition-colors duration-150 hover:bg-[#EF4444]/25"
            >
              {isUserBanned(selectedUser) ? '✅ Unban User' : '🚫 Ban User'}
            </button>
            <button
              onClick={() => {
                setDeleteTarget(selectedUser)
                setDeleteConfirmText('')
              }}
              className="w-full h-12 rounded-xl bg-[#EF4444]/10 text-[#EF4444] text-sm font-semibold min-h-[44px] transition-colors duration-150 hover:bg-[#EF4444]/20"
            >
              🗑️ Delete Account
            </button>
          </div>
        </div>
      )}

      {/* ── Ban Confirm Modal ── */}
      {banTarget && (
        <ConfirmModal
          title={isUserBanned(banTarget) ? 'Unban User' : 'Ban User'}
          message={
            isUserBanned(banTarget)
              ? `Are you sure you want to unban "${banTarget.email}"? They will regain access to their account.`
              : `Are you sure you want to ban "${banTarget.email}"? They will lose access to their account immediately.`
          }
          confirmLabel={isUserBanned(banTarget) ? 'Unban' : 'Ban'}
          onConfirm={handleBanConfirm}
          onCancel={() => setBanTarget(null)}
        />
      )}

      {/* ── Delete Confirm Modal (custom — requires typing email) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => {
              setDeleteTarget(null)
              setDeleteConfirmText('')
            }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-[#0F0F0F] border border-[#242424] rounded-2xl p-6">
            <h3 className="text-white font-bold text-lg mb-2">Delete Account</h3>
            <p className="text-[#9CA3AF] text-sm mb-5">
              This will permanently delete the account for{' '}
              <span className="text-[#EF4444] font-semibold">{deleteTarget.email}</span>.
              This action cannot be undone.
            </p>

            <div className="mb-4">
              <p className="text-[#9CA3AF] text-xs mb-2">
                Type the user&apos;s email{' '}
                <span className="text-[#EF4444] font-bold">{deleteTarget.email}</span>{' '}
                to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                className="w-full h-11 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-white text-sm outline-none focus:border-[#EF4444] transition-colors duration-150 placeholder:text-[#6B7280]"
                placeholder={deleteTarget.email}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteConfirmText('')
                }}
                className="flex-1 h-12 rounded-xl border border-[#2D2D2D] text-[#9CA3AF] text-sm font-medium min-h-[44px] transition-colors duration-150 hover:bg-[#1A1A1A]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmText !== deleteTarget.email}
                className="flex-1 h-12 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-sm font-semibold min-h-[44px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
