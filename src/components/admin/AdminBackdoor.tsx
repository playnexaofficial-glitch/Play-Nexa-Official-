// ── Play Nexa — Admin Backdoor Module ─────────────────────────────
// Hidden access gate triggered from Global Search
// Real Supabase Auth + admin_users role verification
// Inline Admin Dashboard with movie upload form
// AMOLED dark theme, 44px touch targets, mobile APK-friendly

'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react'
import { supabase } from '@/lib/supabaseAdmin'
import type { Movie } from '@/lib/supabase'
import {
  X, Eye, EyeOff, ShieldAlert, Loader2,
  Upload, CheckCircle, Film, LogOut,
  ChevronDown, AlertTriangle, Database,
  Clock, Trash2
} from 'lucide-react'

// ── Channel options matching movies table channel_name ──

const CHANNEL_OPTIONS = [
  { value: 'G-Series', label: '🎬 G-Series' },
  { value: 'Eagle Movies', label: '🦅 Eagle Movies' },
  { value: 'Chorki', label: '🍿 Chorki' },
  { value: 'BongoBD', label: '🎭 BongoBD' },
  { value: 'SVF', label: '🌟 SVF' },
  { value: 'Goldmines', label: '🎥 Goldmines' },
  { value: 'Pen Movies', label: '📽️ Pen Movies' },
  { value: 'SonyLIV', label: '📡 SonyLIV' },
]

// ── Animation keyframes ──

const ADMIN_ANIMATIONS = `
@keyframes adminFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes adminSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes adminPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.3); }
  50% { box-shadow: 0 0 40px rgba(124,58,237,0.6); }
}
@keyframes adminScanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
.admin-fade-in { animation: adminFadeIn 300ms ease-out forwards; }
.admin-slide-up { animation: adminSlideUp 400ms ease-out forwards; }
.admin-pulse { animation: adminPulse 2s ease-in-out infinite; }
`

// ── Toast component ──

