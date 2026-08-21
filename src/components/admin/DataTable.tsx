// ── Play Nexa Admin — Reusable Data Table ─────────────────────
// Built-in search, sort, pagination
// AMOLED dark theme, 44px touch targets, content-visibility

'use client'

import { useState, useMemo, ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

export interface Column<T> {
  key: string
  label: string
  render?: (item: T) => ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  pageSize?: number
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  searchPlaceholder?: string
  searchFields?: (keyof T)[]
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  pageSize = 15,
  onEdit,
  onDelete,
  searchPlaceholder = 'Search...',
  searchFields = [],
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim() || searchFields.length === 0) return data
    const q = search.toLowerCase()
    return data.filter(item =>
      searchFields.some(field => {
        const val = item[field]
        return val != null && String(val).toLowerCase().includes(q)
      })
    )
  }, [data, search, searchFields])

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder={searchPlaceholder}
            className="w-full h-11 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl pl-10 pr-4 text-sm text-white outline-none focus:border-[#7C3AED] transition-colors duration-150 placeholder-[#6B7280]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1A1A1A]">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  className={`text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wide ${
                    col.sortable ? 'cursor-pointer hover:text-white' : ''
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wide">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paged.map(item => (
              <tr key={keyExtractor(item)} className="border-b border-[#1A1A1A] hover:bg-[#0F0F0F] transition-colors duration-150">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-white">
                    {col.render ? col.render(item) : String(item[col.key] ?? '—')}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition-colors duration-150"
                          title="Edit"
                        >
                          ✏️
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item)}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors duration-150"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="text-center py-8 text-[#9CA3AF]">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-[#9CA3AF] text-xs">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-[#2D2D2D] text-white disabled:opacity-30 transition-opacity duration-150"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="flex items-center px-3 text-[#9CA3AF] text-xs">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-[#2D2D2D] text-white disabled:opacity-30 transition-opacity duration-150"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
