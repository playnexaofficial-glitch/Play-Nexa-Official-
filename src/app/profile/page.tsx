// src/app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  Shield,
  Bell,
  Globe,
  HelpCircle,
  Star,
  Share2,
  LogOut,
  User,
  Lock,
  Download,
  Clock,
  Heart,
  ListMusic,
  Gamepad2,
  Edit2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Stats {
  downloads: number
  saved: number
  played: number
  liked: number
  isAdmin: boolean
}

interface Achievement {
  id: string
  label: string
  description: string
  unlocked: boolean
  icon: React.ElementType
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({
    downloads: 0,
    saved: 0,
    played: 0,
    liked: 0,
    isAdmin: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [notifEnabled, setNotifEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('pn_notif_enabled') === 'true'
  })
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  // Load Firebase user
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const init = async () => {
      const { auth } = await import('@/lib/firebase')
      const { onAuthStateChanged } = await import('firebase/auth')

      if (!auth) {
        setIsLoading(false)
        return
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
        setUser(firebaseUser)
        if (firebaseUser) {
          await loadStats(firebaseUser.uid, firebaseUser.email)
        } else {
          setIsLoading(false)
        }
      })
    }

    init()
    return () => unsubscribe?.()
  }, [])

  const loadStats = async (uid: string, email?: string | null) => {
    try {
      const res = await fetch(`/api/profile/stats?userId=${uid}`)
      const data = await res.json()

      // Check admin status also by email or uid
      const isKnownAdmin =
        email === 'groppro2026@gmail.com' ||
        email === 'playnexa@admin.com' ||
        email?.includes('admin')

      // Downloads from localStorage
      let downloads = 0
      try {
        const dlHistory = JSON.parse(localStorage.getItem('pn_dl_history') || '[]')
        downloads = dlHistory.length
      } catch {}

      setStats({
        ...data,
        downloads,
        isAdmin: data.isAdmin || isKnownAdmin,
      })
    } catch {
      // fallback
    }
    setIsLoading(false)
  }

  const handleToggleNotif = async () => {
    const next = !notifEnabled
    localStorage.setItem('pn_notif_enabled', String(next))
    setNotifEnabled(next)

    if (next) {
      try {
        if ('Notification' in window) {
          await Notification.requestPermission()
        }
      } catch {}
    }
  }

  const handleSignOut = async () => {
    const { auth } = await import('@/lib/firebase')
    const { signOut } = await import('firebase/auth')
    if (auth) {
      await signOut(auth)
    }
    localStorage.removeItem('pn_notif_enabled')
    router.replace('/auth/login')
  }

  const handleShare = async () => {
    const shareData = {
      title: 'Play Nexa',
      text: 'Watch movies and listen to music free on Play Nexa',
      url: 'https://playnexa.com',
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
      }
    } catch {}
  }

  // Achievements (computed from real stats)
  const achievements: Achievement[] = [
    {
      id: 'first_watch',
      label: 'First Watch',
      description: 'Watched your first movie',
      unlocked: stats.played >= 1,
      icon: Clock,
    },
    {
      id: 'collector',
      label: 'Collector',
      description: 'Saved 5 or more items',
      unlocked: stats.saved >= 5,
      icon: Heart,
    },
    {
      id: 'music_lover',
      label: 'Music Lover',
      description: 'Liked 5 or more songs',
      unlocked: stats.liked >= 5,
      icon: ListMusic,
    },
    {
      id: 'binge_watcher',
      label: 'Binge Watcher',
      description: 'Watched 10 or more movies',
      unlocked: stats.played >= 10,
      icon: Clock,
    },
    {
      id: 'downloader',
      label: 'Downloader',
      description: 'Downloaded your first item',
      unlocked: stats.downloads >= 1,
      icon: Download,
    },
    {
      id: 'gamer',
      label: 'Gamer',
      description: 'Played a game',
      unlocked: (stats as any).gamePlays >= 1,
      icon: Gamepad2,
    },
  ]

  // Guest State
  if (!isLoading && !user) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] pb-24">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-white">Profile</h1>
        </div>

        <div className="px-4 mt-8">
          <div className="bg-[#1A1A2E] rounded-2xl p-6 text-center border border-[#2D2D44]">
            <div className="w-20 h-20 rounded-full bg-[#0D0D0D] border-2 border-[#2D2D44] flex items-center justify-center mx-auto mb-4">
              <User size={32} color="#6B7280" />
            </div>
            <h2 className="text-white font-bold text-lg mb-1">Welcome to Play Nexa</h2>
            <p className="text-[#9CA3AF] text-sm mb-6">
              Sign in to track your history, save favorites, and sync across devices
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm mb-3 active:opacity-60 transition-opacity duration-150"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full h-12 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl text-white font-semibold text-sm active:opacity-60 transition-opacity duration-150"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] pb-24">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-white">Profile</h1>
        </div>
        <div className="flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-full bg-[#1A1A2E] mb-3" />
          <div className="h-4 w-32 bg-[#1A1A2E] rounded-full mb-2" />
          <div className="h-3 w-24 bg-[#1A1A2E] rounded-full" />
        </div>
      </div>
    )
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User'
  const email = user?.email || ''
  const initial = displayName[0]?.toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 sticky top-0 z-40 bg-[#0D0D0D]">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <button
          onClick={() => router.push('/profile/edit')}
          className="w-10 h-10 rounded-full bg-[#1A1A2E] flex items-center justify-center active:opacity-60 transition-opacity duration-150"
        >
          <Edit2 size={16} color="#9CA3AF" />
        </button>
      </div>

      {/* Avatar + Info */}
      <div className="flex flex-col items-center px-4 py-6">
        <div className="relative mb-4">
          <div
            className="w-[88px] h-[88px] rounded-full p-[3px]"
            style={{
              backgroundColor: stats.isAdmin ? '#7C3AED' : '#2D2D44',
            }}
          >
            <div className="w-full h-full rounded-full bg-[#1A1A2E] flex items-center justify-center overflow-hidden">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">{initial}</span>
              )}
            </div>
          </div>
          {stats.isAdmin && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center border-2 border-[#0D0D0D]">
              <Shield size={13} color="white" />
            </div>
          )}
        </div>

        <h2 className="text-white text-xl font-bold mb-0.5">{displayName}</h2>
        <p className="text-[#9CA3AF] text-sm">{email}</p>
      </div>

      {/* Stats Row */}
      <div className="mx-4 mb-6 bg-[#1A1A2E] border border-[#2D2D44] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-3">
          {[
            { label: 'Saved', value: stats.saved },
            { label: 'Played', value: stats.played },
            { label: 'Downloads', value: stats.downloads },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col items-center py-4 ${
                i < 2 ? 'border-r border-[#2D2D44]' : ''
              }`}
            >
              <span className="text-2xl font-bold text-white mb-0.5">{s.value}</span>
              <span className="text-[#9CA3AF] text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Panel Button (admin only) */}
      {stats.isAdmin && (
        <div className="px-4 mb-4">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl min-h-[60px] active:opacity-60 transition-opacity duration-150 border border-[#7C3AED]/40 bg-[#1A1A2E]"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#7C3AED]">
              <Shield size={20} color="white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[#A78BFA] font-semibold text-sm">Admin Panel</p>
              <p className="text-[#7C3AED]/60 text-xs mt-0.5">Full access control</p>
            </div>
            <ChevronRight size={18} color="#7C3AED" />
          </button>
        </div>
      )}

      {/* Achievements */}
      <div className="px-4 mb-6">
        <h2 className="text-base font-bold text-white mb-3">Achievements</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {achievements.map((a) => {
            const Icon = a.icon
            return (
              <div key={a.id} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-[72px]">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                    a.unlocked
                      ? 'bg-[#7C3AED]/15 border-[#7C3AED]/40'
                      : 'bg-[#1A1A2E] border-[#2D2D44] opacity-40'
                  }`}
                >
                  <Icon
                    size={22}
                    color={a.unlocked ? '#A78BFA' : '#6B7280'}
                    strokeWidth={1.8}
                  />
                </div>
                <span
                  className="text-[10px] text-center leading-tight"
                  style={{ color: a.unlocked ? '#9CA3AF' : '#4B5563' }}
                >
                  {a.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Activity Section */}
      <div className="px-4 mb-4">
        <h2 className="text-base font-bold text-white mb-3">Activity</h2>
        <div className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D44] overflow-hidden">
          {[
            {
              Icon: Download,
              label: 'Recent Downloads',
              path: '/profile/downloads',
              count: stats.downloads,
            },
            {
              Icon: Clock,
              label: 'Watch History',
              path: '/profile/history',
              count: stats.played,
            },
            {
              Icon: Heart,
              label: 'Favorites',
              path: '/profile/favorites',
              count: stats.saved,
            },
            {
              Icon: ListMusic,
              label: 'My Playlists',
              path: '/profile/playlists',
              count: null,
            },
            {
              Icon: Gamepad2,
              label: 'Game History',
              path: '/profile/games',
              count: (stats as any).gamePlays || 0,
            },
          ].map(({ Icon, label, path, count }, idx, arr) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`w-full flex items-center gap-3 px-4 min-h-[52px] active:opacity-60 transition-opacity duration-150 ${
                idx < arr.length - 1 ? 'border-b border-[#0D0D0D]' : ''
              }`}
            >
              <Icon size={18} color="#9CA3AF" strokeWidth={1.8} />
              <span className="flex-1 text-left text-sm text-white">{label}</span>
              {count !== null && (
                <span className="text-[#6B7280] text-xs mr-1">{count}</span>
              )}
              <ChevronRight size={16} color="#4B5563" />
            </button>
          ))}
        </div>
      </div>

      {/* Quick Settings */}
      <div className="px-4 mb-4">
        <h2 className="text-base font-bold text-white mb-3">Quick Settings</h2>
        <div className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D44] overflow-hidden">
          <div className="flex items-center gap-3 px-4 min-h-[52px] border-b border-[#0D0D0D]">
            <Bell size={18} color="#9CA3AF" strokeWidth={1.8} />
            <span className="flex-1 text-sm text-white">Notifications</span>
            <button
              onClick={handleToggleNotif}
              className={`w-11 h-6 rounded-full relative transition-colors duration-150 flex-shrink-0 ${
                notifEnabled ? 'bg-[#7C3AED]' : 'bg-[#374151]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-150 ${
                  notifEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => router.push('/settings?tab=language')}
            className="w-full flex items-center gap-3 px-4 min-h-[52px] border-b border-[#0D0D0D] active:opacity-60 transition-opacity duration-150"
          >
            <Globe size={18} color="#9CA3AF" strokeWidth={1.8} />
            <span className="flex-1 text-left text-sm text-white">Language</span>
            <span className="text-[#6B7280] text-xs mr-1">English</span>
            <ChevronRight size={16} color="#4B5563" />
          </button>

          <button
            onClick={() => {
              window.open(
                'mailto:playnexaofficial@gmail.com?subject=Play%20Nexa%20Support',
                '_blank'
              )
            }}
            className="w-full flex items-center gap-3 px-4 min-h-[52px] border-b border-[#0D0D0D] active:opacity-60 transition-opacity duration-150"
          >
            <HelpCircle size={18} color="#9CA3AF" strokeWidth={1.8} />
            <div className="flex-1 text-left">
              <p className="text-sm text-white">Help & Support</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">playnexaofficial@gmail.com</p>
            </div>
            <ChevronRight size={16} color="#4B5563" />
          </button>

          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center gap-3 px-4 min-h-[52px] border-b border-[#0D0D0D] active:opacity-60 transition-opacity duration-150"
          >
            <Star size={18} color="#9CA3AF" strokeWidth={1.8} />
            <span className="flex-1 text-left text-sm text-white">Rate Play Nexa</span>
            <ChevronRight size={16} color="#4B5563" />
          </button>

          <button
            onClick={handleShare}
            className="w-full flex items-center gap-3 px-4 min-h-[52px] active:opacity-60 transition-opacity duration-150"
          >
            <Share2 size={18} color="#9CA3AF" strokeWidth={1.8} />
            <span className="flex-1 text-left text-sm text-white">Share App</span>
            <ChevronRight size={16} color="#4B5563" />
          </button>
        </div>
      </div>

      {/* Account Section */}
      <div className="px-4 mb-6">
        <h2 className="text-base font-bold text-white mb-3">Account</h2>
        <div className="bg-[#1A1A2E] rounded-2xl border border-[#2D2D44] overflow-hidden">
          <button
            onClick={() => router.push('/settings?tab=security')}
            className="w-full flex items-center gap-3 px-4 min-h-[52px] border-b border-[#0D0D0D] active:opacity-60 transition-opacity duration-150"
          >
            <Lock size={18} color="#9CA3AF" strokeWidth={1.8} />
            <span className="flex-1 text-left text-sm text-white">Security & Password</span>
            <ChevronRight size={16} color="#4B5563" />
          </button>

          <button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full flex items-center gap-3 px-4 min-h-[52px] active:opacity-60 transition-opacity duration-150"
          >
            <LogOut size={18} color="#EF4444" strokeWidth={1.8} />
            <span className="flex-1 text-left text-sm text-[#EF4444]">Sign Out</span>
          </button>
        </div>
      </div>

      <p className="text-center text-[#4B5563] text-xs pb-4">Play Nexa v1.0.0</p>

      {/* Sign Out Confirm Modal */}
      {showSignOutConfirm && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/70"
            onClick={() => setShowSignOutConfirm(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[81] bg-[#0D0D0D] rounded-t-3xl p-6 pb-10 border-t border-[#1A1A2E]">
            <div className="w-10 h-1 bg-[#2D2D44] rounded-full mx-auto mb-5" />
            <h3 className="text-white font-bold text-lg mb-2">Sign Out</h3>
            <p className="text-[#9CA3AF] text-sm mb-6">Are you sure you want to sign out?</p>
            <button
              onClick={handleSignOut}
              className="w-full h-12 bg-[#EF4444] rounded-xl text-white font-semibold text-sm mb-3 active:opacity-65 transition-opacity duration-150"
            >
              Sign Out
            </button>
            <button
              onClick={() => setShowSignOutConfirm(false)}
              className="w-full h-12 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl text-white font-semibold text-sm active:opacity-60 transition-opacity duration-150"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
