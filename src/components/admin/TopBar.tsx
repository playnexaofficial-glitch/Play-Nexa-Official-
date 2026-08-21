// ── Play Nexa Admin — Top Bar ─────────────────────────────────
// Page title + admin avatar + mobile hamburger menu
// AMOLED dark theme, 44px touch targets

'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/channels': 'Channel Manager',
  '/admin/movies': 'Movie Manager',
  '/admin/users': 'User Manager',
  '/admin/games': 'Game Manager',
  '/admin/keys': 'API Keys',
  '/admin/vault': 'Key Vault',
  '/admin/chat': 'AI Assistant',
  '/admin/feedback': 'Feedback',
  '/admin/yt-importer': 'YT Importer',
  '/admin/features': 'Feature Control',
  '/admin/notifications': 'Notifications',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'App Settings',
}

interface TopBarProps {
  adminEmail: string
  onMenuToggle?: () => void
}

export default function TopBar({ adminEmail, onMenuToggle }: TopBarProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'Admin'

  return (
    <header className="flex items-center justify-between px-4 lg:px-6 h-14 bg-[#0A0A0A] border-b border-[#1A1A1A] flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#1A1A1A] transition-colors duration-150 md:hidden min-h-[44px] min-w-[44px]"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <h2 className="text-white font-bold text-base sm:text-lg">{title}</h2>
      </div>

      {/* Admin avatar */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <p className="text-[#9CA3AF] text-xs text-right">{adminEmail}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">
            {(adminEmail || 'A')[0].toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  )
}
