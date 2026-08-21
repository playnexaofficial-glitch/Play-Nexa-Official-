// ── Play Nexa — Seed Gemini Keys to Database ────────────────────
// One-time script to insert 5 Gemini API keys into gemini_keys table

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const GEMINI_KEYS = [
  { key_name: 'Gemini Key 1', api_key: process.env.GEMINI_KEY_1 || '', sort_order: 1 },
  { key_name: 'Gemini Key 2', api_key: process.env.GEMINI_KEY_2 || '', sort_order: 2 },
  { key_name: 'Gemini Key 3', api_key: process.env.GEMINI_KEY_3 || '', sort_order: 3 },
  { key_name: 'Gemini Key 4', api_key: process.env.GEMINI_KEY_4 || '', sort_order: 4 },
  { key_name: 'Gemini Key 5', api_key: process.env.GEMINI_KEY_5 || '', sort_order: 5 },
]

async function seed() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('Seeding Gemini keys...')

  // First, delete all existing keys
  const { error: delError } = await supabase
    .from('gemini_keys')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all

  if (delError) {
    console.error('Delete error:', delError)
    // Try without condition
    await supabase.from('gemini_keys').delete().gte('sort_order', 0)
  }

  // Insert all keys
  const rows = GEMINI_KEYS.map((k, i) => ({
    key_name: k.key_name,
    api_key: k.api_key,
    is_active: i === 0,
    status: i === 0 ? 'active' : 'standby',
    quota_used: 0,
    usage_count: 0,
    sort_order: k.sort_order,
  }))

  const { error } = await supabase.from('gemini_keys').insert(rows)

  if (error) {
    console.error('Insert error:', error)
    process.exit(1)
  }

  console.log('Successfully seeded 5 Gemini keys!')

  // Verify
  const { data: verify } = await supabase
    .from('gemini_keys')
    .select('key_name, is_active, status, sort_order')
    .order('sort_order')

  if (verify) {
    console.table(verify)
  }
}

seed()
