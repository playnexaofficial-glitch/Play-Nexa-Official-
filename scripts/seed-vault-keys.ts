// ── Play Nexa — Seed API Vault Keys ─────────────────────────────
// One-time script to insert Firebase & YouTube keys into api_vault table

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const VAULT_KEYS = [
  // ── Firebase ──
  {
    service: 'firebase' as const,
    key_name: 'API Key',
    key_value: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    description: 'Firebase Web API Key — client-side auth',
    guide: 'Used by firebase.ts for authentication. NEXT_PUBLIC_ prefix means it is safe to expose in browser.',
    risk_level: 'low' as const,
  },
  {
    service: 'firebase' as const,
    key_name: 'Auth Domain',
    key_value: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    description: 'Firebase Auth domain for popup/redirect sign-in',
    guide: 'Must match your Firebase project domain. Used by firebase/auth module.',
    risk_level: 'low' as const,
  },
  {
    service: 'firebase' as const,
    key_name: 'Project ID',
    key_value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    description: 'Firebase project identifier',
    guide: 'Used for all Firebase services. Links your app to the GCP project.',
    risk_level: 'low' as const,
  },
  {
    service: 'firebase' as const,
    key_name: 'App ID',
    key_value: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    description: 'Firebase Web App ID',
    guide: 'Identifies the web app within your Firebase project. Safe to expose.',
    risk_level: 'low' as const,
  },
  // ── YouTube ──
  {
    service: 'gemini' as const,
    key_name: 'YouTube Data API v3 Key',
    key_value: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '',
    description: 'YouTube Data API v3 key for channel import',
    guide: 'Used by YT Importer to fetch channel uploads. Enable YouTube Data API v3 in Google Cloud Console.',
    risk_level: 'medium' as const,
  },
]

async function seed() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('Seeding API Vault keys...')

  // Delete existing Firebase & YouTube vault entries (keep Supabase ones)
  await supabase.from('api_vault').delete().in('service', ['firebase'])
  await supabase.from('api_vault').delete().eq('key_name', 'YouTube Data API v3 Key')

  // Insert new keys
  const { error } = await supabase.from('api_vault').insert(VAULT_KEYS)

  if (error) {
    console.error('Insert error:', error)
    process.exit(1)
  }

  console.log('Successfully seeded API Vault keys!')

  // Verify
  const { data: verify } = await supabase
    .from('api_vault')
    .select('service, key_name, risk_level')
    .order('service')

  if (verify) {
    console.table(verify)
  }
}

seed()
