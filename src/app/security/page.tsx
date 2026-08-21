'use client'

// ── Play Nexa Security Dashboard Page ─────────────────────────
// System Apps Manager — Global App Lock, App Hide, Icon Changer
// Integrates with existing app-lock-store & disguise-context

import { useRouter } from 'next/navigation'
import { ChevronLeft, Shield } from 'lucide-react'
import SystemAppsManager from '@/components/security/SystemAppsManager'

export default function SecurityPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#070B14] pb-24">
      {/* TopBar */}
      <div className="sticky top-0 z-50 bg-[#070B14]
                      border-b border-[#1E293B]
                      px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-[#111827]
                     border border-[#1E293B]
                     active:scale-90
                     transition-transform duration-150"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-[#7C5CFF]" />
          <h1 className="text-lg font-bold text-white">
            System Apps Manager
          </h1>
        </div>
      </div>

      {/* Dashboard */}
      <SystemAppsManager />
    </div>
  )
}
