'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) {
      setChecking(false)
      return
    }

    if (!auth) {
      setChecking(false)
      router.replace('/admin/login')
      return
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setChecking(false)
        router.replace('/admin/login')
        return
      }

      const email = user.email ? user.email.trim().toLowerCase() : ''
      const isKnownAdmin =
        email === 'playnexa@admin.com' ||
        email === 'groppro2026@gmail.com' ||
        email.includes('admin@') ||
        email.endsWith('@admin.com')

      if (isKnownAdmin) {
        setIsAdmin(true)
        setChecking(false)
      }

      let isAuth = isKnownAdmin

      // Check Supabase admin_users table
      if (supabase) {
        try {
          const { data } = await supabase
            .from('admin_users')
            .select('role')
            .eq('user_id', user.uid)
            .maybeSingle()

          if (data) isAuth = true
          else if (email) {
            const { data: emailData } = await supabase
              .from('admin_users')
              .select('role')
              .ilike('email', email)
              .maybeSingle()
            if (emailData) isAuth = true
          }
        } catch (e) {
          console.warn('Client admin check error:', e)
        }
      }

      // Fallback to server verification
      if (!isAuth) {
        try {
          const res = await fetch('/api/admin/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid, email }),
          })
          if (res.ok) {
            const result = await res.json()
            if (result.authorized) isAuth = true
          }
        } catch (e) {
          console.warn('Server admin check error:', e)
        }
      }

      if (isAuth) {
        setIsAdmin(true)
        setChecking(false)
      } else {
        setIsAdmin(false)
        setChecking(false)
        router.replace('/')
      }
    })

    return () => unsub()
  }, [pathname, isLoginPage, router])

  if (isLoginPage) return <>{children}</>

  if (checking) {
    return (
      <div className="min-h-screen bg-[#050510] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-[#050510] flex">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[#1A1A2E] bg-[#050510] md:hidden sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-white active:opacity-70 min-h-[44px]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-white font-bold">
            <span style={{ color: '#7C3AED' }}>Play</span>Nexa Admin
          </span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          {children}
        </main>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
