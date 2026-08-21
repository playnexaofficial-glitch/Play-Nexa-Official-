// ── Play Nexa — Admin Setup API Route ──────────────────────────
// One-time setup: creates the first admin user in Supabase Auth
// and inserts their UUID into admin_users table.
//
// SECURITY: This route is ONLY accessible when no admin_users exist.
// Once at least one admin exists, this route returns 403.
// The Supabase service role key is required (server-side only).
//
// POST /api/admin/setup
// Body: { email, password }
// Returns: { success, userId } or { error }

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// ── GET: Check if any admin users exist ──
// Used by the login page to determine setup vs login mode

export async function GET() {
  try {
    const admin = supabaseAdmin

    const { data, error } = await admin
      .from('admin_users')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json(
        { hasAdmins: false, error: error.message },
        { status: 200 }
      )
    }

    return NextResponse.json({
      hasAdmins: !!(data && data.length > 0),
    })
  } catch {
    return NextResponse.json({ hasAdmins: false }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Validate env vars ──
    const admin = supabaseAdmin

    // ── 2. Check if any admin already exists (prevent re-run) ──
    const { data: existingAdmins, error: checkErr } = await admin
      .from('admin_users')
      .select('id')
      .limit(1)

    if (checkErr) {
      console.error('[Admin Setup] Error checking existing admins:', checkErr.message)
      return NextResponse.json(
        { error: 'Database check failed: ' + checkErr.message },
        { status: 500 }
      )
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        { error: 'Admin user already exists. Use the login page instead.' },
        { status: 403 }
      )
    }

    // ── 3. Parse and validate input ──
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // ── 4. Create user in Supabase Auth ──
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email
    })

    let userId: string

    if (authError) {
      console.error('[Admin Setup] Auth creation error:', authError.message)

      // If user already exists in Auth, look them up and add to admin_users
      if (authError.message.includes('already been registered')) {
        // List users and find by email
        const { data: listData, error: listErr } = await admin.auth.admin.listUsers()

        if (listErr || !listData?.users) {
          return NextResponse.json(
            { error: 'User exists in Auth but could not be looked up: ' + (listErr?.message || 'Unknown error') },
            { status: 500 }
          )
        }

        const existingUser = listData.users.find(
          (u: any) => u.email?.toLowerCase() === email.trim().toLowerCase()
        )

        if (!existingUser) {
          return NextResponse.json(
            { error: 'User exists in Auth but could not be found by email' },
            { status: 409 }
          )
        }

        userId = existingUser.id

        // Update their password too
        const { error: updateErr } = await admin.auth.admin.updateUserById(userId, { password })
        if (updateErr) {
          console.warn('[Admin Setup] Could not update password for existing user:', updateErr.message)
        }

        console.info('[Admin Setup] Found existing Auth user, adding to admin_users:', userId)
      } else {
        return NextResponse.json(
          { error: 'Failed to create admin user: ' + authError.message },
          { status: 500 }
        )
      }
    } else {
      if (!authData.user) {
        return NextResponse.json(
          { error: 'User creation returned no data' },
          { status: 500 }
        )
      }
      userId = authData.user.id
    }

    // ── 5. Insert into admin_users table ──
    const { error: insertErr } = await admin
      .from('admin_users')
      .insert([{
        user_id: userId,
        email: email.trim().toLowerCase(),
        role: 'superadmin',
      }])

    if (insertErr) {
      console.error('[Admin Setup] admin_users insert error:', insertErr.message)
      // Try to clean up the auth user we just created
      try { await admin.auth.admin.deleteUser(userId) } catch { /* silent */ }
      return NextResponse.json(
        { error: 'Failed to add admin to database: ' + insertErr.message },
        { status: 500 }
      )
    }

    // ── 6. Log the setup activity ──
    try {
      await admin.from('admin_activity_log').insert([{
        admin_id: userId,
        action: 'ADMIN_SETUP',
        target: email.trim().toLowerCase(),
        details: { method: 'setup_route' },
      }])
    } catch {
      // Silent — don't block setup if activity logging fails
    }

    console.info('[Admin Setup] Successfully created admin:', email)

    return NextResponse.json({
      success: true,
      userId,
      email: email.trim().toLowerCase(),
      role: 'superadmin',
    })

  } catch (err: any) {
    console.error('[Admin Setup] Unexpected error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