interface ToastData {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

function ToastContainer({ toasts }: { toasts: ToastData[] }) {
  return (
    <div className="fixed top-4 right-4 z-[200] space-y-2 max-w-xs">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            admin-slide-up px-4 py-3 rounded-xl text-sm font-medium
            flex items-center gap-2 border
            ${t.type === 'success'
              ? 'bg-[#0F2A1F] border-[#22C55E]/30 text-[#22C55E]'
              : t.type === 'error'
                ? 'bg-[#2A0F0F] border-[#EF4444]/30 text-[#EF4444]'
                : 'bg-[#0F1A2A] border-[#3B82F6]/30 text-[#3B82F6]'
            }
          `}
        >
          {t.type === 'success' && <CheckCircle size={16} />}
          {t.type === 'error' && <AlertTriangle size={16} />}
          {t.type === 'info' && <Database size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MAIN EXPORT — Admin Backdoor Component
// ═══════════════════════════════════════════════════════════════

interface AdminBackdoorProps {
  isOpen: boolean
  onClose: () => void
}

export default function AdminBackdoor({ isOpen, onClose }: AdminBackdoorProps) {
  // ── Gate state ──
  const [adminGateOpen, setAdminGateOpen] = useState(false)

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [unauthorizedAlert, setUnauthorizedAlert] = useState(false)

  // ── Admin session state ──
  const [adminVerified, setAdminVerified] = useState(false)
  const [adminRole, setAdminRole] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  // ── Dashboard state ──
  const [dashTab, setDashTab] = useState<'upload' | 'movies' | 'stats'>('upload')
  const [movies, setMovies] = useState<Movie[]>([])
  const [isLoadingMovies, setIsLoadingMovies] = useState(false)
  const [movieCount, setMovieCount] = useState(0)

  // ── Upload form state ──
  const [formTitle, setFormTitle] = useState('')
  const [formThumbnail, setFormThumbnail] = useState('')
  const [formYoutubeId, setFormYoutubeId] = useState('')
  const [formChannel, setFormChannel] = useState('')
  const [formDuration, setFormDuration] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Delete state ──
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Toast state ──
  const [toasts, setToasts] = useState<ToastData[]>([])
  const toastIdRef = useRef(0)

  // ── Refs ──
  const emailRef = useRef<HTMLInputElement>(null)

  // ── Toast helper ──
  const showToast = useCallback((type: ToastData['type'], message: string) => {
    const id = ++toastIdRef.value
    setToasts(prev => [...prev.slice(-4), { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  // ── Open gate when component becomes visible ──
  useEffect(() => {
    if (isOpen) {
      setAdminGateOpen(true)
      setTimeout(() => emailRef.current?.focus(), 300)
    } else {
      // Full reset when closing
      setAdminGateOpen(false)
      setAdminVerified(false)
      setAdminRole('')
      setAdminEmail('')
      setLoginEmail('')
      setLoginPassword('')
      setLoginError('')
      setUnauthorizedAlert(false)
      setFormTitle('')
      setFormThumbnail('')
      setFormYoutubeId('')
      setFormChannel('')
      setFormDuration('')
      setFormDescription('')
      setDashTab('upload')
    }
  }, [isOpen])

  // ── Fetch movies for dashboard (via API route with service role) ──
  const fetchDashboardMovies = useCallback(async () => {
    setIsLoadingMovies(true)
    try {
      const res = await fetch('/api/admin/movies')
      const json = await res.json()
      if (json.movies) {
        setMovies(json.movies as Movie[])
        setMovieCount(json.total || 0)
      }
    } catch {
      // silent
    } finally {
      setIsLoadingMovies(false)
    }
  }, [])

  // ── Load movies when dashboard tab is active ──
  useEffect(() => {
    if (adminVerified && dashTab === 'movies') {
      fetchDashboardMovies()
    }
    if (adminVerified && dashTab === 'stats') {
      fetchDashboardMovies()
    }
  }, [adminVerified, dashTab, fetchDashboardMovies])

  // ── AUTH: Supabase sign in + role check ──
  const handleAdminLogin = useCallback(async () => {
    setLoginError('')
    setUnauthorizedAlert(false)

    if (!loginEmail.trim() || !loginEmail.includes('@')) {
      setLoginError('Enter a valid email address')
      return
    }
    if (!loginPassword || loginPassword.length < 6) {
      setLoginError('Password must be at least 6 characters')
      return
    }

    if (!supabase) {
      setLoginError('Supabase not connected. Check .env.local')
      return
    }

    setIsLoggingIn(true)

    try {
      // Step 1: Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      })

      if (authError) {
        setLoginError(authError.message)
        return
      }
      if (!authData.user) {
        setLoginError('Authentication failed — no user returned')
        return
      }

      // Step 2: Verify admin role via server-side API (bypasses RLS on admin_users)
      const verifyRes = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authData.user.id }),
      })

      const verifyData = await verifyRes.json()

      if (!verifyData.authorized) {
        // NOT an admin — sign out immediately
        await supabase.auth.signOut()
        setUnauthorizedAlert(true)
        setLoginEmail('')
        setLoginPassword('')
        return
      }

      const adminRoleValue: string = verifyData.role

      // Step 3: Grant access
      setAdminVerified(true)
      setAdminRole(adminRoleValue)
      setAdminEmail(authData.user.email || loginEmail.trim())
      showToast('success', `Welcome, ${adminRoleValue}!`)

    } catch (err: any) {
      setLoginError(err.message || 'Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }, [loginEmail, loginPassword, showToast])

  // ── MOVIE UPLOAD: Insert into Supabase ──
  const handleMovieUpload = useCallback(async () => {
    if (!supabase) {
      showToast('error', 'Supabase not connected')
      return
    }

    // Validate
    if (!formTitle.trim()) {
      showToast('error', 'Title is required')
      return
    }
    if (!formYoutubeId.trim()) {
      showToast('error', 'YouTube Video ID is required')
      return
    }
    if (!formChannel) {
      showToast('error', 'Select a channel')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          youtube_id: formYoutubeId.trim(),
          thumbnail: formThumbnail.trim() || '',
          channel_name: formChannel,
          duration: formDuration.trim() || '',
          description: formDescription.trim() || '',
        }),
      })

      const json = await res.json()

      if (!res.ok || json.error) {
        showToast('error', `Upload failed: ${json.error || 'Unknown error'}`)
        return
      }

      showToast('success', `"${formTitle.trim()}" uploaded successfully!`)

      // Reset form
      setFormTitle('')
      setFormThumbnail('')
      setFormYoutubeId('')
      setFormChannel('')
      setFormDuration('')
      setFormDescription('')

      // Refresh movie count
      setMovieCount(prev => prev + 1)

    } catch (err: any) {
      showToast('error', `Upload error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [formTitle, formThumbnail, formYoutubeId, formChannel, formDuration, formDescription, showToast])

  // ── DELETE MOVIE (via API route with service role) ──
  const handleDeleteMovie = useCallback(async (movieId: string, movieTitle: string) => {
    setDeletingId(movieId)
    try {
      const res = await fetch(`/api/admin/movies?id=${movieId}`, { method: 'DELETE' })
      const json = await res.json()

      if (!res.ok || json.error) {
        showToast('error', `Delete failed: ${json.error || 'Unknown error'}`)
      } else {
        showToast('success', `"${movieTitle}" deleted`)
        setMovies(prev => prev.filter(m => m.id !== movieId))
        setMovieCount(prev => Math.max(0, prev - 1))
      }
    } catch {
      showToast('error', 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }, [showToast])

  // ── LOGOUT & LOCK ──
  const handleLogout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    onClose()
  }, [onClose])

  // ── Don't render if not open ──
  if (!isOpen) return null

  // ═══════════════════════════════════════════════════════════════
  //  RENDER — Login Gate
  // ═══════════════════════════════════════════════════════════════

  if (!adminVerified) {
    return (
      <div className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center p-4">
        <style dangerouslySetInnerHTML={{ __html: ADMIN_ANIMATIONS }} />

        {/* Scanline effect */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(124,58,237,0.1) 2px, rgba(124,58,237,0.1) 4px)',
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#9CA3AF] hover:text-white z-10"
        >
          <X size={24} />
        </button>

        {/* Login card */}
        <div
          className="admin-fade-in w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(15,15,15,0.95), rgba(10,10,10,0.98))',
            border: '1px solid rgba(124,58,237,0.3)',
            boxShadow: '0 0 60px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Header */}
          <div className="p-6 pb-4 text-center">
            <div
              className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 admin-pulse"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #4C1D95)',
                border: '1px solid rgba(124,58,237,0.5)',
              }}
            >
              <ShieldAlert size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              <span className="text-[#7C3AED]">Play</span> Nexa
            </h2>
            <p className="text-[#9CA3AF] text-xs mt-1">Admin Authentication Required</p>
          </div>

          {/* Unauthorized Alert */}
          {unauthorizedAlert && (
            <div className="mx-6 mb-4 p-3 rounded-xl bg-[#2A0F0F] border border-[#EF4444]/30">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert size={14} className="text-[#EF4444]" />
                <p className="text-[#EF4444] text-xs font-bold uppercase">Access Denied</p>
              </div>
              <p className="text-[#F87171] text-[11px]">
                Your account is not authorized for admin access. This incident has been logged.
              </p>
            </div>
          )}

          {/* Form */}
          <div className="px-6 pb-6 space-y-3">
            {/* Email */}
            <div>
              <label className="text-[#9CA3AF] text-[11px] font-medium mb-1.5 block uppercase tracking-wider">
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                value={loginEmail}
                onChange={e => { setLoginEmail(e.target.value); setLoginError(''); setUnauthorizedAlert(false) }}
                placeholder="admin@playnexa.com"
                className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-sm text-white outline-none focus:border-[#7C3AED] transition-colors duration-150 placeholder-[#6B7280]"
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-[#9CA3AF] text-[11px] font-medium mb-1.5 block uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
                  placeholder="Enter password"
                  className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 pr-12 text-sm text-white outline-none focus:border-[#7C3AED] transition-colors duration-150 placeholder-[#6B7280]"
                  onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center text-[#6B7280] hover:text-white"
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {loginError && (
              <p className="text-[#EF4444] text-xs">{loginError}</p>
            )}

            {/* Login button */}
            <button
              onClick={handleAdminLogin}
              disabled={isLoggingIn}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm transition-all duration-150 disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                boxShadow: '0 4px 15px rgba(124,58,237,0.4)',
              }}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <ShieldAlert size={16} />
                  Verify Identity
                </>
              )}
            </button>
          </div>
        </div>

        <ToastContainer toasts={toasts} />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER — Admin Dashboard
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-[150] bg-black flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_ANIMATIONS }} />

      {/* ── HEADER ── */}
      <div
        className="flex items-center justify-between px-4 h-14 flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(124,58,237,0.1), transparent)',
          borderBottom: '1px solid rgba(124,58,237,0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #4C1D95)' }}
          >
            <ShieldAlert size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">
              <span className="text-[#7C3AED]">Nexa</span> Admin
            </h1>
            <p className="text-[#9CA3AF] text-[10px]">{adminEmail} &middot; {adminRole}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 h-10 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-semibold min-h-[44px] active:scale-95 transition-transform duration-150"
        >
          <LogOut size={14} />
          Logout & Lock
        </button>
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex gap-1 px-4 py-2 flex-shrink-0 bg-[#0A0A0A] border-b border-[#1A1A1A]">
        {([
          { key: 'upload' as const, icon: Upload, label: 'Upload' },
          { key: 'movies' as const, icon: Film, label: 'Movies' },
          { key: 'stats' as const, icon: Database, label: 'Stats' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setDashTab(tab.key)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-xs font-medium min-h-[40px] transition-all duration-150
              ${dashTab === tab.key
                ? 'bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/40'
                : 'text-[#9CA3AF] border border-transparent active:scale-95'
              }
            `}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">

        {/* ═══════ UPLOAD TAB ═══════ */}
        {dashTab === 'upload' && (
          <div className="admin-slide-up space-y-4 max-w-lg mx-auto">

            {/* Form card */}
            <div
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(145deg, rgba(15,15,15,0.9), rgba(10,10,10,0.95))',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Upload size={16} className="text-[#7C3AED]" />
                <h2 className="text-white font-bold text-sm">Upload Movie</h2>
              </div>

              {/* Title */}
              <div>
                <label className="text-[#9CA3AF] text-[11px] font-medium mb-1.5 block uppercase tracking-wider">
                  Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Movie title"
                  className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-sm text-white outline-none focus:border-[#7C3AED] transition-colors duration-150 placeholder-[#6B7280]"
                />
              </div>

              {/* YouTube ID + Thumbnail row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#9CA3AF] text-[11px] font-medium mb-1.5 block uppercase tracking-wider">
                    YouTube ID *
                  </label>
                  <input
                    type="text"
                    value={formYoutubeId}
                    onChange={e => setFormYoutubeId(e.target.value)}
                    placeholder="dQw4w9WgXcQ"
                    className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-sm text-white outline-none focus:border-[#7C3AED] transition-colors duration-150 placeholder-[#6B7280]"
                  />
                </div>
                <div>
                  <label className="text-[#9CA3AF] text-[11px] font-medium mb-1.5 block uppercase tracking-wider">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={formDuration}
                    onChange={e => setFormDuration(e.target.value)}
                    placeholder="1:32:00"
                    className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-sm text-white outline-none focus:border-[#7C3AED] transition-colors duration-150 placeholder-[#6B7280]"
                  />
                </div>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="text-[#9CA3AF] text-[11px] font-medium mb-1.5 block uppercase tracking-wider">
                  Thumbnail URL <span className="text-[#6B7280]">(auto-generated if empty)</span>
                </label>
                <input
                  type="text"
                  value={formThumbnail}
                  onChange={e => setFormThumbnail(e.target.value)}
                  placeholder="https://img.youtube.com/vi/.../hqdefault.jpg"
                  className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-sm text-white outline-none focus:border-[#7C3AED] transition-colors duration-150 placeholder-[#6B7280]"
                />
              </div>

              {/* Channel dropdown */}
              <div>
                <label className="text-[#9CA3AF] text-[11px] font-medium mb-1.5 block uppercase tracking-wider">
                  Channel *
                </label>
                <div className="relative">
                  <select
                    value={formChannel}
                    onChange={e => setFormChannel(e.target.value)}
                    className="w-full h-12 bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 text-sm text-white outline-none focus:border-[#7C3AED] transition-colors duration-150 appearance-none"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="" disabled>Select channel</option>
                    {CHANNEL_OPTIONS.map(ch => (
                      <option key={ch.value} value={ch.value}>{ch.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[#9CA3AF] text-[11px] font-medium mb-1.5 block uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Optional movie description..."
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#7C3AED] transition-colors duration-150 placeholder-[#6B7280] resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleMovieUpload}
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl text-white font-semibold text-sm min-h-[44px] flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  boxShadow: '0 4px 15px rgba(124,58,237,0.3)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading to Database...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload Movie
                  </>
                )}
              </button>
            </div>

            {/* YouTube Preview */}
            {formYoutubeId.trim() && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid rgba(124,58,237,0.2)' }}
              >
                <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider px-4 pt-3 pb-2">
                  Preview
                </p>
                <div className="aspect-video bg-[#0A0A0A]">
                  <img
                    src={`https://img.youtube.com/vi/${formYoutubeId.trim()}/hqdefault.jpg`}
                    alt="YouTube preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
                {formTitle.trim() && (
                  <p className="text-white text-xs font-medium px-4 py-2 truncate">
                    {formTitle.trim()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════ MOVIES TAB ═══════ */}
        {dashTab === 'movies' && (
          <div className="admin-slide-up space-y-3 max-w-lg mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-sm flex items-center gap-2">
                <Film size={16} className="text-[#7C3AED]" />
                Movies Database
              </h2>
              <button
                onClick={fetchDashboardMovies}
                className="text-[#7C3AED] text-xs font-medium min-h-[36px] px-3 active:scale-95 transition-transform"
              >
                Refresh
              </button>
            </div>

            {isLoadingMovies ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[#1A1A1A] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : movies.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3">
                <Film size={40} className="text-[#2D2D2D]" />
                <p className="text-[#9CA3AF] text-sm">No movies in database</p>
                <p className="text-[#6B7280] text-xs">Upload your first movie in the Upload tab</p>
              </div>
            ) : (
              <div className="space-y-2">
                {movies.map(movie => (
                  <div
                    key={movie.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#0F0F0F] border border-[#1A1A1A]"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#1A1A1A]">
                      <img
                        src={movie.thumbnail || `https://img.youtube.com/vi/${movie.youtube_id}/mqdefault.jpg`}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium line-clamp-1">{movie.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[#7C3AED] text-[10px]">{movie.channel_name}</span>
                        <span className="text-[#6B7280] text-[10px]">{movie.duration || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteMovie(movie.id, movie.title)}
                      disabled={deletingId === movie.id}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#6B7280] hover:text-[#EF4444] transition-colors disabled:opacity-50"
                    >
                      {deletingId === movie.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════ STATS TAB ═══════ */}
        {dashTab === 'stats' && (
          <div className="admin-slide-up space-y-4 max-w-lg mx-auto">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Database size={16} className="text-[#7C3AED]" />
              Database Stats
            </h2>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05))',
                  border: '1px solid rgba(124,58,237,0.3)',
                }}
              >
                <Film size={20} className="text-[#7C3AED] mb-2" />
                <p className="text-white text-2xl font-bold">{movieCount}</p>
                <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Total Movies</p>
              </div>

              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
                  border: '1px solid rgba(6,182,212,0.3)',
                }}
              >
                <Database size={20} className="text-[#06B6D4] mb-2" />
                <p className="text-white text-2xl font-bold">{movies.length}</p>
                <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Loaded</p>
              </div>

              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}
              >
                <CheckCircle size={20} className="text-[#22C55E] mb-2" />
                <p className="text-white text-2xl font-bold">{supabase ? 'Live' : 'Off'}</p>
                <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Supabase</p>
              </div>

              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))',
                  border: '1px solid rgba(249,115,22,0.3)',
                }}
              >
                <Clock size={20} className="text-[#F97316] mb-2" />
                <p className="text-white text-2xl font-bold">{adminRole === 'superadmin' ? 'SU' : 'A'}</p>
                <p className="text-[#9CA3AF] text-[10px] uppercase tracking-wider">Access Level</p>
              </div>
            </div>

            {/* Channel breakdown */}
            {movies.length > 0 && (
              <div
                className="rounded-xl p-4 space-y-2"
                style={{
                  background: 'rgba(15,15,15,0.9)',
                  border: '1px solid rgba(124,58,237,0.2)',
                }}
              >
                <p className="text-[#9CA3AF] text-[11px] uppercase tracking-wider font-medium mb-2">
                  Channel Breakdown
                </p>
                {Object.entries(
                  movies.reduce<Record<string, number>>((acc, m) => {
                    acc[m.channel_name] = (acc[m.channel_name] || 0) + 1
                    return acc
                  }, {})
                ).sort((a, b) => b[1] - a[1]).map(([channel, count]) => (
                  <div key={channel} className="flex items-center justify-between">
                    <span className="text-white text-xs">{channel || 'Unknown'}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${Math.max(20, (count / movieCount) * 120)}px`,
                          background: 'linear-gradient(90deg, #7C3AED, #06B6D4)',
                        }}
                      />
                      <span className="text-[#9CA3AF] text-[11px] w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Connection info */}
            <div
              className="rounded-xl p-4 space-y-1"
              style={{
                background: 'rgba(15,15,15,0.9)',
                border: '1px solid rgba(124,58,237,0.2)',
              }}
            >
              <p className="text-[#9CA3AF] text-[11px] uppercase tracking-wider font-medium mb-2">
                Connection
              </p>
              <p className="text-[#6B7280] text-[10px]">
                Project: gjapqxeksdsiqhvlfrnb
              </p>
              <p className="text-[#6B7280] text-[10px]">
                Schema: public
              </p>
              <p className="text-[#6B7280] text-[10px]">
                Auth: {adminEmail}
              </p>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full h-12 rounded-xl text-[#EF4444] font-semibold text-sm border border-[#EF4444]/30 bg-[#EF4444]/5 min-h-[44px] flex items-center justify-center gap-2 active:scale-95 transition-transform duration-150"
            >
              <LogOut size={16} />
              Logout & Lock App
            </button>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
