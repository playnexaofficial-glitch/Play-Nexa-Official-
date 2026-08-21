import { createClient } from '@supabase/supabase-js'

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Helper to extract project ref from JWT payload and build correct URL
export function getUrlFromKey(token: string): string | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payloadBase64 = parts[1]
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
    
    let decoded = ''
    if (typeof window === 'undefined') {
      decoded = Buffer.from(normalized, 'base64').toString('utf8')
    } else {
      decoded = window.atob(normalized)
    }
    
    const payload = JSON.parse(decoded)
    if (payload && payload.ref) {
      return `https://${payload.ref}.supabase.co`
    }
  } catch (err) {
    console.error('[Supabase URL Resolver] Error parsing JWT:', err)
  }
  return null
}

const resolvedUrl = getUrlFromKey(key) || envUrl

if (!resolvedUrl) console.error('[supabaseAdmin] Supabase URL missing')
if (!key) console.error('[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY missing')

export const supabaseAdmin = createClient(
  resolvedUrl || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: 'public' },
  }
)

export const supabase = supabaseAdmin
