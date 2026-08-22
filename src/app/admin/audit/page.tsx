// ── Play Nexa Admin — Audit Logs Dashboard ─────────────────────
// Real-time audit trail, action filters, search, and JSON inspector
// AMOLED dark theme matching play nexa aesthetics (#000000 base)

'use client'

import { useState, useEffect, useCallback } from 'react'
import { History, Search, Filter, Eye, X, Calendar, RefreshCw, UserCheck, ShieldAlert } from 'lucide-react'
import { logActivity } from '@/lib/adminAuth'
import { safeJSONStringify } from '@/lib/safeStringify'

interface AuditLog {
  id: string
  admin_id: string | null
  action: string
  target: string
  details: Record<string, any> | null
  created_at: string
}

const ACTION_CATEGORIES = [
  { label: 'All Actions', value: '' },
  { label: 'Key Activation', value: 'ACTIVATE_KEY' },
  { label: 'Add Key', value: 'ADD_KEY' },
  { label: 'Delete Key', value: 'DELETE_KEY' },
  { label: 'Vault Add', value: 'VAULT_ADD_KEY' },
  { label: 'Vault Update', value: 'VAULT_UPDATE_KEY' },
  { label: 'Vault Delete', value: 'VAULT_DELETE_KEY' },
  { label: 'Ban User', value: 'BAN_USER' },
  { label: 'Unban User', value: 'UNBAN_USER' },
  { label: 'Setup Complete', value: 'SETUP_COMPLETE' },
]

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true)
    try {
      let url = '/api/admin/audit?limit=200'
      if (selectedAction) {
        url += `&action=${encodeURIComponent(selectedAction)}`
      }
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`
      }
      
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedAction, searchTerm])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchLogs(true)
  }

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    } catch {
      return isoString
    }
  }

  const getBadgeStyles = (action: string) => {
    if (action.includes('BAN_') || action.includes('DELETE_')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444' }
    }
    if (action.includes('ADD_') || action.includes('SETUP_')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' }
    }
    if (action.includes('UPDATE_')) {
      return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3B82F6' }
    }
    return { bg: 'rgba(139, 92, 246, 0.12)', text: '#8B5CF6' }
  }

  const getAdminEmail = (log: AuditLog) => {
    if (log.details?.admin_email) return log.details.admin_email
    if (log.details?.email) return log.details.email
    return log.admin_id ? log.admin_id.slice(0, 8) + '...' : 'System / Auto'
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
            <History className="text-[#7C3AED]" size={26} />
            Security Audit Trail
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-1">
            Centralized admin activity logs for compliance and traceability
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-[#121214] border border-[#27272A] hover:bg-[#1E1E22] transition-colors flex items-center gap-2 text-sm text-[#E4E4E7]"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {/* ── Filters Bar ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search target, action, details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[#0F0F11] border border-[#1F1F23] text-white text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          />
        </div>

        {/* Action Dropdown */}
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-[#0F0F11] border border-[#1F1F23] text-white text-sm focus:outline-none focus:border-[#7C3AED] transition-colors appearance-none cursor-pointer"
          >
            {ACTION_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[#0A0A0C] border border-[#1F1F23]/40 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-[#9CA3AF]">
          <span className="flex items-center gap-2">
            <UserCheck size={14} className="text-[#10B981]" />
            Active Records:
          </span>
          <span className="font-mono text-white text-sm font-semibold">{logs.length}</span>
        </div>
      </div>

      {/* ── Logs Table ── */}
      <div className="bg-[#09090B] border border-[#1F1F23] rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading security trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <ShieldAlert className="text-gray-600 mb-3" size={40} />
            <p className="text-white font-medium">No log entries found</p>
            <p className="text-gray-500 text-xs mt-1">
              Try adjusting your filters or search term.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#1F1F23] bg-[#121214]/50">
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Administrator</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Target Object</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F23]">
                {logs.map((log) => {
                  const badge = getBadgeStyles(log.action)
                  return (
                    <tr key={log.id} className="hover:bg-[#121214]/40 transition-colors">
                      <td className="p-4 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {formatTimestamp(log.created_at)}
                      </td>
                      <td className="p-4 text-sm font-medium text-white max-w-[180px] truncate">
                        {getAdminEmail(log)}
                      </td>
                      <td className="p-4">
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-semibold inline-block whitespace-nowrap"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-300 font-mono max-w-[200px] truncate" title={log.target}>
                        {log.target}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] text-xs font-medium rounded-lg transition-colors border border-[#27272A]"
                        >
                          <Eye size={13} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── JSON Inspection Modal ── */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 transition-opacity duration-150">
          <div className="bg-[#09090B] border border-[#27272A] w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="text-[#7C3AED]" size={18} />
                <h3 className="font-semibold text-white text-base">Log Metadata Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm text-gray-300">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">ACTION PERFORMED</p>
                  <span
                    className="px-2 py-0.5 rounded-md text-xs font-semibold inline-block"
                    style={{
                      backgroundColor: getBadgeStyles(selectedLog.action).bg,
                      color: getBadgeStyles(selectedLog.action).text,
                    }}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">TARGET IDENTIFIER</p>
                  <p className="font-mono text-white text-xs truncate" title={selectedLog.target}>
                    {selectedLog.target}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">TIMESTAMP</p>
                <div className="flex items-center gap-1.5 font-mono text-xs text-white">
                  <Calendar size={14} className="text-gray-500" />
                  {formatTimestamp(selectedLog.created_at)}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">OPERATOR METADATA</p>
                <p className="text-xs text-white font-mono break-all bg-[#121214] p-3 rounded-xl border border-[#1F1F23]">
                  Admin ID: {selectedLog.admin_id || 'System'}<br />
                  Email: {getAdminEmail(selectedLog)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">RAW JSON DETAILS payload</p>
                <pre className="bg-[#121214] p-3 rounded-xl text-xs font-mono text-[#10B981] overflow-x-auto border border-[#1F1F23] max-h-52">
                  {safeJSONStringify(selectedLog.details || {}, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#27272A] bg-[#121214]/40 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="min-h-[38px] px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-medium rounded-xl transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
