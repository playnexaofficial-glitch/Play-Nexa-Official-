'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  LayoutDashboard,
  Tv,
  Film,
  Music,
  Gamepad2,
  Users,
  Zap,
  Bell,
  BarChart3,
  Settings,
  Key,
  Shield,
  MessageSquare,
  MessageCircle,
  LogOut,
  History,
} from 'lucide-react'

const NAV = [
  { Icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { Icon: Tv, label: 'Channels', path: '/admin/channels' },
  { Icon: Film, label: 'Movies', path: '/admin/movies' },
  { Icon: Music, label: 'Music', path: '/admin/music' },
  { Icon: Gamepad2, label: 'Games', path: '/admin/games' },
  { Icon: Users, label: 'Users', path: '/admin/users' },
  { Icon: Zap, label: 'Features', path: '/admin/features' },
  { Icon: Bell, label: 'Notifications', path: '/admin/notifications' },
  { Icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { Icon: History, label: 'Audit Logs', path: '/admin/audit' },
  { Icon: Settings, label: 'Settings', path: '/admin/settings' },
  { Icon: Key, label: 'API Keys', path: '/admin/keys' },
  { Icon: Shield, label: 'Key Vault', path: '/admin/vault' },
  { Icon: MessageSquare, label: 'AI Chat', path: '/admin/chat' },
  { Icon: MessageCircle, label: 'Feedback', path: '/admin/feedback' },
]

export default function AdminSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch {}
    router.replace('/')
  }

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 w-60 bg-[#050510] border-r border-[#1A1A2E] z-50 flex flex-col transition-transform duration-200 md:translate-x-0 md:z-30 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1A1A2E] flex-shrink-0">
        <h1 className="text-lg font-bold">
          <span style={{ color: '#7C3AED' }}>Play</span>
          <span className="text-white">Nexa</span>
        </h1>
        <p className="text-[#6B7280] text-xs mt-0.5">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map(({ Icon, label, path }) => {
          const active = pathname === path
          return (
            <Link
              key={path}
              href={path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 min-h-[44px] text-sm font-medium active:opacity-70 transition-colors ${
                active ? 'text-[#A78BFA]' : 'text-[#9CA3AF] hover:text-white'
              }`}
              style={{
                backgroundColor: active
                  ? 'rgba(124,58,237,0.15)'
                  : 'transparent',
              }}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-[#1A1A2E] flex-shrink-0">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl min-h-[44px] text-sm font-medium text-red-400 active:opacity-70 transition-colors"
        >
          <LogOut size={18} strokeWidth={2} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
