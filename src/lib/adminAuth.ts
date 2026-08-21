// ── Play Nexa Admin — Auth Helpers ────────────────────────────
// Admin session management, activity logging, auth checks

import { supabaseAdmin as supabase } from './supabaseAdmin'

// ── Types ──

export interface AdminSession {
  userId: string
  email: string
  role: 'superadmin' | 'admin'
  token: string
}

// ── Get admin session from localStorage ──

export const getAdminSession = (): AdminSession | null => {
  if (typeof window === 'undefined') return null
  try {
    const userId = localStorage.getItem('pna_admin_id')
    const email = localStorage.getItem('pna_admin_email')
    const role = localStorage.getItem('pna_admin_role') as 'superadmin' | 'admin'
    const token = localStorage.getItem('pna_admin_token')
    if (!userId || !email || !token) return null
    return { userId, email, role, token }
  } catch { return null }
}

// ── Set admin session ──

export const setAdminSession = (session: AdminSession): void => {
  try {
    localStorage.setItem('pna_admin_id', session.userId)
    localStorage.setItem('pna_admin_email', session.email)
    localStorage.setItem('pna_admin_role', session.role)
    localStorage.setItem('pna_admin_token', session.token)
    document.cookie = `pna_admin_token=${session.token};path=/;max-age=7200;SameSite=Strict`
  } catch { /* silent */ }
}

// ── Clear admin session ──

export const clearAdminSession = (): void => {
  try {
    localStorage.removeItem('pna_admin_id')
    localStorage.removeItem('pna_admin_email')
    localStorage.removeItem('pna_admin_role')
    localStorage.removeItem('pna_admin_token')
    document.cookie = 'pna_admin_token=;path=/;max-age=0;SameSite=Strict'
  } catch { /* silent */ }
}

// ── Log admin activity ──

const isUUID = (str: string | null): boolean => {
  if (!str) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export const logActivity = async (
  action: string,
  target: string,
  details: Record<string, unknown> = {}
): Promise<void> => {
  const adminId = typeof window !== 'undefined'
    ? localStorage.getItem('pna_admin_id')
    : null
  const adminEmail = typeof window !== 'undefined'
    ? localStorage.getItem('pna_admin_email')
    : null

  if (!supabase) return

  try {
    const validAdminId = isUUID(adminId) ? adminId : null
    const enrichedDetails = {
      ...details,
      ...(adminEmail ? { admin_email: adminEmail } : {}),
      ...(!isUUID(adminId) && adminId ? { firebase_uid: adminId } : {}),
    }

    await supabase.from('admin_activity_log').insert([{
      admin_id: validAdminId,
      action,
      target,
      details: enrichedDetails,
      created_at: new Date().toISOString(),
    }])
  } catch { /* silent — don't block admin actions */ }
}

// ── Check if admin is authenticated ──

export const isAdminAuthenticated = (): boolean => {
  return !!getAdminSession()
}
