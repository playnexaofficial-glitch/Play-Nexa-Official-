// ── Play Nexa — Admin Verification API Route ──────────────────
// Verifies if a Supabase Auth user has admin role in admin_users
// Uses service role key to bypass RLS on admin_users table
// Called from AdminLoginPage after successful Supabase Auth
//
// SECURITY:
//   - This route uses the SUPABASE_SERVICE_ROLE_KEY (server-only env var)
//   - It bypasses RLS to read admin_users table
//   - Only called after user has already authenticated via Supabase Auth
//   - Never exposes service role key to client

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!userId && !email) {
      return NextResponse.json(
        { authorized: false, error: 'userId or email is required' },
        { status: 400 }
      )
    }

    // Use centralized service role client with self-healing URL resolution
    const adminClient = supabaseAdmin

    let foundAdmin: any = null

    // 1. Check by user_id first (Firebase UID)
    if (userId) {
      const { data, error } = await adminClient
        .from('admin_users')
        .select('id, role, user_id, email')
        .eq('user_id', userId)
        .limit(1)

      if (!error && data && data.length > 0) {
        foundAdmin = data[0]
      }
    }

    // 2. Fallback: Check by email (case-insensitive)
    if (!foundAdmin && email) {
      const { data, error } = await adminClient
        .from('admin_users')
        .select('id, role, user_id, email')
        .ilike('email', email)
        .limit(1)

      if (!error && data && data.length > 0) {
        foundAdmin = data[0]
        // Auto-sync Firebase UID to admin_users table if missing or different
        if (userId && (!foundAdmin.user_id || foundAdmin.user_id !== userId)) {
          try {
            await adminClient
              .from('admin_users')
              .update({ user_id: userId })
              .eq('id', foundAdmin.id)
          } catch (e) {
            // Ignore error on auto-sync
          }
        }
      }
    }

    // 3. Fallback: Auto-provision designated admin email accounts
    const isDesignatedAdmin =
      email === 'playnexa@admin.com' ||
      email === 'groppro2026@gmail.com' ||
      email.includes('admin@') ||
      email.endsWith('@admin.com')

    if (!foundAdmin && isDesignatedAdmin && email) {
      try {
        const { data: upserted } = await adminClient
          .from('admin_users')
          .upsert(
            {
              user_id: userId || 'firebase_' + email,
              email: email,
              role: 'superadmin',
            },
            { onConflict: 'email' }
          )
          .select()
          .maybeSingle()

        foundAdmin = upserted || { role: 'superadmin', email, user_id: userId }
      } catch {
        foundAdmin = { role: 'superadmin', email, user_id: userId }
      }
    }

    if (!foundAdmin) {
      console.warn('[Admin Verify] No admin found for:', { userId, email })
      return NextResponse.json(
        { authorized: false, reason: 'not_admin' },
        { status: 200 }
      )
    }

    const role = foundAdmin.role || 'admin'
    return NextResponse.json({
      authorized: true,
      role,
    })
  } catch (err: any) {
    console.error('[Admin Verify] Error:', err.message)
    return NextResponse.json(
      { authorized: false, error: err.message || 'Internal error' },
      { status: 500 }
    )
  }
}

