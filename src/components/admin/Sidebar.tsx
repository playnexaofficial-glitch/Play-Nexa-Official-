// ── Play Nexa Admin — Sidebar Navigation ──────────────────────
// AMOLED dark theme, 44px touch targets, mobile-friendly
// No backdrop-blur, no styled-jsx

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  label: string
  icon: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: '📊', href: '/admin' },
  { label: 'Channels', icon: '📺', href: '/admin/channels' },
  { label: 'Movies', icon: '🎬', href: '/admin/movies' },
  { label: 'Games', icon: '🎮', href: '/admin/games' },
  { label: 'Users', icon: '👥', href: '/admin/users' },
  { label: 'API Keys', icon: '🔑', href: '/admin/keys' },
  { label: 'Key Vault', icon: '🏦', href: '/admin/vault' },
  { label: 'AI Chat', icon: '🤖', href: '/admin/chat' },
  { label: 'Feedback', icon: '📣', href: '/admin/feedback' },
  { label: 'YT Importer', icon: '🚀', href: '/admin/yt-importer' },
  { label: 'Features', icon: '⚡', href: '/admin/features' },
  { label: 'Notifications', icon: '🔔', href: '/admin/notifications' },
  { label: 'Analytics', icon: '📈', href: '/admin/analytics' },
  { label: 'Settings', icon: '⚙️', href: '/admin/settings' },
]

interface AdminSidebarProps {
  adminEmail?: string
}

export default function AdminSidebar({ adminEmail }: AdminSidebarProps = { adminEmail: '' }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={`bg-[#0A0A0A] border-r border-[#1A1A1A] flex flex-col h-screen transition-[width] duration-200 w-56 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#1A1A1A] flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-white font-bold text-sm">
            <span className="text-[#7C3AED]">Play</span> Nexa
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1A1A1A] transition-colors duration-150 min-h-[44px] min-w-[44px] ml-auto"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 min-h-[44px] ${
              isActive(item.href)
                ? 'bg-[#7C3AED]/15 text-[#A78BFA] border-r-2 border-[#7C3AED]'
                : 'text-[#9CA3AF] hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            <span className="text-base shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#1A1A1A]">
        {/* Back to App — returns to the regular Play Nexa app (Profile page)
            without clearing the admin session, so the user can come back to
            the admin panel later without re-logging in. */}
        <button
          onClick={() => router.push('/profile')}
          className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[#9CA3AF] hover:text-white hover:bg-[#1A1A1A] rounded-lg transition-colors duration-150 min-h-[44px] mb-1"
          aria-label="Back to App"
        >
          <span className="text-base shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
          {!collapsed && <span>Back to App</span>}
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('pna_admin_id')
            localStorage.removeItem('pna_admin_email')
            localStorage.removeItem('pna_admin_role')
            localStorage.removeItem('pna_admin_token')
            document.cookie = 'pna_admin_token=;path=/;max-age=0;SameSite=Strict'
            router.push('/admin/login')
          }}
          className="w-full flex items-center gap-3 px-3 py-3 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors duration-150 min-h-[44px]"
        >
          <span className="text-base shrink-0">🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
