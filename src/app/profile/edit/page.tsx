// src/app/profile/edit/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { updateProfile } from 'firebase/auth'
import { useAuth } from '@/hooks/useAuth'
import { ChevronLeft } from 'lucide-react'

export default function EditProfilePage() {
  const router = useRouter()
  const { user, supabaseProfile, isLoggedIn, isLoading } = useAuth()
  const [editName, setEditName] = useState('')
  const [editHandle, setEditHandle] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (user?.displayName) setEditName(user.displayName)
    else if (supabaseProfile?.display_name) setEditName(supabaseProfile.display_name)
    if (supabaseProfile?.display_name) {
      setEditHandle(supabaseProfile.display_name.toLowerCase().replace(/\s+/g, '_'))
    }
  }, [user, supabaseProfile])

  const handleSave = async () => {
    if (!editName.trim()) {
      setToast('Name cannot be empty')
      setTimeout(() => setToast(''), 2500)
      return
    }
    if (!user) {
      setToast('Not signed in')
      setTimeout(() => setToast(''), 2500)
      return
    }
    setSaving(true)
    try {
      await updateProfile(user, { displayName: editName.trim() })
      setToast('Profile updated successfully')
      setTimeout(() => setToast(''), 2000)
      setTimeout(() => router.push('/profile'), 800)
    } catch {
      setToast('Update failed')
      setTimeout(() => setToast(''), 2500)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-white font-semibold mb-2">Sign in required</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="h-11 px-5 bg-[#7C3AED] text-white rounded-xl text-sm font-medium active:opacity-60 transition-opacity duration-150"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#1A1A2E] sticky top-0 z-40 bg-[#0D0D0D]">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center text-white active:opacity-60 transition-opacity duration-150"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-white font-bold text-lg">Edit Profile</h1>
      </div>

      <div className="px-4 pt-6 space-y-4">
        <div>
          <label className="text-[#9CA3AF] text-xs mb-2 block">Display Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Your name"
            className="w-full h-12 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
          />
        </div>

        <div>
          <label className="text-[#9CA3AF] text-xs mb-2 block">Handle</label>
          <input
            type="text"
            value={editHandle}
            onChange={(e) => setEditHandle(e.target.value)}
            placeholder="username"
            className="w-full h-12 bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-4 text-white text-sm outline-none focus:border-[#7C3AED]"
          />
        </div>

        <div>
          <label className="text-[#9CA3AF] text-xs mb-2 block">Email (read-only)</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full h-12 bg-[#141414] border border-[#2D2D44] rounded-xl px-4 text-[#9CA3AF] text-sm"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-[#7C3AED] rounded-xl text-white font-semibold text-sm active:opacity-65 disabled:opacity-50 transition-opacity duration-150"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-[#1A1A2E] border border-[#2D2D44] rounded-xl px-5 py-3 shadow-lg">
          <p className="text-white text-sm">{toast}</p>
        </div>
      )}
    </div>
  )
}
